import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { requestedExamCategory, resolveDopplerMode, resolveWriterExam } from "../requestedExam";
import { buildSystemMessage } from "../../prompts/buildSystemMessage";
import { DOPPLER_OBSTETRICO_CONTRACT, DOPPLER_OBSTETRICO_MODELO_BASE } from "../../prompts/contracts/DOPPLER_OBSTETRICO";
import { toObjectiveHeaders } from "../../prompts/contracts/objective";
import { runWriterStream } from "../writer";
import { openai } from "../../ai/openai";
import { resolveGenerationPath } from "../generationPathResolver";
import { MORFOLOGICO_CONTRACT } from "../../prompts/contracts/MORFOLOGICO";

// Execute production route expressions, not a separately reimplemented flow.
// External IO is replaced; this is not an HTTP or live clinical validation.
const source = readFileSync(new URL("../../../app/api/generate/route.ts", import.meta.url), "utf8");
const tree = ts.createSourceFile("route.ts", source, ts.ScriptTarget.Latest, true);
const nodes: ts.Node[] = [];
function visit(node: ts.Node) { nodes.push(node); ts.forEachChild(node, visit); }
visit(tree);
function declaration(name: string) {
  const node = nodes.find(n => ts.isVariableDeclaration(n) && n.name.getText(tree) === name);
  assert.ok(node, name);
  return `const ${node.getText(tree)};`;
}
function evaluate(code: string, scope: Record<string, unknown>) {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return new Function(...Object.keys(scope), `return (async () => { ${js} })()`)(...Object.values(scope));
}
const categoryFunction = nodes.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "resolveEffectiveCategory")!;
const writerCalls = nodes.filter(n => ts.isCallExpression(n) && n.expression.getText(tree) === "runWriterStream");
assert.equal(writerCalls.length, 2, "primary and renderer fallback writer calls");
const rendererCall = nodes.find(n => ts.isCallExpression(n) && n.expression.getText(tree) === "runRendererStream") as ts.CallExpression;
const rendererArgs = rendererCall.arguments[0] as ts.ObjectLiteralExpression;
const rendererCategory = rendererArgs.properties.find(p => p.name?.getText(tree) === "categoryCode") as ts.PropertyAssignment;
const fallbackGuard = nodes.find(n => ts.isIfStatement(n) && n.expression.getText(tree) === 'dopplerMode === "combined" && bundle.error')!;

async function main() {
  Object.assign(process.env, {
    SUPABASE_URL: "https://example.invalid", DATABASE_URL: "postgres://test:test@localhost/test",
    SUPABASE_ANON_KEY: "x".repeat(24), SUPABASE_SERVICE_ROLE_KEY: "x".repeat(24),
    OPENAI_API_KEY: "x".repeat(24), DEEPGRAM_API_KEY: "x".repeat(24),
  });
  const client = openai();
  const original = client.chat.completions.create;
  let captured: any;
  client.chat.completions.create = (async (params: unknown) => {
    captured = params;
    return (async function* () { yield { choices: [{ delta: { content: "synthetic output" } }] }; })();
  }) as unknown as typeof original;
  let cases = 0;
  try {
    for (const hint of ["DOPPLER_OBSTETRICO", "OBSTETRICA", "MORFOLOGICO", "PELVE_FEMININA"]) {
      for (const mode of [undefined, "combined", "isolated"] as const) {
        for (const style of ["CLASSICO_COMPLETO", "OBJETIVO"] as const) {
          const reqInput = { category_hint: hint, doppler_mode: mode, raw_input: "Doppler umbilical IP 0,9. Placenta anterior. DBP 80 mm." };
          const effectiveCategory = await evaluate(`${categoryFunction.getText(tree)}\nreturn resolveEffectiveCategory("DOPPLER_OBSTETRICO", reqInput.raw_input, "test", knownCodes, reqInput.category_hint, reqInput.doppler_mode);`, {
            requestedExamCategory, reqInput,
            knownCodes: new Set(["DOPPLER_OBSTETRICO", "OBSTETRICA", "MORFOLOGICO", "PELVE_FEMININA"]),
            resolveMorfologicoCategory: () => ({ category: hint, overridden: false }),
            normalizeCategoryCode: (category: string) => ({ category, normalized: false }),
          });
          const isolated = hint === "DOPPLER_OBSTETRICO" && mode === "isolated";
          assert.equal(effectiveCategory, hint === "DOPPLER_OBSTETRICO" && !isolated ? "OBSTETRICA" : hint);
          if (hint === "DOPPLER_OBSTETRICO") {
            const path = resolveGenerationPath({ mode: "standard", categoryCode: effectiveCategory }, {
              HARD_MODE_ENABLED: "false", RENDERER_CATEGORIES: "", DOPPLER_STANDALONE_V2: "true",
            });
            assert.equal(path.path, isolated ? "renderer" : "writer-pure", "isolated flag must not force combined into standalone renderer");
          }
          const calls: any[] = [];
          const selection = await evaluate([
            declaration("dopplerMode"), declaration("writerExam"), declaration("bundle"),
            "return { dopplerMode, writerExam, bundle };",
          ].join("\n"), {
            reqInput, effectiveCategory, resolveDopplerMode, resolveWriterExam,
            effectiveWritingStyleId: "test-style", accountVariantKey: "account-variant",
            loadDeterministicBundle: async (args: any) => {
              calls.push(args);
              return { error: null, variantKey: "padrao", blocks: [{
                id: "fixture-model", kind: "modelo", title: "Fixture", priority: 1, similarity: null,
                content: `${args.categoryCode} TEMPLATE SENTINEL\nCOMENTÁRIOS:\nBiometria placenta Doppler.\nCONCLUSÃO:`,
              }] };
            },
          });
          assert.equal(calls.length, isolated ? 0 : 1);
          assert.equal(await evaluate(`return ${rendererCategory.initializer.getText(tree)};`, {
            requestedExamCategory, effectiveCategory, dopplerMode: selection.dopplerMode,
          }), effectiveCategory);
          if (!isolated) {
            assert.equal(calls[0].categoryCode, hint);
            assert.equal(calls[0].rawInput, reqInput.raw_input);
            assert.equal(calls[0].writingStyleId, "test-style");
          }
          for (const call of writerCalls) {
            for (const fastPath of [false, true]) {
              const auditState: any = {};
              const generator = await evaluate(`return ${call.getText(tree)};`, {
                runWriterStream, dopplerMode: selection.dopplerMode, effectiveCategory,
                findings: { categoria_detectada: effectiveCategory, achados: {}, comandos_do_medico: [] },
                blocks: selection.bundle.blocks, styleRow: { code: style },
                categoriesInfo: { labels: new Map() }, fastPath, isFreeWriterCategory: false,
                reqInput, modelConfig: undefined, signal: undefined, auditState,
              });
              for (;;) { if ((await generator.next()).done) break; }
              const prompt = captured.messages[0].content as string;
              assert.equal(prompt, auditState.systemMessageFull);
              if (isolated) {
                assert.ok(prompt.includes(DOPPLER_OBSTETRICO_CONTRACT));
                assert.ok(prompt.includes(style === "OBJETIVO" ? toObjectiveHeaders(DOPPLER_OBSTETRICO_MODELO_BASE) : DOPPLER_OBSTETRICO_MODELO_BASE));
                assert.doesNotMatch(prompt, /TEMPLATE SENTINEL|EXAME SELECIONADO: obstétrico com Doppler/);
              } else if (hint === "DOPPLER_OBSTETRICO") {
                assert.match(prompt, /DOPPLER_OBSTETRICO TEMPLATE SENTINEL/);
                assert.doesNotMatch(prompt, /obstétrica sem Doppler|gerar somente a avaliação Doppler|MODELO BASE OBJETIVO/);
              } else {
                assert.equal(prompt, buildSystemMessage({ categoryCode: hint, categoryLabel: hint, writingStyleCode: style, ragBlocks: selection.bundle.blocks, hasPlacenta: hint === "OBSTETRICA", includeDoppler: hint === "OBSTETRICA" ? false : undefined }));
                if (hint === "MORFOLOGICO") {
                  assert.ok(prompt.endsWith(style === "OBJETIVO" ? toObjectiveHeaders(MORFOLOGICO_CONTRACT) : MORFOLOGICO_CONTRACT));
                  assert.match(prompt, /mesmo que o modelo exija título exato sem complemento/);
                  assert.match(prompt, /Não arredonde percentis informados/);
                } else assert.doesNotMatch(prompt, /PRECEDÊNCIA ESPECÍFICA DO MORFOLÓGICO/);
              }
              cases++;
            }
          }
        }
      }
    }
    await assert.rejects(evaluate(fallbackGuard.getText(tree), {
      dopplerMode: "combined", bundle: { error: { code: "BUNDLE_EMPTY" } },
    }), /fallback blocked: BUNDLE_EMPTY/);
    await evaluate(fallbackGuard.getText(tree), { dopplerMode: "combined", bundle: { error: null } });
    const isolatedPrompt = buildSystemMessage({
      categoryCode: "DOPPLER_OBSTETRICO", dopplerMode: "isolated", categoryLabel: "Doppler", writingStyleCode: "CLASSICO_COMPLETO", hasPlacenta: true,
      ragBlocks: [{ id: "fixture", kind: "modelo", title: "Contaminated combined", content: "COMBINED CONTAMINATION", priority: 1, similarity: null }],
    });
    assert.doesNotMatch(isolatedPrompt, /COMBINED CONTAMINATION/);
    assert.ok(isolatedPrompt.includes(DOPPLER_OBSTETRICO_MODELO_BASE));
    console.log(`${cases} route-expression -> real writer -> real prompt cases passed; renderer selection, fallback guard and isolated contamination passed (external IO mocked)`);
  } finally { client.chat.completions.create = original; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
