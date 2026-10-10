/**
 * CENÁRIOS SINTÉTICOS DA REVISÃO W13 (A05, A06, A07) — Haiku 5.5 pela ASSINATURA, com o system efetivo da
 * mama (contrato + global + biblioteca do banco, só leitura; --patch aplica a biblioteca proposta). Ditados
 * inventados, sem dado de paciente. Imprime o laudo e o resultado de cada verificação.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/sinteticos-mama-tireoide.ts [--patch bundle.json]
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { callClaude } from "./claudeCli";

loadDotenv({ path: join(resolve(__dirname, "../../../.."), ".env") });
const argv = process.argv.slice(2);
const patchFile = argv.includes("--patch") ? argv[argv.indexOf("--patch") + 1] : undefined;

type Caso = { id: string; ditado: string; checks: Array<[string, (t: string) => boolean]> };
const CASOS: Caso[] = [
  { id: "A05 exclusão", ditado: "Ultrassonografia só das mamas, sem axilas. Mamas normais.",
    checks: [["título sem axilas", (t) => /^ULTRASSONOGRAFIA DAS MAMAS\s*$/m.test(t)], ["sem frase axilar", (t) => !/axila/i.test(t.replace(/^.*Breast Imaging.*$/gm, ""))], ["BI-RADS 1", (t) => /BI-RADS® 1\)/.test(t)]] },
  { id: "A05 axila alterada", ditado: "Mamas e axilas. Mamas sem alterações. Linfonodo axilar esquerdo com córtex espessado, medindo 1,8 x 1,0 cm.",
    checks: [["título com axilas", (t) => /E REGIÕES AXILARES/.test(t)], ["sem 'Linfonodos axilares normais' contraditório", (t) => !/^\s*(\d\)\s*)?Linfonodos axilares normais\.\s*$/m.test(t)], ["medida do linfonodo", (t) => /1,8 x 1,0 cm/.test(t)]] },
  { id: "A06 margem espiculada", ditado: "Ultrassonografia das mamas. Imagem hipoecoica de mama direita com margem espiculada, medindo 1,4 x 1,1 x 1,2 cm, no quadrante superolateral às 10 horas, distando 1,0 cm do seu centro até a pele.",
    checks: [["margem espiculada preservada", (t) => /margem espiculada/.test(t)], ["não virou circunscrita", (t) => !/circunscrit/.test(t)], ["sem BI-RADS inventado no achado", (t) => !/BI-RADS® [2-6]/.test(t)]] },
  { id: "A07 número truncado", ditado: "Ultrassonografia das mamas. Imagem anecoica de mama esquerda, com margem circunscrita, medindo 2 9, no quadrante superomedial às 11 horas.",
    checks: [["marca medida ambígua", (t) => /\[REVISAR — medida ambígua\]/.test(t)], ["não resolveu para 2,9 cm sem marca", (t) => !/medindo 2,9 cm(?! \[REVISAR)/.test(t)]] },
  { id: "A07 unidade do mesmo achado", ditado: "Ultrassonografia das mamas. Imagem anecoica de mama direita, com margem circunscrita, medindo 0.4 por 0.3 por 0.3, no quadrante inferolateral às 7 horas, distando 0,8 cm do seu centro até a pele.",
    checks: [["usa a unidade do mesmo achado", (t) => /0,4 x 0,3 x 0,3 cm/.test(t)], ["sem marca desnecessária", (t) => !/REVISAR/.test(t)]] },
];

async function main() {
  const { buildSystemMessage } = await import("../../src/server/prompts/buildSystemMessage");
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const { buildRawUserMessage, chosenExamLabel } = await import("../../src/server/pipeline/writer");
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const [ws] = await sql`select id from writing_styles where code = 'CLASSICO_COMPLETO'`;
  await sql.end();
  let falhas = 0;
  for (const c of CASOS) {
    const bundle = await loadDeterministicBundle({ categoryCode: "MAMARIA", writingStyleId: ws.id, rawInput: c.ditado });
    if (bundle.error) throw new Error(bundle.error.code);
    let blocks = bundle.blocks;
    if (patchFile) {
      const patch: Record<string, string | null> = JSON.parse(readFileSync(patchFile, "utf8"));
      blocks = blocks.filter((b) => patch[b.title] !== null).map((b) => (typeof patch[b.title] === "string" ? { ...b, content: patch[b.title] as string } : b));
    }
    const system = buildSystemMessage({ categoryCode: "MAMARIA", categoryLabel: chosenExamLabel("MAMARIA", "Mamas e axilas"), writingStyleCode: "CLASSICO_COMPLETO", ragBlocks: blocks, inputMode: "raw" });
    const user = buildRawUserMessage(c.ditado, false, { label: chosenExamLabel("MAMARIA", "Mamas e axilas"), code: "MAMARIA" });
    const r = await callClaude({ model: "claude-haiku-5-5", system, user, effort: "medium" });
    console.log(`\n===== ${c.id}\n${r.text}`);
    for (const [nome, ok] of c.checks) {
      const passou = ok(r.text);
      if (!passou) falhas++;
      console.log(`${passou ? "✓" : "✗"} ${nome}`);
    }
  }
  console.log(`\n${falhas} verificação(ões) falharam.`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
