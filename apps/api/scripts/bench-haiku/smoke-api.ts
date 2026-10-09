/**
 * SMOKE REAL do motor Haiku 5.5 na API Anthropic (gasta API — poucas chamadas).
 *
 * Ditados SINTÉTICOS (nenhum dado de paciente). Prova, ponta a ponta pelo código
 * de produção, que a API aceita: (1) o caminho por ferramenta com um schema
 * clínico grande (OBSTETRICA, 98 uniões), (2) o modo estrito com uniões
 * `["x","null"]` (CERVICOMETRIA, sanity), (3) o writer completo em streaming.
 *
 * Rodar (de apps/api), com ANTHROPIC_API_KEY no .env:
 *   pnpm exec tsx --env-file=../../.env scripts/bench-haiku/smoke-api.ts
 * Cerca de 5 chamadas (6–7 se houver rodada de correção).
 */
import { HAIKU_MODEL } from "../../src/server/ai/llm";

const OBST =
  "Ultrassonografia obstétrica. Feto único, cefálico, dorso à esquerda. BCF 142 bpm, movimentos presentes. " +
  "DBP 7,8 cm, CC 28,4 cm, CA 26,9 cm, fêmur 5,9 cm. Peso estimado 1580 gramas. Placenta anterior, grau I. " +
  "Líquido amniótico normal, ILA 14 cm. DUM 10/03/2026.";
const CERVICO = "Medida do colo uterino por via transvaginal: 3,4 cm, orifício interno fechado, sem funil.";
const ABDOME =
  "Abdome total. Fígado com dimensões normais e ecotextura homogênea. Vesícula com cálculo de 1,2 cm com sombra acústica. " +
  "Rins normais, rim direito 10,8 cm, rim esquerdo 11,0 cm. Restante normal.";

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("smoke: ANTHROPIC_API_KEY ausente");
  const { runRendererExtraction } = await import("../../src/server/renderer/extraction");
  const { runSanityCheck } = await import("../../src/server/pipeline/sanityCheck");
  const { runWriterStream } = await import("../../src/server/pipeline/writer");
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const { resolveWriterModel } = await import("../../src/server/pipeline/modelResolver");
  const results: Record<string, unknown> = {};

  const t = async <T>(name: string, fn: () => Promise<T>) => {
    const t0 = Date.now();
    try {
      const value = await fn();
      results[name] = { ok: true, ms: Date.now() - t0 };
      console.log(`✓ ${name} (${Date.now() - t0} ms)`);
      return value;
    } catch (err) {
      results[name] = { ok: false, ms: Date.now() - t0, error: (err as Error).message.slice(0, 400) };
      console.error(`✗ ${name}: ${(err as Error).message.slice(0, 400)}`);
      return null;
    }
  };

  const obst = await t("extração OBSTETRICA (ferramenta não estrita, schema de 98 uniões)", () =>
    runRendererExtraction({ categoryCode: "OBSTETRICA", rawInput: OBST, stream: true, onProgress: (e) => console.log(`  · progresso: ${e.label}`) }),
  );
  if (obst) {
    const f = obst.findings as Record<string, any>;
    console.log(`  tokens in/out: ${obst.inputTokens}/${obst.outputTokens}; chaves: ${Object.keys(f).slice(0, 12).join(", ")}`);
  }

  const cervico = await t("extração CERVICOMETRIA (modo estrito, uniões)", () =>
    runRendererExtraction({ categoryCode: "CERVICOMETRIA", rawInput: CERVICO }),
  );
  if (cervico) console.log(`  achados: ${JSON.stringify(cervico.findings).slice(0, 300)}`);

  const writer = await t("writer completo ABDOMEN_TOTAL (streaming, bundle real)", async () => {
    const sql = (await import("postgres")).default(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
    const [style] = await sql`select id from writing_styles where code = 'CLASSICO_COMPLETO'`;
    await sql.end();
    const styleId = style!.id as string;
    const bundle = await loadDeterministicBundle({ categoryCode: "ABDOMEN_TOTAL", writingStyleId: styleId, rawInput: ABDOME });
    if (bundle.error) throw new Error(`bundle ${bundle.error.code}`);
    const modelConfig = resolveWriterModel({ mode: "standard", categoryCode: "ABDOMEN_TOTAL" });
    if (modelConfig.model !== HAIKU_MODEL || modelConfig.provider !== "anthropic") throw new Error(`writer resolvido = ${modelConfig.provider}/${modelConfig.model}`);
    const gen = runWriterStream({
      findings: { categoria_detectada: "ABDOMEN_TOTAL" } as never,
      ragBlocks: bundle.blocks,
      writingStyleCode: "CLASSICO_COMPLETO",
      categoryCode: "ABDOMEN_TOTAL",
      categoryLabel: "Abdome total",
      rawUserMessage: ABDOME,
      sourceTranscript: ABDOME,
      modelConfig,
    });
    let text = "";
    let deltas = 0;
    for (;;) {
      const n = await gen.next();
      if (n.done) {
        console.log(`  tokens in/out/cache: ${n.value.inputTokens}/${n.value.outputTokens}/${n.value.cachedInputTokens ?? 0}; ${deltas} deltas`);
        return n.value.fullText || text;
      }
      deltas += 1;
      text += n.value;
    }
  });
  if (writer) console.log(`  laudo (início): ${String(writer).slice(0, 400).replace(/\n/g, " ⏎ ")}`);

  await t("sanity por IA (modo estrito)", async () => {
    const r = await runSanityCheck({
      findings: { schema_version: "v1", categoria_detectada: "ABDOMEN_TOTAL", tipo_exame: "abdome", achados: {}, comandos_do_medico: [], trechos_confusos: [], nivel_de_confianca: "alta" } as never,
      finalText: String(writer ?? "Fígado normal. Vesícula com cálculo de 1,2 cm. CONCLUSÃO: Colelitíase."),
      rawInput: ABDOME,
    });
    console.log(`  veredito: ${r.result.verdict}; issues: ${r.result.issues.length}`);
  });

  console.log(JSON.stringify(results, null, 2));
  process.exit(Object.values(results).every((r) => (r as { ok: boolean }).ok) ? 0 : 1);
}

void main();
