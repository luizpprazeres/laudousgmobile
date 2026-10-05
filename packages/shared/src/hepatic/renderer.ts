import type { AbdomenTotalDopplerInput } from "../clinicalModels/contracts";
import { ABDOMEN_VESSEL_KEYS, PHYSIOLOGICAL_FLOW_DIRECTION, validateClinicalModelInput } from "../clinicalModels/contracts";
import { renderDopplerHepaticoReport } from "../clinicalModels/dopplerHepatico";
import type { HepaticAssessment, HepaticModule, HepaticModuleKey } from "./contracts";
import { evaluateHepaticConclusion } from "./contracts";

const pt = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

const methodLabel: Record<NonNullable<HepaticModule["method"]>, string> = {
  "2D-SWE": "elastografia por onda de cisalhamento bidimensional (2D-SWE)",
  "pSWE/ARFI": "elastografia por onda de cisalhamento pontual (pSWE/ARFI)",
  TE: "elastografia transitória",
  CAP: "parâmetro de atenuação controlada (CAP)",
  ATI: "imagem do coeficiente de atenuação (ATI)",
  UGAP: "parâmetro de atenuação guiado por ultrassom (UGAP)",
  UDFF: "fração de gordura derivada por ultrassom (UDFF)",
  USFF: "fração de gordura por ultrassom (USFF)",
};

const lobeLabel = { right: "direito", left: "esquerdo" } as const;
const flowLabel = {
  hepatopetal: "hepatopetal",
  hepatofugal: "hepatofugal",
  ausente: "ausente",
  outro: "conforme descrito pelo médico",
} as const;

function active(module: HepaticModule): boolean {
  return module.status === "performed" || module.status === "partially_limited";
}

function requiredMedian(module: HepaticModule) {
  const median = module.measurements.find((measurement) => measurement.role === "median");
  if (!median) throw new Error("Mediana hepática obrigatória não encontrada após validação.");
  return median;
}

function moduleTechnique(module: HepaticModule): string {
  const acquisition = module.acquisition!;
  const equipment = module.equipment!;
  const method = methodLabel[module.method!];
  const capsule = acquisition.capsuleDistanceCm == null
    ? ""
    : `, a ${pt(acquisition.capsuleDistanceCm)} cm da cápsula hepática`;
  const fasting = module.fasting!.status === "fasting"
    ? `, após jejum de ${pt(module.fasting!.hours!)} horas`
    : ", sem jejum";
  return `${method}, no equipamento ${equipment.manufacturer} ${equipment.model}, com ${acquisition.count} aquisições no lobo ${lobeLabel[acquisition.lobe]}, à profundidade de ${pt(acquisition.depthCm)} cm${capsule}. Região de interesse posicionada em ${acquisition.roi}, com o paciente em ${acquisition.position}${fasting}.`;
}

function moduleResult(module: HepaticModule, key: HepaticModuleKey): string[] {
  const median = requiredMedian(module);
  const iqr = module.measurements.find((measurement) => measurement.role === "iqr");
  const ratio = module.derived.find((derived) => derived.id === "iqr-median-percent");
  const label = key === "stiffness" ? "Rigidez hepática" : "Quantificação de gordura hepática";
  const lines = [`${label}: mediana de ${pt(median.value)} ${median.unit}, obtida por ${module.method}.`];
  if (iqr) {
    lines.push(`Intervalo interquartil de ${pt(iqr.value)} ${iqr.unit}${ratio ? `, com razão IQR/mediana de ${pt(ratio.value)}%` : ""}.`);
  }
  lines.push(`Aquisição com qualidade técnica adequada segundo ${module.quality!.criterion.reference.citation} (${module.quality!.criterion.reference.version}).`);
  if (module.status === "partially_limited") lines.push(`Limitação: ${module.reason}.`);
  return lines;
}

function validatedAssessment(value: unknown, purpose: "multiparametric" | "elastography"): HepaticAssessment {
  const result = evaluateHepaticConclusion(value);
  if (!result.canConclude || !result.data) {
    const details = result.issues.map((issue) => `${issue.path || "assessment"}:${issue.code}`).join(", ");
    throw new Error(`Conclusão hepática bloqueada${details ? `: ${details}` : "."}`);
  }
  if (result.data.purpose !== purpose) {
    throw new Error(`Finalidade incompatível: esperado ${purpose}.`);
  }
  return result.data;
}

/**
 * Renderer candidato, sem registro de categoria ou ativação de consumidor.
 * Toda interpretação clínica exibida já deve estar confirmada no contrato.
 */
export function renderHepaticElastographyReport(value: unknown): string {
  const data = validatedAssessment(value, "elastography");
  const stiffness = data.modules.stiffness;
  const results = moduleResult(stiffness, "stiffness");
  return `ELASTOGRAFIA HEPÁTICA\n\nCOMENTÁRIOS:\nExame realizado por ${moduleTechnique(stiffness)}\nIndicação: ${data.indication}.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${results.join("\n")}\n\nCONCLUSÃO:\n${stiffness.interpretation!.text}`;
}

/**
 * A conclusão integrada é emitida literalmente após confirmação médica.
 * O renderer não classifica gordura, fibrose ou rigidez por limiar próprio.
 */
export function renderHepaticMultiparametricReport(value: unknown): string {
  const data = validatedAssessment(value, "multiparametric");
  const correlation = data.correlation!;
  const techniques = (["fat", "stiffness"] as const)
    .filter((key) => active(data.modules[key]))
    .map((key) => moduleTechnique(data.modules[key]));
  const results = (["fat", "stiffness"] as const)
    .filter((key) => active(data.modules[key]))
    .flatMap((key) => moduleResult(data.modules[key], key));
  const resolution = correlation.concordance === "discordant"
    ? `\nResolução da discordância pelo médico: ${correlation.physicianResolution}.`
    : "";
  return `AVALIAÇÃO MULTIPARAMÉTRICA HEPÁTICA\n\nCOMENTÁRIOS:\nAvaliação realizada com correlação entre modo B, Doppler e parâmetros quantitativos.\n${techniques.join("\n")}\nIndicação: ${data.indication}.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\nModo B: ${correlation.modeB}.\nDoppler: ${correlation.doppler}.\n${results.join("\n")}${resolution}\n\nCONCLUSÃO:\n${data.integratedInterpretation!.text}`;
}

function vesselLine(label: string, vessel: { caliberCm?: number; velocityCms?: number; flow?: keyof typeof flowLabel }): string {
  return `${label} com calibre de ${pt(vessel.caliberCm!)} cm, velocidade de ${pt(vessel.velocityCms!)} cm/s e fluxo ${flowLabel[vessel.flow!]}.`;
}

/**
 * Reutiliza o núcleo vascular já aprovado de ABDOMEN_TOTAL_DOPPLER sem criar
 * uma categoria ou um segundo contrato. A revisão médica global é obrigatória.
 */
export function renderHepaticDopplerReport(value: unknown): string {
  if (typeof value === "object" && value !== null && "categoryCode" in value && value.categoryCode === "DOPPLER_HEPATICO") {
    return renderDopplerHepaticoReport(value);
  }
  const validation = validateClinicalModelInput(value, { requirePhysicianReview: true });
  if (!validation.success) {
    throw new Error(`Conclusão Doppler hepática bloqueada: ${validation.issues.map((entry) => `${entry.path}:${entry.code}`).join(", ")}`);
  }
  if (validation.data.categoryCode !== "ABDOMEN_TOTAL_DOPPLER") {
    throw new Error("Contrato vascular incompatível com Doppler hepático.");
  }
  const data: AbdomenTotalDopplerInput = validation.data;
  const optional = [
    ["Veias hepáticas", data.hepaticVeins],
    ["Veia esplênica", data.splenicVein],
    ["Veia mesentérica superior", data.superiorMesentericVein],
    ["Artéria hepática comum", data.commonHepaticArtery],
  ] as const;
  const findings = [
    vesselLine("Tronco da veia porta", data.portalVein),
    ...optional.flatMap(([label, vessel]) => vessel.evaluated ? [vesselLine(label, vessel)] : []),
  ];
  const evaluatedFlows = ABDOMEN_VESSEL_KEYS.flatMap((key) => {
    const vessel = data[key];
    return "flow" in vessel ? [{ flow: vessel.flow, expected: PHYSIOLOGICAL_FLOW_DIRECTION[key] }] : [];
  });
  if (evaluatedFlows.some((vessel) => vessel.flow === "outro")) {
    throw new Error("Conclusão Doppler hepática bloqueada: fluxo classificado como outro exige descrição estruturada antes da renderização.");
  }
  // Veias hepáticas são fisiologicamente hepatofugais; os demais vasos, hepatopetais.
  if (data.portalPathology.status === "absent" && evaluatedFlows.some((vessel) => vessel.flow !== vessel.expected)) {
    throw new Error("Conclusão Doppler hepática bloqueada: direção ou ausência de fluxo incompatível com conclusão normal.");
  }
  let conclusion: string;
  if (data.portalPathology.status === "absent") {
    findings.push("Não foram identificados sinais de trombose nos segmentos avaliados.");
    conclusion = "Estudo Doppler hepático sem alterações hemodinâmicas significativas nos vasos avaliados.";
  } else {
    findings.push(`${data.portalPathology.evidence}.`);
    const qualifier = data.portalPathology.status === "confirmed" ? "Sinais ultrassonográficos de" : "Achados suspeitos de";
    conclusion = data.portalPathology.kind === "portal_thrombosis"
      ? `${qualifier} trombose portal.`
      : data.portalPathology.kind === "portal_hypertension"
        ? `${qualifier} hipertensão portal.`
        : "Alteração do sistema portal, conforme descrita acima.";
  }
  return `DOPPLER HEPÁTICO\n\nCOMENTÁRIOS:\nExame realizado com avaliação bidimensional, mapeamento com Doppler colorido e análise espectral dos vasos selecionados.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${findings.join("\n")}\n\nCONCLUSÃO:\n${conclusion}`;
}
