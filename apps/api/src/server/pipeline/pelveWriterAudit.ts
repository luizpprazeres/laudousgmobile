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
  /** Categoria FIGO no laudo sem o médico ter ditado FIGO (revisão W13, A03). */
  figoInventado: boolean;
  /** Tipo de mioma (intramural/subseroso/submucoso) no laudo sem ter sido ditado (A03). */
  tipoMiomaInventado: string[];
  /** Tipo de mioma ditado que sumiu do laudo (A03). */
  tipoMiomaOmitido: string[];
  /** Medida no laudo que não aparece no ditado (eixo ou volume preenchido pelo modelo, A02). */
  medidasNaoDitadas: string[];
  /** [REVISAR] por dado não ditado — a regra manda omitir a oração (A02). */
  revisaoPorFalta: boolean;
  /** Tipo e categoria FIGO incompatíveis na mesma linha, sem sinalização (A03; tabela do FIGO_RULES). */
  figoTipoIncompativel: string[];
};

/** Tipos compatíveis com cada categoria FIGO (espelho do FIGO_RULES do global; 8 = outros, aceita qualquer). */
const FIGO_TIPOS: Record<string, RegExp> = {
  "0": /submucos/, "1": /submucos/, "2": /submucos/,
  "3": /intramural/, "4": /intramural/,
  "5": /subseros|intramural/, "6": /subseros/, "7": /subseros|pediculad/,
};
function figoTipoConflitos(laudo: string): string[] {
  const out: string[] = [];
  for (const linha of laudo.split("\n")) {
    const m = linha.match(/miomatos[oa]s?\s+([a-zà-ú-]+)[^\n]*?FIGO\s+(\d)(?!\s*-\s*\d)/i);
    if (!m || /\[REVISAR/.test(linha)) continue;
    const re = FIGO_TIPOS[m[2]!];
    if (re && /submucos|intramural|subseros|pediculad/i.test(m[1]!) && !re.test(m[1]!.toLowerCase())) out.push(`${m[1]} × FIGO ${m[2]}`);
  }
  return out;
}

const RE_TIPO_MIOMA = /\b(intramural|subseros[oa]|submucos[oa]|pediculad[oa])\b/gi;
const RE_REVISAO_POR_FALTA = /\[REVISAR[^\]]*(?:n[ãa]o\s+(?:foi\s+)?(?:ditad|informad|mencionad)|ausente|faltando|n[ãa]o\s+consta)/i;

/** Valores numéricos do ditado (qualquer número, com ou sem unidade), em cm e na escala ×10/÷10 (mm↔cm). */
function numerosDoDitado(raw: string): Set<number> {
  const out = new Set<number>();
  // O ASR às vezes separa o decimal por espaço ("volume de 8 4" = 8,4): conta as duas leituras.
  const numeros = [
    ...[...raw.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]),
    ...[...raw.matchAll(/\b(\d{1,3})\s+(\d)\b/g)].map((m) => `${m[1]}.${m[2]}`),
  ];
  for (const n of numeros) {
    const v = parseFloat(n.replace(",", "."));
    for (const x of [v, v / 10, v * 10]) out.add(Math.round(x * 1000) / 1000);
  }
  return out;
}

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

/** O número foi ditado em MILÍMETROS? (ex.: "12 mm" / "12 milímetros"). */
function ditadoEmMm(num: string, raw: string): boolean {
  const pat = num.replace(/[.,]/g, "[.,]");
  return new RegExp(`(?<![\\d.,])${pat}\\s*(?:mm|mil[íi]metros?)\\b`, "i").test(raw);
}

/** Forma em cm (÷10) de um número ditado em mm — "12" → "1.2" (numberInLaudo
 *  já casa vírgula/ponto). Usado p/ tolerar a conversão mm→cm do writer. */
function mmParaCm(num: string): string {
  const v = parseFloat(num.replace(",", ".")) / 10;
  return String(v);
}

const RE_MENOPAUSA = /menop[áa]usic|\bmenopausa\b|ov[áa]rios?\s+atr[óo]fic/i;
const RE_MENOPAUSA_NEG = /pr[ée]-?\s*menopausa|n[ãa]o\s+(?:est[áa]\s+)?(?:na\s+|em\s+)?menopausa/i;
const RE_LIQ_LIVRE = /l[íi]quido\s+livre/i;

export function auditPelveFacts(rawInput: string, laudo: string): PelveAudit {
  const rawLc = rawInput.toLowerCase();
  const laudoLc = laudo.toLowerCase();

  // Medidas ditadas ausentes no laudo (com unidade, via MSK) + volumes sem unidade.
  // Tolerância mm→cm (achado do smoke ampliado): quando o médico dita em mm e o
  // writer converte p/ cm (ex.: "12 mm" → "1,2 cm"), o número literal "12" não está
  // no laudo — mas a forma /10 está. Não é drop; aceita a conversão correta.
  const ditadas = [...extractMeasureNumbers(rawInput), ...extractVolumeNumbers(rawInput)];
  const missingMeasures = [...new Set(ditadas)].filter((n) => {
    if (numberInLaudo(n, laudo)) return false;
    if (ditadoEmMm(n, rawInput) && numberInLaudo(mmParaCm(n), laudo)) return false;
    return true;
  });

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

  const figoInventado = /\bFIGO\s*\d|categoria\s+FIGO/i.test(laudo) && !/\bfigo\b/i.test(rawInput);
  // Tipo compatível com um FIGO ditado não é invenção (FIGO_RULES: "tipo consistente com o número FIGO").
  const figosDitados = [...rawInput.matchAll(/fi[gc]o\W{0,15}(\d)/gi)].map((m) => m[1]!);
  const tipoMiomaInventado = [...new Set([...laudo.matchAll(RE_TIPO_MIOMA)].map((m) => m[1]!.toLowerCase()))]
    .filter((t) => !new RegExp(t.slice(0, 7), "i").test(rawInput))
    .filter((t) => !figosDitados.some((n) => FIGO_TIPOS[n]?.test(t)));
  const tipoMiomaOmitido = [...new Set([...rawInput.matchAll(RE_TIPO_MIOMA)].map((m) => m[1]!.toLowerCase()))]
    .filter((t) => !new RegExp(t.slice(0, 7), "i").test(laudo));
  const doDitado = numerosDoDitado(rawInput);
  // Grupos "A x B x C cm" inteiros (a unidade vem só no fim) + medidas soltas com unidade.
  const doLaudo = [
    ...[...laudo.matchAll(/\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?)+\s*(?:cm|mm)/gi)].flatMap((m) => m[0].match(/\d+(?:[.,]\d+)?/g) ?? []),
    ...extractMeasureNumbers(laudo),
  ];
  const medidasNaoDitadas = [...new Set(doLaudo)].filter(
    (n) => !doDitado.has(Math.round(parseFloat(n.replace(",", ".")) * 1000) / 1000),
  );
  const revisaoPorFalta = RE_REVISAO_POR_FALTA.test(laudo);
  const figoTipoIncompativel = figoTipoConflitos(laudo);

  return {
    ok:
      missingMeasures.length === 0 &&
      !menopausaSemMarca &&
      !liquidoLivreInventado &&
      !placeholder &&
      !figoInventado &&
      tipoMiomaInventado.length === 0 &&
      tipoMiomaOmitido.length === 0 &&
      medidasNaoDitadas.length === 0 &&
      !revisaoPorFalta &&
      figoTipoIncompativel.length === 0,
    missingMeasures,
    menopausaSemMarca,
    liquidoLivreInventado,
    placeholder,
    figoInventado,
    tipoMiomaInventado,
    tipoMiomaOmitido,
    medidasNaoDitadas,
    revisaoPorFalta,
    figoTipoIncompativel,
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
  if (a.figoInventado) partes.push(`categoria FIGO no laudo sem FIGO no ditado`);
  if (a.tipoMiomaInventado.length) partes.push(`tipo de mioma não ditado: ${a.tipoMiomaInventado.join(", ")}`);
  if (a.tipoMiomaOmitido.length) partes.push(`tipo de mioma ditado ausente no laudo: ${a.tipoMiomaOmitido.join(", ")}`);
  if (a.medidasNaoDitadas.length) partes.push(`medida(s) no laudo que não estão no ditado: ${a.medidasNaoDitadas.join(", ")}`);
  if (a.revisaoPorFalta) partes.push(`[REVISAR] por dado não ditado (omitir a oração)`);
  if (a.figoTipoIncompativel.length) partes.push(`tipo do mioma incompatível com a categoria FIGO: ${a.figoTipoIncompativel.join(", ")}`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
