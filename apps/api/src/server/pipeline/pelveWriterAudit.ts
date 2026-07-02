/**
 * Fact-audit determinístico do PELVE writer_guarded — mesma receita do MSK/PARTES_MOLES.
 * Compara o DITADO com o LAUDO e sinaliza FATOS objetivos que faltam/sobram. Não julga
 * prosa. Falha → anexa "[REVISAR: …]" ao fim (não re-roda — mantém o TTFT).
 */
import { extractMeasureNumbers, numberInLaudo } from "./mskWriterAudit";

export type PelveAudit = {
  ok: boolean;
  /** Medidas ditadas (número) não encontradas no laudo. */
  missingMeasures: string[];
  /** Menopausa ditada mas laudo NÃO tem "praticamente sem folículos". */
  menopausaSemMarca: boolean;
  /** Laudo alucina "líquido livre" sem o médico ter ditado (anti-líquido-livre). */
  liquidoLivreInventado: boolean;
  /** Placeholder "____" no laudo (proibido). */
  placeholder: boolean;
};

/** Números de VOLUME ditados sem unidade adjacente ("volume de 69,8", "volume
 *  aumentado de 189,1", "volume 54,0") — o extractMeasureNumbers (com unidade) não
 *  os pega, mas o volume é fato crítico (vai na conclusão). O "de" é OPCIONAL
 *  (review dex1: o médico dita "volume 54,0" sem "de"). */
function extractVolumeNumbers(text: string): string[] {
  const re = /volume\s+(?:normal\s+|aumentado\s+|reduzido\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]!);
  return out;
}

const RE_MENOPAUSA = /menop[áa]usic|\bmenopausa\b|ov[áa]rios?\s+atr[óo]fic/i;
const RE_MENOPAUSA_NEG = /pr[ée]-?\s*menopausa|n[ãa]o\s+(?:est[áa]\s+)?(?:na\s+|em\s+)?menopausa/i;
const RE_LIQ_LIVRE = /l[íi]quido\s+livre/i;

export function auditPelveFacts(rawInput: string, laudo: string): PelveAudit {
  const rawLc = rawInput.toLowerCase();
  const laudoLc = laudo.toLowerCase();

  // Medidas ditadas ausentes no laudo (com unidade, via MSK) + volumes sem unidade.
  const ditadas = [...extractMeasureNumbers(rawInput), ...extractVolumeNumbers(rawInput)];
  const missingMeasures = [...new Set(ditadas)].filter((n) => !numberInLaudo(n, laudo));

  // Menopausa ditada → o laudo TEM que marcar "praticamente sem folículos".
  const menopausaDitada = RE_MENOPAUSA.test(rawLc) && !RE_MENOPAUSA_NEG.test(rawLc);
  const menopausaSemMarca =
    menopausaDitada && !/praticamente sem fol[íi]culos/.test(laudoLc);

  // Anti-líquido-livre: o laudo menciona "líquido livre" POSITIVAMENTE sem o médico
  // ter ditado. NÃO conta menção NEGADA ("ausência de/sem/não há líquido livre") —
  // review dex1: evita falso-positivo quando o writer escreve a negação de rotina.
  const liqLivreNoLaudo = RE_LIQ_LIVRE.test(laudoLc);
  const liqLivreNegado = /(aus[êe]ncia\s+de|sem|n[ãa]o\s+h[áa]|n[ãa]o\s+se\s+observ\w+)\s+l[íi]quido\s+livre/i.test(laudoLc);
  const liquidoLivreInventado =
    liqLivreNoLaudo && !liqLivreNegado && !RE_LIQ_LIVRE.test(rawLc);

  const placeholder = laudo.includes("____");

  return {
    ok:
      missingMeasures.length === 0 &&
      !menopausaSemMarca &&
      !liquidoLivreInventado &&
      !placeholder,
    missingMeasures,
    menopausaSemMarca,
    liquidoLivreInventado,
    placeholder,
  };
}

/** Nota "[REVISAR: …]" para anexar ao fim do laudo quando o audit falha. */
export function pelveRevisarNote(a: PelveAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.missingMeasures.length) partes.push(`medida(s) ditada(s) não localizada(s) no texto: ${a.missingMeasures.join(", ")}`);
  if (a.menopausaSemMarca) partes.push(`menopausa ditada mas ovários não marcados como "praticamente sem folículos"`);
  if (a.liquidoLivreInventado) partes.push(`"líquido livre" no laudo sem o médico ter ditado (confirmar se não é coleção ovariana)`);
  if (a.placeholder) partes.push(`placeholder "____" no laudo`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
