/**
 * Guard de saída COMUM a todos os writers (writer completo, Livre, MSK, pelve,
 * partes moles, Doppler renal e venoso).
 *
 * Com o Claude Haiku 5.5, o W4 mediu nos writers dedicados (PELVE/MSK, cenário A)
 * markdown em 11/22 laudos e, em 11/22, um bloco do próprio modelo depois da
 * conclusão — "**Pontos para conferir antes de assinar:**", "Obs. para revisão: o
 * ditado…", "Observações: Interpretei…" — que o `normalizeMskWriterFormat` não
 * limpava e que iria para o texto copiado e assinado.
 *
 * Só FORMA e comentário do modelo; nunca conteúdo clínico:
 *  - markdown: negrito com `**`, títulos `#`, crases e separadores `---` (nunca
 *    sublinhado: `____` é o placeholder do laudo);
 *  - bloco de comentário do modelo: um cabeçalho de comentário ("Observação",
 *    "Obs.", "Nota", "Pontos para conferir…", "Pendências…") que fale do ditado ou
 *    do próprio trabalho do modelo ("o ditado", "interpretei", "usei", "confirme"…),
 *    com os itens que o seguem. Observação CLÍNICA do modelo curado (ex.: "Observação:
 *    a avaliação por via transabdominal possui limitações…") e rodapés de referência
 *    (BI-RADS, Domingos/ACR) ficam.
 */

/** Linha anexada ao system de todo writer (o guard abaixo limpa o que escapar). */
export const WRITER_OUTPUT_RULE =
  "SAÍDA: só o texto do laudo, sem markdown (sem **, #, crases ou listas com hífen) e sem nada seu depois da " +
  "CONCLUSÃO/IMPRESSÃO — nenhuma observação, nota, pendência ou explicação sobre como você interpretou o ditado; " +
  "dúvida real vai como [REVISAR: …] no ponto do laudo a que se refere.";

const COMMENT_HEADER_RE =
  /^\s*(?:\*\*)?\s*(?:observa[çc](?:[ãa]o|[õo]es)|obs\.?|notas?|pend[êe]ncias?|pontos?\s+(?:para|a|de)\s+(?:conferir|confer[êe]ncia|revis[ãa]o|aten[çc][ãa]o)|esclarecimentos?|coment[áa]rios?\s+(?:do|da)\s+(?:modelo|redator|reda[çc][ãa]o)|interpreta[çc][õo]es?)\b[^\n:]{0,80}:/i;

/** O bloco fala do ditado ou do trabalho do modelo (não é texto clínico). */
const META_RE =
  /\b(?:o\s+ditado|do\s+ditado|no\s+ditado|ditad[oa]s?\b|interpretei|considerei|assumi|optei|mantive|omiti|inclu[ií]\b|n[ãa]o\s+inclu[ií]|transcrevi|usei|deixei|coloquei|corrigi|foi\s+lido|foi\s+corrigido|foi\s+inferid|confirme|corrija|se\s+quiser|eu\s+ajusto|antes\s+de\s+assinar|antes\s+do\s+laudo|para\s+revis[ãa]o|para\s+conferir)\b/i;

const LIST_ITEM_RE = /^\s*(?:[-*•]\s+|\d+[.)]\s+)/;

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*\n]+?)\*\*/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/`([^`\n]*)`/g, "$1")
    .replace(/^\s*\*\*\s*$/gm, "")
    // Separador markdown. Sublinhado NUNCA: "____" é o placeholder do laudo.
    .replace(/^\s*(?:-{3,}|\*{3,})\s*$/gm, "");
}

/** Remove os blocos de comentário do modelo. Devolve o texto e os cabeçalhos removidos. */
function stripModelCommentBlocks(text: string): { text: string; removed: string[] } {
  const lines = text.split("\n");
  const out: string[] = [];
  const removed: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (!COMMENT_HEADER_RE.test(line)) {
      out.push(line);
      continue;
    }
    // O bloco: o cabeçalho + itens/continuações; linhas em branco só entram se o
    // próximo conteúdo ainda for item de lista.
    let end = i + 1;
    for (; end < lines.length; end += 1) {
      const next = lines[end]!;
      if (next.trim() === "") {
        const following = lines.slice(end + 1).find((l) => l.trim() !== "");
        if (following !== undefined && LIST_ITEM_RE.test(following)) continue;
        break;
      }
      if (!LIST_ITEM_RE.test(next) && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ]{6,}:?\s*$/.test(next.trim())) break; // próximo cabeçalho do laudo
      if (!LIST_ITEM_RE.test(next) && end > i + 1 && !LIST_ITEM_RE.test(lines[end - 1]!)) break;
    }
    const block = lines.slice(i, end).join("\n");
    if (META_RE.test(block)) {
      removed.push(line.trim().slice(0, 80));
      i = end - 1;
      continue;
    }
    out.push(line);
  }
  return { text: out.join("\n"), removed };
}

export function cleanWriterOutput(text: string): { text: string; removed: string[] } {
  const { text: noComments, removed } = stripModelCommentBlocks(text);
  const cleaned = stripMarkdown(noComments)
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: cleaned, removed };
}
