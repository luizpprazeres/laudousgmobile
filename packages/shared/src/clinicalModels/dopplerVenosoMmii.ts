import { z } from "zod";

/** Approved 2026-10-05. The candidate contract stays isolated for historical drafts.
 * Coverage: SVU Lower Extremity Venous Duplex/Insufficiency guidelines (2019),
 * ACR vascular ultrasound accreditation requirements (2026).
 * Reflux: SVS/AVF/AVLS 2023, https://pmc.ncbi.nlm.nih.gov/articles/PMC11523430/.
 * Strict perforator thresholds and publication rules follow the physician decisions
 * exported as decisoes-primeiro-lote-doppler.json on 2026-10-05.
 */
export const DOPPLER_VENOSO_MMII_VERSION = "doppler-venoso-mmii/v1" as const;
export const DOPPLER_VENOSO_MMII_SEGMENTS = [
  "common_femoral", "saphenofemoral_junction", "femoral_proximal", "femoral_mid", "femoral_distal",
  "deep_femoral", "popliteal", "posterior_tibial", "fibular", "anterior_tibial", "gastrocnemius", "soleal",
  "great_saphenous_proximal_thigh", "great_saphenous_mid_thigh", "great_saphenous_distal_thigh",
  "great_saphenous_knee", "great_saphenous_proximal_calf", "great_saphenous_mid_calf", "great_saphenous_distal_calf",
  "saphenopopliteal_junction", "small_saphenous_proximal", "small_saphenous_distal",
  "anterior_accessory_saphenous", "giacomini",
] as const;
export type DopplerVenosoMmiiSegmentId = typeof DOPPLER_VENOSO_MMII_SEGMENTS[number];
export const DOPPLER_VENOSO_MMII_SEGMENT_LABELS: Record<DopplerVenosoMmiiSegmentId, string> = {
  common_femoral: "Veia femoral comum", saphenofemoral_junction: "Junção safenofemoral",
  femoral_proximal: "Veia femoral — terço proximal", femoral_mid: "Veia femoral — terço médio", femoral_distal: "Veia femoral — terço distal",
  deep_femoral: "Veia femoral profunda", popliteal: "Veia poplítea", posterior_tibial: "Veias tibiais posteriores", fibular: "Veias fibulares",
  anterior_tibial: "Veias tibiais anteriores", gastrocnemius: "Veias gastrocnêmias", soleal: "Veias soleares",
  great_saphenous_proximal_thigh: "Veia safena magna — coxa proximal", great_saphenous_mid_thigh: "Veia safena magna — coxa média",
  great_saphenous_distal_thigh: "Veia safena magna — coxa distal", great_saphenous_knee: "Veia safena magna — joelho",
  great_saphenous_proximal_calf: "Veia safena magna — perna proximal", great_saphenous_mid_calf: "Veia safena magna — perna média",
  great_saphenous_distal_calf: "Veia safena magna — perna distal", saphenopopliteal_junction: "Junção safenopoplítea",
  small_saphenous_proximal: "Veia safena parva — segmento proximal", small_saphenous_distal: "Veia safena parva — segmento distal",
  anterior_accessory_saphenous: "Veia safena acessória anterior", giacomini: "Veia de Giacomini",
};
export const DOPPLER_VENOSO_MMII_TVP_REQUIRED: readonly DopplerVenosoMmiiSegmentId[] = [
  "common_femoral", "saphenofemoral_junction", "femoral_proximal", "femoral_mid", "femoral_distal", "popliteal", "posterior_tibial", "fibular",
];
export const DOPPLER_VENOSO_MMII_REFLUX_REQUIRED: readonly DopplerVenosoMmiiSegmentId[] = [
  "common_femoral", "saphenofemoral_junction", "deep_femoral", "femoral_proximal", "femoral_mid", "femoral_distal", "popliteal",
  "great_saphenous_proximal_thigh", "great_saphenous_mid_thigh", "great_saphenous_distal_thigh", "great_saphenous_proximal_calf",
  "saphenopopliteal_junction", "small_saphenous_proximal", "small_saphenous_distal",
];
const TimeSchema = z.object({ value: z.number().finite().nonnegative(), unit: z.enum(["s", "ms"]) }).strict();
const DiameterSchema = z.object({ value: z.number().finite().positive(), unit: z.enum(["mm", "cm"]) }).strict();
const RefluxSchema = z.object({
  tested: z.boolean(), time: TimeSchema.optional(),
  maneuver: z.enum(["not_documented", "valsalva", "distal_compression", "release"]),
  position: z.enum(["not_documented", "standing", "sitting", "reverse_trendelenburg", "supine"]),
}).strict();
export const DopplerVenosoMmiiSegmentSchema = z.object({
  id: z.enum(DOPPLER_VENOSO_MMII_SEGMENTS),
  assessment: z.enum(["not_assessed", "evaluated", "limited"]),
  limitation: z.string().trim().min(3).max(500).optional(),
  compressibility: z.enum(["not_assessed", "complete", "partial", "absent", "not_testable"]),
  diameter: DiameterSchema.optional(),
  reflux: RefluxSchema,
  thrombosis: z.object({
    physicianConfirmed: z.boolean(),
    phase: z.enum(["not_assessed", "acute", "chronic_recanalized", "mixed", "indeterminate"]),
    phaseConfirmed: z.boolean(), phaseEvidence: z.string().trim().min(3).max(500).optional(),
    intraluminalMaterial: z.enum(["not_assessed", "absent", "present"]),
    occlusion: z.enum(["not_assessed", "partial", "occlusive", "indeterminate"]),
    extent: z.string().trim().min(1).max(300).optional(),
  }).strict().optional(),
}).strict();
export const DopplerVenosoMmiiPerforatorSchema = z.object({
  id: z.string().trim().min(1).max(80), location: z.string().trim().min(3).max(200),
  diameter: DiameterSchema.optional(), reflux: RefluxSchema,
  outwardFlow: z.enum(["not_assessed", "documented", "absent"]),
  limitation: z.string().trim().min(3).max(500).optional(),
}).strict();
const SideSchema = z.object({
  segments: z.array(DopplerVenosoMmiiSegmentSchema).max(40),
  perforators: z.array(DopplerVenosoMmiiPerforatorSchema).max(40),
}).strict();
export const DopplerVenosoMmiiSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.enum(["DOPPLER_VENOSO_MMII", "DOPPLER_VENOSO_MMII_MEDIDAS"]),
  protocol: z.enum(["tvp_only", "complete", "mapping_measurements"]),
  laterality: z.enum(["right", "left", "bilateral"]),
  physicianReviewed: z.boolean(),
  sides: z.object({ right: SideSchema, left: SideSchema }).strict(),
  recommendations: z.array(z.object({ text: z.string().trim().min(3).max(1000), physicianConfirmed: z.boolean() }).strict()).max(10),
}).strict();
export type DopplerVenosoMmiiInput = z.infer<typeof DopplerVenosoMmiiSchema>;
export type DopplerVenosoMmiiSegment = z.infer<typeof DopplerVenosoMmiiSegmentSchema>;
export type DopplerVenosoMmiiIssue = { code: string; path: string; message: string };
export type DopplerVenosoMmiiValidation = { success: boolean; data: DopplerVenosoMmiiInput | null; issues: DopplerVenosoMmiiIssue[]; canGenerateFinalText: boolean };

export function createInitialDopplerVenosoMmiiInput(categoryCode: DopplerVenosoMmiiInput["categoryCode"] = "DOPPLER_VENOSO_MMII"): DopplerVenosoMmiiInput {
  const side = () => ({ segments: DOPPLER_VENOSO_MMII_SEGMENTS.map((id): DopplerVenosoMmiiSegment => ({
    id, assessment: "not_assessed", compressibility: "not_assessed", reflux: { tested: false, maneuver: "not_documented", position: "not_documented" },
  })), perforators: [] });
  return { schemaVersion: 1, categoryCode, protocol: categoryCode === "DOPPLER_VENOSO_MMII_MEDIDAS" ? "mapping_measurements" : "tvp_only", laterality: "bilateral", physicianReviewed: false, sides: { right: side(), left: side() }, recommendations: [] };
}

const deepSegments = new Set<DopplerVenosoMmiiSegmentId>(["common_femoral", "femoral_proximal", "femoral_mid", "femoral_distal", "deep_femoral", "popliteal", "posterior_tibial", "fibular", "anterior_tibial", "gastrocnemius", "soleal"]);
const oneSecondSegments = new Set<DopplerVenosoMmiiSegmentId>(["common_femoral", "femoral_proximal", "femoral_mid", "femoral_distal", "popliteal"]);
const requested = (data: DopplerVenosoMmiiInput, side: "right" | "left") => data.laterality === "bilateral" || data.laterality === side;
const seconds = (time: z.infer<typeof TimeSchema>) => time.unit === "ms" ? time.value / 1000 : time.value;
const millimeters = (diameter: z.infer<typeof DiameterSchema>) => diameter.unit === "cm" ? diameter.value * 10 : diameter.value;
const pt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
const sentence = (s: string) => `${s.trim().replace(/[.;,:\s]+$/u, "")}.`;
const sideLabel = (side: "right" | "left") => side === "right" ? "direito" : "esquerdo";
const isIncompressible = (s: DopplerVenosoMmiiSegment) => s.compressibility === "partial" || s.compressibility === "absent";
/** No automatic muscular-vein reflux classification is introduced by this release. */
export function dopplerVenosoMmiiRefluxThreshold(id: DopplerVenosoMmiiSegmentId): number | null {
  if (id === "gastrocnemius" || id === "soleal") return null;
  return oneSecondSegments.has(id) ? 1 : 0.5;
}
const hasSegmentResult = (s: DopplerVenosoMmiiSegment) => s.assessment !== "not_assessed" || s.compressibility !== "not_assessed" || !!s.diameter || s.reflux.tested || !!s.reflux.time || s.reflux.maneuver !== "not_documented" || s.reflux.position !== "not_documented" || !!s.thrombosis || !!s.limitation;

/** Missing observations are never converted to normal findings. */
export function validateDopplerVenosoMmii(value: unknown): DopplerVenosoMmiiValidation {
  const parsed = DopplerVenosoMmiiSchema.safeParse(value);
  if (!parsed.success) return { success: false, data: null, canGenerateFinalText: false, issues: parsed.error.issues.map((i) => ({ code: "SCHEMA_INVALID", path: i.path.join("."), message: i.message })) };
  const data = parsed.data;
  const issues: DopplerVenosoMmiiIssue[] = [];
  const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const checkReflux = (r: z.infer<typeof RefluxSchema>, path: string, optional: boolean) => {
    if (!r.tested) {
      if (r.time || r.maneuver !== "not_documented" || r.position !== "not_documented") issue("REFLUX_TEST_CONFLICT", path, "Há dados de refluxo sem avaliação registrada.");
      if (!optional) issue("REFLUX_ASSESSMENT_REQUIRED", path, "Registre a pesquisa de refluxo ou uma limitação do segmento.");
      return;
    }
    if (!r.time) issue("REFLUX_TIME_REQUIRED", `${path}.time`, "Informe o tempo de fluxo reverso, inclusive zero quando ausente.");
    if (r.maneuver === "not_documented") issue("REFLUX_MANEUVER_REQUIRED", `${path}.maneuver`, "Informe a manobra usada para pesquisar refluxo.");
    if (r.position === "not_documented" || r.position === "supine") issue("REFLUX_POSITION_REQUIRED", `${path}.position`, "Para classificar refluxo, documente ortostatismo, posição sentada ou Trendelenburg reverso.");
  };
  for (const side of ["right", "left"] as const) {
    const s = data.sides[side];
    const path = `sides.${side}`;
    if (!requested(data, side)) {
      if (s.segments.some(hasSegmentResult) || s.perforators.length) issue("UNREQUESTED_SIDE_HAS_RESULTS", path, "Há resultados em um lado não incluído no exame.");
      continue;
    }
    const seen = new Set<string>();
    for (const segment of s.segments) {
      if (seen.has(segment.id)) issue("DUPLICATE_SEGMENT", `${path}.segments`, "O mesmo segmento foi informado mais de uma vez.");
      seen.add(segment.id);
    }
    const required = data.protocol === "tvp_only" ? DOPPLER_VENOSO_MMII_TVP_REQUIRED : [...new Set([...DOPPLER_VENOSO_MMII_TVP_REQUIRED, ...DOPPLER_VENOSO_MMII_REFLUX_REQUIRED])];
    for (const id of required) {
      const segment = s.segments.find((v) => v.id === id);
      if (!segment || segment.assessment === "not_assessed") issue("COVERAGE_REQUIRED", `${path}.segments.${id}`, `${DOPPLER_VENOSO_MMII_SEGMENT_LABELS[id]}: registre a avaliação ou a limitação.`);
    }
    for (const segment of s.segments) {
      const p = `${path}.segments.${segment.id}`;
      if (segment.assessment === "not_assessed") {
        if (hasSegmentResult(segment)) issue("NOT_ASSESSED_HAS_RESULTS", p, "Segmento não avaliado contém resultados.");
        continue;
      }
      if (segment.assessment === "limited" && !segment.limitation) issue("LIMITATION_REQUIRED", `${p}.limitation`, "Descreva a limitação técnica.");
      if (segment.assessment !== "limited" && segment.limitation) issue("LIMITATION_STATE_CONFLICT", p, "Marque o segmento como limitado para registrar uma limitação.");
      if (segment.assessment === "evaluated" && (segment.compressibility === "not_assessed" || segment.compressibility === "not_testable")) issue("COMPRESSION_REQUIRED", `${p}.compressibility`, "Documente a compressibilidade ou marque a avaliação como limitada.");
      checkReflux(segment.reflux, `${p}.reflux`, data.protocol === "tvp_only" || segment.assessment === "limited" || !DOPPLER_VENOSO_MMII_REFLUX_REQUIRED.includes(segment.id));
      if (isIncompressible(segment) && !segment.thrombosis?.physicianConfirmed) issue("THROMBOSIS_CONFIRMATION_REQUIRED", `${p}.thrombosis`, "Confirme a observação de trombose associada à incompressibilidade antes de gerar o texto.");
      if (segment.thrombosis) {
        const t = segment.thrombosis;
        if (!isIncompressible(segment)) issue("TVP_INCOMPRESSIBILITY_REQUIRED", p, "A conclusão de trombose exige compressibilidade parcial ou ausente documentada.");
        if (!t.physicianConfirmed) issue("THROMBOSIS_CONFIRMATION_REQUIRED", `${p}.thrombosis`, "Confirme a observação de trombose.");
        if (t.phase !== "not_assessed" && t.phase !== "indeterminate" && (!t.phaseConfirmed || !t.phaseEvidence)) issue("PHASE_EVIDENCE_REQUIRED", `${p}.thrombosis.phase`, "Fase temporal exige achados de suporte e confirmação médica; use indeterminada quando não puder defini-la.");
        if (t.phase === "not_assessed" && (t.phaseConfirmed || t.phaseEvidence)) issue("PHASE_STATE_CONFLICT", `${p}.thrombosis.phase`, "Há dados de fase temporal sem fase selecionada.");
      }
    }
    const perforatorIds = new Set<string>();
    for (const [i, perforator] of s.perforators.entries()) {
      const p = `${path}.perforators.${i}`;
      if (perforatorIds.has(perforator.id)) issue("DUPLICATE_PERFORATOR", p, "Identificador de perfurante repetido.");
      perforatorIds.add(perforator.id);
      if (!perforator.limitation && !perforator.diameter) issue("PERFORATOR_DIAMETER_REQUIRED", `${p}.diameter`, "Informe o calibre da perfurante ou a limitação.");
      checkReflux(perforator.reflux, `${p}.reflux`, !!perforator.limitation);
      if (!perforator.limitation && perforator.outwardFlow === "not_assessed") issue("PERFORATOR_DIRECTION_REQUIRED", `${p}.outwardFlow`, "Documente o sentido do fluxo na perfurante.");
      if (perforator.outwardFlow === "absent" && perforator.reflux.time && seconds(perforator.reflux.time) > 0) issue("PERFORATOR_DIRECTION_CONFLICT", p, "Fluxo reverso não pode ter duração positiva com fluxo de saída ausente.");
    }
  }
  return { success: issues.length === 0, data, issues, canGenerateFinalText: issues.length === 0 };
}

const maneuverLabel = { not_documented: "não documentada", valsalva: "Valsalva", distal_compression: "compressão distal", release: "liberação da compressão distal" } as const;
const positionLabel = { not_documented: "não documentada", standing: "ortostatismo", sitting: "posição sentada", reverse_trendelenburg: "Trendelenburg reverso", supine: "decúbito dorsal" } as const;
const phaseLabel = { not_assessed: "", acute: "aguda", chronic_recanalized: "crônica, com recanalização", mixed: "de aspecto misto", indeterminate: "de idade indeterminada" } as const;

export function renderDopplerVenosoMmii(value: unknown, style: "CLASSICO_COMPLETO" | "OBJETIVO" = "CLASSICO_COMPLETO"): string {
  const validation = validateDopplerVenosoMmii(value);
  if (!validation.success || !validation.data) throw new Error(validation.issues.map((i) => `${i.path}: ${i.message}`).join(" "));
  const data = validation.data;
  const bodies: string[] = [];
  const conclusions: string[] = [];
  for (const side of ["right", "left"] as const) {
    if (!requested(data, side)) continue;
    const dataSide = data.sides[side];
    const limb = `membro inferior ${sideLabel(side)}`;
    const lines: string[] = [`MEMBRO INFERIOR ${sideLabel(side).toUpperCase()}:`];
    const completeCompression: string[] = [];
    const refluxAbsent: string[] = [];
    let positiveDeep = false;
    let hasLimitation = false;
    for (const s of dataSide.segments) {
      if (s.assessment === "not_assessed") continue;
      const label = DOPPLER_VENOSO_MMII_SEGMENT_LABELS[s.id];
      if (s.assessment === "limited") {
        hasLimitation = true;
        lines.push(`${label}: avaliação limitada. ${sentence(s.limitation!)}`);
      }
      if (s.compressibility === "complete") completeCompression.push(label.toLocaleLowerCase("pt-BR"));
      if (isIncompressible(s) && s.thrombosis) {
        const t = s.thrombosis;
        const phase = t.phase === "not_assessed" ? "" : ` ${phaseLabel[t.phase]}`;
        const occlusion = t.occlusion === "occlusive" ? "oclusiva" : t.occlusion === "partial" ? "parcialmente oclusiva" : "de grau de oclusão indeterminado";
        const diagnosis = `Trombose venosa profunda${phase} em ${label.toLocaleLowerCase("pt-BR")} do ${limb}`;
        lines.push(`${label} com compressibilidade ${s.compressibility === "partial" ? "parcial" : "ausente"}${t.intraluminalMaterial === "present" ? ", contendo material intraluminal" : ""}${t.occlusion === "not_assessed" ? "" : `, com alteração ${occlusion}`}.${t.extent ? ` Extensão: ${sentence(t.extent)}` : ""}${t.phaseEvidence ? ` ${sentence(t.phaseEvidence)}` : ""}`);
        if (deepSegments.has(s.id)) conclusions.push(`${diagnosis}.`);
        positiveDeep ||= deepSegments.has(s.id);
      }
      if (s.diameter) lines.push(`${label} com calibre de ${pt(s.diameter.value)} ${s.diameter.unit}.`);
      if (s.reflux.tested && s.reflux.time) {
        const duration = seconds(s.reflux.time);
        const threshold = dopplerVenosoMmiiRefluxThreshold(s.id);
        const technique = `${maneuverLabel[s.reflux.maneuver]}, em ${positionLabel[s.reflux.position]}`;
        if (threshold !== null && duration > threshold) {
          lines.push(`${label} com fluxo reverso de ${pt(s.reflux.time.value)} ${s.reflux.time.unit} à manobra de ${technique}.`);
          conclusions.push(`Refluxo em ${label.toLocaleLowerCase("pt-BR")} do ${limb}.`);
        } else if (duration === 0) refluxAbsent.push(label.toLocaleLowerCase("pt-BR"));
        else lines.push(`${label} com fluxo reverso de ${pt(s.reflux.time.value)} ${s.reflux.time.unit} à manobra de ${technique}${threshold === null ? "; sem classificação automática de refluxo neste segmento" : ", sem ultrapassar o limiar de refluxo adotado para este segmento"}.`);
      }
    }
    if (completeCompression.length) lines.splice(1, 0, `Compressibilidade preservada nos seguintes segmentos: ${completeCompression.join("; ")}.`);
    if (refluxAbsent.length) lines.push(`Pesquisa de refluxo negativa nos segmentos testados: ${refluxAbsent.join("; ")}.`);
    for (const p of dataSide.perforators) {
      if (p.limitation) { lines.push(`Perfurante em ${p.location}: avaliação limitada. ${sentence(p.limitation)}`); hasLimitation = true; }
      if (p.diameter || p.reflux.time) {
        const flow = p.reflux.time
          ? p.outwardFlow === "absent" && seconds(p.reflux.time) === 0
            ? "; pesquisa de fluxo de saída negativa"
            : `; ${p.outwardFlow === "documented" ? "fluxo de saída com duração" : "tempo de fluxo reverso informado"} de ${pt(p.reflux.time.value)} ${p.reflux.time.unit}`
          : "";
        lines.push(`Perfurante em ${p.location}${p.diameter ? `, com calibre de ${pt(p.diameter.value)} ${p.diameter.unit}` : ""}${flow}.`);
      }
      if (!p.limitation && p.diameter && p.reflux.tested && p.reflux.time && p.outwardFlow === "documented" && millimeters(p.diameter) > 3.5 && seconds(p.reflux.time) > 0.5) conclusions.push(`Perfurante insuficiente em ${p.location}, no ${limb}.`);
    }
    const deepAssessed = dataSide.segments.filter((s) => deepSegments.has(s.id) && s.assessment !== "not_assessed");
    const fullyCompressed = DOPPLER_VENOSO_MMII_TVP_REQUIRED.every((id) => dataSide.segments.some((s) => s.id === id && s.compressibility === "complete" && s.assessment === "evaluated")) && deepAssessed.every((s) => s.compressibility === "complete" && s.assessment === "evaluated");
    if (!positiveDeep && fullyCompressed) conclusions.push(`Não se identificam sinais de trombose venosa profunda nos segmentos avaliados do ${limb}.`);
    else if (!positiveDeep) conclusions.push(`Pesquisa de trombose venosa profunda limitada no ${limb}, conforme descrito no corpo do laudo.`);
    if (hasLimitation) conclusions.push(`Limitações da avaliação do ${limb}: considerar os territórios descritos no corpo do laudo.`);
    bodies.push(lines.join("\n"));
  }
  const recommendations = data.recommendations.filter((r) => r.physicianConfirmed).map((r) => sentence(r.text));
  const title = data.laterality === "bilateral" ? "DOPPLER VENOSO DOS MEMBROS INFERIORES" : `DOPPLER VENOSO DO MEMBRO INFERIOR ${sideLabel(data.laterality).toUpperCase()}`;
  const technique = "Exame realizado com transdutor linear multifrequencial, avaliação em modo B, compressão venosa nos segmentos documentados e Doppler colorido e espectral.";
  return `${title}\n\n${style === "OBJETIVO" ? "TÉCNICA" : "COMENTÁRIOS"}:\n${technique}\n\n${style === "OBJETIVO" ? "ACHADOS" : "OS SEGUINTES ASPECTOS FORAM OBSERVADOS"}:\n${bodies.join("\n\n")}\n\n${style === "OBJETIVO" ? "IMPRESSÃO" : "CONCLUSÃO"}:\n${conclusions.join("\n")}${recommendations.length ? `\n\nRECOMENDAÇÕES CONFIRMADAS PELO MÉDICO:\n${recommendations.join("\n")}` : ""}`;
}
