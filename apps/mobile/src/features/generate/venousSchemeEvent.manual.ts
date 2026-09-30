import assert from "node:assert/strict";
import { test } from "node:test";
import { generateReducer, initialGenerateState } from "./state";
import { venousSchemeFromEvent } from "./venousSchemeEvent";
import type { GenerateSSEEvent } from "@/shared";

const reportId = "11111111-1111-4111-8111-111111111111";
const map = {
  lados: {
    direito: { avaliado: true, segmentos: {} },
    esquerdo: { avaliado: false, segmentos: {} },
  },
  lesoes: [], perfurantes: [], tvp_presente: false,
};
const event = (overrides: Record<string, unknown> = {}) => ({
  type: "scheme", ts: "2026-09-30T12:00:00.000Z", exam_type: "VENOSO_MMII",
  asset_version: "venous-4view-1", map, ...overrides,
}) as Extract<GenerateSSEEvent, { type: "scheme" }>;

test("esquema venoso aceito somente com tipo, versao e mapa validos", () => {
  assert.deepEqual(venousSchemeFromEvent(event()), { map, assetVersion: "venous-4view-1" });
  assert.equal(venousSchemeFromEvent(event({ exam_type: "TIREOIDE" })), null);
  assert.equal(venousSchemeFromEvent(event({ asset_version: "thyroid-1" })), null);
  assert.equal(venousSchemeFromEvent(event({ map: { ...map, lesoes: [null] } })), null);
  assert.equal(venousSchemeFromEvent(event({ map: { ...map, lados: {} } })), null);
});

test("evento de outro esquema nao contamina laudo pronto", () => {
  const ready = generateReducer(initialGenerateState, { type: "EDIT_TEXT", text: "Achados" });
  const generating = generateReducer(ready, { type: "GENERATE" });
  const done = generateReducer(generating, {
    type: "SSE_EVENT", event: { type: "done", ts: "2026-09-30T12:00:00.000Z", report_id: reportId, final_text: "Laudo" },
  });
  assert.equal(done.kind, "done");
  assert.strictEqual(generateReducer(done, { type: "SSE_EVENT", event: event({ exam_type: "TIREOIDE" }) }), done);
  const withMap = generateReducer(done, { type: "SSE_EVENT", event: event() });
  assert.equal(withMap.kind === "done" && withMap.venousAssetVersion, "venous-4view-1");
});
