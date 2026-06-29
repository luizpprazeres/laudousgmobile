/**
 * Golden do interpretador de comandos v2 (DET-6, flag COMMAND_OPERATIONS).
 * Cobre os casos reais que vazavam (mineração das correções do Luiz):
 *  - 43657c4b: "acrescente nos comentários ..." → COMENTÁRIOS (não conclusão).
 *  - b8f67ca5: "acione/correlacione na conclusão com a US precoce" → DROP (meta).
 *  - 89de6e68 (literal): "no lugar de X escreva Y" → replace_phrase.
 * Rodar: tsx src/server/pipeline/__tests__/command-operations-v2.manual.ts
 */
import { extractCommandOperations, applyCommandOperations } from "../commandOperations";
import { applyOperations } from "../operations";
import { normalizeAsrCommands } from "../asrNormalize";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass += 1; console.log(`✓ ${name}`); }
  else { fail += 1; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}

const LAUDO = [
  "ULTRASSONOGRAFIA ABDOMINAL TOTAL",
  "",
  "COMENTÁRIOS:",
  "Exame realizado com transdutor de 4.0 MHz.",
  "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "Fígado de dimensões normais.",
  "",
  "CONCLUSÃO:",
  "1) Exame dentro dos limites da normalidade.",
].join("\n");

// ── add_comment: executor anexa ao bloco COMENTÁRIOS ──
{
  const r = applyOperations(LAUDO, [
    { op: "add_comment", text: "Exame realizado em um recém-nascido de 3 dias de vida" },
  ]);
  const comentariosBloco = r.laudo.split("OS SEGUINTES")[0] ?? "";
  check("add_comment: entra no bloco COMENTÁRIOS", /recém-nascido de 3 dias/.test(comentariosBloco), r.laudo);
  check("add_comment: NÃO entra na conclusão", !/recém-nascido/.test(r.laudo.split("CONCLUSÃO:")[1] ?? ""), r.laudo);
}

// ── 43657c4b: "acrescente nos comentários que ..." → op add_comment ──
{
  const ops = extractCommandOperations(
    "Fígado normal. Acrescente nos comentários que o exame foi realizado em um recém-nascido de 3 dias.",
  );
  check("comentários: gera add_comment", ops.some((o) => o.op === "add_comment"), JSON.stringify(ops));
  check("comentários: NÃO gera item de conclusão com 'recém-nascido'", !ops.some((o) => o.op === "add_conclusion_item" && /recém-nascido/i.test(o.text)), JSON.stringify(ops));
}

// ── 43657c4b e2e: comando vai p/ COMENTÁRIOS, conclusão intocada ──
{
  const out = applyCommandOperations(LAUDO, "Acrescente nos comentários que o exame foi em um recém-nascido de 3 dias.");
  check("e2e: COMENTÁRIOS recebe o texto", /COMENTÁRIOS:[\s\S]*recém-nascido[\s\S]*OS SEGUINTES/.test(out), out);
  check("e2e: conclusão NÃO poluída", !/recém-nascido/.test(out.split("CONCLUSÃO:")[1] ?? ""), out);
}

// ── b8f67ca5: meta-comando de correlação NÃO vira item-lixo ──
{
  const ops = extractCommandOperations("Acione na conclusão com a ultrassonografia precoce.");
  check("meta: nenhum item com 'ultrassonografia precoce'", !ops.some((o) => "text" in o && /ultrassonografia precoce/i.test((o as { text: string }).text)), JSON.stringify(ops));
}
{
  const out = applyCommandOperations(LAUDO, "Acione na conclusão com a ultrassonografia precoce.");
  check("meta e2e: sem 'Com a ultrassonografia precoce.' na conclusão", !/Com a ultrassonografia precoce/i.test(out), out);
}

// ── 89de6e68 (literal): "no lugar de X escreva Y" → replace_phrase ──
{
  const ops = extractCommandOperations("No lugar de resíduo pós-miccional escreva bexiga com volume normal.");
  const rep = ops.find((o) => o.op === "replace_phrase") as { from: string; to: string } | undefined;
  check("replace: gera replace_phrase", !!rep, JSON.stringify(ops));
  check("replace: from/to corretos", rep?.from === "resíduo pós-miccional" && /bexiga com volume normal/.test(rep?.to ?? ""), JSON.stringify(rep));
}

// ── ASR normalize: "escreve" → "escreva" em contexto de comando ──
{
  check("ASR: 'no lugar de X escreve Y' → 'escreva'", /escreva/.test(normalizeAsrCommands("no lugar de A escreve B")));
  check("ASR: 'acione ... US precoce' → 'correlacione'", /correlacione/.test(normalizeAsrCommands("acione com a ultrassonografia precoce")));
}

// ── Regressão: comando de conclusão legítimo ainda funciona ──
{
  const out = applyCommandOperations(LAUDO, "Na conclusão, recomendar acompanhamento ultrassonográfico em 6 meses.");
  check("regressão: item legítimo entra na conclusão", /acompanhamento ultrassonográfico/i.test(out.split("CONCLUSÃO:")[1] ?? ""), out);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
