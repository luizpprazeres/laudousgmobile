import assert from "node:assert/strict";
import { POST } from "@/app/api/catalog/[category]/render/route";
import { renderDopplerRenalWeb } from "../renderer/categories/dopplerRenalWeb";

const TOKEN = "token-de-teste-com-tamanho-suficiente-1234";
process.env.CATALOG_SERVICE_TOKEN = TOKEN;

const kidney = (length: number) => ({
  medidas_cm: [length, 4.8, 5.1],
  espessura_parenquima_cm: 1.6,
  dimensao: "normal",
  diferenciacao: "preservada",
  situacao_baixa: false,
  rotacao: false,
  drc: false,
  alteracao_difusa: null,
  hidronefrose: "ausente",
  achados: [],
});

const side = (which: "right" | "left", psv: number, length: number) => ({
  assessment: "normal",
  limitation: null,
  kidney: kidney(length),
  artery: {
    psv_cms: [{ segment: "ostial_or_proximal", value: psv }],
    // RAR é exibida, mas não participa do diagnóstico.
    documented_rar: which === "right" ? 4.2 : 1.4,
  },
  intrarenal: {
    ri: [{ territory: "summary_unspecified", value: 0.63 }],
    spectral_pattern: "normal",
    acceleration_time_ms: [{ territory: "unspecified", value: 55 }],
    acceleration_index_cms2: [{ territory: "unspecified", value: 410 }],
  },
});

const input = (rightPsv = 110, rightLength = 10.2, leftLength = 9.8) => ({
  contract_version: "doppler-renal/web-v1",
  category_code: "DOPPLER_RENAL",
  laterality: "bilateral",
  aorta: { assessment: "normal", limitation: null, psv_cms: 80 },
  sides: {
    right: { ...side("right", rightPsv, rightLength), assessment: rightPsv > 250 ? "abnormal" : "normal" },
    left: side("left", 105, leftLength),
  },
  // Deliberadamente falso: o servidor precisa recalcular, nunca confiar nisso.
  derived: {
    maximum_renal_measurement_difference_cm: 99,
    right_maximum_measurement_cm: 99,
    left_maximum_measurement_cm: 0.1,
    conclusion_candidate_strict_gt_1_8_cm: true,
  },
});

async function main() {
const normal = renderDopplerRenalWeb(input(), "CLASSICO_COMPLETO");
assert.equal(normal.ok, true);
if (!normal.ok) throw new Error("renderer normal bloqueado");
assert.match(normal.text, /da emergência das artérias renais/);
assert.match(normal.text, /Medidas do rim direito: 10,2 x 4,8 x 5,1 cm/);
assert.match(normal.text, /Índice de aceleração.*410 cm\/s²/);
assert.match(normal.text, /RAR\) à direita de 4,2/);
assert.doesNotMatch(normal.text, /Assimetria renal/);
assert.doesNotMatch(normal.text, /direita com sinais ecográficos de estenose/);

const stenosis = renderDopplerRenalWeb(input(251), "CLASSICO_COMPLETO");
assert.equal(stenosis.ok, true);
if (!stenosis.ok) throw new Error("renderer de estenose bloqueado");
assert.match(stenosis.text, /direita com sinais ecográficos de estenose hemodinamicamente significativa \(VPS de 251 cm\/s\)/);

const boundary = renderDopplerRenalWeb(input(110, 11.6, 9.8), "CLASSICO_COMPLETO");
assert.equal(boundary.ok, true);
if (!boundary.ok) throw new Error("renderer de limite bloqueado");
assert.doesNotMatch(boundary.text, /Assimetria renal/);
const asymmetric = renderDopplerRenalWeb(input(110, 11.61, 9.8), "CLASSICO_COMPLETO");
assert.equal(asymmetric.ok, true);
if (!asymmetric.ok) throw new Error("renderer de assimetria bloqueado");
assert.match(asymmetric.text, /Assimetria renal/);

const invalid = structuredClone(input());
invalid.sides.left.assessment = "not_assessed";
const blocked = renderDopplerRenalWeb(invalid, "CLASSICO_COMPLETO");
assert.equal(blocked.ok, false);

const aortaWithoutEvidence = structuredClone(input());
assert.equal(renderDopplerRenalWeb({
  ...aortaWithoutEvidence,
  aorta: { ...aortaWithoutEvidence.aorta, assessment: "abnormal", psv_cms: null },
}, "CLASSICO_COMPLETO").ok, false);

const contradictoryPattern = structuredClone(input());
contradictoryPattern.sides.right.intrarenal.spectral_pattern = "tardus_parvus";
assert.equal(renderDopplerRenalWeb(contradictoryPattern, "CLASSICO_COMPLETO").ok, false);

const response = await POST(new Request("https://x/api/catalog/DOPPLER_RENAL/render", {
  method: "POST",
  headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
  body: JSON.stringify({ estilo: "CLASSICO_COMPLETO", alteracoes: [], dados: input() }),
}), { params: Promise.resolve({ category: "DOPPLER_RENAL" }) });
assert.equal(response.status, 200);
const json = await response.json() as { laudo?: string };
assert.match(json.laudo ?? "", /ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS/);

console.log("✓ Doppler renal estruturado: renderer canônico e endpoint fail-closed aprovados");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
