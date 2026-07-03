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

/** Números de VPS ditados (int, cm/s) — "VPS 120", "120 cm/s", "95 centímetros por segundo". */
function extractVps(text: string): number[] {
  const out: number[] = [];
  const re = /(?:vps\s*(?:de\s*)?|velocidade\s+de\s+pico\s+sist[óo]lico\s+de\s+)(\d{2,3})|(\d{2,3})\s*(?:cm\/s|cent[íi]metros?\s+por\s+segundo)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(Number(m[1] ?? m[2]));
  return out;
}

/** Valores de RAR ditados (decimal). "RAR 1,3", "relação aorto-renal de 3,8", "relação renal aorta de 1,8". */
function extractRar(text: string): number[] {
  const out: number[] = [];
  const re = /(?:\brar\b|rela[çc][ãa]o\s+(?:aorto-?renal|renal\s+aorta))\s*(?:de\s*)?(\d+[.,]\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(Number(m[1]!.replace(",", ".")));
  return out;
}

/** Valores de IR ditados (decimal). "IR 0,62", "índices de resistividade de 0,50". */
function extractIr(text: string): number[] {
  const out: number[] = [];
  const re = /(?:\bir\b|[íi]ndices?\s+de\s+resist\w+)[^0-9]{0,30}?(\d+[.,]\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(Number(m[1]!.replace(",", ".")));
  return out;
}

/** O número (com grafia decimal vírgula/ponto) está no laudo? */
function inLaudo(nStr: string, laudo: string): boolean {
  return laudo.includes(nStr.replace(",", ".")) || laudo.includes(nStr.replace(".", ","));
}

// AFIRMAÇÃO positiva de estenose ("com sinais ecográficos de estenose … significativa"
// / "apresentando estenose …"). NÃO casa a forma NEGADA da conclusão normal ("SEM
// evidência ecográfica de estenose hemodinamicamente significativa").
const RE_ESTENOSE_AFIRMADA =
  /(?:com\s+sinais?|apresent\w+|achados?\s+de)\s+(?:ecogr[áa]ficos?\s+)?(?:de\s+)?estenose\s+hemodinamicamente\s+significativa/i;
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

  const estenoseSemCriterio = RE_ESTENOSE_AFIRMADA.test(laudo) && !criterioForte;

  // Medidas ditadas ausentes do laudo (VPS int + RAR/IR decimais).
  const ditadas = [
    ...vps.map((v) => String(v)),
    ...rar.map((r) => String(r).replace(".", ",")),
    ...extractIr(rawInput).map((v) => String(v).replace(".", ",")),
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
