import type { DopplerHepaticoInput } from "./contracts";
import { validateClinicalModelInput } from "./contracts";

const pt = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const sentence = (text: string) => `${text.trim().replace(/[.;,:\s]+$/u, "")}.`;
const flowLabel = {
  hepatopetal: "hepatopetal",
  hepatofugal: "hepatofugal",
  ausente: "ausente",
  outro: "conforme descrito pelo médico",
} as const;
const patternLabel = {
  preserved: "preservado",
  altered: "alterado",
  other: "conforme descrito pelo médico",
  not_assessed: "não avaliado",
} as const;

type OptionalVessel = DopplerHepaticoInput["hepaticVeins"];

function patencyText(patency: "not_assessed" | "patent" | "thrombosis" | undefined): string {
  if (patency === "patent") return "pérvia";
  if (patency === "thrombosis") return "com sinais de trombose";
  throw new Error("Conclusão Doppler hepática bloqueada: perviedade não informada.");
}

function venousLine(label: string, vessel: Extract<OptionalVessel, { evaluated: true }>): string {
  return `${label} ${patencyText(vessel.patency)}, com calibre de ${pt(vessel.caliberCm!)} cm, velocidade de ${pt(vessel.velocityCms!)} cm/s e fluxo ${flowLabel[vessel.flow!]}.`;
}

function hepaticVeinsLine(vessel: Extract<OptionalVessel, { evaluated: true }>): string {
  const patency = vessel.patency === "patent" ? "pérvias" : vessel.patency === "thrombosis" ? "com sinais de trombose" : patencyText(vessel.patency);
  return `Veias hepáticas ${patency}, com calibre de ${pt(vessel.caliberCm!)} cm, velocidade de ${pt(vessel.velocityCms!)} cm/s, fluxo ${flowLabel[vessel.flow!]} e padrão espectral ${patternLabel[vessel.spectralPattern!]}.`;
}

function hepaticArteryLine(vessel: Extract<OptionalVessel, { evaluated: true }>): string {
  return `Artéria hepática comum ${patencyText(vessel.patency)}, com calibre de ${pt(vessel.caliberCm!)} cm, velocidade de pico sistólico de ${pt(vessel.peakSystolicVelocityCms!)} cm/s, velocidade diastólica final de ${pt(vessel.endDiastolicVelocityCms!)} cm/s, índice de resistência de ${pt(vessel.resistanceIndex!)}, fluxo ${flowLabel[vessel.flow!]} e padrão espectral ${patternLabel[vessel.spectralPattern!]}.`;
}

/**
 * Renderer determinístico do escopo básico aprovado de Doppler hepático.
 * Não interpreta medidas por limiares próprios e não aceita campos de TIPS,
 * transplante ou classificações avançadas, que são rejeitados pelo schema strict.
 */
export function renderDopplerHepaticoReport(
  value: unknown,
  options: { requirePhysicianReview?: boolean } = {},
): string {
  const validation = validateClinicalModelInput(value, {
    requirePhysicianReview: options.requirePhysicianReview !== false,
  });
  if (!validation.success) {
    throw new Error(`Conclusão Doppler hepática bloqueada: ${validation.issues.map((entry) => `${entry.path}:${entry.code}`).join(", ")}`);
  }
  if (validation.data.categoryCode !== "DOPPLER_HEPATICO") {
    throw new Error("Contrato incompatível com Doppler hepático.");
  }

  const data = validation.data;
  const evaluatedLabels = [
    "veia porta",
    data.hepaticVeins.evaluated ? "veias hepáticas" : "",
    data.splenicVein.evaluated ? "veia esplênica" : "",
    data.superiorMesentericVein.evaluated ? "veia mesentérica superior" : "",
    data.commonHepaticArtery.evaluated ? "artéria hepática comum" : "",
  ].filter(Boolean);
  const findings = [
    `Veia porta ${patencyText(data.portalVein.patency)}, com calibre de ${pt(data.portalVein.caliberCm!)} cm, velocidade de ${pt(data.portalVein.velocityCms!)} cm/s e fluxo ${flowLabel[data.portalVein.flow!]}.`,
  ];
  if (data.hepaticVeins.evaluated) findings.push(hepaticVeinsLine(data.hepaticVeins));
  if (data.splenicVein.evaluated) findings.push(venousLine("Veia esplênica", data.splenicVein));
  if (data.superiorMesentericVein.evaluated) findings.push(venousLine("Veia mesentérica superior", data.superiorMesentericVein));
  if (data.commonHepaticArtery.evaluated) findings.push(hepaticArteryLine(data.commonHepaticArtery));

  const finding = data.portalPathology;
  let conclusion: string;
  if (finding.status === "absent") {
    findings.push("Não foram identificados sinais de trombose nos segmentos avaliados.");
    conclusion = "Estudo Doppler hepático sem alterações hemodinâmicas significativas nos vasos avaliados.";
  } else {
    findings.push(sentence(finding.evidence!));
    const qualifier = finding.status === "confirmed" ? "Sinais ultrassonográficos de" : "Achados suspeitos de";
    conclusion = finding.kind === "portal_thrombosis"
      ? `${qualifier} trombose portal.`
      : finding.kind === "portal_hypertension"
        ? `${qualifier} hipertensão portal.`
        : finding.status === "suspected"
          ? "Achados suspeitos de alteração vascular hepática, conforme descritos acima."
          : "Alteração vascular hepática, conforme descrita acima.";
  }

  return `DOPPLER HEPÁTICO\n\nCOMENTÁRIOS:\nEstudo realizado com transdutor convexo multifrequencial, utilizando modos bidimensional, Doppler colorido e análise espectral.\nForam avaliados ${evaluatedLabels.join(", ")}, com registro de calibre, direção do fluxo e velocidades quando aplicável.\n\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n${findings.join("\n")}\n\nCONCLUSÃO:\n${conclusion}`;
}
