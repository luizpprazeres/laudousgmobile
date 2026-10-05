import type { DopplerRenalDormant } from "../../../../../../packages/shared/src/clinicalModels/dormant/dopplerRenal";
import { validateDopplerRenalDormant } from "../../../../../../packages/shared/src/clinicalModels/dormant/dopplerRenal";
import {
  renderSharedKidney,
  type SharedKidney,
  type SharedKidneyRender,
} from "./sharedUrinary";

/**
 * Projeção estruturada preparatória do Doppler renal.
 *
 * Este arquivo é deliberadamente órfão dos registries e do pipeline ativo. O
 * contrato renal ainda contém decisões clínicas pendentes, portanto esta
 * projeção serve para revisar o formulário e as frases sem substituir o
 * `writer_guarded` que hoje atende DOPPLER_RENAL.
 */

type Side = "right" | "left";

type RenalSide = DopplerRenalDormant["sides"][Side];

export type DopplerRenalStructuredSection = {
  side: Side;
  title: string;
  kidneyBody: string[];
  vascularBody: string[];
  reviewOnlyConclusionCandidates: string[];
  missingFields: string[];
  limitations: string[];
};

export type DopplerRenalStructuredCandidate = {
  ok: true;
  registered: false;
  canGenerateFinalText: false;
  finalText: null;
  title: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS";
  aortaBody: string[];
  sections: [DopplerRenalStructuredSection, DopplerRenalStructuredSection];
  reviewOnlyConclusionCandidates: string[];
  pendingClinicalDecisions: string[];
  contractPendingIssues: Array<{ code: string; path: string }>;
  examLimitations: string[];
};

export type DopplerRenalStructuredCandidateFailure = {
  ok: false;
  registered: false;
  canGenerateFinalText: false;
  finalText: null;
  issues: Array<{ code: string; path: string; severity: string }>;
};

const SIDE_LABEL: Record<Side, "direito" | "esquerdo"> = {
  right: "direito",
  left: "esquerdo",
};

const SIDE_FEMININE_LABEL: Record<Side, "direita" | "esquerda"> = {
  right: "direita",
  left: "esquerda",
};

const SEGMENT_LABEL: Record<RenalSide["artery"]["psv"][number]["segment"], string> = {
  ostial_or_proximal: "ostial/proximal",
  middle: "médio",
  distal: "distal",
  maximum_unspecified: "máxima",
};

const TERRITORY_LABEL: Record<RenalSide["intrarenal"]["ri"][number]["territory"], string> = {
  upper_pole: "polo superior",
  middle_pole: "polo médio",
  lower_pole: "polo inferior",
  summary_unspecified: "território intrarrenal",
};

const ACCELERATION_TERRITORY_LABEL: Record<RenalSide["intrarenal"]["accelerationTime"][number]["territory"], string> = {
  upper_pole: "polo superior",
  middle_pole: "polo médio",
  lower_pole: "polo inferior",
  unspecified: "território intrarrenal",
};

function ptBr(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function kidneyMeasurementValues(side: RenalSide): Array<number | null> {
  return [
    side.kidney.bipolarLength?.canonical.value ?? null,
    side.kidney.anteroposteriorDiameter?.canonical.value ?? null,
    side.kidney.transverseDiameter?.canonical.value ?? null,
  ];
}

function kidneyToShared(side: RenalSide): SharedKidney {
  const measurements = kidneyMeasurementValues(side);
  const completeMeasurements = measurements.every((value): value is number => value !== null)
    ? measurements
    : null;
  const increasedEchogenicity = side.kidney.echogenicity === "increased";
  const otherEchogenicity = side.kidney.echogenicity === "other";

  return {
    medidas_cm: completeMeasurements,
    espessura_parenquima_cm: side.kidney.parenchymalThickness?.canonical.value ?? null,
    dimensao: side.assessment === "normal" ? "normal" : null,
    diferenciacao: side.kidney.corticomedullaryDifferentiation === "reduced"
      ? "reduzida"
      : "preservada",
    situacao_baixa: false,
    rotacao: false,
    drc: false,
    alteracao_difusa: increasedEchogenicity
      ? "Aumento da ecogenicidade do parênquima renal"
      : otherEchogenicity
        ? "Alteração da ecogenicidade do parênquima renal"
        : null,
    hidronefrose: "ausente",
    achados: [],
  };
}

function kidneyMorphologySupportsSharedWording(side: RenalSide): boolean {
  return side.assessment === "normal" || (
    side.kidney.echogenicity !== "not_assessed" &&
    side.kidney.corticomedullaryDifferentiation !== "not_assessed"
  );
}

function neutralKidneyMeasurements(side: Side, renalSide: RenalSide): string[] {
  const label = SIDE_LABEL[side];
  const values = kidneyMeasurementValues(renalSide);
  const body: string[] = [];
  if (values.some((value) => value !== null)) {
    const rendered = values.map((value, index) => value === null
      ? `[${["L", "AP", "T"][index]} não informado]`
      : ptBr(value));
    body.push(`Medidas do rim ${label} (L x AP x T): ${rendered.join(" x ")} cm.`);
  }
  if (renalSide.kidney.parenchymalThickness) {
    body.push(
      `Espessura do parênquima do rim ${label}: ${ptBr(renalSide.kidney.parenchymalThickness.canonical.value)} cm.`,
    );
  }
  if (renalSide.kidney.echogenicity === "preserved") {
    body.push(`Ecogenicidade do parênquima do rim ${label} preservada.`);
  } else if (renalSide.kidney.echogenicity === "increased") {
    body.push(`Ecogenicidade do parênquima do rim ${label} aumentada.`);
  } else if (renalSide.kidney.echogenicity === "other") {
    body.push(`Ecogenicidade do parênquima do rim ${label} alterada.`);
  }
  if (renalSide.kidney.corticomedullaryDifferentiation === "preserved") {
    body.push(`Diferenciação corticomedular do rim ${label} preservada.`);
  } else if (renalSide.kidney.corticomedullaryDifferentiation === "reduced") {
    body.push(`Diferenciação corticomedular do rim ${label} reduzida.`);
  }
  return body;
}

function incompleteKidneyMeasurementLine(side: Side, renalSide: RenalSide): string | null {
  const values = kidneyMeasurementValues(renalSide);
  if (values.every((value) => value === null) || values.every((value) => value !== null)) return null;
  const rendered = values.map((value, index) => value === null
    ? `[${["L", "AP", "T"][index]} não informado]`
    : ptBr(value));
  return `Medidas do rim ${SIDE_LABEL[side]} (L x AP x T): ${rendered.join(" x ")} cm.`;
}

function renderKidney(side: Side, renalSide: RenalSide): {
  rendered: SharedKidneyRender;
  body: string[];
  missingFields: string[];
} {
  const canUseSharedWording = kidneyMorphologySupportsSharedWording(renalSide);
  const rendered = canUseSharedWording
    ? renderSharedKidney(kidneyToShared(renalSide), SIDE_LABEL[side])
    : { body: neutralKidneyMeasurements(side, renalSide), conclusion: [], isNormal: false };
  const incompleteLine = incompleteKidneyMeasurementLine(side, renalSide);
  const missingFields: string[] = [];
  const measurements = kidneyMeasurementValues(renalSide);
  if (measurements.some((value) => value === null)) {
    const missingAxes = measurements
      .map((value, index) => value === null ? ["L", "AP", "T"][index] : null)
      .filter((value): value is string => value !== null);
    missingFields.push(`Medidas ${missingAxes.join(", ")} do rim ${SIDE_LABEL[side]}`);
  }

  return {
    rendered,
    body: incompleteLine && canUseSharedWording
      ? [...rendered.body, incompleteLine]
      : rendered.body,
    missingFields,
  };
}

function renderVascularSide(
  side: Side,
  renalSide: RenalSide,
  data: DopplerRenalDormant,
): string[] {
  const label = SIDE_LABEL[side];
  const feminineLabel = SIDE_FEMININE_LABEL[side];
  const body: string[] = [];

  if (renalSide.artery.patency === "patent") {
    body.push(`Artéria renal ${feminineLabel} com fluxo detectável ao Doppler.`);
  } else if (renalSide.artery.patency === "no_flow_detected") {
    body.push(`Não foi detectado fluxo na artéria renal ${feminineLabel} durante a avaliação.`);
  }

  for (const measurement of renalSide.artery.psv) {
    body.push(measurement.segment === "maximum_unspecified"
      ? `Artéria renal ${feminineLabel}: VPS máxima de ${ptBr(measurement.canonical.value)} cm/s.`
      : `Artéria renal ${feminineLabel}, segmento ${SEGMENT_LABEL[measurement.segment]}: VPS de ${ptBr(measurement.canonical.value)} cm/s.`);
  }

  const rar = data.derived.rar.find((entry) => entry.side === side);
  if (rar) {
    body.push(
      `Relação aorto-renal (RAR) à ${feminineLabel} de ${ptBr(rar.value, 3)}.`,
    );
  }

  for (const measurement of renalSide.intrarenal.ri) {
    body.push(
      `Índice de resistência (IR) no ${TERRITORY_LABEL[measurement.territory]} do rim ${label}: ${ptBr(measurement.canonical.value, 3)}.`,
    );
  }

  const spectralPattern = renalSide.intrarenal.spectralPattern;
  if (spectralPattern === "normal") {
    body.push(`Padrão espectral intrarrenal preservado no rim ${label}.`);
  } else if (spectralPattern === "tardus_parvus") {
    body.push(`Padrão espectral tardus-parvus nas artérias intrarrenais do rim ${label}.`);
  } else if (spectralPattern === "indeterminate") {
    body.push(`Padrão espectral intrarrenal indeterminado no rim ${label}.`);
  }

  for (const measurement of renalSide.intrarenal.accelerationTime) {
    body.push(
      `Tempo de aceleração no ${ACCELERATION_TERRITORY_LABEL[measurement.territory]} do rim ${label}: ${ptBr(measurement.canonical.value)} ms.`,
    );
  }
  for (const measurement of renalSide.intrarenal.accelerationIndex) {
    body.push(
      `Índice de aceleração no ${ACCELERATION_TERRITORY_LABEL[measurement.territory]} do rim ${label}: ${ptBr(measurement.canonical.value)} cm/s².`,
    );
  }

  if (renalSide.artery.aliasingOrTurbulence === "present") {
    body.push(`Aliasing/turbulência identificado na artéria renal ${feminineLabel}.`);
  }
  if (renalSide.artery.accessoryArtery === "identified") {
    body.push(`Artéria renal acessória identificada à ${feminineLabel}.`);
  }

  return body;
}

function pendingClinicalDecisions(data: DopplerRenalDormant): string[] {
  const pending = [
    "Critérios numéricos restantes para classificação de estenose ainda não aprovados.",
    "Regra de interpretação do índice de resistência ainda não aprovada.",
    "Ausência de fluxo não pode ser convertida automaticamente em diagnóstico de oclusão.",
    "Veias renais, avaliação pós-stent e recomendações permanecem fora desta projeção.",
  ];
  if (data.sides.right.documentedRar || data.sides.left.documentedRar) {
    pending.push("RAR documentada só é elegível quando suas VPS renal e aórtica de origem permanecem rastreáveis.");
  }
  return pending;
}

function renderLimitation(
  prefix: string,
  limitation: { reason: string; territory: string } | undefined,
): string[] {
  return limitation
    ? [`${prefix}: ${limitation.reason} (${limitation.territory}).`]
    : [];
}

/**
 * Produz uma prévia estruturada revisável. Nunca produz um laudo final e nunca
 * interpreta isoladamente VPS, RAR, IR, TA ou IA como estenose.
 */
export function projectDopplerRenalStructuredCandidate(
  input: unknown,
): DopplerRenalStructuredCandidate | DopplerRenalStructuredCandidateFailure {
  const validation = validateDopplerRenalDormant(input);
  if (!validation.success || !validation.data) {
    return {
      ok: false,
      registered: false,
      canGenerateFinalText: false,
      finalText: null,
      issues: validation.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
        severity: issue.severity,
      })),
    };
  }

  const data = validation.data;
  const aortaBody = data.aorta.psv
    ? [`Aorta abdominal com VPS de ${ptBr(data.aorta.psv.canonical.value)} cm/s ao nível da emergência das artérias renais.`]
    : [];

  const rightKidney = renderKidney("right", data.sides.right);
  const leftKidney = renderKidney("left", data.sides.left);
  const lengthDifference = data.derived.maximumRenalMeasurementDifference;
  const lengthConclusion = lengthDifference?.conclusionCandidate
    ? [`Diferença entre as maiores medidas dos rins superior a 1,8 cm (${ptBr(lengthDifference.value)} cm).`]
    : [];

  const right: DopplerRenalStructuredSection = {
    side: "right",
    title: "Rim e artéria renal direita",
    kidneyBody: rightKidney.body,
    vascularBody: renderVascularSide("right", data.sides.right, data),
    reviewOnlyConclusionCandidates: rightKidney.rendered.conclusion,
    missingFields: rightKidney.missingFields,
    limitations: renderLimitation("Avaliação à direita limitada", data.sides.right.limitation),
  };
  const left: DopplerRenalStructuredSection = {
    side: "left",
    title: "Rim e artéria renal esquerda",
    kidneyBody: leftKidney.body,
    vascularBody: renderVascularSide("left", data.sides.left, data),
    reviewOnlyConclusionCandidates: leftKidney.rendered.conclusion,
    missingFields: leftKidney.missingFields,
    limitations: renderLimitation("Avaliação à esquerda limitada", data.sides.left.limitation),
  };

  return {
    ok: true,
    registered: false,
    canGenerateFinalText: false,
    finalText: null,
    title: "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS",
    aortaBody,
    sections: [right, left],
    reviewOnlyConclusionCandidates: [
      ...right.reviewOnlyConclusionCandidates,
      ...left.reviewOnlyConclusionCandidates,
      ...lengthConclusion,
    ],
    pendingClinicalDecisions: pendingClinicalDecisions(data),
    contractPendingIssues: validation.issues
      .filter((issue) => issue.severity === "pending")
      .map((issue) => ({ code: issue.code, path: issue.path })),
    examLimitations: [
      ...renderLimitation("Exame limitado", data.quality.limitation),
      ...renderLimitation("Avaliação da aorta limitada", data.aorta.limitation),
    ],
  };
}
