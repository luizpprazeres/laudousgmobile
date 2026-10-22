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
  await db.close();
  console.log(
    "Local SQL: migration + seed parity + RLS/ACL + safe views + unknown totals + UUID dedupe + append-only + account deletion passed",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
