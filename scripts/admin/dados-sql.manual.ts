/** Entirely local embedded Postgres: no URL, credentials, Docker or remote connection. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PRICE_SEED } from "../../apps/api/src/server/usage/pricing";
async function main() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE public.generation_audit(created_at timestamptz, category text, error_code text, total_duration_ms integer,
      raw_input text, output_text text, system_message_full text);
    CREATE TABLE public.subscriptions(environment text, tier text, period text, status text);
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT SELECT ON public.generation_audit, public.subscriptions TO service_role;
  `);
  const sql = readFileSync(
    new URL(
      "../../supabase/migrations/20261022011955_admin_fase2_dados.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(sql);
  const beforeLunaCorrection = (
    await db.query(
      "SELECT * FROM ai_model_prices WHERE model <> 'gpt-6-luna' ORDER BY provider,model,version",
    )
  ).rows;
  await db.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261022013042_admin_luna_cache_write_correction.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM ai_model_prices WHERE provider='openai' AND model='gpt-6-luna' AND cache_write_per_million IS NULL",
      )
    ).rows[0]?.n,
    2,
  );
  assert.deepEqual(
    (
      await db.query(
        "SELECT * FROM ai_model_prices WHERE model <> 'gpt-6-luna' ORDER BY provider,model,version",
      )
    ).rows,
    beforeLunaCorrection,
  );
  await db.exec(
    readFileSync(
      new URL(
        "../../supabase/migrations/20261022013044_admin_transcription_audio_prices.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const rows = await db.query<Record<string, unknown>>(
    "SELECT * FROM ai_model_prices",
  );
  assert.equal(rows.rows.length, PRICE_SEED.length);
  for (const price of PRICE_SEED) {
    const row = rows.rows.find(
      (r) =>
        r.provider === price.provider &&
        r.model === price.model &&
        r.version === price.version,
    )!;
    assert.ok(row);
    for (const key of [
      "input_per_million",
      "output_per_million",
      "cached_per_million",
      "cache_write_per_million",
      "audio_per_minute",
      "audio_input_per_million",
    ] as const)
      assert.equal(
        row[key] === null ? null : Number(row[key]),
        price[key],
        `${price.model} ${key}`,
      );
    assert.equal(row.source_url, price.source_url);
    assert.equal(
      new Date(String(row.checked_on)).toISOString().slice(0, 10),
      price.checked_on,
    );
    assert.equal(
      new Date(String(row.effective_from)).toISOString(),
      new Date(price.effective_from).toISOString(),
    );
  }
  const tables = [
    "ai_model_prices",
    "ai_usage_events",
    "iap_notifications",
    "iap_notification_attempts",
  ];
  for (const table of tables) {
    const protection = await db.query<{
      rls: boolean;
      policies: number;
      anon_read: boolean;
      user_read: boolean;
    }>(
      `SELECT c.relrowsecurity AS rls,
      (SELECT count(*)::int FROM pg_policies WHERE schemaname='public' AND tablename=$1) AS policies,
      has_table_privilege('anon',c.oid,'SELECT') AS anon_read,has_table_privilege('authenticated',c.oid,'SELECT') AS user_read
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=$1`,
      [table],
    );
    assert.deepEqual(protection.rows[0], {
      rls: true,
      policies: 0,
      anon_read: false,
      user_read: false,
    });
  }
  const views = [
    "admin_user_usage",
    "admin_generation_stats",
    "admin_iap_stats",
    "admin_subscription_stats",
  ];
  for (const view of views) {
    const acl = await db.query<{
      anon: boolean;
      user: boolean;
      service: boolean;
    }>(
      `SELECT has_table_privilege('anon',$1,'SELECT') AS anon,
      has_table_privilege('authenticated',$1,'SELECT') AS user,has_table_privilege('service_role',$1,'SELECT') AS service`,
      [view],
    );
    assert.deepEqual(acl.rows[0], { anon: false, user: false, service: true });
    const columns = await db.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name=$1",
      [view],
    );
    assert.equal(
      columns.rows.some((c) =>
        /raw_input|output_text|system_message|signed_payload|transcript|patient/.test(
          c.column_name,
        ),
      ),
      false,
    );
  }
  const user = "00000000-0000-4000-8000-000000000001",
    request = "00000000-0000-4000-8000-000000000002";
  await db.query("INSERT INTO auth.users VALUES ($1)", [user]);
  await db.exec("SET ROLE service_role");
  await db.query(
    `INSERT INTO ai_usage_events(user_id,route,stage,provider,model,cost_usd,price_version,measurement,surface,request_id,ok)
    VALUES ($1,'generate','writer','openai','gpt-5',0.123,'observed-2026-10-21-0','priced','ios',$2,true),
    ($1,'generate','writer','openai','gpt-5',NULL,NULL,'unmeasured','ios',$2,false)`,
    [user, request],
  );
  const usage = await db.query<{
    cost_usd: string | null;
    known_cost_usd: string;
    unpriced_events: number;
  }>(
    "SELECT cost_usd,known_cost_usd,unpriced_events::int FROM admin_user_usage",
  );
  assert.equal(usage.rows.length, 1);
  assert.equal(usage.rows[0]?.cost_usd, null);
  assert.equal(Number(usage.rows[0]?.known_cost_usd), 0.123);
  assert.equal(usage.rows[0]?.unpriced_events, 1);
  await db.query(
    "INSERT INTO iap_notifications(notification_uuid,notification_type,environment,user_id) VALUES ('dup','TEST','Sandbox',$1) ON CONFLICT DO NOTHING",
    [user],
  );
  await db.exec(
    "INSERT INTO iap_notifications(notification_uuid,notification_type,environment) VALUES ('dup','TEST','Sandbox') ON CONFLICT DO NOTHING",
  );
  assert.equal(
    (await db.query("SELECT * FROM iap_notifications")).rows.length,
    1,
  );
  await assert.rejects(
    () => db.exec("UPDATE iap_notifications SET notification_type='OTHER'"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.exec("DELETE FROM iap_notifications"),
    /permission denied/,
  );
  await db.exec("RESET ROLE");
  // Even accidental SELECT grants cannot bypass policy-less RLS for authenticated.
  await db.exec(
    "GRANT SELECT ON ai_usage_events TO authenticated; SET ROLE authenticated",
  );
  assert.equal(
    (await db.query("SELECT * FROM ai_usage_events")).rows.length,
    0,
  );
  await assert.rejects(
    () => db.query("SELECT * FROM admin_user_usage"),
    /permission denied/,
  );
  await db.exec(
    "RESET ROLE; REVOKE SELECT ON ai_usage_events FROM authenticated",
  );
  await db.query("DELETE FROM auth.users WHERE id=$1", [user]);
  assert.equal(
    (
      await db.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM ai_usage_events WHERE user_id IS NULL",
      )
    ).rows[0]?.n,
    2,
  );
  assert.equal(
    (
      await db.query<{ user_id: string | null }>(
        "SELECT user_id FROM iap_notifications",
      )
    ).rows[0]?.user_id,
    null,
  );
  assert.equal(sql.includes("CREATE POLICY"), false);
  const viewMetadata = () =>
    db.query(`SELECT c.relname, c.relacl::text, c.reloptions,
    (SELECT json_agg(json_build_array(a.attname, a.atttypid) ORDER BY a.attnum)
     FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped) AS columns
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('admin_user_usage','admin_generation_stats','admin_iap_stats','admin_subscription_stats')
    ORDER BY c.relname`);
  await db.exec(
    "INSERT INTO subscriptions(environment,tier,period,status,auto_renew_status) VALUES ('Sandbox','pro','monthly','active',1)",
  );
  const originalSnapshot = (
    await db.query("SELECT * FROM admin_subscription_stats")
  ).rows;
  const beforeViews = (await viewMetadata()).rows;
  const timezoneSql = readFileSync(
    new URL(
      "../../supabase/migrations/20261022012304_admin_views_sao_paulo_day.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(timezoneSql);
  await db.exec(timezoneSql); // Replacing the views is safe and does not change their ACLs or schemas.
  assert.deepEqual((await viewMetadata()).rows, beforeViews);
  for (const row of (await viewMetadata()).rows)
    assert.deepEqual(row.reloptions, ["security_invoker=true"]);
  assert.deepEqual(
    (await db.query("SELECT * FROM admin_subscription_stats")).rows,
    originalSnapshot,
  );
  // Midnight in 2026 (UTC-3), and historical summer time (UTC-2): IANA rules, not a fixed offset.
  for (const [index, timestamp] of [
    "2026-10-22T02:59:59Z",
    "2026-10-22T03:00:00Z",
    "2018-12-01T01:59:59Z",
    "2018-12-01T02:00:00Z",
  ].entries()) {
    await db.query(
      `INSERT INTO ai_usage_events(created_at,route,stage,provider,model,measurement,surface,request_id,ok)
      VALUES ($1,'timezone-test','writer','openai','gpt-5','unmeasured','web',$2,true)`,
      [timestamp, request],
    );
    await db.query(
      "INSERT INTO generation_audit(created_at,category,total_duration_ms) VALUES ($1,'TIMEZONE_TEST',100)",
      [timestamp],
    );
    await db.query(
      "INSERT INTO iap_notifications(notification_uuid,received_at,notification_type,environment,product_id) VALUES ($1,$2,'TEST','Sandbox','timezone-test')",
      [`timezone-${index}`, timestamp],
    );
  }
  const expectedDays = ["2018-11-30", "2018-12-01", "2026-10-21", "2026-10-22"];
  for (const timezone of ["UTC", "Asia/Tokyo"]) {
    await db.exec(`SET TIME ZONE '${timezone}'; SET ROLE service_role`);
    for (const [view, filter, count] of [
      ["admin_user_usage", "route='timezone-test'", "events"],
      ["admin_generation_stats", "category='TIMEZONE_TEST'", "generations"],
      ["admin_iap_stats", "product_id='timezone-test'", "notifications"],
    ]) {
      const buckets = (
        await db.query<{ day: string; n: number }>(
          `SELECT day::text, ${count}::int AS n FROM ${view} WHERE ${filter} ORDER BY day`,
        )
      ).rows;
      assert.deepEqual(
        buckets,
        expectedDays.map((day) => ({ day, n: 1 })),
        `${view} civil day with session ${timezone}`,
      );
    }
    await db.exec("RESET ROLE");
  }
  console.log(
    "Admin timezone follow-up: midnight + historical DST + session timezone independence + all four contracts/ACLs/security_invoker preserved",
  );
  await assert.rejects(
    () =>
      db.query(
        `INSERT INTO ai_usage_events(route,stage,provider,model,input_tokens,audio_input_tokens,text_input_tokens,measurement,surface,request_id,ok)
    VALUES ('transcribe','transcription','openai','gpt-4o-transcribe',1100,1000,99,'unpriced','ios',$1,true)`,
        [request],
      ),
    /ai_usage_input_modalities_check/,
  );
  await db.close();
  console.log(
    "Local SQL: migration + seed parity + RLS/ACL + safe views + unknown totals + UUID dedupe + append-only + account deletion passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
