/**
 * DET-6 FASE 3 — Pré-geração: SEPARA o comando do ditado ANTES do writer/extração.
 *
 * Problema (validação E2E em dados reais): o comando é processado como
 * pós-processamento, mas a extração/writer já ECOA o comando para dentro do laudo
 * ANTES do parser rodar, e o pós-processamento só ADICIONA a execução (o eco
 * upstream permanece — casos 43657c4b/89de6e68/88543eea).
 *
 * Solução: gerar o draft a partir do ditado SEM os comandos (`stripCommandSpans`),
 * e aplicar os comandos (fase 1 + 2) sobre o draft LIMPO. O writer nunca vê o
 * comando → não ecoa.
 *
 * MUITO CONSERVADOR por design (review dex1): remover conteúdo clínico é GRAVE;
 * deixar um eco é só cosmético (e o sanitizer/dedup pega o residual). Por isso:
 *  - "na conclusão X" só é comando se vier seguida de VERBO de comando (não pega
 *    "na conclusão do exame físico, paciente refere ...");
 *  - comentário exige ALVO explícito ("nos/após comentários", não "inclui
 *    comentários sobre ...");
 *  - "recomendar" solto NÃO é stripado (eco benigno → vira "Recomenda-se X" certo);
 *  - comentário/replace só são removidos quando há aplicador tipado ligado
 *    (`typedEngine`) — senão seriam lost-command (o legado só aplica conclusão).
 *
 * Flag: `COMMAND_PREGEN` (default OFF). Wirado no route antes da geração.
 */
import { normalizeAsrCommands } from "./asrNormalize";
import { REPLACE_RE } from "./commandOperations";

/**
 * Diretiva de conclusão = "na conclusão" + (vírgula/dois-pontos opcional) + VERBO
 * de comando. Exigir o verbo evita stripar frase clínica ("na conclusão do exame").
 */
const NA_CONCLUSAO_CMD_RE =
  /\bna\s+conclus[ãa]o\s*[,;:]?\s*(?:recomend|acrescent|adicion|inclu|coloqu|escrev|ponh|pode\s+colocar|substitu)\w*[^.;\n]*/gi;

/**
 * Comentário com ALVO EXPLÍCITO obrigatório (mais estrito que o COMMENT_RE de
 * extração): "acrescente/adicione/coloque/inclua nos/após/ao final dos comentários".
 */
const COMMENT_STRIP_RE =
  /(?:acrescent\w+|adicion\w+|coloqu\w+|inclu\w+)\s+(?:n[oa]s?|ap[óo]s(?:\s+os)?|ao\s+final\s+d[oa]s)\s+coment[áa]rios?\s*(?:,?\s*que\s+)?[:\s-]*[^.;\n]+/gi;

export interface StripResult {
  clean: string;
  stripped: string[];
}

/**
 * Remove do ditado os spans de comando de ALTA confiança, preservando 100% do
 * conteúdo clínico. `typedEngine` (COMMAND_OPERATIONS||COMMAND_INTERPRETER): só
 * quando true removemos comentário/substituição (que só o aplicador tipado
 * reaplica) — senão seriam lost-command. "na conclusão + verbo" o legado cobre,
 * então é sempre seguro stripar.
 */
export function stripCommandSpans(
  rawInput: string,
  opts?: { typedEngine?: boolean },
): StripResult {
  let clean = normalizeAsrCommands(rawInput);
  const stripped: string[] = [];
  const rm = (re: RegExp): void => {
    clean = clean.replace(new RegExp(re.source, "gi"), (m) => {
      const t = m.trim();
      if (t) stripped.push(t);
      return " ";
    });
  };
  rm(NA_CONCLUSAO_CMD_RE);
  if (opts?.typedEngine) {
    rm(COMMENT_STRIP_RE);
    rm(REPLACE_RE);
  }
  clean = clean
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.;,])/g, "$1")
    .replace(/^[\s.,;]+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, stripped };
}
