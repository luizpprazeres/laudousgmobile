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
 *    (BI-RADS, Domingos/ACR) ficam;
 *  - narração do modelo ANTES do título ("…ditado de normalidade. Gero o laudo…"),
 *    só quando inequívoca (ver stripNarrationBeforeTitle).
 */

/**
 * Linha anexada ao system de todo writer (o guard abaixo limpa o que escapar). É o único
 * trecho presente em TODO prompt de writer (completo, Livre e dedicados), por isso carrega
 * também o vocabulário da casa (W14, revisão M03). A marca de dúvida segue as regras da
 * categoria (o global enxuto tem lista fechada) — sem autorização genérica (W14, M02).
 */
export const WRITER_OUTPUT_RULE =
  "SAÍDA: só o texto do laudo, sem markdown (sem **, #, crases ou listas com hífen) e sem nada seu depois da " +
  "CONCLUSÃO/IMPRESSÃO — nenhuma observação, nota, pendência ou explicação sobre como você interpretou o ditado; " +
  "dúvida clínica real vai no ponto do laudo, só com a marca [REVISAR …] e nos casos que as regras acima permitem. " +
  "Vocabulário da casa: hipoecoico, hiperecoico, anecoico e isoecoico (nunca \"hipoecogênico\", \"hiperecogênico\" " +
  "ou \"anecogênico\"), com a concordância de gênero; \"ecogenicidade\" como propriedade continua.";

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

/** Narração do modelo sobre o próprio trabalho ("Gero o laudo…", "Segue o laudo…"). */
const NARRACAO_RE =
  /\b(?:gero|gerei|segue(?:m)?|aqui\s+est[áa]|abaixo|elaborei|redigi|escrevi|montei|preparei)\b[^\n]{0,60}\blaudo\b/i;
/** Rótulo de cabeçalho clínico que pode vir antes do título — nunca é narração. */
const HEADER_LABEL_RE = /^\s*(?:paciente|nome|data|idade|indica[çc][ãa]o|solicitante|m[ée]dic[oa]|convênio|conv[êe]nio|exame)\s*:/i;
/** Cabeçalhos de seção (não são o título do exame). */
const SECAO_RE = /^(?:T[ÉE]CNICA|ACHADOS|CONCLUS[ÃA]O|IMPRESS[ÃA]O|OS SEGUINTES ASPECTOS|COMENT[ÁA]RIOS?|OBSERVA[ÇC][ÃA]O)/;
const TITULO_RE = /^[A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ0-9][A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ0-9 ()/,.+-]{5,}$/;

/**
 * Narração do modelo ANTES do título (rebancada final, abdome 1/38, ead3b7f4: "…: ditado de
 * normalidade. Gero o laudo normal completo a partir do modelo da categoria."). Só sai
 * quando é inequívoco: há um título em maiúsculas depois, o trecho anterior tem até 2
 * linhas/400 caracteres, cada linha fala do ditado ou do próprio trabalho do modelo e
 * nenhuma é rótulo de cabeçalho. Qualquer dúvida → texto intacto.
 */
function stripNarrationBeforeTitle(text: string): { text: string; removed: string[] } {
  // Rótulo "TÍTULO:" na frente do título (PACOTE2, 1/2454 saídas): sai só o rótulo.
  const rotulo = text.match(/^(\s*)T[ÍI]TULO\s*:\s*([^\n]+)/);
  if (rotulo && TITULO_RE.test(rotulo[2]!.trim()) && !SECAO_RE.test(rotulo[2]!.trim())) {
    text = `${rotulo[1]}${rotulo[2]!.trim()}${text.slice(rotulo[0].length)}`;
  }
  const lines = text.split("\n");
  const titulo = lines.findIndex((l) => TITULO_RE.test(l.trim()) && !l.trim().endsWith(":") && !SECAO_RE.test(l.trim()) && /[A-ZÁÉÍÓÚÇ]{3}/.test(l));
  if (titulo <= 0) return { text, removed: [] };
  const antes = lines.slice(0, titulo).filter((l) => l.trim() !== "");
  if (antes.length === 0 || antes.length > 2 || antes.join(" ").length > 400) return { text, removed: [] };
  const narracao = antes.every((l) => !HEADER_LABEL_RE.test(l) && (META_RE.test(l) || NARRACAO_RE.test(l)));
  if (!narracao) return { text, removed: [] };
  return { text: lines.slice(titulo).join("\n"), removed: antes.map((l) => l.trim().slice(0, 80)) };
}

export function cleanWriterOutput(text: string): { text: string; removed: string[] } {
  const narration = stripNarrationBeforeTitle(text);
  const { text: noComments, removed: commentRemoved } = stripModelCommentBlocks(narration.text);
  const removed = [...narration.removed, ...commentRemoved];
  const cleaned = stripMarkdown(noComments)
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text: cleaned, removed };
}
