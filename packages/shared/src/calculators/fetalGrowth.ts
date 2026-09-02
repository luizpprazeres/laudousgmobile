/**
 * Classificação de feto pequeno / restrição do crescimento fetal.
 *
 * Fonte clínica autoritativa:
 * Fetal Medicine Barcelona — "Fetal growth defects", versão publicada em
 * novembro de 2024. Este módulo NÃO calcula o percentil do peso: ele recebe o
 * percentil produzido pela curva escolhida e classifica os achados.
 *
 * Travas deliberadas:
 * - PIG exige PFE >= p3 e < p10, além de Doppler completo e normal;
 * - critérios que o protocolo exige em duas medidas não fecham estágio com
 *   apenas um exame;
 * - achado Doppler isolado com PFE >= p10 não vira RCF;
 * - nenhum estágio é inferido de texto livre.
 */

export const FETAL_GROWTH_PROTOCOL_VERSION =
  "FMB-FETAL-GROWTH-DEFECTS-2024-11";

export const FETAL_GROWTH_PROTOCOL_REFERENCE =
  "Classificação baseada no protocolo Fetal Growth Defects da Fetal Medicine Barcelona (versão publicada em novembro de 2024).";

export type FetalGrowthClassification =
  | "adequate_for_gestational_age"
  | "small_for_gestational_age"
  | "fetal_growth_restriction_stage_1"
  | "fetal_growth_restriction_stage_2"
  | "fetal_growth_restriction_stage_3"
  | "fetal_growth_restriction_stage_4"
  | "small_fetus_staging_incomplete";

export type FetalGrowthStage = 1 | 2 | 3 | 4;

export interface RepeatedCriterion {
  /** O achado está presente no exame atual. */
  present: boolean;
  /** O achado foi confirmado no intervalo mínimo exigido pelo protocolo. */
  confirmed: boolean;
}

export interface DuctusVenosusCriteria {
  piAboveP95?: boolean;
  diastolicFlow?: "present" | "absent" | "reversed";
  persistentDicroticVenousPulsations?: boolean;
  /** Duas determinações com intervalo superior a 6–12 horas. */
  confirmedAfter6To12Hours?: boolean;
}

export interface FetalGrowthInput {
  /** Percentil do peso fetal estimado, calculado por curva identificada. */
  efwPercentile: number;
  efwPercentileSource: string;
  gestationalWeeks?: number;
  gestationalDays?: number;

  /**
   * Verdadeiro somente quando UA, ACM, RCP e uterinas foram avaliadas e não há
   * alteração. Necessário para concluir PIG; ausência significa avaliação
   * incompleta, não normalidade.
   */
  dopplerAssessmentCompleteAndNormal?: boolean;

  cprBelowP5?: RepeatedCriterion;
  mcaPiBelowP5?: RepeatedCriterion;
  meanUterinePiAboveP95?: boolean;

  umbilicalArteryEndDiastolicFlow?: "present" | "absent" | "reversed";
  /** Alteração em mais de 50% dos ciclos, documentada nas duas artérias. */
  umbilicalFlowAbnormalInMajorityBothArteries?: boolean;
  /** Duas determinações: >12 h para fluxo ausente; >6–12 h para reverso. */
  umbilicalFlowConfirmedInRequiredInterval?: boolean;

  ductusVenosus?: DuctusVenosusCriteria;
  pathologicalCtg?: boolean;
}

export interface FetalGrowthCriterionResult {
  stage: FetalGrowthStage;
  code:
    | "efw_below_p3"
    | "cpr_below_p5"
    | "mca_pi_below_p5"
    | "mean_uterine_pi_above_p95"
    | "umbilical_absent_end_diastolic_flow"
    | "umbilical_reversed_end_diastolic_flow"
    | "ductus_venosus_pi_above_p95"
    | "ductus_venosus_absent_diastolic_flow"
    | "persistent_dicrotic_venous_pulsations"
    | "pathological_ctg"
    | "ductus_venosus_reversed_diastolic_flow";
  label: string;
  confirmed: boolean;
  confirmationRequirement?: string;
}

export interface FetalGrowthResult {
  classification: FetalGrowthClassification;
  stage?: FetalGrowthStage;
  confirmedCriteria: FetalGrowthCriterionResult[];
  pendingCriteria: FetalGrowthCriterionResult[];
  warnings: string[];
  conclusion: string;
  reportReference: string;
  protocolVersion: typeof FETAL_GROWTH_PROTOCOL_VERSION;
  efwPercentile: number;
  efwPercentileSource: string;
}

const UA_ABSENT_CONFIRMATION =
  "Documentar em mais de 50% dos ciclos nas duas artérias e confirmar em duas determinações com intervalo superior a 12 horas.";
const UA_REVERSED_CONFIRMATION =
  "Documentar em mais de 50% dos ciclos nas duas artérias e confirmar em duas determinações com intervalo superior a 6–12 horas.";
const TWO_AFTER_12_HOURS =
  "Confirmar em duas determinações com intervalo superior a 12 horas.";
const TWO_AFTER_6_TO_12_HOURS =
  "Confirmar em duas determinações com intervalo superior a 6–12 horas.";

function criterion(
  stage: FetalGrowthStage,
  code: FetalGrowthCriterionResult["code"],
  label: string,
  confirmed: boolean,
  confirmationRequirement?: string,
): FetalGrowthCriterionResult {
  const result: FetalGrowthCriterionResult = {
    stage,
    code,
    label,
    confirmed,
  };
  if (confirmationRequirement) result.confirmationRequirement = confirmationRequirement;
  return result;
}

function assertValidInput(input: FetalGrowthInput): void {
  if (!Number.isFinite(input.efwPercentile) ||
      input.efwPercentile < 0 || input.efwPercentile > 100) {
    throw new RangeError("O percentil do peso fetal deve estar entre 0 e 100.");
  }
  if (!input.efwPercentileSource.trim()) {
    throw new TypeError("A fonte do percentil do peso fetal é obrigatória.");
  }
  if (input.gestationalWeeks !== undefined &&
      (!Number.isInteger(input.gestationalWeeks) ||
       input.gestationalWeeks < 4 || input.gestationalWeeks > 44)) {
    throw new RangeError("A idade gestacional deve estar entre 4 e 44 semanas.");
  }
  if (input.gestationalDays !== undefined &&
      (!Number.isInteger(input.gestationalDays) ||
       input.gestationalDays < 0 || input.gestationalDays > 6)) {
    throw new RangeError("Os dias da idade gestacional devem estar entre 0 e 6.");
  }
}

function stageConclusion(stage: FetalGrowthStage): string {
  const roman = ["", "I", "II", "III", "IV"][stage];
  return `Restrição do crescimento fetal, estágio ${roman} pela classificação de Gratacós.`;
}

/**
 * Classifica o crescimento sem produzir recomendações de manejo ou parto.
 * A decisão clínica continua com o médico e pode depender de dados não contidos
 * no laudo ultrassonográfico.
 */
export function classifyFetalGrowth(input: FetalGrowthInput): FetalGrowthResult {
  assertValidInput(input);

  const confirmedCriteria: FetalGrowthCriterionResult[] = [];
  const pendingCriteria: FetalGrowthCriterionResult[] = [];
  const warnings: string[] = [];
  const efwBelowP10 = input.efwPercentile < 10;

  const add = (item: FetalGrowthCriterionResult): void => {
    (item.confirmed ? confirmedCriteria : pendingCriteria).push(item);
  };

  if (input.efwPercentile < 3) {
    add(criterion(1, "efw_below_p3", "PFE abaixo do percentil 3", true));
  }

  // Alterações Doppler definem RCF somente quando o PFE também está abaixo de p10.
  if (efwBelowP10) {
    if (input.cprBelowP5?.present) {
      add(criterion(
        1,
        "cpr_below_p5",
        "RCP abaixo do percentil 5",
        input.cprBelowP5.confirmed,
        TWO_AFTER_12_HOURS,
      ));
    }
    if (input.mcaPiBelowP5?.present) {
      add(criterion(
        1,
        "mca_pi_below_p5",
        "IP da artéria cerebral média abaixo do percentil 5",
        input.mcaPiBelowP5.confirmed,
        TWO_AFTER_12_HOURS,
      ));
    }
    if (input.meanUterinePiAboveP95) {
      add(criterion(
        1,
        "mean_uterine_pi_above_p95",
        "IP médio das artérias uterinas acima do percentil 95",
        true,
      ));
    }

    if (input.umbilicalArteryEndDiastolicFlow === "absent") {
      add(criterion(
        2,
        "umbilical_absent_end_diastolic_flow",
        input.umbilicalFlowAbnormalInMajorityBothArteries
          ? "fluxo diastólico ausente em mais de 50% dos ciclos nas duas artérias umbilicais"
          : "fluxo diastólico ausente na artéria umbilical",
        input.umbilicalFlowConfirmedInRequiredInterval === true &&
          input.umbilicalFlowAbnormalInMajorityBothArteries === true,
        UA_ABSENT_CONFIRMATION,
      ));
    }
    if (input.umbilicalArteryEndDiastolicFlow === "reversed") {
      add(criterion(
        3,
        "umbilical_reversed_end_diastolic_flow",
        input.umbilicalFlowAbnormalInMajorityBothArteries
          ? "fluxo diastólico reverso em mais de 50% dos ciclos nas duas artérias umbilicais"
          : "fluxo diastólico reverso na artéria umbilical",
        input.umbilicalFlowConfirmedInRequiredInterval === true &&
          input.umbilicalFlowAbnormalInMajorityBothArteries === true,
        UA_REVERSED_CONFIRMATION,
      ));
    }

    const dv = input.ductusVenosus;
    const dvConfirmed = dv?.confirmedAfter6To12Hours === true;
    if (dv?.piAboveP95) {
      add(criterion(
        3,
        "ductus_venosus_pi_above_p95",
        "IP do ducto venoso acima do percentil 95",
        dvConfirmed,
        TWO_AFTER_6_TO_12_HOURS,
      ));
    }
    if (dv?.diastolicFlow === "absent") {
      add(criterion(
        3,
        "ductus_venosus_absent_diastolic_flow",
        "fluxo diastólico ausente no ducto venoso",
        dvConfirmed,
        TWO_AFTER_6_TO_12_HOURS,
      ));
    }
    if (dv?.persistentDicroticVenousPulsations) {
      add(criterion(
        3,
        "persistent_dicrotic_venous_pulsations",
        "pulsações venosas dicróticas persistentes",
        dvConfirmed,
        TWO_AFTER_6_TO_12_HOURS,
      ));
    }
    if (input.pathologicalCtg) {
      add(criterion(4, "pathological_ctg", "traçado cardiotocográfico patológico", true));
    }
    if (dv?.diastolicFlow === "reversed") {
      add(criterion(
        4,
        "ductus_venosus_reversed_diastolic_flow",
        "fluxo diastólico reverso no ducto venoso",
        dvConfirmed,
        TWO_AFTER_6_TO_12_HOURS,
      ));
    }
  } else if (
    input.cprBelowP5?.present ||
    input.mcaPiBelowP5?.present ||
    input.meanUterinePiAboveP95 ||
    input.umbilicalArteryEndDiastolicFlow === "absent" ||
    input.umbilicalArteryEndDiastolicFlow === "reversed" ||
    input.ductusVenosus?.piAboveP95 ||
    input.ductusVenosus?.diastolicFlow === "absent" ||
    input.ductusVenosus?.diastolicFlow === "reversed" ||
    input.ductusVenosus?.persistentDicroticVenousPulsations ||
    input.pathologicalCtg
  ) {
    warnings.push(
      "Há alteração de vitalidade/Doppler, mas PFE igual ou acima do percentil 10 não preenche a definição de RCF deste protocolo. O achado deve ser descrito separadamente.",
    );
  }

  const gaDays = input.gestationalWeeks === undefined
    ? undefined
    : input.gestationalWeeks * 7 + (input.gestationalDays ?? 0);
  if (gaDays !== undefined && gaDays < 24 * 7 && efwBelowP10) {
    warnings.push(
      "Diagnóstico antes de 24 semanas baseado somente na biometria deve ser confirmado com 24 semanas.",
    );
  }

  const highestConfirmedStage = confirmedCriteria.reduce<FetalGrowthStage | undefined>(
    (highest, item) => highest === undefined || item.stage > highest ? item.stage : highest,
    undefined,
  );
  const highestPendingStage = pendingCriteria.reduce<FetalGrowthStage | undefined>(
    (highest, item) => highest === undefined || item.stage > highest ? item.stage : highest,
    undefined,
  );
  if (highestConfirmedStage !== undefined &&
      highestPendingStage !== undefined &&
      highestPendingStage > highestConfirmedStage) {
    warnings.push(
      `Há critério de estágio ${highestPendingStage} ainda pendente da repetição exigida; mantém-se o maior estágio confirmado.`,
    );
  }

  let classification: FetalGrowthClassification;
  let conclusion: string;
  let stage: FetalGrowthStage | undefined;

  if (highestConfirmedStage !== undefined) {
    stage = highestConfirmedStage;
    classification = `fetal_growth_restriction_stage_${stage}` as FetalGrowthClassification;
    conclusion = stageConclusion(stage);
  } else if (input.efwPercentile >= 10) {
    classification = "adequate_for_gestational_age";
    conclusion = "Peso fetal adequado para a idade gestacional pela curva informada.";
  } else if (pendingCriteria.length > 0 || !input.dopplerAssessmentCompleteAndNormal) {
    classification = "small_fetus_staging_incomplete";
    conclusion =
      "Peso fetal abaixo do percentil 10; classificação entre PIG e RCF ainda incompleta.";
  } else {
    classification = "small_for_gestational_age";
    conclusion = "Feto pequeno para a idade gestacional, com Doppler dentro da normalidade.";
  }

  const result: FetalGrowthResult = {
    classification,
    confirmedCriteria,
    pendingCriteria,
    warnings,
    conclusion,
    reportReference: FETAL_GROWTH_PROTOCOL_REFERENCE,
    protocolVersion: FETAL_GROWTH_PROTOCOL_VERSION,
    efwPercentile: input.efwPercentile,
    efwPercentileSource: input.efwPercentileSource,
  };
  if (stage !== undefined) result.stage = stage;
  return result;
}

export function formatFetalGrowthReport(result: FetalGrowthResult): string {
  return [
    "CRESCIMENTO FETAL:",
    `Peso fetal estimado no percentil ${result.efwPercentile.toLocaleString("pt-BR")} pela curva ${result.efwPercentileSource}.`,
    result.conclusion,
    ...result.confirmedCriteria.map((item) => `Critério confirmado: ${item.label}.`),
    ...result.pendingCriteria.map((item) =>
      `${item.label}: achado no exame atual; ${item.confirmationRequirement ?? "confirmação pendente"}`,
    ),
    ...result.warnings,
    result.reportReference,
  ].join("\n");
}
