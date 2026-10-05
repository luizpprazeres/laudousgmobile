/**
 * Fact-audit determinístico do DOPPLER_RENAL writer_guarded (guards do Dex2, 03/07).
 * Sinaliza [REVISAR] quando: placeholder ____; classificação de % de estenose;
 * afirmação de estenose SEM critério numérico rastreável no ditado; medida renal
 * ditada ausente do laudo. O gate continua externo a este arquivo.
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
  /** Medidas presentes, mas sem preservar parâmetro e lateralidade do ditado. */
  mismatchedMeasures: string[];
  /** Normalidades ou escopo de avaliação afirmados sem suporte no ditado. */
  unsupportedAssertions: string[];
};

type MeasureParameter = "VPS" | "RAR" | "IR" | "TA" | "IA";
type MeasureSide = "direita" | "esquerda" | "bilateral" | "aorta" | null;
type MeasureFact = { parameter: MeasureParameter; side: MeasureSide; value: number };

const MEASURE_LABELS: ReadonlyArray<{ parameter: MeasureParameter; re: RegExp }> = [
  { parameter: "VPS", re: /\bvps\b|velocidade\s+de\s+pico\s+sist[óo]lic[oa]/gi },
  { parameter: "RAR", re: /\brar\b|rela[çc][ãa]o\s+(?:aorto-?renal|renal\s+aorta)/gi },
  { parameter: "IR", re: /\bir\b|[íi]ndices?\s+de\s+resist(?:[êe]ncia|ividade)/gi },
  { parameter: "TA", re: /\bta\b|tempo\s+de\s+acelera[çc][ãa]o/gi },
  { parameter: "IA", re: /\bia\b|[íi]ndice\s+de\s+acelera[çc][ãa]o/gi },
];

function nearestSide(sentence: string, valueIndex: number, valueLength: number): MeasureSide {
  const occurrences: Array<{ side: Exclude<MeasureSide, null>; index: number }> = [];
  const sideRe = /\b(direit[ao]|esquerd[ao]|bilateral(?:mente)?|aorta(?:\s+abdominal)?|a[óo]rtic[ao])\b/gi;
  let m: RegExpExecArray | null;
  while ((m = sideRe.exec(sentence)) !== null) {
    const token = m[1]!.toLowerCase();
    const side: Exclude<MeasureSide, null> = token.startsWith("direit")
      ? "direita"
      : token.startsWith("esquerd")
        ? "esquerda"
        : token.startsWith("bilateral")
          ? "bilateral"
          : "aorta";
    occurrences.push({ side, index: m.index });
  }
  const before = occurrences
    .filter((o) => o.index < valueIndex && valueIndex - o.index <= 120)
    .sort((a, b) => b.index - a.index)[0];
  const after = occurrences
    .filter((o) => o.index >= valueIndex + valueLength && o.index - (valueIndex + valueLength) <= 120)
    .sort((a, b) => a.index - b.index)[0];

  if (after) {
    const bridge = sentence.slice(valueIndex + valueLength, after.index);
    // "1,3 à direita" e "0,62 bilateralmente" qualificam o valor anterior;
    // vírgula/"e" normalmente iniciam o próximo par ("120, esquerda 110").
    if (/^\s*(?:cm\s*\/\s*s\s*)?(?:à|ao|do\s+lado)?\s*$/i.test(bridge)) return after.side;
  }
  return before?.side ?? after?.side ?? null;
}

/** Extrai fatos tipados o suficiente para detectar troca de parâmetro/lado. */
function extractMeasureFacts(text: string): MeasureFact[] {
  const facts: MeasureFact[] = [];
  const sentences = text.split(/[\n.!?]+/).filter(Boolean);

  for (const sentence of sentences) {
    const labels: Array<{ parameter: MeasureParameter; index: number }> = [];
    for (const def of MEASURE_LABELS) {
      def.re.lastIndex = 0;
      let lm: RegExpExecArray | null;
      while ((lm = def.re.exec(sentence)) !== null) labels.push({ parameter: def.parameter, index: lm.index });
    }
    if (!labels.length) continue;

    const numberRe = /\b\d{1,3}(?:[.,]\d+)?\b/g;
    let nm: RegExpExecArray | null;
    while ((nm = numberRe.exec(sentence)) !== null) {
      const value = Number(nm[0].replace(",", "."));
      const labelBefore = labels
        .map((l) => ({ ...l, distance: nm!.index - l.index }))
        .filter((l) => l.distance >= 0 && l.distance <= 80)
        .sort((a, b) => a.distance - b.distance)[0];
      const labelAfter = labels
        .map((l) => ({ ...l, distance: l.index - nm!.index }))
        .filter((l) => l.distance > 0 && l.distance <= 80)
        .sort((a, b) => a.distance - b.distance)[0];
      // Em frases compostas, o rótulo imediatamente anterior pertence ao valor;
      // um novo rótulo depois do número já inicia o parâmetro seguinte.
      const nearestLabel = labelBefore ?? labelAfter;
      if (!nearestLabel) continue;

      // RAR/IR são decimais; isto evita capturar números de frequência/ângulo próximos.
      if ((nearestLabel.parameter === "RAR" || nearestLabel.parameter === "IR") && !/[.,]/.test(nm[0])) continue;
      // VPS renal/aórtica é expressa em cm/s e, no contrato atual, em inteiros.
      if (nearestLabel.parameter === "VPS" && /[.,]/.test(nm[0])) continue;

      const detectedSide = nearestSide(sentence, nm.index, nm[0].length);
      // Em "relação renal-aorta", "aorta" nomeia o parâmetro RAR; não é lateralidade.
      const side = nearestLabel.parameter !== "VPS" && detectedSide === "aorta" ? null : detectedSide;
      facts.push({ parameter: nearestLabel.parameter, side, value });
    }
  }

  return facts.filter((fact, index, all) =>
    all.findIndex((other) => other.parameter === fact.parameter && other.side === fact.side && other.value === fact.value) === index,
  );
}

function sameMeasureFact(expected: MeasureFact, actual: MeasureFact[]): boolean {
  const sameValueAndParameter = actual.filter((f) =>
    f.parameter === expected.parameter && Math.abs(f.value - expected.value) < 0.0001,
  );
  if (expected.side === null) return sameValueAndParameter.length > 0;
  if (expected.side === "bilateral") {
    return sameValueAndParameter.some((f) => f.side === "bilateral") ||
      (["direita", "esquerda"] as const).every((side) => sameValueAndParameter.some((f) => f.side === side));
  }
  return sameValueAndParameter.some((f) => f.side === expected.side);
}

function formatMeasureFact(fact: MeasureFact): string {
  const value = String(fact.value).replace(".", ",");
  return `${fact.parameter}${fact.side ? ` ${fact.side}` : ""} ${value}`;
}

function findUnsupportedAssertions(rawInput: string, laudo: string, rawFacts: MeasureFact[]): string[] {
  const output = laudo.toLowerCase();
  const issues: string[] = [];

  const rawMentionsAorta = /\baorta\b/i.test(rawInput);
  const rawDescribesNormalAorta = /\baorta\b[^.\n]{0,70}(?:normal|preservad|calibre|contorn)|(?:normal|preservad|calibre|contorn)[^.\n]{0,70}\baorta\b/i.test(rawInput);
  if (!rawMentionsAorta && /\baorta\b[^.\n]{0,90}(?:avaliad|vps|calibre|contorn|preservad|normal)/i.test(laudo)) {
    issues.push("aorta descrita sem ter sido mencionada no ditado");
  } else if (!rawDescribesNormalAorta && /\baorta\b[^.\n]{0,80}(?:calibre|contorn)[^.\n]{0,35}preservad|\baorta\b[^.\n]{0,50}\bnormal/i.test(laudo)) {
    issues.push("normalidade morfológica da aorta não ditada");
  }

  const hasRight = /\bdireit[ao]\b/i.test(rawInput) || rawFacts.some((f) => f.side === "direita");
  const hasLeft = /\besquerd[ao]\b/i.test(rawInput) || rawFacts.some((f) => f.side === "esquerda");
  const supportsBilateral = /\bbilateral(?:mente)?\b|\bambas?\b/i.test(rawInput) || (hasRight && hasLeft);
  if (!supportsBilateral && (
    /fluxo\s+preservado\s+bilateralmente/i.test(laudo) ||
    /art[ée]rias\s+renais[^.\n]{0,100}sem\s+evid[êe]ncia[^.\n]{0,60}estenose/i.test(laudo)
  )) {
    issues.push("fluxo bilateral normal afirmado sem avaliação dos dois lados");
  }

  const rawIrFacts = rawFacts.filter((f) => f.parameter === "IR");
  const outputClaimsNormalIr = /[íi]ndices?\s+de\s+resist(?:[êe]ncia|ividade)[^.\n]{0,70}(?:normal|dentro\s+dos\s+limites)/i.test(laudo);
  const rawMentionsIr = /\bir\b|[íi]ndices?\s+de\s+resist/i.test(rawInput);
  if (outputClaimsNormalIr && rawIrFacts.length === 0 && !rawMentionsIr) {
    issues.push("IR normal afirmado sem IR no ditado");
  } else if (outputClaimsNormalIr && /bilateral/i.test(output) && !rawIrFacts.some((f) => f.side === "bilateral") &&
      !(rawIrFacts.some((f) => f.side === "direita") && rawIrFacts.some((f) => f.side === "esquerda"))) {
    issues.push("IR bilateral normal afirmado sem IR dos dois lados");
  }
  if (outputClaimsNormalIr && rawIrFacts.some((f) => f.value < 0.55 || f.value > 0.70)) {
    issues.push("IR fora da faixa adotada tratado como normal");
  }

  return [...new Set(issues)];
}

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
  const lateral = text.split(/[.!?\n]+/).flatMap((sentence) =>
    /\bvps\b|velocidade\s+de\s+pico\s+sist/i.test(sentence)
      ? collect(/(?:à\s+)?(?:direita|esquerda)\s+(\d{2,3})(?![.,]?\d)/gi, sentence)
      : [],
  );
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

function kidneyMaxAxes(text: string): Partial<Record<"direita" | "esquerda", number>> {
  const out: Partial<Record<"direita" | "esquerda", number>> = {};
  for (const side of ["direita", "esquerda"] as const) {
    const re = new RegExp(`rim\\s+${side.replace("a", "[oa]")}[^.\\n]{0,220}?(\\d+[,.]\\d+)\\s*(?:cm\\s*)?(?:x|×|por)\\s*(\\d+[,.]\\d+)\\s*(?:cm\\s*)?(?:x|×|por)\\s*(\\d+[,.]\\d+)`, "i");
    const m = text.match(re);
    if (m) out[side] = Math.max(...m.slice(1, 4).map((v) => Number(v!.replace(",", "."))));
  }
  return out;
}

function allowedRarPlaceholder(rawInput: string, laudo: string, vps: number[]): boolean {
  if (!laudo.includes("____")) return false;
  const occurrences = laudo.match(/____/g)?.length ?? 0;
  const exact = /Art[ée]ria renal (?:direita|esquerda) com sinais de estenose, apresentando velocidade de pico sist[óo]lico de \d{2,3} cm\/s no segmento [^.,;\n]+ e rela[çc][ãa]o aorto-renal de ____\./i.test(laudo);
  const rawExplainsMissingAorta = /\brar\b/i.test(rawInput) &&
    /n[ãa]o\s+(?:foi\s+)?poss[íi]vel\s+calcular|n[ãa]o\s+calculad|pendente/i.test(rawInput) &&
    /aorta|a[óo]rtic/i.test(rawInput);
  return occurrences === 1 && exact && rawExplainsMissingAorta && vps.some((v) => v > 250);
}

export function auditDopplerRenalFacts(rawInput: string, laudo: string): DopplerRenalAudit {
  const vps = extractVps(rawInput);
  const placeholder = laudo.includes("____") && !allowedRarPlaceholder(rawInput, laudo, vps);

  // % de estenose no laudo (proibido).
  const percentEstenose = /estenose[^.]{0,40}\d{1,3}\s*%|\d{1,3}\s*%[^.]{0,40}estenose/i.test(laudo);

  // Critério forte de estenose PRESENTE no ditado?
  const rar = extractRar(rawInput);
  const hasVpsHigh = vps.some((v) => v > 250);
  // RAR e confirmação verbal isolada não autorizam conclusão enquanto o limiar
  // da RAR estiver clinicamente pendente.
  const criterioForte = hasVpsHigh;

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

  const rawFacts = extractMeasureFacts(rawInput);
  const outputFacts = extractMeasureFacts(laudo);
  const mismatchedMeasures = rawFacts
    .filter((fact) => !sameMeasureFact(fact, outputFacts))
    .map(formatMeasureFact);
  const unsupportedAssertions = findUnsupportedAssertions(rawInput, laudo, rawFacts);

  const rawAxes = kidneyMaxAxes(rawInput);
  const axisDifference = rawAxes.direita !== undefined && rawAxes.esquerda !== undefined
    ? Math.abs(rawAxes.direita - rawAxes.esquerda)
    : null;
  const conclusion = laudo.split(/CONCLUS[ÃA]O:/i)[1] ?? "";
  const concludesAsymmetry = /assimetria\s+renal/i.test(conclusion);
  if (axisDifference !== null && axisDifference > 1.8001 && !concludesAsymmetry) {
    unsupportedAssertions.push("assimetria renal > 1,8 cm ausente da conclusão");
  }
  if (axisDifference !== null && axisDifference <= 1.8001 && concludesAsymmetry) {
    unsupportedAssertions.push("assimetria renal concluída sem diferença estritamente > 1,8 cm");
  }

  if (/\boclus[ãa]o|\boclu[ií]d/i.test(laudo) && !/\boclus[ãa]o|\boclu[ií]d/i.test(rawInput)) {
    unsupportedAssertions.push("oclusão inferida a partir de fluxo não detectado");
  }
  if (/reestenose/i.test(laudo) && !/reestenose/i.test(rawInput)) {
    unsupportedAssertions.push("reestenose classificada sem confirmação no ditado");
  }

  return {
    ok: !placeholder && !percentEstenose && !estenoseSemCriterio && missingMeasures.length === 0 &&
      mismatchedMeasures.length === 0 && unsupportedAssertions.length === 0,
    placeholder,
    percentEstenose,
    estenoseSemCriterio,
    missingMeasures,
    mismatchedMeasures,
    unsupportedAssertions,
  };
}

export function dopplerRenalRevisarNote(a: DopplerRenalAudit): string | null {
  if (a.ok) return null;
  const partes: string[] = [];
  if (a.placeholder) partes.push(`placeholder "____" no laudo`);
  if (a.percentEstenose) partes.push(`classificação de % de estenose (Doppler não classifica percentual)`);
  if (a.estenoseSemCriterio) partes.push(`estenose hemodinamicamente significativa afirmada SEM VPS renal >250 cm/s no ditado`);
  if (a.missingMeasures.length) partes.push(`medida(s) ditada(s) não localizada(s): ${a.missingMeasures.join(", ")}`);
  if (a.mismatchedMeasures.length) partes.push(`parâmetro/lateralidade divergente: ${a.mismatchedMeasures.join(", ")}`);
  if (a.unsupportedAssertions.length) partes.push(...a.unsupportedAssertions);
  return `[REVISAR: ${partes.join(" · ")}]`;
}

/** Falha fechada: um laudo renal com divergência crítica não pode ser entregue. */
export class DopplerRenalAuditError extends Error {
  readonly code = "DOPPLER_RENAL_AUDIT_FAILED";

  constructor(readonly audit: DopplerRenalAudit) {
    super(dopplerRenalRevisarNote(audit) ?? "Falha na auditoria do Doppler renal");
    this.name = "DopplerRenalAuditError";
  }
}

export function isDopplerRenalAuditError(error: unknown): error is DopplerRenalAuditError {
  return error instanceof DopplerRenalAuditError ||
    (typeof error === "object" && error !== null &&
      (error as { code?: unknown }).code === "DOPPLER_RENAL_AUDIT_FAILED");
}

export function assertDopplerRenalAuditPassed(audit: DopplerRenalAudit): void {
  if (!audit.ok) throw new DopplerRenalAuditError(audit);
}
