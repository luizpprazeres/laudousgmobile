/** Run from repo root: pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/api/src/server/renderer/__tests__/morfologico-lateralidade.manual.ts
 * Synthetic fixtures only; no network, database, LLM or file writes.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  MORFOLOGICO_EXTRACTION_PROMPT,
  MORFOLOGICO_JSON_SCHEMA,
  MorfologicoFindingsSchema,
  renderMorfologico,
} from "../categories/MORFOLOGICO";
import { BASE, legado, OSSOS } from "./morfologico-lateralidade-fixtures";

let pass = 0;
let fail = 0;
function test(name: string, run: () => void): void {
  try {
    run();
    pass++;
    console.log(`PASS ${name}`);
  } catch (error) {
    fail++;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// SHA-256 da saida completa — guarda de byte-identidade da lateralidade dos ossos.
//
// BASE ATUALIZADA EM 11/10/2026 (W16D): os ossos longos laterais ganharam a sigla do
// laudo do médico ("Comprimento do fêmur direito (CF) de …"). Conferido: tirando as
// siglas, a saída nova tem exatamente os hashes anteriores (2t/3t, clássico e objetivo).
//
// BASE ATUALIZADA EM 06/10/2026: sem percentil informado, o 1T não conclui
// normalidade das uterinas. Em 18/09/2026 houve a unificação da linha do peso;
// em 15/09/2026, a decisão de MODELO COMPLETO trouxe de volta as
// frases padrao de normalidade (movimentos ativos, survey anatomico, cordao de
// tres vasos, placenta com ecotextura, liquido normal, orificio interno fechado
// no 2t). O texto dos ossos nao mudou; a diferenca e so o modelo ao redor, e foi
// conferida linha a linha antes de regravar os hashes.
const LEGACY_HASHES = [
["1t", false, "59e79e9157b38affa68898f34e88b61e192c9e97d1df4bd98f71d4d83fad8b74"],
  ["1t", true, "0a157cff761b64cffedc1dde5322f91435b116dc35b509694e8efeb212ce1b27"],
  ["2t", false, "5056e64a9250d8b75b163201f64608936947ac1107b7344b3d3acd6097ca7f1a"],
  ["2t", true, "198a1fa0326e5dfec9739ba4cefbf49e07d3626e8695dc63ddd0af5a6879ab64"],
  ["3t", false, "f162919c063153d8b2aec24f8fef433d0ecdb7759a5cd7fff756454e74ff211c"],
  ["3t", true, "6dc1d3b0a0c889820a9652074c3e3de767c81124af7a79b6313f60f5de276a9a"],
] as const;
for (const [trimestre, objetivo, hash] of LEGACY_HASHES) {
  test(`${trimestre} ${objetivo ? "Objetivo" : "Classico"} legacy six bones byte-identical`, () => {
    const texto = renderMorfologico(MorfologicoFindingsSchema.parse(legado(trimestre)), null, { objetivo });
    assert.equal(createHash("sha256").update(texto).digest("hex"), hash);
  });
}

for (const [osso] of OSSOS) {
  for (const lado of ["dir", "esq"] as const) {
    const campo = `${osso}_${lado}_mm`;
    test(`Zod preserves ${campo}, accepts missing/null, rejects non-number`, () => {
      for (const value of [undefined, null, 42.3]) {
        const input = { ...BASE, ...(value === undefined ? {} : { [campo]: value }) };
        const result = MorfologicoFindingsSchema.parse(input);
        assert.equal(Reflect.get(result, campo), value);
      }
      for (const value of ["42.3", true, {}, []]) {
        assert.equal(MorfologicoFindingsSchema.safeParse({ ...BASE, [campo]: value }).success, false);
      }
    });
    test(`strict schema ${campo}: required nullable number`, () => {
      assert.deepEqual(Reflect.get(MORFOLOGICO_JSON_SCHEMA.properties, campo), { type: ["number", "null"] });
      assert.ok((MORFOLOGICO_JSON_SCHEMA.required as readonly string[]).includes(campo));
    });
    test(`extraction prompt declares ${campo}`, () => {
      assert.ok(MORFOLOGICO_EXTRACTION_PROMPT.includes(campo));
    });
  }
}

test("strict objects recursively require every property and match Zod", () => {
  function strict(schema: unknown): void {
    if (!schema || typeof schema !== "object") return;
    const node = schema as Record<string, unknown>;
    if (node.properties && typeof node.properties === "object") {
      const props = node.properties as Record<string, unknown>;
      assert.equal(node.additionalProperties, false);
      assert.deepEqual([...(node.required as string[])].sort(), Object.keys(props).sort());
      Object.values(props).forEach(strict);
    }
    if (node.items) strict(node.items);
    for (const keyword of ["anyOf", "oneOf", "allOf"]) {
      const children = node[keyword];
      if (Array.isArray(children)) children.forEach(strict);
    }
  }
  strict(MORFOLOGICO_JSON_SCHEMA);
  assert.deepEqual(Object.keys(MorfologicoFindingsSchema.shape).sort(), Object.keys(MORFOLOGICO_JSON_SCHEMA.properties).sort());
});

/** Sigla de cada osso, como no laudo do médico (W16D). */
const SIGLA: Record<string, string> = { femur: "CF", tibia: "T", fibula: "F", umero: "U", radio: "R", ulna: "U" };

const scenarios = [
  { name: "asymmetric", generic: null, dir: 42.3, esq: 40.1, right: "42,3", left: "40,1" },
  { name: "specific beats generic", generic: 49.9, dir: 42.3, esq: 40.1, right: "42,3", left: "40,1" },
  { name: "right only", generic: null, dir: 42.3, esq: null, right: "42,3", left: "____" },
  { name: "left only", generic: null, dir: null, esq: 40.1, right: "____", left: "40,1" },
  { name: "right and generic cannot fill left", generic: 49.9, dir: 42.3, esq: undefined, right: "42,3", left: "____" },
  { name: "left and generic cannot fill right", generic: 49.9, dir: undefined, esq: 40.1, right: "____", left: "40,1" },
  { name: "generic with null sides", generic: 39.5, dir: null, esq: null, right: "39,5", left: "39,5" },
  { name: "generic with omitted sides", generic: 39.5, dir: undefined, esq: undefined, right: "39,5", left: "39,5" },
  { name: "all absent", generic: null, dir: undefined, esq: undefined, right: "____", left: "____" },
];

for (const trimestre of ["2t", "3t"] as const) {
  for (const objetivo of [false, true]) {
    const name = `${trimestre} ${objetivo ? "Objetivo" : "Classico"}`;
    const sep = objetivo ? ": " : " de ";
    for (const [osso, label, rightLabel, leftLabel] of OSSOS) {
      for (const scenario of scenarios) {
        test(`${name} ${osso} ${scenario.name}`, () => {
          const input = {
            ...legado(trimestre), [`${osso}_mm`]: scenario.generic,
            ...(scenario.dir === undefined ? {} : { [`${osso}_dir_mm`]: scenario.dir }),
            ...(scenario.esq === undefined ? {} : { [`${osso}_esq_mm`]: scenario.esq }),
          };
          const before = JSON.stringify(input);
          const parsed = MorfologicoFindingsSchema.parse(input);
          const parsedBefore = JSON.stringify(parsed);
          const texto = renderMorfologico(parsed, null, { objetivo });
          const linhas = texto.split("\n").filter((line) => line.startsWith(`Comprimento ${label} `));
          assert.deepEqual(linhas, [
            `Comprimento ${label} ${rightLabel} (${SIGLA[osso]})${sep}${scenario.right} mm.`,
            `Comprimento ${label} ${leftLabel} (${SIGLA[osso]})${sep}${scenario.left} mm.`,
          ]);
          const original = renderMorfologico(legado(trimestre), null, { objetivo });
          const semOsso = (text: string) => text.split("\n").filter((line) => !line.startsWith(`Comprimento ${label} `)).join("\n");
          assert.equal(semOsso(texto), semOsso(original), "other bones and report sections must not change");
          assert.equal(JSON.stringify(input), before);
          assert.equal(JSON.stringify(parsed), parsedBefore);
        });
      }
    }
    test(`${name} all six asymmetric bones together`, () => {
      const fields: Record<string, number> = {};
      OSSOS.forEach(([osso], index) => {
        fields[`${osso}_dir_mm`] = 40.1 + index;
        fields[`${osso}_esq_mm`] = 38.2 + index;
      });
      const parsed = MorfologicoFindingsSchema.parse({ ...legado(trimestre), ...fields });
      const texto = renderMorfologico(parsed, null, { objetivo });
      OSSOS.forEach(([osso, label, right, left], index) => {
        assert.ok(texto.includes(`Comprimento ${label} ${right} (${SIGLA[osso]})${sep}${(40.1 + index).toFixed(1).replace(".", ",")} mm.`));
        assert.ok(texto.includes(`Comprimento ${label} ${left} (${SIGLA[osso]})${sep}${(38.2 + index).toFixed(1).replace(".", ",")} mm.`));
      });
    });
  }
}

for (const objetivo of [false, true]) {
  test(`1t ${objetivo ? "Objetivo" : "Classico"} unchanged with all lateral fields`, () => {
    const fields = Object.fromEntries(OSSOS.flatMap(([osso]) => [[`${osso}_dir_mm`, 42.3], [`${osso}_esq_mm`, 40.1]]));
    const expected = renderMorfologico(legado("1t"), null, { objetivo });
    const actual = renderMorfologico(MorfologicoFindingsSchema.parse({ ...legado("1t"), ...fields }), null, { objetivo });
    assert.equal(actual, expected);
    assert.ok(!actual.includes("42,3 mm") && !actual.includes("40,1 mm"));
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
