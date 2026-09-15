import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { openai } from "../../ai/openai";
import { runRendererExtraction } from "../../renderer/extraction";
import { runRendererStream } from "../renderer";
import { achadoNormalDe } from "../../renderer/catalog/modeloNormal";
import { ObstetricaFindingsSchema, OBSTETRICA_JSON_SCHEMA } from "../../renderer/categories/OBSTETRICA";
import { MorfologicoFindingsSchema } from "../../renderer/categories/MORFOLOGICO";
import { DopplerObstetricoFindingsSchema } from "../../renderer/categories/DOPPLER_OBSTETRICO";
import { DopplerObstetricoModuleSchema } from "../../renderer/categories/dopplerObstetricoModule";

const route = readFileSync(new URL("../../../app/api/generate/route.ts", import.meta.url), "utf8");
const ast = ts.createSourceFile("route.ts", route, ts.ScriptTarget.Latest, true);
let policy: ts.Expression | undefined;
function visit(n: ts.Node) {
  if (ts.isCallExpression(n) && n.expression.getText(ast) === "runRendererStream") {
    const property = (n.arguments[0] as ts.ObjectLiteralExpression).properties.find(p => p.name?.getText(ast) === "includeDoppler") as ts.PropertyAssignment;
    policy = property?.initializer;
  }
  ts.forEachChild(n, visit);
}
visit(ast);
assert.ok(policy, "route must explicitly forward the plain-exam policy");
const includeFromRequest = new Function("reqInput", `return ${policy.getText(ast)}`);
for (const category_hint of [undefined, "OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO"]) {
  for (const doppler_mode of [undefined, "combined", "isolated"]) {
    assert.equal(includeFromRequest({ category_hint, doppler_mode }), category_hint === "OBSTETRICA" ? false : undefined);
  }
}

async function main() {
  Object.assign(process.env, {
    SUPABASE_URL: "https://example.invalid", DATABASE_URL: "postgres://test:test@localhost/test",
    SUPABASE_ANON_KEY: "x".repeat(24), SUPABASE_SERVICE_ROLE_KEY: "x".repeat(24),
    OPENAI_API_KEY: "x".repeat(24), DEEPGRAM_API_KEY: "x".repeat(24),
    MODEL_CATALOG_CATEGORIES: "", ASR_CLINICAL: "false",
  });
  const doppler = DopplerObstetricoModuleSchema.parse({
    ...Object.fromEntries(Object.keys(DopplerObstetricoModuleSchema.shape).map(k => [k, null])),
    ip_umbilical: 0.91,
  });
  const obst = ObstetricaFindingsSchema.parse({
    ...achadoNormalDe(ObstetricaFindingsSchema) as Record<string, unknown>,
    numero_fetos: 1, gestacao_inicial: false, ig_semanas: 30,
    fetos: [{ rotulo: null, posicao_relativa: null, apresentacao: "cefálica", dorso: null,
      polo_cefalico: null, bcf_bpm: 145, dbp_mm: 70, cc_mm: 250, ca_mm: 230,
      cf_mm: 50, ccn_mm: null, peso_g: 1200, peso_variacao_g: null, percentil: null }],
    itens_conclusao_livres: [], observacoes_corpo_livres: [], cervicometria: null, doppler,
  });
  const rawInput = "Obstétrico. 30 semanas. DBP 70 mm. IP umbilical 0,91.";
  const client = openai();
  const original = client.chat.completions.create;
  const schemaBefore = JSON.stringify(OBSTETRICA_JSON_SCHEMA);
  let captured: any;
  let payload: unknown = obst;
  client.chat.completions.create = (async (params: any) => {
    captured = params;
    // Deliberately violate the plain schema: the boundary must reject the module.
    const content = JSON.stringify(payload);
    return params.stream
      ? (async function* () { yield { choices: [{ delta: { content } }] }; })()
      : { choices: [{ message: { content } }] };
  }) as unknown as typeof original;
  let cases = 0;
  try {
    for (const includeDoppler of [undefined, true, false]) {
      for (const dopplerMode of [undefined, "combined"] as const) {
        for (const stream of [false, true]) {
          const result = await runRendererExtraction({ categoryCode: "OBSTETRICA", includeDoppler, dopplerMode, rawInput, stream });
          assert.equal((result.findings as typeof obst).doppler?.ip_umbilical ?? null, includeDoppler === false ? null : 0.91);
          assert.equal(captured.messages[1].content, `Ditado do médico:\n${rawInput}`);
          assert.equal(JSON.stringify(OBSTETRICA_JSON_SCHEMA), schemaBefore, "shared schema must not mutate");
          if (includeDoppler === false) {
            assert.deepEqual(captured.response_format.json_schema.schema.properties.doppler, { type: "null" });
            assert.match(captured.messages[0].content, /sem complemento Doppler/);
            assert.doesNotMatch(captured.messages[0].content, /Preencha doppler SOMENTE/);
          } else assert.deepEqual(captured.response_format.json_schema.schema, OBSTETRICA_JSON_SCHEMA);
          for (const writingStyleId of ["11111111-1111-4111-8111-111111111111", "44444444-4444-4444-8444-444444444444"]) {
            const generator = runRendererStream({ categoryCode: "OBSTETRICA", includeDoppler, dopplerMode, rawInput, templateBody: "", writingStyleId, onProgress: stream ? () => {} : undefined });
            let output = "";
            for (;;) {
              const next = await generator.next();
              if (next.done) { assert.equal(next.value.fullText, output); break; }
              output += next.value;
            }
            assert.equal(output.includes("COM DOPPLER COLORIDO"), includeDoppler !== false);
            assert.equal(output.includes("DOPPLERVELOCIMETRIA:"), includeDoppler !== false);
            assert.equal(output.includes("0,91"), includeDoppler !== false);
            assert.match(output, /70/);
            cases++;
          }
        }
      }
    }
    payload = MorfologicoFindingsSchema.parse({
      ...achadoNormalDe(MorfologicoFindingsSchema) as Record<string, unknown>,
      trimestre: "2t", itens_conclusao_livres: [], doppler,
    });
    const morph = await runRendererExtraction({ categoryCode: "MORFOLOGICO", includeDoppler: false, rawInput });
    assert.equal((morph.findings as { doppler: typeof doppler }).doppler.ip_umbilical, 0.91);
    payload = DopplerObstetricoFindingsSchema.parse({ ...doppler, ig_semanas: 30, observacoes_adicionais: null, itens_conclusao_livres: [], cervicometria: null });
    const isolated = await runRendererExtraction({ categoryCode: "DOPPLER_OBSTETRICO", includeDoppler: false, rawInput });
    assert.equal((isolated.findings as { ip_umbilical: number }).ip_umbilical, 0.91);
    assert.equal(obst.doppler?.ip_umbilical, 0.91, "source fixture remains intact");
    console.log(`${cases} extraction -> renderer cases passed; route policy, shared-schema immutability, MORFO and isolated preservation passed (LLM mocked)`);
  } finally { client.chat.completions.create = original; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
