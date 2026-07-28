import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildSystemMessage } from "../buildSystemMessage";
import { OBSTETRICA_CONTRACT, PLACENTA_BLOCK } from "../contracts/OBSTETRICA";
import { hasPlacentaMention } from "../../pipeline/writer";

const sha256 = (text: string): string =>
  createHash("sha256").update(text).digest("hex");

// Bloco RAG mínimo p/ espelhar prod (DOPPLER_OBSTETRICO não tem contract no
// registry — recebe o modelo via RAG; sem isso buildSystemMessage retornaria o
// DEFAULT cedo, antes da injeção condicional).
const RAG_MODELO = [
  {
    id: "m1",
    kind: "modelo" as const,
    title: "Modelo",
    content: "ULTRASSONOGRAFIA OBSTÉTRICA\n\nOS SEGUINTES ASPECTOS...",
    priority: 100,
  },
];

function build(
  categoryCode: "OBSTETRICA" | "DOPPLER_OBSTETRICO",
  hasPlacenta?: boolean,
): string {
  return buildSystemMessage({
    categoryCode,
    categoryLabel: "Obstétrica",
    writingStyleCode: "CLASSICO_COMPLETO",
    ragBlocks: RAG_MODELO,
    hasPlacenta,
  });
}

// 1. Controle: OBSTETRICA sem gatilho == build sem hasPlacenta (byte-idêntico).
const obControl = build("OBSTETRICA");
const obNormal = build("OBSTETRICA", false);
assert.equal(obNormal, obControl, "obstetrica normal divergiu do controle");
assert.ok(
  !obNormal.includes(PLACENTA_BLOCK),
  "controle não pode conter PLACENTA_BLOCK",
);

// 2. Com gatilho: injeta o bloco exatamente 1x.
const obPlacenta = build("OBSTETRICA", true);
assert.equal(
  obPlacenta.split(PLACENTA_BLOCK).length - 1,
  1,
  "PLACENTA_BLOCK deve aparecer exatamente 1x quando disparado",
);

// 3. DOPPLER_OBSTETRICO idem.
const dopControl = build("DOPPLER_OBSTETRICO");
const dopPlacenta = build("DOPPLER_OBSTETRICO", true);
assert.ok(!dopControl.includes(PLACENTA_BLOCK));
assert.equal(dopPlacenta.split(PLACENTA_BLOCK).length - 1, 1);

// 4. O bloco NÃO está embutido no contrato base (opt-in puro).
assert.ok(
  !OBSTETRICA_CONTRACT.includes(PLACENTA_BLOCK),
  "PLACENTA_BLOCK não pode estar no contrato base (always-on)",
);

// 5. Regex de gatilho: dispara em variações reais, não em ruído.
for (const yes of [
  "placenta anterior grau II",
  "Placenta de inserção posterior",
  "aspecto placentário heterogêneo",
  "as placentas gemelares",
]) {
  assert.ok(hasPlacentaMention(yes), `deveria disparar: "${yes}"`);
}
for (const no of [
  "feto único em apresentação cefálica",
  "líquido amniótico normal",
  "biometria compatível com a idade gestacional",
]) {
  assert.ok(!hasPlacentaMention(no), `NÃO deveria disparar: "${no}"`);
}

console.log("placenta condicional: 12/12 PASS", {
  controlSha256: sha256(obControl),
  normalSha256: sha256(obNormal),
  withPlacentaSha256: sha256(obPlacenta),
});
