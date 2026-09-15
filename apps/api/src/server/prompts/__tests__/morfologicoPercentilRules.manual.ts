import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { WritingStyleCodeSchema } from "@laudousg/shared";
import { buildSystemMessage } from "../buildSystemMessage";
import { CATEGORY_CONTRACTS } from "../contracts";
import { GLOBAL_RULES_BLOCK, buildCoTInstruction } from "../global";

// Reconstruct the pre-adapter assembly to compare complete prompts byte-for-byte.
const moduleUrl = new URL("../buildSystemMessage.ts", import.meta.url);
const source = readFileSync(moduleUrl, "utf8");
const baselineSource = source
  .replace("globalSectionForCategory(GLOBAL_RULES_BLOCK, args.categoryCode)", "GLOBAL_RULES_BLOCK")
  .replace("globalSectionForCategory(buildCoTInstruction(args.categoryLabel), args.categoryCode)", "buildCoTInstruction(args.categoryLabel)");
assert.notEqual(baselineSource, source, "both production adapter calls must exist");
assert.ok(!baselineSource.includes("globalSectionForCategory(GLOBAL_RULES_BLOCK"));
assert.ok(!baselineSource.includes("globalSectionForCategory(buildCoTInstruction"));
const baselineModule = { exports: {} as { buildSystemMessage: typeof buildSystemMessage } };
const compiled = ts.transpileModule(baselineSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function("require", "module", "exports", compiled)(
  createRequire(moduleUrl), baselineModule, baselineModule.exports,
);

const globalRounding = 'Quando o médico informar um percentil decimal (ex.: 47,8 ou 12,4), ARREDONDE para o inteiro mais próximo (47,8 → 48; 12,4 → 12). ';
const cotRounding = "Percentil decimal → arredondar para INTEIRO. ";
assert.ok(GLOBAL_RULES_BLOCK.includes(globalRounding));
assert.ok(buildCoTInstruction("MORFOLOGICO").includes(cotRounding));
const categories = [...new Set([
  ...Object.keys(CATEGORY_CONTRACTS), "DOPPLER_OBSTETRICO", "DOPPLER_RENAL",
  "DOPPLER_VENOSO_MMII", "DOPPLER_CAROTIDAS", "CERVICOMETRIA",
  "ABDOMEN_SUPERIOR", "PARTES_MOLES", "VIAS_URINARIAS", "LIVRE", "TESTE",
])];
let cases = 0;
for (const categoryCode of categories) {
  for (const writingStyleCode of WritingStyleCodeSchema.options) {
    for (const hardening of [false, true]) {
      for (const dopplerMode of [undefined, "combined", "isolated"] as const) {
        const args: Parameters<typeof buildSystemMessage>[0] = {
          categoryCode, categoryLabel: categoryCode, writingStyleCode, hardening, dopplerMode,
          hasAnexial: true, hasPlacenta: true, hasHashimoto: true, hasPolipo: true,
          ragBlocks: [{ id: "fixture", kind: "modelo", title: "Modelo", content: "COMENTÁRIOS:\nPercentil informado 46,81.\nCONCLUSÃO:", priority: 1, similarity: null }],
        };
        const before = baselineModule.exports.buildSystemMessage(args);
        const after = buildSystemMessage(args);
        if (categoryCode === "MORFOLOGICO") {
          assert.ok(before.includes(globalRounding) && before.includes(cotRounding));
          assert.equal(after, before.replace(globalRounding, "").replace(cotRounding, ""));
          assert.doesNotMatch(after, /ARREDONDE para o inteiro|arredondar para INTEIRO|47,8 → 48|12,4 → 12/);
          assert.match(after, /NUNCA invente casas decimais/);
          assert.match(after, /Nunca infira data da Primeira USG\/DUM a partir da IG/);
          assert.match(after, /Percentil é OPCIONAL/);
          assert.match(after, /Percentil informado 46,81/);
          assert.match(after, /Não arredonde percentis informados/);
        } else {
          assert.equal(after, before, `${categoryCode}/${writingStyleCode}/${dopplerMode}: unchanged bytes`);
          if (categoryCode !== "LIVRE" && categoryCode !== "TESTE") {
            assert.ok(after.includes(globalRounding) && after.includes(cotRounding));
          }
        }
        assert.equal(buildSystemMessage(args), after, "deterministic repeat");
        cases++;
      }
    }
  }
}
console.log(`${cases} prompts passed: MORFOLOGICO removes only two rounding instructions; other categories byte-identical`);
