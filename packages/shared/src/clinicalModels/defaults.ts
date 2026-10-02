import type { ClinicalModelCode, ClinicalModelInput } from "./contracts";

const optionalVessel = () => ({ evaluated: false as const });
const venousSide = (examined: boolean) => ({ examined, deepSystem: "patent" as const, superficialSystem: "patent" as const, competenceTested: false, reflux: "not_assessed" as const, internalJugular: "not_assessed" as const, catheter: { present: false }, thrombosisPhase: "not_applicable" as const, phaseConfirmed: false });
const arterialSide = (examined: boolean) => ({ examined, status: "normal" as const, psvCms: {}, percentageDataSufficient: false, percentageConfirmed: false, thoracicOutlet: { evaluated: false as const } });
const thoraxSide = () => ({ pleuralLine: "regular" as const, sliding: "present" as const, linesB: { count: 0, distribution: "none" as const }, effusion: { present: false as const }, consolidation: "not_seen" as const, atelectasis: "not_seen" as const, pneumothorax: "not_seen" as const });
const hipSide = () => ({ adequateStandardPlane: true, bonyRoof: "normal" as const, cartilaginousRoof: "normal" as const, femoralHead: "centered" as const, labrumPosition: "normal" as const, classificationConfirmed: false });

const NORMAL_ABDOMEN_REPORT = "Fígado de margens regulares, dimensões e ecotextura normais. Vasos intra-hepáticos bem visíveis e de calibre anatômico. Não há sinais de processo expansivo hepático. Vesícula biliar de topografia usual e parede fina, sem cálculos. Vias biliares sem dilatação. Pâncreas e baço sem alterações. Rins tópicos, com dimensões e diferenciação corticomedular preservadas. Aorta e veia cava inferior de calibres normais. Bexiga de paredes finas e conteúdo anecoico homogêneo.";

export function createInitialClinicalModelInput(code: ClinicalModelCode): ClinicalModelInput {
  switch (code) {
    case "ABDOMEN_TOTAL_DOPPLER": return { schemaVersion: 1, categoryCode: code, physicianReviewed: false, documentationPhoto: "include", abdomenReport: NORMAL_ABDOMEN_REPORT, portalVein: {}, hepaticVeins: optionalVessel(), splenicVein: optionalVessel(), superiorMesentericVein: optionalVessel(), commonHepaticArtery: optionalVessel(), portalPathology: { status: "absent", physicianConfirmed: false } };
    case "DOPPLER_VENOSO_MMSS": return { schemaVersion: 1, categoryCode: code, physicianReviewed: false, indication: "elective", laterality: "right", right: venousSide(true), left: venousSide(false) };
    case "DOPPLER_ARTERIAL_MMSS": return { schemaVersion: 1, categoryCode: code, physicianReviewed: false, laterality: "right", right: arterialSide(true), left: arterialSide(false) };
    case "TORAX": return { schemaVersion: 1, categoryCode: code, physicianReviewed: false, right: thoraxSide(), left: thoraxSide(), correlationSuggested: false };
    case "QUADRIL_INFANTIL": return { schemaVersion: 1, categoryCode: code, physicianReviewed: false, right: hipSide(), left: hipSide(), recommendationConfirmed: false };
  }
}
