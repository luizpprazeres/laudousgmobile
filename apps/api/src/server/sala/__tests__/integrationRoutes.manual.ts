import assert from "node:assert/strict";
import { GET as listReports } from "../../../app/api/sala/integration/reports/route";
import { GET as readReport } from "../../../app/api/sala/integration/report/route";
import { GET as snapshot } from "../../../app/api/sala/integration/snapshot/route";
import { POST as connect } from "../../../app/api/sala/integration/connect/route";
import { sha256, type IntegrationGrant, type IntegrationRoom } from "../integration";
import { salaDayStart, type ReviewRow } from "../reportContract";
import type { IntegrationReportRow } from "../integrationAccess";

async function main() {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const originalEnv = { ...process.env };
  const now = Date.parse("2026-10-11T15:00:00Z");
  const owner = "22222222-2222-4222-8222-222222222222";
  const roomId = "11111111-1111-4111-8111-111111111111";
  const grantValue = "A".repeat(43);
  const id = (n: number) => `44444444-4444-4444-8444-${String(n).padStart(12, "0")}`;
  const room: IntegrationRoom = {
    id: roomId, user_id: owner, active: true, revoked_at: null,
    expires_at: "2027-10-11T15:00:00.000Z", pairing_code_expires_at: "2027-10-10T15:00:00.000Z",
  };
  const grant: IntegrationGrant = {
    id: "33333333-3333-4333-8333-333333333333", room_token_id: roomId,
    expires_at: room.pairing_code_expires_at!, revoked_at: null,
  };
  const row = (n: number, overrides: Partial<IntegrationReportRow> = {}): IntegrationReportRow => ({
    id: id(n), user_id: owner, created_at: `2026-10-11T${String(8 + n).padStart(2, "0")}:00:00.000Z`,
    final_output: `Laudo ${n}`, generated_output: null, category_code: "ABDOME_TOTAL",
    content_revision: 2, sanity_result: null, ...overrides,
  });
  let currentRoom: IntegrationRoom | null;
  let currentGrant: IntegrationGrant | null;
  let rows: IntegrationReportRow[];
  let reviews: ReviewRow[];
  let failedTable: string | null;
  let bypassReportFilters: boolean;
  const calls: URL[] = [];
  function reset() {
    currentRoom = { ...room }; currentGrant = { ...grant };
    rows = [row(2), row(1)]; reviews = []; failedTable = null; bypassReportFilters = false; calls.length = 0;
  }
  const request = (path: string, token: string | null = grantValue) => new Request(`https://integration.test/api/sala/integration/${path}`, {
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  });
  const handlers = [listReports, readReport, snapshot];
  const paths = ["reports", `report?id=${id(1)}`, "snapshot"];
  async function expectUnavailable(status = 401) {
    for (let i = 0; i < handlers.length; i++) {
      const response = await handlers[i]!(request(paths[i]!));
      assert.equal(response.status, status);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), { error: "integration_unavailable" });
    }
  }
  try {
    Date.now = () => now;
    Object.assign(process.env, {
      SUPABASE_URL: "https://synthetic.supabase.test", SUPABASE_ANON_KEY: "synthetic-key-".repeat(3),
      SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-".repeat(3), DATABASE_URL: "postgres://synthetic:synthetic@localhost/test",
      DEEPGRAM_API_KEY: "synthetic-deepgram-".repeat(3), OPENAI_API_KEY: "synthetic-openai-".repeat(3), SALA_INTEGRATION_RATE_LIMIT_SECRET: "synthetic-only",
    });
    globalThis.fetch = async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      assert.equal(url.hostname, "synthetic.supabase.test", "no real network in this harness");
      calls.push(url);
      const table = url.pathname.split("/").pop()!;
      if (table === failedTable) return Response.json({ message: "synthetic unavailable" }, { status: 500 });
      if (table === "consume_sala_integration_rate_limit") return Response.json([{ allowed: true }]);
      if (table === "sala_integration_grants") {
        if (init?.method === "POST") {
          const inserted = JSON.parse(String(init.body));
          assert.equal(inserted.expires_at, room.pairing_code_expires_at);
          assert.equal("grant" in inserted, false);
          return new Response(null, { status: 201 });
        }
        if (init?.method === "PATCH") return new Response(null, { status: 204 });
        return Response.json(currentGrant && url.searchParams.get("grant_hash") === `eq.${sha256(grantValue)}` ? [currentGrant] : []);
      }
      if (table === "room_tokens") {
        return Response.json(currentRoom && (url.searchParams.get("id") === `eq.${currentRoom.id}` || url.searchParams.get("pairing_code") === "eq.ABC234") ? [currentRoom] : []);
      }
      if (table === "report_medical_reviews") {
        const ids = url.searchParams.get("report_id") ?? "";
        return Response.json(reviews.filter((review) => ids.includes(review.report_id)));
      }
      assert.equal(table, "reports");
      let selected = [...rows];
      if (!bypassReportFilters) {
        for (const [key, value] of url.searchParams) {
          if (value.startsWith("eq.")) selected = selected.filter((entry) => String(entry[key as keyof IntegrationReportRow]) === value.slice(3));
          if (key === "created_at" && value.startsWith("gte.")) selected = selected.filter((entry) => Date.parse(entry.created_at) >= Date.parse(value.slice(4)));
        }
      }
      const orders = (url.searchParams.get("order") ?? "").split(",");
      selected.sort((a, b) => {
        for (const order of orders) {
          const [column, direction] = order.split(".");
          const comparison = String(a[column as keyof IntegrationReportRow] ?? "").localeCompare(String(b[column as keyof IntegrationReportRow] ?? ""));
          if (comparison) return direction === "desc" ? -comparison : comparison;
        }
        return 0;
      });
      return Response.json(selected.slice(0, Number(url.searchParams.get("limit") ?? 1000)));
    };
    reset();
    for (let i = 0; i < handlers.length; i++) {
      for (const token of [null, "invalid", "B".repeat(43)]) {
        const response = await handlers[i]!(request(paths[i]!, token));
        assert.equal(response.status, 401);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(await response.json(), { error: "integration_unavailable" });
      }
    }
    currentGrant = null; await expectUnavailable();
    reset(); currentGrant!.expires_at = new Date(now).toISOString(); await expectUnavailable();
    reset(); currentGrant!.revoked_at = new Date(now).toISOString(); await expectUnavailable();
    reset(); currentRoom!.revoked_at = new Date(now).toISOString(); await expectUnavailable();
    reset(); currentRoom!.active = false; await expectUnavailable();
    reset(); currentRoom!.expires_at = new Date(now).toISOString(); await expectUnavailable();
    reset(); currentRoom!.pairing_code_expires_at = new Date(now).toISOString(); await expectUnavailable();
    reset(); currentRoom = null; await expectUnavailable();
    reset(); currentGrant!.room_token_id = id(99); await expectUnavailable();
    for (const table of ["sala_integration_grants", "room_tokens", "reports"]) {
      reset(); failedTable = table; await expectUnavailable(503);
    }

    reset();
    rows = [row(2), row(1, {
      final_output: `Início [REVISAR medida] ____ ${"x".repeat(220)}`,
      sanity_result: { issues: [{ detail: "Confira a técnica", severity: "warning" }] },
    }), row(3, { user_id: id(99) }), row(4, { created_at: "2026-10-11T02:59:59.999Z" })];
    reviews = [
      { report_id: id(1), reviewed_revision: 2, reviewed_at: "2026-10-11T10:00:00.000Z" },
      { report_id: id(2), reviewed_revision: 1, reviewed_at: "2026-10-11T10:00:00.000Z" },
    ];
    const listResponse = await listReports(request("reports"));
    assert.equal(listResponse.status, 200);
    assert.equal(listResponse.headers.get("cache-control"), "no-store");
    const list = await listResponse.json();
    assert.equal(list.expiresAt, room.pairing_code_expires_at);
    assert.deepEqual(list.reports.map((entry: { id: string }) => entry.id), [id(1), id(2)]);
    assert.equal(list.reports[0].preview, `Início ____ ${"x".repeat(220)}`.slice(0, 160));
    assert.equal(list.reports[0].preview.length, 160);
    assert.equal(list.reports[0].reviewSignalsCount, 2);
    assert.equal(list.reports[0].reviewStatus, "reviewed");
    assert.equal(list.reports[1].reviewStatus, "pending");
    assert.equal(list.reports[1].reviewedAt, null);
    assert.deepEqual(Object.keys(list.reports[0]).sort(), ["id", "createdAt", "category", "contentRevision", "reviewStatus", "reviewedAt", "preview", "reviewSignalsCount"].sort());
    const query = calls.find((url) => url.pathname.endsWith("/reports"))!;
    assert.equal(query.searchParams.get("order"), "created_at.asc,id.asc");
    assert.equal(query.searchParams.get("limit"), "200");
    assert.equal(query.searchParams.get("user_id"), `eq.${owner}`);
    assert.equal(query.searchParams.get("created_at"), `gte.${salaDayStart(new Date(now)).toISOString()}`);

    const fullResponse = await readReport(request(`report?id=${id(1)}`));
    assert.equal(fullResponse.status, 200);
    assert.equal(fullResponse.headers.get("cache-control"), "no-store");
    const full = await fullResponse.json();
    assert.equal(full.outputText.length > 160, true);
    assert.equal(full.outputText.includes("[REVISAR"), false);
    assert.equal(full.reviewStatus, "reviewed");
    assert.equal(full.reviewSignals.highlights.length + full.reviewSignals.notices.length, 2);
    assert.equal((await (await readReport(request(`report?id=${id(2)}`))).json()).reviewStatus, "pending");
    for (const forbidden of [id(3), id(4), id(99), "../invalid", ""]) {
      const response = await readReport(request(`report?id=${forbidden}`));
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { error: "integration_unavailable" });
    }
    // Outra sala com outro proprietário não pode ler os laudos do dono original.
    currentRoom!.user_id = id(90);
    assert.deepEqual((await (await listReports(request("reports"))).json()).reports, []);
    assert.equal((await readReport(request(`report?id=${id(1)}`))).status, 401);
    // Não há room_id nos laudos: salas do mesmo dono/dia compartilham o recorte legado.
    currentRoom!.user_id = owner;
    const snap = await (await snapshot(request(`snapshot?boundReportId=${id(1)}`))).json();
    assert.equal(snap.bound.id, id(1));
    assert.equal(snap.grantExpiresAt, room.pairing_code_expires_at);
    assert.equal(typeof snap.cursor, "string");

    // Defesa adicional: linhas devolvidas fora do filtro nunca entram nos novos endpoints.
    reset(); bypassReportFilters = true; rows = [row(1, { user_id: id(99) })];
    assert.equal((await readReport(request(`report?id=${id(1)}`))).status, 401);
    assert.deepEqual((await (await listReports(request("reports"))).json()).reports, []);
    rows = [row(1, { created_at: "invalid-date" })];
    assert.equal((await readReport(request(`report?id=${id(1)}`))).status, 401);
    rows = [row(1, { created_at: "2026-10-11T02:59:59.999Z" })];
    assert.equal((await readReport(request(`report?id=${id(1)}`))).status, 401);

    reset(); failedTable = "report_medical_reviews";
    assert.ok((await (await listReports(request("reports"))).json()).reports.every((entry: { reviewStatus: string; reviewedAt: null }) => entry.reviewStatus === "pending" && entry.reviewedAt === null));
    assert.equal((await (await readReport(request(`report?id=${id(1)}`))).json()).reviewStatus, "pending");
    reset(); reviews = [{ report_id: id(1), reviewed_revision: 2, reviewed_at: "invalid-date" }];
    assert.equal((await (await readReport(request(`report?id=${id(1)}`))).json()).reviewStatus, "pending");

    reset(); rows = Array.from({ length: 205 }, (_, index) => row(index + 1, { created_at: new Date(now + index * 1000).toISOString() })).reverse();
    const limited = await (await listReports(request("reports"))).json();
    assert.equal(limited.reports.length, 200);
    assert.equal(limited.reports[0].id, id(1));
    assert.equal(limited.reports[199].id, id(200));
    reset(); rows = [];
    assert.deepEqual((await (await listReports(request("reports"))).json()).reports, []);
    const connection = await connect(new Request("https://integration.test/api/sala/integration/connect", {
      method: "POST", body: JSON.stringify({ code: "ABC234" }),
    }));
    assert.equal(connection.status, 200);
    assert.equal((await connection.json()).grantExpiresAt, room.pairing_code_expires_at);
    console.log("PASS integration routes: grants, room revalidation, isolation, order, limit, sanitized preview, exact review, fail closed and snapshot regression");
  } finally {
    globalThis.fetch = originalFetch; Date.now = originalNow;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
