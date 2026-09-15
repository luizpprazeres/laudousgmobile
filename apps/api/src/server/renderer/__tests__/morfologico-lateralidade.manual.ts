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

// SHA-256 da saida completa capturada antes da correcao, incluindo dirty existente.
const LEGACY_HASHES = [
  ["1t", false, "d58689a75ef822ee48a14e785e55cf1889e3a7a42592cf7cbd3cf239d1b91e3a"],
  ["1t", true, "5e3ff706d19e44e745370b4a71a77515c111a6da90302019a723c961334d45ab"],
  ["2t", false, "73bcfdbe32403f920eea87f867734f922165cbfc3f2806c0cd121224e055652b"],
  ["2t", true, "7eb00078907317d5b87ec78db8f9edc378f306e5fc840684552442452b9a9db2"],
  ["3t", false, "ded915f292a1d1cd3786048b63301a64c2f8404ba2bf5c9177674c2fb7c2814c"],
  ["3t", true, "dd8127d9b8b426f5b4e526899a0868c34714129e0184517a1eb179062cf04648"],
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
            `Comprimento ${label} ${rightLabel}${sep}${scenario.right} mm.`,
            `Comprimento ${label} ${leftLabel}${sep}${scenario.left} mm.`,
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
      OSSOS.forEach(([, label, right, left], index) => {
        assert.ok(texto.includes(`Comprimento ${label} ${right}${sep}${(40.1 + index).toFixed(1).replace(".", ",")} mm.`));
        assert.ok(texto.includes(`Comprimento ${label} ${left}${sep}${(38.2 + index).toFixed(1).replace(".", ",")} mm.`));
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
