import { z } from "zod";

/**
 * Doppler de fístula arteriovenosa — contrato Web MVP (pendente de revisão clínica).
 * Limiares de maturação, baixo/alto fluxo e critérios de estenose ainda não foram
 * aprovados: o volume é descrito, nunca classificado sozinho. Estenose, trombose,
 * dilatação aneurismática e classificação do fluxo só entram na conclusão com
 * confirmação médica explícita; sem ela, o achado medido aparece de forma descritiva.
 */
export const DOPPLER_FISTULA_AV_VERSION = "doppler-fistula-av/web-v1" as const;
export const DOPPLER_FISTULA_AV_SEGMENTS = [
  "feeding_artery", "anastomosis", "juxta_anastomotic_vein", "draining_vein_puncture",
  "draining_vein_proximal", "central_outflow", "distal_artery",
] as const;
export type DopplerFistulaAvSegmentId = typeof DOPPLER_FISTULA_AV_SEGMENTS[number];
export const DOPPLER_FISTULA_AV_SEGMENT_LABELS: Record<DopplerFistulaAvSegmentId, string> = {
  feeding_artery: "Artéria nutridora", anastomosis: "Anastomose",
  juxta_anastomotic_vein: "Veia de drenagem — segmento justa-anastomótico",
  draining_vein_puncture: "Veia de drenagem — segmento de punção",
  draining_vein_proximal: "Veia de drenagem — segmento proximal",
  central_outflow: "Veia de saída central", distal_artery: "Artéria distal à anastomose",
};
export const DOPPLER_FISTULA_AV_REQUIRED: readonly DopplerFistulaAvSegmentId[] = [
  "feeding_artery", "anastomosis", "juxta_anastomotic_vein", "draining_vein_puncture", "draining_vein_proximal",
];
const ACCESS_LABELS = {
  radiocephalic: "radiocefálica", brachiocephalic: "braquiocefálica", brachiobasilic: "braquiobasílica", graft: "com prótese",
} as const;

const Positive = z.number().finite().positive();
const SegmentSchema = z.object({
  id: z.enum(DOPPLER_FISTULA_AV_SEGMENTS),
  assessment: z.enum(["not_assessed", "evaluated", "limited"]),
  limitation: z.string().trim().min(3).max(500).optional(),
  psvCms: Positive.optional(),
  diameterMm: Positive.optional(),
  depthMm: Positive.optional(),
  flowDirection: z.enum(["not_assessed", "anterograde", "retrograde"]).default("not_assessed"),
  stenosis: z.object({
    lesionPsvCms: Positive, referencePsvCms: Positive.optional(), minDiameterMm: Positive.optional(), physicianConfirmed: z.boolean(),
  }).strict().optional(),
  thrombus: z.object({ extent: z.enum(["partial", "occlusive"]), physicianConfirmed: z.boolean() }).strict().optional(),
  noFlow: z.boolean().default(false),
  aneurysm: z.object({ maxDiameterMm: Positive, physicianConfirmed: z.boolean() }).strict().optional(),
}).strict();
export const DopplerFistulaAvSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("DOPPLER_FISTULA_AV"),
  side: z.enum(["right", "left"]),
  accessType: z.enum(["radiocephalic", "brachiocephalic", "brachiobasilic", "graft", "other"]),
  accessTypeOther: z.string().trim().min(3).max(120).optional(),
  segments: z.array(SegmentSchema).max(20),
  flowVolume: z.object({
    valueMlMin: Positive,
    site: z.enum(["feeding_artery", "draining_vein"]),
    classification: z.enum(["not_classified", "low", "high"]),
    physicianConfirmed: z.boolean(),
  }).strict().optional(),
}).strict();
export type DopplerFistulaAvInput = z.infer<typeof DopplerFistulaAvSchema>;
export type DopplerFistulaAvSegment = z.infer<typeof SegmentSchema>;
export type DopplerFistulaAvIssue = { code: string; path: string; message: string };
export type DopplerFistulaAvValidation = { success: boolean; data: DopplerFistulaAvInput | null; issues: DopplerFistulaAvIssue[] };

export function createInitialDopplerFistulaAvInput(): DopplerFistulaAvInput {
  return {
    schemaVersion: 1, categoryCode: "DOPPLER_FISTULA_AV", side: "left", accessType: "radiocephalic",
    segments: DOPPLER_FISTULA_AV_SEGMENTS.map((id) => ({ id, assessment: "not_assessed", flowDirection: "not_assessed", noFlow: false })),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export function dopplerFistulaAvVelocityRatio(stenosis: NonNullable<DopplerFistulaAvSegment["stenosis"]>): number | null {
  return stenosis.referencePsvCms ? round2(stenosis.lesionPsvCms / stenosis.referencePsvCms) : null;
}
const hasResult = (s: DopplerFistulaAvSegment) => !!s.limitation || s.psvCms !== undefined || s.diameterMm !== undefined || s.depthMm !== undefined ||
  s.flowDirection !== "not_assessed" || !!s.stenosis || !!s.thrombus || s.noFlow || !!s.aneurysm;

export function validateDopplerFistulaAv(value: unknown): DopplerFistulaAvValidation {
  const parsed = DopplerFistulaAvSchema.safeParse(value);
  if (!parsed.success) return { success: false, data: null, issues: parsed.error.issues.map((i) => ({ code: "SCHEMA_INVALID", path: i.path.join("."), message: i.message })) };
  const data = parsed.data;
  const issues: DopplerFistulaAvIssue[] = [];
  const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (data.accessType === "other" && !data.accessTypeOther) issue("ACCESS_TYPE_REQUIRED", "accessTypeOther", "Descreva o tipo de acesso.");
  if (data.accessType !== "other" && data.accessTypeOther) issue("ACCESS_TYPE_CONFLICT", "accessTypeOther", "A descrição livre só vale para o tipo \"outro\".");
  if (!data.segments.some((s) => s.assessment !== "not_assessed")) issue("COVERAGE_REQUIRED", "segments", "Registre ao menos um segmento avaliado.");
  const seen = new Set<string>();
  for (const s of data.segments) {
    const p = `segments.${s.id}`;
    if (seen.has(s.id)) issue("DUPLICATE_SEGMENT", p, "O mesmo segmento foi informado mais de uma vez.");
    seen.add(s.id);
    if (s.assessment === "not_assessed") {
      if (hasResult(s)) issue("NOT_ASSESSED_HAS_RESULTS", p, "Segmento não avaliado contém resultados.");
      continue;
    }
    if (s.assessment === "limited" && !s.limitation) issue("LIMITATION_REQUIRED", `${p}.limitation`, "Descreva a limitação técnica.");
    if (s.assessment !== "limited" && s.limitation) issue("LIMITATION_STATE_CONFLICT", p, "Marque o segmento como limitado para registrar uma limitação.");
    if (s.flowDirection !== "not_assessed" && s.id !== "distal_artery") issue("FLOW_DIRECTION_SEGMENT", p, "O sentido do fluxo só é registrado na artéria distal à anastomose.");
    if (s.noFlow && (s.psvCms !== undefined || s.stenosis || s.flowDirection !== "not_assessed")) issue("NO_FLOW_CONFLICT", p, "Fluxo não detectado não admite VPS, estenose ou sentido de fluxo no mesmo segmento.");
    if (s.thrombus?.extent === "occlusive" && !s.noFlow) issue("OCCLUSIVE_THROMBUS_FLOW", p, "Trombo oclusivo exige fluxo não detectado no segmento.");
    if (s.thrombus && s.stenosis) issue("THROMBUS_STENOSIS_CONFLICT", p, "Registre estenose e trombo em segmentos distintos nesta versão.");
    if (s.stenosis?.physicianConfirmed && dopplerFistulaAvVelocityRatio(s.stenosis) === null) issue("STENOSIS_DATA_INSUFFICIENT", `${p}.stenosis`, "Confirmar estenose exige VPS de referência para calcular a razão de velocidades.");
  }
  const fv = data.flowVolume;
  if (fv && fv.classification !== "not_classified" && !fv.physicianConfirmed) issue("FLOW_CLASSIFICATION_CONFIRMATION_REQUIRED", "flowVolume", "Confirme a classificação do volume de fluxo; não há limiar automático aprovado.");
  if (fv && fv.classification === "not_classified" && fv.physicianConfirmed) issue("CONFIRMATION_WITHOUT_CLASSIFICATION", "flowVolume", "A confirmação exige uma classificação selecionada.");
  return { success: issues.length === 0, data, issues };
}

const pt = (n: number, digits = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const sentence = (s: string) => `${s.trim().replace(/[.;,:\s]+$/u, "")}.`;
const lower = (s: string) => s.charAt(0).toLocaleLowerCase("pt-BR") + s.slice(1);

export function renderDopplerFistulaAv(value: unknown, style: "CLASSICO_COMPLETO" | "OBJETIVO" = "CLASSICO_COMPLETO"): string {
  const validation = validateDopplerFistulaAv(value);
  if (!validation.success || !validation.data) throw new Error(validation.issues.map((i) => `${i.path}: ${i.message}`).join(" "));
  const data = validation.data;
  const limb = `membro superior ${data.side === "right" ? "direito" : "esquerdo"}`;
  const access = data.accessType === "other" ? `(${data.accessTypeOther!.replace(/[.\s]+$/u, "")})` : ACCESS_LABELS[data.accessType];
  const lines: string[] = [`Fístula arteriovenosa ${access} no ${limb}.`];
  const findings: string[] = [];
  const incomplete: string[] = [];
  for (const id of DOPPLER_FISTULA_AV_SEGMENTS) {
    const s = data.segments.find((segment) => segment.id === id);
    const label = DOPPLER_FISTULA_AV_SEGMENT_LABELS[id];
    const where = lower(label);
    if (!s || s.assessment === "not_assessed") {
      if (DOPPLER_FISTULA_AV_REQUIRED.includes(id)) incomplete.push(where);
      continue;
    }
    if (s.assessment === "limited") {
      incomplete.push(where);
      lines.push(`${label}: avaliação limitada. ${sentence(s.limitation!)}`);
    }
    const parts: string[] = [];
    if (s.noFlow) parts.push("fluxo não detectado ao Doppler colorido e espectral");
    else if (s.assessment === "evaluated") parts.push("fluxo detectável ao Doppler");
    if (s.flowDirection !== "not_assessed") parts.push(`fluxo ${s.flowDirection === "anterograde" ? "anterógrado" : "retrógrado"}`);
    if (s.psvCms !== undefined) parts.push(`VPS de ${pt(s.psvCms)} cm/s`);
    if (s.diameterMm !== undefined) parts.push(`calibre de ${pt(s.diameterMm, 1)} mm`);
    if (s.depthMm !== undefined) parts.push(`profundidade de ${pt(s.depthMm, 1)} mm em relação à pele`);
    if (s.thrombus) parts.push(`material ecogênico intraluminal ${s.thrombus.extent === "occlusive" ? "ocupando toda a luz" : "ocupando parcialmente a luz"}`);
    if (s.aneurysm) parts.push(`calibre máximo de ${pt(s.aneurysm.maxDiameterMm, 1)} mm`);
    if (s.stenosis) {
      const st = s.stenosis;
      const ratio = dopplerFistulaAvVelocityRatio(st);
      parts.push(`aceleração focal do fluxo com VPS de ${pt(st.lesionPsvCms)} cm/s${st.referencePsvCms ? `, VPS de referência de ${pt(st.referencePsvCms)} cm/s e razão de velocidades de ${pt(ratio!)}` : ""}${st.minDiameterMm ? `, diâmetro luminal mínimo de ${pt(st.minDiameterMm, 1)} mm` : ""}`);
      const measures = [`VPS de ${pt(st.lesionPsvCms)} cm/s`, ratio !== null ? `razão de velocidades de ${pt(ratio)}` : "", st.minDiameterMm ? `diâmetro luminal mínimo de ${pt(st.minDiameterMm, 1)} mm` : ""].filter(Boolean).join("; ");
      findings.push(st.physicianConfirmed
        ? `Estenose na ${where} (${measures}).`
        : `Aumento focal da velocidade de pico sistólico na ${where} (${measures}), sem confirmação de estenose.`);
    }
    if (s.thrombus) findings.push(s.thrombus.physicianConfirmed
      ? `Trombose ${s.thrombus.extent === "occlusive" ? "oclusiva" : "parcial"} na ${where}.`
      : `Material ecogênico intraluminal na ${where}${s.noFlow ? ", sem fluxo detectável" : ""}.`);
    else if (s.noFlow) findings.push(`Fluxo não detectado ao Doppler na ${where}.`);
    if (s.aneurysm) findings.push(s.aneurysm.physicianConfirmed
      ? `Dilatação aneurismática na ${where} (calibre máximo de ${pt(s.aneurysm.maxDiameterMm, 1)} mm).`
      : `Calibre máximo de ${pt(s.aneurysm.maxDiameterMm, 1)} mm na ${where}.`);
    if (s.flowDirection === "retrograde") findings.push(`Fluxo retrógrado na ${where}.`);
    if (parts.length) lines.push(`${label}: ${parts.join(", ")}.`);
  }
  const fv = data.flowVolume;
  if (fv) {
    lines.push(`Volume de fluxo de ${pt(fv.valueMlMin, 0)} mL/min, medido na ${fv.site === "feeding_artery" ? "artéria nutridora" : "veia de drenagem"}.`);
    if (fv.classification !== "not_classified") findings.push(`Volume de fluxo ${fv.classification === "low" ? "reduzido" : "elevado"} (${pt(fv.valueMlMin, 0)} mL/min).`);
  }
  const conclusions: string[] = [];
  if (!findings.length && !incomplete.length) {
    conclusions.push(`Fístula arteriovenosa ${access} no ${limb} pérvia, sem sinais ecográficos de estenose ou trombose nos segmentos avaliados.`);
  }
  conclusions.push(...findings);
  if (incomplete.length) conclusions.push(`Avaliação incompleta da fístula; segmentos não avaliados ou com limitação: ${incomplete.join("; ")}.`);
  const technique = "Exame realizado com transdutor linear multifrequencial, com avaliação em modo B, Doppler colorido e espectral da artéria nutridora, da anastomose e da veia de drenagem.";
  return `ULTRASSONOGRAFIA COM DOPPLER DE FÍSTULA ARTERIOVENOSA\n\n${style === "OBJETIVO" ? "TÉCNICA" : "COMENTÁRIOS"}:\n${technique}\n\n${style === "OBJETIVO" ? "ACHADOS" : "OS SEGUINTES ASPECTOS FORAM OBSERVADOS"}:\n${lines.join("\n")}\n\n${style === "OBJETIVO" ? "IMPRESSÃO" : "CONCLUSÃO"}:\n${conclusions.join("\n")}`;
}
