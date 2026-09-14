/** T44: uma casa decimal em cm; preservar mL, mm e campos sem medida. */
import assert from "node:assert/strict";
import {
  ABDOMEN_ORGAN_KEYS,
  AbdomenTotalFindingsSchema,
  type AbdomenFinding,
} from "../findingsSchemas/ABDOMEN_TOTAL";
import {
  formatMedidasCm,
  formatNumberPtBr,
  renderAbdomenTotalClassico,
  renderAbdomenTotalObjetivo,
  renderOrgan,
} from "../phrases/ABDOMEN_TOTAL";

let passed = 0;
let failed = 0;
function check(name: string, run: () => void) {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${String(error)}`); }
}

check("inteiro em cm", () => assert.equal(formatMedidasCm([4]), "4,0 cm"));
check("eixos mistos em cm", () => assert.equal(formatMedidasCm([4, 1.4, 2]), "4,0 x 1,4 x 2,0 cm"));
check("decimal mantém arredondamento anterior", () => assert.equal(formatMedidasCm([1.24]), "1,2 cm"));
check("medida nula", () => assert.equal(formatMedidasCm(null), "____"));
check("medida vazia", () => assert.equal(formatMedidasCm([]), "____"));
check("formatador geral preserva inteiro", () => assert.equal(formatNumberPtBr(12), "12"));
check("formatador geral preserva decimal", () => assert.equal(formatNumberPtBr(1.2), "1,2"));

const finding = (patch: Partial<AbdomenFinding>): AbdomenFinding => ({
  tipo: "outro", grau: null, quantidade: null, lateralidade: null,
  mobilidade: null, localizacao: null, medidas_cm: null, valor_ml: null,
  termo_do_medico: null, descricao_livre: null, ...patch,
});
check("lobos hepáticos numéricos em cm", () => {
  const report = renderOrgan("figado", { status: "alterado", achados: [
    finding({ descricao_livre: "hepatomegalia", medidas_cm: [15, 10] }),
  ] });
  assert.ok(report.body?.includes("lobo direito com diâmetro longitudinal de 15,0 cm e lobo esquerdo com diâmetro longitudinal de 10,0 cm"));
});
check("eixos esplênicos numéricos em cm", () => {
  const report = renderOrgan("baco", { status: "alterado", achados: [
    finding({ descricao_livre: "esplenomegalia", medidas_cm: [13, 6] }),
  ] });
  assert.ok(report.body?.includes("maior eixo medindo 13,0 cm e menor eixo medindo 6,0 cm"));
});
check("descrição pronta preservada sem reformatar texto", () => {
  const description = "lobo esquerdo com diâmetro longitudinal de 10 cm";
  const report = renderOrgan("figado", { status: "alterado", achados: [
    finding({ descricao_livre: "hepatomegalia", medidas_cm: [10], localizacao: description }),
  ] });
  assert.ok(report.body?.includes(description));
  assert.ok(!report.body?.includes("lobo direito com"));
});
const findings = AbdomenTotalFindingsSchema.parse({
  orgaos: {
    ...Object.fromEntries(ABDOMEN_ORGAN_KEYS.map(key => [key, { status: "normal", achados: [] }])),
    figado: { status: "alterado", achados: [finding({ tipo: "cisto_simples", medidas_cm: [4, 1.4], localizacao: "segmento VII" })] },
    vesicula: { status: "alterado", achados: [finding({ tipo: "litiase", quantidade: "unica", medidas_cm: [1.4, 4] })] },
    bexiga: { status: "alterado", achados: [
      finding({ tipo: "volume_pre_miccional", valor_ml: 12 }),
      finding({ descricao_livre: "parede vesical espessada", medidas_cm: [0.4] }),
      finding({ descricao_livre: "resíduo pós-miccional", valor_ml: 12 }),
    ] },
  },
  achados_extra_abdominais: [], observacoes_do_medico: null,
});
const template = ABDOMEN_ORGAN_KEYS.map(key => `{{orgao:${key}|Normal.}}`).join("\n");
for (const [style, report] of [
  ["Clássico", renderAbdomenTotalClassico(findings, template)],
  ["Objetivo", renderAbdomenTotalObjetivo(findings)],
] as const) {
  check(`${style}: eixos em cm`, () => assert.ok(report.includes("medindo 4,0 x 1,4 cm")));
  check(`${style}: maior eixo em centímetros`, () => assert.ok(report.includes("4,0 centímetros no maior eixo")));
  check(`${style}: volume inteiro em mL`, () => assert.ok(report.includes("Volume pré-miccional de 12 mL.")));
  check(`${style}: resíduo inteiro em mL`, () => assert.ok(report.includes("Resíduo pós-miccional de 12 mL.")));
  check(`${style}: espessura inteira em mm`, () => assert.ok(report.includes("paredes espessadas, medindo 4 mm.")));
}
console.log(`T44: ${passed} passaram; ${failed} falharam.`);
if (failed) process.exitCode = 1;
