/**
 * Épico IG determinística — regra Dr. Domingos (DET, 2026-06-17).
 *
 * MÓDULO PURO. Concentra TODA a decisão clínica da idade gestacional (IG) da
 * conclusão obstétrica + a construção das frases (clássico/objetivo) + o cálculo
 * da IG de referência corrigida para a data do exame (R_hoje). OBSTETRICA,
 * MORFOLOGICO e o overlay Doppler consomem este módulo — a regra fica num lugar
 * só, auditável e testável (é o 1º candidato à "tabela de decisão" declarativa).
 *
 * PRINCÍPIO (Dr. Domingos): a ÂNCORA é SEMPRE a biometria atual. A referência
 * precoce (1ª US ou DUM, escolha do médico) só entra na conclusão quando há
 * divergência > threshold. NÃO terceirizamos o dado mais importante a um exame
 * que não fizemos.
 *
 * Design: docs/epico-ig-deterministica-design.md.
 *
 * ⚠️ NÃO use `checkConcordance` de @laudousg/shared aqui: ela implementa a
 * doutrina ACOG PB 700 (DUM como base, thresholds por IG) — OPOSTA à de Domingos.
 * Reusamos APENAS `parseDateBR` (parse de data neutro), envolto em validação
 * ESTRITA (rejeita rollover tipo 31/02) — review adversarial dex2 (bomba #2). A
 * aritmética de datas é local. Nenhum `now()`: a data do exame é SEMPRE entrada
 * (app/ditado); sem ela não há correção (bomba #1).
 */
import { parseDateBR } from "@laudousg/shared";

// ---------------------------------------------------------------------------
// Threshold — ponto único de decisão (trocar p/ ACOG por-IG é 1 linha)
// ---------------------------------------------------------------------------

/** Threshold plano de divergência, em dias (briefing Dr. Domingos). */
export const IG_DIVERGENCE_THRESHOLD_DAYS = 5;

/**
 * Dias de tolerância antes de sinalizar a correção pela referência. Plano = 5
 * (Domingos). Alternativa ACOG PB 700 (por IG: 5/7/10/14/21) fica documentada em
 * gestationalAge.ts#checkConcordance — trocar AQUI se a decisão clínica mudar.
 */
export function igThresholdDays(_biometriaSemanas: number | null): number {
  return IG_DIVERGENCE_THRESHOLD_DAYS;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type IgFonte = "usg_precoce" | "dum";

export interface IgReferencia {
  fonte: IgFonte;
  /** Data da 1ª US ou da DUM (DD/MM/AAAA ou ISO). null se não informada. */
  data: string | null;
  /** IG na data da 1ª US (só usg_precoce). null caso contrário. */
  igNaDataSemanas: number | null;
  igNaDataDias: number | null;
  /** R_hoje ditado DIRETO ("hoje está com 20 e 3") — dispensa aritmética. */
  rHojeSemanas: number | null;
  rHojeDias: number | null;
}

export interface IgComputeInput {
  /** Âncora: IG da biometria atual (ditada). */
  biometriaSemanas: number | null;
  biometriaDias: number | null;
  /** Referência precoce, se houver. */
  referencia: IgReferencia | null;
  /** Data do exame (hoje). DD/MM/AAAA ou ISO. NUNCA now() do servidor. */
  dataExame: string | null;
  /** Sinaliza a correção no caso divergente (toggle conta / comando de voz). */
  corrigir: boolean;
  /**
   * Lead da conclusão âncora. Feto único: "Gestação em torno de ". Gemelar:
   * "Gestação gemelar dicoriônica e diamniótica em torno de " (o renderer monta).
   */
  leadAncora: string;
  /** Lead-base do 2º item objetivo (sempre "Gestação em torno de "). */
  leadBase: string;
}

export type IgCaso =
  | "sem_referencia"
  | "sem_biometria"
  | "concordante"
  | "divergente_leve"
  | "divergente"
  | "divergente_sem_correcao";

export interface IgComputed {
  caso: IgCaso;
  /** IG da biometria (âncora) em dias totais; null se não ditada. */
  biometriaDias: number | null;
  /** R_hoje em {semanas,dias}; null se indeterminável. */
  rHoje: { semanas: number; dias: number } | null;
  /** |A − R_hoje| em dias; null se indeterminável. */
  divergenciaDias: number | null;
  /** Conclusão no estilo clássico (1 string). */
  conclusaoClassico: string;
  /** Conclusão no estilo objetivo (1 ou 2 itens). */
  conclusaoObjetivo: string[];
  /** Frase-prosa da referência p/ o corpo; null se sem dados suficientes. */
  fraseReferencia: string | null;
  /** Label da fonte ("ultrassonografia precoce" | "data da última menstruação"). */
  fonteLabel: string | null;
  /**
   * IG a usar para PERCENTIL Doppler, com a FONTE explícita (bomba #3 dex2: sem
   * fallback silencioso). O caller decide se calcula. `source`:
   *  - "referencia": R_hoje existe (preferível clinicamente).
   *  - "biometria": sem referência → biometria atual (pode estar defasada).
   *  - null (campo ausente): sem IG → NÃO calcular percentil.
   */
  igParaPercentil:
    | { semanas: number; dias: number; source: "referencia" | "biometria" }
    | null;
}

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

function intPtBr(n: number): string {
  return String(n);
}

/**
 * "X semanas" (dias 0/null) ou "X semanas e Y dias". null → placeholder.
 *
 * PLURAL SEMPRE ("semanas"/"dias"), inclusive para 1 — espelha o `formatIg`
 * existente em OBSTETRICA.ts/MORFOLOGICO.ts (byte-stability: este módulo
 * substitui exatamente aquela linha de conclusão). A flexão singular correta
 * ("1 dia") é dívida cosmética GLOBAL do sistema, fora do escopo deste épico.
 */
export function formatIgSemanasDias(
  semanas: number | null,
  dias: number | null,
): string {
  if (semanas === null) return "____ semanas";
  if (dias === null || dias === 0) return `${intPtBr(semanas)} semanas`;
  return `${intPtBr(semanas)} semanas e ${intPtBr(dias)} dias`;
}

/** Dias totais de uma IG {semanas, dias}. */
function igDias(semanas: number, dias: number): number {
  return semanas * 7 + dias;
}

/** {semanas, dias} a partir de dias totais (dias ≥ 0). */
function diasToIg(total: number): { semanas: number; dias: number } {
  return { semanas: Math.floor(total / 7), dias: total % 7 };
}

/** Diferença em dias inteiros (a − b), via T12:00:00 (parseDateBR neutraliza TZ). */
function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Parse ESTRITO de data (DD/MM/AAAA ou ISO YYYY-MM-DD). Diferente de parseDateBR,
 * REJEITA rollover do JS (31/02 → 03/03): valida que os componentes do Date
 * batem com os números informados. Retorna null em data inválida (bomba #2 dex2).
 */
export function parseDataStrict(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = parseDateBR(raw);
  if (!d) return null;
  const m = raw.includes("-")
    ? raw.split("T")[0]!.split("-").map(Number).reverse() // [dd, mm, yyyy]
    : raw.split("/").map(Number); // [dd, mm, yyyy]
  const [dd, mm, yyyy] = m;
  if (
    dd === undefined ||
    mm === undefined ||
    yyyy === undefined ||
    d.getFullYear() !== yyyy ||
    d.getMonth() + 1 !== mm ||
    d.getDate() !== dd
  ) {
    return null;
  }
  return d;
}

/** Exibe a data como DD/MM/AAAA (parse + reformat); usa o valor cru se inválida. */
function fmtData(raw: string): string {
  const d = parseDataStrict(raw);
  if (!d) return raw;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fonteLabelDe(fonte: IgFonte): string {
  return fonte === "usg_precoce"
    ? "ultrassonografia precoce"
    : "data da última menstruação";
}

// ---------------------------------------------------------------------------
// Cálculo de R_hoje (IG de referência corrigida p/ a data do exame)
// ---------------------------------------------------------------------------

/**
 * IG de referência corrigida para hoje. Ordem de precedência:
 *  1. R_hoje ditado DIRETO (rHojeSemanas) — sem aritmética.
 *  2. USG precoce: IG_na_data + dias decorridos (data_exame − data_us).
 *  3. DUM: dias decorridos (data_exame − dum).
 * Retorna null quando faltam dados ou as datas são inválidas/futuras.
 */
export function computeRHoje(
  ref: IgReferencia,
  dataExame: string | null,
): { semanas: number; dias: number } | null {
  // 1. Ditado direto vence (o médico já corrigiu).
  if (ref.rHojeSemanas !== null) {
    return { semanas: ref.rHojeSemanas, dias: ref.rHojeDias ?? 0 };
  }
  // 2/3. Precisa da data do exame e da data da referência (parse ESTRITO).
  if (!dataExame || !ref.data) return null;
  const dExame = parseDataStrict(dataExame);
  const dRef = parseDataStrict(ref.data);
  if (!dExame || !dRef) return null;
  const decorridos = diffDays(dExame, dRef);
  if (decorridos < 0) return null; // referência no futuro → ignora

  if (ref.fonte === "usg_precoce") {
    if (ref.igNaDataSemanas === null) return null;
    const base = igDias(ref.igNaDataSemanas, ref.igNaDataDias ?? 0);
    return diasToIg(base + decorridos);
  }
  // DUM: a IG hoje é simplesmente o tempo decorrido desde a DUM.
  return diasToIg(decorridos);
}

// ---------------------------------------------------------------------------
// Decisão Domingos + construção das frases
// ---------------------------------------------------------------------------

export function computeIg(input: IgComputeInput): IgComputed {
  const {
    biometriaSemanas,
    biometriaDias: bDia,
    referencia,
    dataExame,
    corrigir,
    leadAncora,
    leadBase,
  } = input;

  const fmtA = formatIgSemanasDias(biometriaSemanas, bDia);
  const biometriaDiasTotal =
    biometriaSemanas === null ? null : igDias(biometriaSemanas, bDia ?? 0);

  /** Fonte do percentil Doppler: referência > biometria > nada (sem fallback oculto). */
  function igPercentil(
    rHoje: { semanas: number; dias: number } | null,
  ): IgComputed["igParaPercentil"] {
    if (rHoje) return { semanas: rHoje.semanas, dias: rHoje.dias, source: "referencia" };
    if (biometriaSemanas !== null)
      return { semanas: biometriaSemanas, dias: bDia ?? 0, source: "biometria" };
    return null;
  }

  // Conclusão âncora pura (caso default): só a biometria.
  const ancoraClassico = `${leadAncora}${fmtA}.`;
  const baseResult = (
    caso: IgCaso,
    rHoje: { semanas: number; dias: number } | null,
    extra?: Partial<IgComputed>,
  ): IgComputed => ({
    caso,
    biometriaDias: biometriaDiasTotal,
    rHoje,
    divergenciaDias: null,
    conclusaoClassico: ancoraClassico,
    conclusaoObjetivo: [ancoraClassico],
    fraseReferencia: null,
    fonteLabel: null,
    igParaPercentil: igPercentil(rHoje),
    ...extra,
  });

  if (!referencia) return baseResult("sem_referencia", null);

  const rHoje = computeRHoje(referencia, dataExame);
  const fonteLabel = fonteLabelDe(referencia.fonte);
  const fraseReferencia = buildFraseReferencia(referencia, rHoje);

  // Sem biometria → não há âncora; placeholder (Domingos: biometria é a âncora).
  if (biometriaDiasTotal === null) {
    return baseResult("sem_biometria", rHoje, { fraseReferencia, fonteLabel });
  }
  // Referência indeterminável → degrada p/ biometria pura (nunca quebra).
  if (!rHoje) {
    return baseResult("sem_referencia", null, { fraseReferencia, fonteLabel });
  }

  const rHojeDiasTotal = igDias(rHoje.semanas, rHoje.dias);
  const divergenciaDias = Math.abs(biometriaDiasTotal - rHojeDiasTotal);
  const threshold = igThresholdDays(biometriaSemanas);

  // Concordante ou divergência leve → âncora pura (biometria), sem referenciar.
  if (divergenciaDias === 0) {
    return baseResult("concordante", rHoje, { divergenciaDias, fraseReferencia, fonteLabel });
  }
  if (divergenciaDias <= threshold) {
    return baseResult("divergente_leve", rHoje, { divergenciaDias, fraseReferencia, fonteLabel });
  }
  // Divergência > threshold, mas o médico optou por NÃO corrigir → âncora pura.
  if (!corrigir) {
    return baseResult("divergente_sem_correcao", rHoje, {
      divergenciaDias,
      fraseReferencia,
      fonteLabel,
    });
  }

  // Divergência relevante + corrigir → sinaliza a correção pela referência.
  const fmtR = formatIgSemanasDias(rHoje.semanas, rHoje.dias);
  const conclusaoClassico = `${leadAncora}${fmtA} pela biometria atual, devendo ser corrigida pela ${fonteLabel}, compatível com ${fmtR}.`;
  const conclusaoObjetivo = [
    `${leadAncora}${fmtA} pela biometria atual.`,
    `${leadBase}${fmtR} corrigido pela ${fonteLabel}.`,
  ];
  return {
    caso: "divergente",
    biometriaDias: biometriaDiasTotal,
    rHoje,
    divergenciaDias,
    conclusaoClassico,
    conclusaoObjetivo,
    fraseReferencia,
    fonteLabel,
    igParaPercentil: igPercentil(rHoje),
  };
}

// ---------------------------------------------------------------------------
// Adaptador: campos extraídos (renderer findings) → IgComputeInput
// ---------------------------------------------------------------------------

/** Default do toggle de correção quando nada é dito (Domingos + review dex1). */
export const DEFAULT_CORRIGIR_IG = true;

export interface IgRawFields {
  biometriaSemanas: number | null;
  biometriaDias: number | null;
  dataExame: string | null;
  dum: string | null;
  primeiraUsData: string | null;
  primeiraUsIgSemanas: number | null;
  primeiraUsIgDias: number | null;
  /** R_hoje ditado direto ("hoje está com X"). */
  igRefHojeSemanas: number | null;
  igRefHojeDias: number | null;
  /**
   * Fonte que o médico ATRIBUIU à correção, quando explícita ("pela primeira US",
   * "pela DUM"). Desambigua o caso R_hoje direto + DUM coexistindo (review dex1
   * ALTO). null → cai na heurística US > DUM.
   */
  referenciaFonte: IgFonte | null;
  /** Comando de voz explícito (true/false) ou null. */
  corrigirComando: boolean | null;
}

/**
 * Monta o IgComputeInput a partir dos campos extraídos. Precedência da fonte de
 * referência: **1ª US precoce vence DUM** (US é clinicamente mais confiável —
 * review dex2 #6). `dum` segue sendo impresso como linha de cabeçalho pelo
 * renderer; aqui ele só vira FONTE de correção quando não há 1ª US.
 *
 * Precedência do `corrigir`: comando de voz > toggle da conta > default (true).
 */
export function buildIgInput(
  raw: IgRawFields,
  opts: { leadAncora: string; leadBase: string; corrigirToggle?: boolean | null },
): IgComputeInput {
  const temUsgData =
    raw.primeiraUsData !== null || raw.primeiraUsIgSemanas !== null;
  const temRefHojeDireto = raw.igRefHojeSemanas !== null;

  // Fonte: explícita do extractor VENCE a heurística (review dex1 ALTO). Sem
  // fonte explícita → heurística US > DUM > (R_hoje direto → US).
  let fonte: IgFonte | null = raw.referenciaFonte;
  if (fonte === null) {
    if (temUsgData || (temRefHojeDireto && raw.dum === null)) fonte = "usg_precoce";
    else if (raw.dum !== null) fonte = "dum";
    else if (temRefHojeDireto) fonte = "usg_precoce";
  }

  let referencia: IgReferencia | null = null;
  if (fonte === "usg_precoce") {
    referencia = {
      fonte: "usg_precoce",
      data: raw.primeiraUsData,
      igNaDataSemanas: raw.primeiraUsIgSemanas,
      igNaDataDias: raw.primeiraUsIgDias,
      rHojeSemanas: raw.igRefHojeSemanas,
      rHojeDias: raw.igRefHojeDias,
    };
  } else if (fonte === "dum") {
    referencia = {
      fonte: "dum",
      data: raw.dum,
      igNaDataSemanas: null,
      igNaDataDias: null,
      rHojeSemanas: raw.igRefHojeSemanas,
      rHojeDias: raw.igRefHojeDias,
    };
  }

  const corrigir =
    raw.corrigirComando ?? opts.corrigirToggle ?? DEFAULT_CORRIGIR_IG;

  return {
    biometriaSemanas: raw.biometriaSemanas,
    biometriaDias: raw.biometriaDias,
    referencia,
    dataExame: raw.dataExame,
    corrigir,
    leadAncora: opts.leadAncora,
    leadBase: opts.leadBase,
  };
}

/** Frase-prosa da referência p/ o corpo. null se não há dados suficientes. */
function buildFraseReferencia(
  ref: IgReferencia,
  rHoje: { semanas: number; dias: number } | null,
): string | null {
  if (!rHoje) return null;
  const fmtR = formatIgSemanasDias(rHoje.semanas, rHoje.dias);
  if (ref.fonte === "usg_precoce") {
    if (ref.data && ref.igNaDataSemanas !== null) {
      const fmtNaData = formatIgSemanasDias(ref.igNaDataSemanas, ref.igNaDataDias);
      return `Primeira ultrassonografia realizada ${fmtData(ref.data)} com ${fmtNaData}. Hoje com ${fmtR}.`;
    }
    // R_hoje ditado direto sem data/IG-na-data → prosa degradada.
    return `Primeira ultrassonografia compatível com ${fmtR} na data do exame.`;
  }
  // DUM
  if (ref.data) {
    return `Data da última menstruação em ${fmtData(ref.data)}, correspondente a ${fmtR} na data do exame.`;
  }
  return `Data da última menstruação correspondente a ${fmtR} na data do exame.`;
}
