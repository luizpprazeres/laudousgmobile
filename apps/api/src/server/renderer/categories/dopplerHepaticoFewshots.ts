import type { HepaticDopplerExtraction } from "./DOPPLER_HEPATICO";

export function emptyHepaticExtractedVessel(): HepaticDopplerExtraction["vessels"]["portalVein"] {
  return { evaluated: false, sourceQuote: null, patency: null, caliberCm: null, velocityCms: null, flow: null, spectralPattern: null, peakSystolicVelocityCms: null, endDiastolicVelocityCms: null, resistanceIndex: null };
}
function base(): HepaticDopplerExtraction {
  return {
    vessels: { portalVein: emptyHepaticExtractedVessel(), hepaticVeins: emptyHepaticExtractedVessel(), splenicVein: emptyHepaticExtractedVessel(), superiorMesentericVein: emptyHepaticExtractedVessel(), commonHepaticArtery: emptyHepaticExtractedVessel() },
    portalPathology: { status: "not_assessed", kind: null, evidence: null, physicianConfirmed: false, sourceQuote: null },
    normalHemodynamicsConfirmed: false, normalSourceQuote: null, unmappedFindings: [],
  };
}
const normal = base();
normal.vessels.portalVein = { ...emptyHepaticExtractedVessel(), evaluated: true, sourceQuote: "Veia porta pérvia, calibre 1,1 cm, velocidade 20 cm/s, fluxo hepatopetal.", patency: "patent", caliberCm: 1.1, velocityCms: 20, flow: "hepatopetal" };
normal.portalPathology = { status: "absent", kind: null, evidence: null, physicianConfirmed: false, sourceQuote: "Sem sinais de trombose ou hipertensão portal." };
normal.normalHemodynamicsConfirmed = true;
normal.normalSourceQuote = "Hemodinâmica normal nos vasos avaliados.";
const thrombosis = base();
thrombosis.vessels.portalVein = { ...emptyHepaticExtractedVessel(), evaluated: true, sourceQuote: "Veia porta com trombo intraluminal, calibre 1,4 cm, velocidade 0 cm/s, fluxo ausente.", patency: "thrombosis", caliberCm: 1.4, velocityCms: 0, flow: "ausente" };
thrombosis.portalPathology = { status: "confirmed", kind: "portal_thrombosis", evidence: "material intraluminal com ausência de fluxo", physicianConfirmed: true, sourceQuote: "Confirmo trombose portal: material intraluminal com ausência de fluxo." };
const incomplete = base();
incomplete.vessels.portalVein = { ...emptyHepaticExtractedVessel(), evaluated: true, sourceQuote: "Veia porta pérvia, fluxo hepatopetal.", patency: "patent", flow: "hepatopetal" };

/** Casos fictícios; ausências permanecem null e serão recusadas pelo contrato. */
export const DOPPLER_HEPATICO_FEWSHOTS: Array<{ raw: string; extraction: HepaticDopplerExtraction }> = [
  { raw: `${normal.vessels.portalVein.sourceQuote} ${normal.portalPathology.sourceQuote} ${normal.normalSourceQuote}`, extraction: normal },
  { raw: `${thrombosis.vessels.portalVein.sourceQuote} ${thrombosis.portalPathology.sourceQuote}`, extraction: thrombosis },
  { raw: incomplete.vessels.portalVein.sourceQuote!, extraction: incomplete },
];
