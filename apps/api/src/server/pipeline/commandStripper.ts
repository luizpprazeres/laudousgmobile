/**
 * DET-6 FASE 3 — Pré-geração: SEPARA o comando do ditado ANTES do writer/extração.
 *
 * Problema (validação E2E em dados reais): o comando é processado como
 * pós-processamento, mas a extração/writer já ECOA o comando para dentro do laudo
 * (vira item da conclusão) ANTES do parser rodar. Resultado: o parser adiciona a
 * execução correta mas o ECO upstream permanece (casos 43657c4b/89de6e68/88543eea).
 *
 * Solução: gerar o draft a partir do ditado SEM os comandos (`stripCommandSpans`),
 * e aplicar os comandos (fase 1 + 2) sobre o draft LIMPO. O writer nunca vê o
 * comando → não ecoa.
 *
 * CONSERVADOR por design: só remove spans de comando de ALTA confiança (marcadores
 * inequívocos). Risco assimétrico — remover conteúdo clínico é grave; deixar um eco
 * é só cosmético (e o sanitizer/dedup pega o residual). Por isso NÃO mexe no
 * "acrescente X" genérico (sem alvo explícito), que pode ser conteúdo.
 *
 * Flag: `COMMAND_PREGEN` (default OFF). Wirado no route antes da geração.
 */
import { normalizeAsrCommands } from "./asrNormalize";
import { COMMENT_RE, REPLACE_RE } from "./commandOperations";

/** Diretiva explícita de conclusão: "na conclusão[,:] X" até o fim da frase. */
const NA_CONCLUSAO_RE = /\bna\s+conclus[ãa]o[,:\s]+.+?(?:[.;\n]|$)/gi;
/** "recomendar/recomende X" → item de conclusão. */
const RECOMENDAR_RE = /\brecomend(?:ar|e|o)\s+.+?(?:[.;\n]|$)/gi;

/**
 * Remove do ditado os spans de comando de alta confiança (comentário, substituição,
 * "na conclusão X", "recomendar X"). Devolve o ditado LIMPO p/ a geração + a lista
 * de spans removidos (auditoria). Mantém TODO o conteúdo clínico.
 */
export function stripCommandSpans(rawInput: string): {
  clean: string;
  stripped: string[];
} {
  let clean = normalizeAsrCommands(rawInput);
  const stripped: string[] = [];
  const rm = (re: RegExp): void => {
    clean = clean.replace(new RegExp(re.source, "gi"), (m) => {
      const t = m.trim();
      if (t) stripped.push(t);
      return " ";
    });
  };
  rm(COMMENT_RE);
  rm(REPLACE_RE);
  rm(NA_CONCLUSAO_RE);
  rm(RECOMENDAR_RE);
  // Limpeza de espaços/pontuação órfã deixada pela remoção.
  clean = clean
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.;,])/g, "$1")
    .replace(/^[\s.,;]+/, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, stripped };
}
