import assert from "node:assert/strict";
import { EXTRACTORS } from "../extraction";
import {
  AbdomenSuperiorFindingsSchema,
  normalizeAbdomenSuperior,
  renderAbdomenSuperior,
  type AbdomenSuperiorFindings,
} from "../categories/ABDOMEN_SUPERIOR";
import { renderOrgan } from "../phrases/ABDOMEN_TOTAL";
import type { AbdomenTotalFindings } from "../findingsSchemas/ABDOMEN_TOTAL";

// Offline: real registered parsers, synthetic findings, no LLM or database.
type Finding = AbdomenSuperiorFindings["orgaos"]["figado"]["achados"][number];
const finding = (over: Partial<Finding> = {}): Finding => ({
  tipo: "esteatose", grau: "leve", quantidade: null, lateralidade: null,
  mobilidade: null, localizacao: null, medidas_cm: null, valor_ml: null,
  termo_do_medico: null, descricao_livre: null, ...over,
});
const normal = () => ({ status: "normal" as const, achados: [] });
function fixture(): AbdomenSuperiorFindings {
  return {
    orgaos: {
      figado: normal(), veia_porta: normal(), vesicula: normal(), vias_biliares: normal(),
      baco: normal(), pancreas: normal(), aorta: normal(), veia_cava: normal(),
    },
    observacoes_do_medico: null,
  };
}
function parse(raw: unknown): AbdomenSuperiorFindings {
  return EXTRACTORS.ABDOMEN_SUPERIOR!.parse(raw) as AbdomenSuperiorFindings;
}

let passed = 0;
let failed = 0;
function test(name: string, run: () => void) {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${(error as Error).message}`); }
}

for (const status of ["normal", "nao_avaliado_gases", "alterado"] as const) {
  for (const grau of ["leve", "moderado", "acentuado"] as const) {
    test(`registered parser: ${status}, ${grau}, both styles, total parity`, () => {
      const raw = fixture();
      raw.orgaos.figado = { status, achados: [finding({ grau })] };
      const before = structuredClone(raw);
      const total = EXTRACTORS.ABDOMEN_TOTAL!.parse({
        ...raw,
        orgaos: { ...raw.orgaos, rim_direito: normal(), rim_esquerdo: normal(), bexiga: normal() },
        achados_extra_abdominais: [],
      }) as AbdomenTotalFindings;
      const expected = renderOrgan("figado", total.orgaos.figado);
      assert.ok(expected.conclusao.includes(`Esteatose hepática, grau ${grau}.`));
      const parsed = parse(raw);
      for (const objetivo of [false, true]) {
        const text = renderAbdomenSuperior(parsed, { objetivo });
        assert.ok(text.includes(`Esteatose hepática, grau ${grau}.`), "esteatose missing from report");
        assert.ok(text.includes(expected.body!), "body differs from ABDOMEN_TOTAL");
        assert.doesNotMatch(text, /Fígado de dimensões normais, contornos regulares e ecotextura homogênea|Parênquima hepático com ecotextura homogênea|superior sem alterações significativas|\nÓrgãos e estruturas abdominais estudadas sem evidência de alterações/);
        assert.doesNotMatch(text, /\brins\b|\bbexiga\b/i);
      }
      assert.equal(parsed.orgaos.figado.status, "alterado");
      assert.deepEqual(parsed, AbdomenSuperiorFindingsSchema.parse(raw));
      assert.deepEqual(parsed, normalizeAbdomenSuperior(raw));
      assert.deepEqual(parse(parsed), parsed);
      assert.deepEqual(raw, before);
    });
  }
}

test("normal and coherent findings remain byte-identical", () => {
  for (const altered of [false, true]) {
    const raw = fixture();
    if (altered) raw.orgaos.figado = { status: "alterado", achados: [finding()] };
    assert.deepEqual(parse(raw), raw);
    for (const objetivo of [false, true]) {
      assert.equal(renderAbdomenSuperior(parse(raw), { objetivo }), renderAbdomenSuperior(raw, { objetivo }));
    }
  }
});

test("empty gas limitation and surgical absence preserved", () => {
  const raw = fixture();
  raw.orgaos.pancreas = { status: "nao_avaliado_gases", achados: [] };
  raw.orgaos.vesicula = { status: "ausente_cirurgico", achados: [finding({ tipo: "litiase", grau: null })] };
  assert.deepEqual(parse(raw), raw);
});

test("existing free finding fallback and doctor observations preserved", () => {
  const raw = fixture();
  raw.orgaos.figado.achados = [finding({ tipo: "outro", grau: null, termo_do_medico: "achado focal sintetico" })];
  raw.observacoes_do_medico = "observacao sintetica";
  const parsed = parse(raw);
  assert.equal(parsed.orgaos.figado.achados[0]!.descricao_livre, "achado focal sintetico");
  assert.equal(parsed.observacoes_do_medico, raw.observacoes_do_medico);
});

test("invalid grade is rejected; null measures stay null", () => {
  const raw = fixture();
  raw.orgaos.figado.achados = [finding()];
  assert.equal(parse(raw).orgaos.figado.achados[0]!.medidas_cm, null);
  assert.throws(() => parse({ ...raw, orgaos: { ...raw.orgaos, figado: { status: "normal", achados: [finding({ grau: "invalid" as Finding["grau"] })] } } }));
});

console.log(`${passed} passed; ${failed} failed (offline synthetic regression)`);
if (failed) process.exitCode = 1;
