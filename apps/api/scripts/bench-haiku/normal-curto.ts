/**
 * BANCADA — ditado curto de normalidade no writer completo (Haiku 5.5, assinatura).
 *
 * Achado do W4 (09/10): sem o exame na mensagem do fast-path, o Haiku recusava
 * escrever "Exame sem alterações dignas de nota". Compara, com o MESMO system
 * (bundle real da categoria, estilo clássico):
 *   antes  — mensagem antiga (só o ditado)
 *   depois — runWriterStream de produção (exame escolhido no ditado)
 * Ditado sintético. 2 chamadas `claude -p` por categoria.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/normal-curto.ts [ABDOMEN_TOTAL,TIREOIDE]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { cliAnthropicClient } from "./cliAnthropicClient";

const REPO = resolve(__dirname, "../../../..");
loadDotenv({ path: join(REPO, ".env") });
process.env.ANTHROPIC_API_KEY = "sk-ant-bench-blocked-no-real-anthropic-calls";

const NORMAL = "Exame sem alterações dignas de nota.";
const LABELS: Record<string, string> = { ABDOMEN_TOTAL: "Abdome total", TIREOIDE: "Tireoide" };
const looksLikeReport = (t: string) => /CONCLUS|IMPRESS/i.test(t) && /ULTRASSONOGRAFIA|ULTRA-SONOGRAFIA/i.test(t);

async function main() {
  const categories = (process.argv[2] ?? "ABDOMEN_TOTAL,TIREOIDE").split(",");
  const postgres = (await import("postgres")).default;
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const { runWriterStream, buildRawUserMessage } = await import("../../src/server/pipeline/writer");
  const { streamAnthropicWriter } = await import("../../src/server/ai/writerClient");
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const [style] = await sql`select id from writing_styles where code = 'CLASSICO_COMPLETO'`;
  await sql.end();
  const config = { provider: "anthropic" as const, model: "claude-haiku-5-5", reasoningEffort: "medium", credentialRef: "default" as const };
  const client = cliAnthropicClient("medium");
  const out: Record<string, unknown> = {};

  for (const code of categories) {
    const bundle = await loadDeterministicBundle({ categoryCode: code, writingStyleId: style!.id as string, rawInput: NORMAL });
    if (bundle.error) throw new Error(`${code}: bundle ${bundle.error.code}`);
    let system = "";
    let depois = "";
    const gen = runWriterStream({
      findings: { categoria_detectada: code } as never,
      ragBlocks: bundle.blocks,
      writingStyleCode: "CLASSICO_COMPLETO",
      categoryCode: code,
      categoryLabel: LABELS[code] ?? code,
      rawUserMessage: NORMAL,
      sourceTranscript: NORMAL,
      modelConfig: config,
      anthropicClient: client,
      onSystemMessage: (m) => (system = m),
    });
    for (;;) {
      const n = await gen.next();
      if (n.done) break;
      depois += n.value;
    }
    let antes = "";
    const old = streamAnthropicWriter({ config, systemMessage: system, userMessage: buildRawUserMessage(NORMAL), client });
    for (;;) {
      const n = await old.next();
      if (n.done) break;
      antes += n.value;
    }
    out[code] = { antes, depois, antesEhLaudo: looksLikeReport(antes), depoisEhLaudo: looksLikeReport(depois) };
    console.log(`\n=== ${code}`);
    console.log(`antes  (sem exame): ${looksLikeReport(antes) ? "LAUDO" : "NÃO É LAUDO"} → ${antes.slice(0, 220).replace(/\n/g, " ⏎ ")}`);
    console.log(`depois (com exame): ${looksLikeReport(depois) ? "LAUDO" : "NÃO É LAUDO"} → ${depois.slice(0, 220).replace(/\n/g, " ⏎ ")}`);
  }
  const dir = join(REPO, "tmp-review/bench-haiku");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `normal-curto-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`\nsaída: ${file}`);
}

void main();
