/**
 * Fact-audit determinístico do DOPPLER_RENAL writer_guarded (guards do Dex2, 03/07).
 * Sinaliza [REVISAR] quando: placeholder ____; classificação de % de estenose;
 * afirmação de estenose SEM critério forte no ditado (VPS>250 OU RAR>3,2 OU
 * "estenose"/"tardus" explícitos); medida (VPS/RAR/IR) ditada ausente do laudo.
 */

export type DopplerRenalAudit = {
  ok: boolean;
  placeholder: boolean;
  /** Laudo classifica % de estenose (Doppler não tem precisão — proibido). */
  percentEstenose: boolean;
  /** Laudo afirma estenose significativa sem critério forte no ditado. */
  estenoseSemCriterio: boolean;
  /** Medidas ditadas (VPS/RAR/IR) ausentes do laudo. */
  missingMeasures: string[];
};

function collect(re: RegExp, text: string): number[] {
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const g = (m[1] ?? m[2])!;
    out.push(Number(g.replace(",", ".")));
  }
  return out;
}

/** Números de VPS ditados (int, cm/s). Tolera palavras entre o rótulo e o número
 *  (review dex1: "VPS à direita 120 e à esquerda 110") + valor lateral sem prefixo. */
function extractVps(text: string): number[] {
  // "VPS ... 120", "velocidade de pico sistólico ... 95", "120 cm/s".
  const rotulado = collect(/(?:vps|velocidade\s+de\s+pico\s+sist[óo]lico)[^0-9]{0,18}?(\d{2,3})|(\d{2,3})\s*(?:cm\/s|cent[íi]metros?\s+por\s+segundo)/gi, text);
  // "à direita 120", "à esquerda 110" (int 2-3 dígitos, NÃO decimal → não pega RAR/IR).
  const lateral = collect(/(?:à\s+)?(?:direita|esquerda)\s+(\d{2,3})(?![.,]?\d)/gi, text);
  return [...rotulado, ...lateral];
}

/** Valores de RAR ditados (decimal). Tolera palavras entre o rótulo e o número
 *  (review dex1: "RAR direita 1,3, esquerda 1,2"). */
function extractRar(text: string): number[] {
  return collect(/(?:\brar\b|rela[çc][ãa]o\s+(?:aorto-?renal|renal\s+aorta))[^0-9]{0,20}?(\d+[.,]\d+)/gi, text);
}

/** Valores de IR ditados (decimal). */
function extractIr(text: string): number[] {
  return collect(/(?:\bir\b|[íi]ndices?\s+de\s+resist\w+)[^0-9]{0,30}?(\d+[.,]\d+)/gi, text);
}

/** Segundo valor decimal por lado sem repetir o rótulo ("... esquerda 1,2"/"esquerda 0,64").
 *  Type-agnóstico (RAR ou IR) — o audit só checa presença do NÚMERO. */
function extractSideDecimals(text: string): number[] {
  return collect(/(?:à\s+)?(?:direita|esquerda)\s+(\d+[.,]\d+)/gi, text);
}

/** O número (com grafia decimal vírgula/ponto) está no laudo? */
function inLaudo(nStr: string, laudo: string): boolean {
  return laudo.includes(nStr.replace(",", ".")) || laudo.includes(nStr.replace(".", ","));
}

// Estenose afirmada no laudo = a FRASE está presente E NÃO está negada (review dex1:
// pegar também a afirmação "pelada", ex.: "Estenose hemodinamicamente significativa da
// artéria renal direita", sem o lead "com sinais/apresenta/achados de").
const RE_ESTENOSE_FRASE = /estenose\s+hemodinamicamente\s+significativa/i;
const RE_ESTENOSE_NEGADA =
  /(?:sem\s+(?:evid[êe]ncia|sinais?)[^.]{0,45}?|aus[êe]ncia\s+de[^.]{0,25}?|n[ãa]o\s+h[áa][^.]{0,25}?)estenose\s+hemodinamicamente\s+significativa/i;
const RE_TARDUS = /tardus[-\s]?parvus/i;

export function auditDopplerRenalFacts(rawInput: string, laudo: string): DopplerRenalAudit {
  const rawLc = rawInput.toLowerCase();

  const placeholder = laudo.includes("____");

  // % de estenose no laudo (proibido).
  const percentEstenose = /estenose[^.]{0,40}\d{1,3}\s*%|\d{1,3}\s*%[^.]{0,40}estenose/i.test(laudo);

  // Critério forte de estenose PRESENTE no ditado?
  const vps = extractVps(rawInput);
  const rar = extractRar(rawInput);
  const hasVpsHigh = vps.some((v) => v > 250);
  const hasRarHigh = rar.some((r) => r > 3.2);
  const estenoseNegada = /sem\s+(?:sinais?\s+de\s+)?estenose|aus[êe]ncia\s+de\s+estenose/i.test(rawLc);
  const estenoseDitada = (/\bestenose\b/i.test(rawLc) && !estenoseNegada) || RE_TARDUS.test(rawLc);
  const criterioForte = hasVpsHigh || hasRarHigh || estenoseDitada;

  const estenoseAfirmadaNoLaudo = RE_ESTENOSE_FRASE.test(laudo) && !RE_ESTENOSE_NEGADA.test(laudo);
  const estenoseSemCriterio = estenoseAfirmadaNoLaudo && !criterioForte;

  // Medidas ditadas ausentes do laudo (VPS int + RAR/IR decimais + decimais laterais
  // sem rótulo repetido, ex.: "…esquerda 1,2").
  const ditadas = [
    ...vps.map((v) => String(v)),
    ...rar.map((r) => String(r).replace(".", ",")),
    ...extractIr(rawInput).map((v) => String(v).replace(".", ",")),
    ...extractSideDecimals(rawInput).map((v) => String(v).replace(".", ",")),
  ];
  const missingMeasures = [...new Set(ditadas)].filter((n) => !inLaudo(n, laudo));

  return {
    ok: !placeholder && !percentEstenose && !estenoseSemCriterio && missingMeasures.length === 0,
    placeholder,
    percentEstenose,
    estenoseSemCriterio,
    missingMeasures,
  };
}

export function dopplerRenalRevisarNote(a: DopplerRenalAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.placeholder) partes.push(`placeholder "____" no laudo`);
  if (a.percentEstenose) partes.push(`classificação de % de estenose (Doppler não classifica percentual)`);
  if (a.estenoseSemCriterio) partes.push(`estenose hemodinamicamente significativa afirmada SEM critério forte no ditado (VPS>250 ou RAR>3,2)`);
  if (a.missingMeasures.length) partes.push(`medida(s) ditada(s) não localizada(s): ${a.missingMeasures.join(", ")}`);
  return `[REVISAR: ${partes.join(" · ")}]`;
}
