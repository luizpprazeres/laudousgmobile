import assert from "node:assert/strict";
import {
  SALA_INTEGRATION_GRANT_TTL_MS,
  bearerGrant,
  consumeIntegrationRateLimit,
  grantExpiryMs,
  integrationGrantExpiry,
  issueOpaqueGrant,
  normalizePairingCode,
  reportBelongsToRoomDay,
  roomExpiryMs,
  serializeIntegrationReport,
  sha256,
  validReportId,
  type IntegrationGrant,
  type IntegrationRoom,
} from "../integration";
import { serializeSalaReport } from "../reportContract";

async function main() {
const NOW = Date.parse("2026-10-08T15:00:00.000Z");
const room = (overrides: Partial<IntegrationRoom> = {}): IntegrationRoom => ({
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  active: true,
  revoked_at: null,
  pairing_code_expires_at: "2026-10-09T15:00:00.000Z",
  expires_at: "2026-10-10T15:00:00.000Z",
  ...overrides,
});
const grant = (overrides: Partial<IntegrationGrant> = {}): IntegrationGrant => ({
  id: "33333333-3333-4333-8333-333333333333",
  room_token_id: room().id,
  expires_at: "2026-10-08T20:00:00.000Z",
  revoked_at: null,
  ...overrides,
});

assert.equal(normalizePairingCode(" ab-c_234 "), "ABC234");
assert.equal(normalizePairingCode("ABC234"), "ABC234");
assert.equal(normalizePairingCode("ABC230"), null);
assert.equal(normalizePairingCode(null), null);

assert.equal(roomExpiryMs(room(), NOW), Date.parse("2026-10-09T15:00:00.000Z"));
assert.equal(roomExpiryMs(room({ active: false }), NOW), null);
assert.equal(roomExpiryMs(room({ revoked_at: "2026-10-08T14:00:00.000Z" }), NOW), null);
assert.equal(roomExpiryMs(room({ pairing_code_expires_at: "2026-10-08T14:59:59.000Z" }), NOW), null);
assert.equal(roomExpiryMs(room({ expires_at: "2026-10-08T14:59:59.000Z" }), NOW), null);
assert.equal(integrationGrantExpiry(room(), NOW), NOW + SALA_INTEGRATION_GRANT_TTL_MS);
assert.equal(
  integrationGrantExpiry(room({ expires_at: "2026-10-08T16:00:00.000Z" }), NOW),
  Date.parse("2026-10-08T16:00:00.000Z"),
);

assert.equal(grantExpiryMs(grant(), NOW), Date.parse("2026-10-08T20:00:00.000Z"));
assert.equal(grantExpiryMs(grant({ revoked_at: "2026-10-08T15:01:00.000Z" }), NOW), null);
assert.equal(grantExpiryMs(grant({ expires_at: "2026-10-08T14:59:59.000Z" }), NOW), null);

const issued = issueOpaqueGrant();
const second = issueOpaqueGrant();
assert.match(issued.value, /^[A-Za-z0-9_-]{43}$/);
assert.match(issued.hash, /^[0-9a-f]{64}$/);
assert.equal(issued.hash, sha256(issued.value));
assert.notEqual(issued.value, second.value);
assert.notEqual(issued.hash, second.hash);
assert.notEqual(issued.hash, issued.value);
assert.notEqual(sha256(`${issued.value.slice(0, -1)}A`), issued.hash);
assert.equal(
  bearerGrant(new Request("https://example.test", { headers: { authorization: `Bearer ${issued.value}` } })),
  issued.value,
);
assert.equal(
  bearerGrant(new Request("https://example.test", { headers: { authorization: `Basic ${issued.value}` } })),
  null,
);

const rateCalls: Array<Record<string, unknown>> = [];
process.env.SALA_INTEGRATION_RATE_LIMIT_SECRET = "synthetic-test-secret";
const allowedRateService = {
  rpc: async (_name: string, params: Record<string, unknown>) => {
    rateCalls.push(params);
    return { data: [{ allowed: true, retry_after_seconds: 0 }], error: null };
  },
};
assert.deepEqual(
  await consumeIntegrationRateLimit(
    allowedRateService as never,
    new Request("https://example.test", { headers: { "x-vercel-forwarded-for": "203.0.113.5" } }),
    "ABC234",
  ),
  { allowed: true, retryAfter: 0 },
);
assert.equal(rateCalls.length, 2);
for (const call of rateCalls) {
  assert.match(String(call.p_key_hash), /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(call).includes("ABC234"), false);
  assert.equal(JSON.stringify(call).includes("203.0.113.5"), false);
}
const blockedRateService = {
  rpc: async () => ({ data: [{ allowed: false, retry_after_seconds: 37 }], error: null }),
};
assert.deepEqual(
  await consumeIntegrationRateLimit(
    blockedRateService as never,
    new Request("https://example.test"),
    null,
  ),
  { allowed: false, retryAfter: 37 },
);
let blockedOriginCalls = 0;
const blockedOriginService = {
  rpc: async () => {
    blockedOriginCalls += 1;
    return { data: [{ allowed: false, retry_after_seconds: 51 }], error: null };
  },
};
assert.deepEqual(
  await consumeIntegrationRateLimit(
    blockedOriginService as never,
    new Request("https://example.test", { headers: { "x-vercel-forwarded-for": "203.0.113.8" } }),
    "ABC234",
  ),
  { allowed: false, retryAfter: 51 },
);
assert.equal(blockedOriginCalls, 1, "blocked origin must not consume the code bucket");

const boundId = "44444444-4444-4444-8444-444444444444";
assert.equal(validReportId(boundId), true);
assert.equal(validReportId("../foreign"), false);
const start = new Date("2026-10-08T03:00:00.000Z");
assert.equal(
  reportBelongsToRoomDay(
    { user_id: room().user_id, created_at: "2026-10-08T03:00:00.000Z" },
    room().user_id,
    start,
  ),
  true,
);
assert.equal(
  reportBelongsToRoomDay(
    { user_id: "55555555-5555-4555-8555-555555555555", created_at: "2026-10-08T12:00:00.000Z" },
    room().user_id,
    start,
  ),
  false,
);
assert.equal(
  reportBelongsToRoomDay(
    { user_id: room().user_id, created_at: "2026-10-08T02:59:59.999Z" },
    room().user_id,
    start,
  ),
  false,
);

const report = {
  id: boundId,
  final_output: "Laudo revisado",
  generated_output: null,
  category_code: "PELVICA",
  created_at: "2026-10-08T12:00:00.000Z",
  content_revision: 3,
  sanity_result: null,
};
assert.equal(
  serializeSalaReport(report, {
    report_id: boundId,
    reviewed_revision: 3,
    reviewed_at: "2026-10-08T12:01:00.000Z",
  }).reviewStatus,
  "reviewed",
);
assert.equal(
  serializeSalaReport(report, {
    report_id: boundId,
    reviewed_revision: 2,
    reviewed_at: "2026-10-08T12:01:00.000Z",
  }).reviewStatus,
  "pending",
);
assert.equal(
  serializeIntegrationReport(report, {
    report_id: boundId,
    reviewed_revision: 3,
    reviewed_at: "invalid-date",
  }).reviewStatus,
  "pending",
);
assert.equal(
  serializeIntegrationReport({ ...report, content_revision: 0 }, {
    report_id: boundId,
    reviewed_revision: 0,
    reviewed_at: "2026-10-08T12:01:00.000Z",
  }).reviewStatus,
  "pending",
);
const reviewedWithSignals = serializeIntegrationReport({
  ...report,
  final_output: "Lesão medindo 123 cm.",
  sanity_result: {
    verdict: "critical",
    issues: [{
      severity: "critical",
      detail: "Magnitude improvável.",
      trecho_laudo: "123 cm",
    }],
  },
}, {
    report_id: boundId,
    reviewed_revision: 3,
    reviewed_at: "2026-10-08T12:01:00.000Z",
});
assert.equal(reviewedWithSignals.reviewStatus, "reviewed");
assert.deepEqual(
  reviewedWithSignals.reviewSignals.highlights.map((item) => [item.kind, item.anchor]),
  [["warning", "123 cm"]],
);
assert.equal(
  reviewedWithSignals.reviewSignals.highlights[0]?.message,
  "Magnitude improvável.",
);

console.log("PASS sala integration grant, expiry, ownership and exact review contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
