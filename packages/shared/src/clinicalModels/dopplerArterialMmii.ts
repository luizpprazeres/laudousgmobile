import { z } from "zod";

/**
 * Doppler arterial dos membros inferiores — contrato Web MVP (pendente de revisão clínica).
 * Fonte clínica: packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII (template, ITB e critérios
 * de estenose por velocidade). Graduação percentual exige medidas suficientes e confirmação;
 * ausência de fluxo só vira oclusão com confirmação médica. Nenhum rótulo clínico
 * (claudicação, Rutherford, isquemia crítica) é derivado do Doppler.
 */
export const DOPPLER_ARTERIAL_MMII_VERSION = "doppler-arterial-mmii/web-v1" as const;
export const DOPPLER_ARTERIAL_MMII_SEGMENTS = [
  "common_femoral", "deep_femoral", "femoral_proximal", "femoral_mid", "femoral_distal", "popliteal",
  "tibioperoneal_trunk", "anterior_tibial", "posterior_tibial", "fibular", "dorsalis_pedis",
] as const;
export type DopplerArterialMmiiSegmentId = typeof DOPPLER_ARTERIAL_MMII_SEGMENTS[number];
export const DOPPLER_ARTERIAL_MMII_SEGMENT_LABELS: Record<DopplerArterialMmiiSegmentId, string> = {
  common_femoral: "Artéria femoral comum", deep_femoral: "Artéria femoral profunda (origem)",
  femoral_proximal: "Artéria femoral — terço proximal", femoral_mid: "Artéria femoral — terço médio",
  femoral_distal: "Artéria femoral — terço distal", popliteal: "Artéria poplítea",
  tibioperoneal_trunk: "Tronco tibiofibular", anterior_tibial: "Artéria tibial anterior",
  posterior_tibial: "Artéria tibial posterior", fibular: "Artéria fibular", dorsalis_pedis: "Artéria dorsal do pé",
};
/** Segmentos sem os quais o membro não recebe conclusão de normalidade. */
export const DOPPLER_ARTERIAL_MMII_REQUIRED: readonly DopplerArterialMmiiSegmentId[] = [
  "common_femoral", "deep_femoral", "femoral_proximal", "femoral_mid", "femoral_distal", "popliteal",
  "anterior_tibial", "posterior_tibial", "fibular",
];
/** Critérios por velocidade da base de conhecimento (template-padrao.md). */
export const DOPPLER_ARTERIAL_MMII_GRADE_CRITERIA = {
  ge50: { minPsvCms: 200, minRatio: 2 },
  ge70: { minPsvCms: 400, minRatio: 4 },
} as const;

const Positive = z.number().finite().positive();
const Pressure = z.number().finite().min(20).max(350);
const SegmentSchema = z.object({
  id: z.enum(DOPPLER_ARTERIAL_MMII_SEGMENTS),
  assessment: z.enum(["not_assessed", "evaluated", "limited"]),
  limitation: z.string().trim().min(3).max(500).optional(),
  waveform: z.enum(["not_assessed", "triphasic", "biphasic", "monophasic"]),
  plaque: z.enum(["not_assessed", "absent", "present"]),
  psvCms: Positive.optional(),
  stenosis: z.object({
    lesionPsvCms: Positive,
    referencePsvCms: Positive.optional(),
    grade: z.enum(["not_classified", "ge50", "ge70"]),
    physicianConfirmed: z.boolean(),
  }).strict().optional(),
  noFlow: z.object({
    occlusionConfirmed: z.boolean(),
    collaterals: z.enum(["not_assessed", "present", "absent"]),
    reconstitution: z.string().trim().min(3).max(200).optional(),
  }).strict().optional(),
}).strict();
const AnkleSchema = z.object({ posteriorTibialMmHg: Pressure.optional(), dorsalisPedisMmHg: Pressure.optional() }).strict();
export const DopplerArterialMmiiSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("DOPPLER_ARTERIAL_MMII"),
  laterality: z.enum(["right", "left", "bilateral"]),
  sides: z.object({
    right: z.object({ segments: z.array(SegmentSchema).max(20) }).strict(),
    left: z.object({ segments: z.array(SegmentSchema).max(20) }).strict(),
  }).strict(),
  abi: z.object({
    brachialRightMmHg: Pressure.optional(),
    brachialLeftMmHg: Pressure.optional(),
    right: AnkleSchema,
    left: AnkleSchema,
  }).strict(),
}).strict();
export type DopplerArterialMmiiInput = z.infer<typeof DopplerArterialMmiiSchema>;
export type DopplerArterialMmiiSegment = z.infer<typeof SegmentSchema>;
export type DopplerArterialMmiiIssue = { code: string; path: string; message: string };
export type DopplerArterialMmiiValidation = { success: boolean; data: DopplerArterialMmiiInput | null; issues: DopplerArterialMmiiIssue[] };
type Side = "right" | "left";

export function createInitialDopplerArterialMmiiInput(): DopplerArterialMmiiInput {
  const side = () => ({ segments: DOPPLER_ARTERIAL_MMII_SEGMENTS.map((id): DopplerArterialMmiiSegment => ({ id, assessment: "not_assessed", waveform: "not_assessed", plaque: "not_assessed" })) });
  return { schemaVersion: 1, categoryCode: "DOPPLER_ARTERIAL_MMII", laterality: "bilateral", sides: { right: side(), left: side() }, abi: { right: {}, left: {} } };
}

const requested = (data: DopplerArterialMmiiInput, side: Side) => data.laterality === "bilateral" || data.laterality === side;
const round2 = (n: number) => Math.round(n * 100) / 100;
const hasResult = (s: DopplerArterialMmiiSegment) => s.assessment !== "not_assessed" || !!s.limitation || s.waveform !== "not_assessed" || s.plaque !== "not_assessed" || s.psvCms !== undefined || !!s.stenosis || !!s.noFlow;
export function dopplerArterialMmiiVelocityRatio(stenosis: NonNullable<DopplerArterialMmiiSegment["stenosis"]>): number | null {
  return stenosis.referencePsvCms ? round2(stenosis.lesionPsvCms / stenosis.referencePsvCms) : null;
}
/** ITB do lado = maior pressão do tornozelo ÷ maior pressão braquial (dois braços). */
export function dopplerArterialMmiiAbi(data: DopplerArterialMmiiInput, side: Side): number | null {
  const ankle = [data.abi[side].posteriorTibialMmHg, data.abi[side].dorsalisPedisMmHg].filter((v): v is number => v !== undefined);
  if (!ankle.length || data.abi.brachialRightMmHg === undefined || data.abi.brachialLeftMmHg === undefined) return null;
  return round2(Math.max(...ankle) / Math.max(data.abi.brachialRightMmHg, data.abi.brachialLeftMmHg));
}

/** Observação ausente nunca vira normalidade; graduação e oclusão dependem de confirmação. */
export function validateDopplerArterialMmii(value: unknown): DopplerArterialMmiiValidation {
  const parsed = DopplerArterialMmiiSchema.safeParse(value);
  if (!parsed.success) return { success: false, data: null, issues: parsed.error.issues.map((i) => ({ code: "SCHEMA_INVALID", path: i.path.join("."), message: i.message })) };
  const data = parsed.data;
  const issues: DopplerArterialMmiiIssue[] = [];
  const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });
  const ankleGiven = (side: Side) => data.abi[side].posteriorTibialMmHg !== undefined || data.abi[side].dorsalisPedisMmHg !== undefined;
  for (const side of ["right", "left"] as const) {
    const path = `sides.${side}`;
    const segments = data.sides[side].segments;
    if (!requested(data, side)) {
      if (segments.some(hasResult) || ankleGiven(side)) issue("UNREQUESTED_SIDE_HAS_RESULTS", path, "Há resultados em um lado não incluído no exame.");
      continue;
    }
    if (!segments.some((s) => s.assessment !== "not_assessed")) issue("COVERAGE_REQUIRED", path, "Registre ao menos um segmento avaliado neste membro.");
    const seen = new Set<string>();
    for (const s of segments) {
      const p = `${path}.segments.${s.id}`;
      if (seen.has(s.id)) issue("DUPLICATE_SEGMENT", p, "O mesmo segmento foi informado mais de uma vez.");
      seen.add(s.id);
      if (s.assessment === "not_assessed") {
        if (hasResult(s)) issue("NOT_ASSESSED_HAS_RESULTS", p, "Segmento não avaliado contém resultados.");
        continue;
      }
      if (s.assessment === "limited" && !s.limitation) issue("LIMITATION_REQUIRED", `${p}.limitation`, "Descreva a limitação técnica.");
      if (s.assessment !== "limited" && s.limitation) issue("LIMITATION_STATE_CONFLICT", p, "Marque o segmento como limitado para registrar uma limitação.");
      if (s.noFlow) {
        if (s.waveform !== "not_assessed" || s.psvCms !== undefined || s.stenosis) issue("NO_FLOW_CONFLICT", p, "Fluxo não detectado não admite padrão espectral, VPS ou estenose no mesmo segmento.");
        if (s.noFlow.occlusionConfirmed && s.assessment === "limited") issue("OCCLUSION_LIMITED_CONFLICT", p, "Oclusão confirmada exige segmento avaliado sem limitação.");
        continue;
      }
      if (s.assessment === "evaluated" && s.waveform === "not_assessed") issue("WAVEFORM_REQUIRED", `${p}.waveform`, "Informe o padrão espectral ou marque a avaliação como limitada.");
      if (s.stenosis) {
        const st = s.stenosis;
        const ratio = dopplerArterialMmiiVelocityRatio(st);
        if (st.grade !== "not_classified") {
          const criteria = DOPPLER_ARTERIAL_MMII_GRADE_CRITERIA[st.grade];
          if (ratio === null) issue("GRADE_DATA_INSUFFICIENT", `${p}.stenosis`, "A graduação exige VPS de referência proximal para calcular a razão de velocidades.");
          else if (!(st.lesionPsvCms > criteria.minPsvCms && ratio > criteria.minRatio)) issue("GRADE_CRITERIA_MISMATCH", `${p}.stenosis.grade`, `A graduação selecionada exige VPS acima de ${criteria.minPsvCms} cm/s e razão acima de ${criteria.minRatio}.`);
          if (!st.physicianConfirmed) issue("GRADE_CONFIRMATION_REQUIRED", `${p}.stenosis`, "Confirme a graduação da estenose antes de gerar o texto.");
        } else if (st.physicianConfirmed) issue("CONFIRMATION_WITHOUT_GRADE", `${p}.stenosis`, "A confirmação exige uma graduação selecionada.");
      }
    }
  }
  const anyAnkle = ankleGiven("right") || ankleGiven("left");
  if (anyAnkle && (data.abi.brachialRightMmHg === undefined || data.abi.brachialLeftMmHg === undefined)) issue("ABI_BRACHIAL_REQUIRED", "abi", "O ITB exige as pressões braquiais dos dois braços.");
  return { success: issues.length === 0, data, issues };
}

const pt = (n: number, digits = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const sentence = (s: string) => `${s.trim().replace(/[.;,:\s]+$/u, "")}.`;
const lower = (s: string) => s.charAt(0).toLocaleLowerCase("pt-BR") + s.slice(1);
const limbLabel = (side: Side) => `membro inferior ${side === "right" ? "direito" : "esquerdo"}`;
const waveformLabel = { triphasic: "trifásico", biphasic: "bifásico", monophasic: "monofásico" } as const;
const gradeLabel = { ge50: "50% ou mais", ge70: "70% ou mais" } as const;
const sideWord = (side: Side) => side === "right" ? "à direita" : "à esquerda";

function abiConclusion(abi: number, side: Side): string | null {
  if (abi > 1.4) return `Índice tornozelo-braquial elevado ${sideWord(side)} (${pt(abi)}), compatível com incompressibilidade arterial; valor inconclusivo para avaliação de doença obstrutiva.`;
  if (abi >= 1) return null;
  if (abi >= 0.9) return `Índice tornozelo-braquial em faixa limítrofe ${sideWord(side)} (${pt(abi)}).`;
  if (abi >= 0.4) return `Índice tornozelo-braquial reduzido ${sideWord(side)} (${pt(abi)}).`;
  return `Índice tornozelo-braquial acentuadamente reduzido ${sideWord(side)} (${pt(abi)}).`;
}

export function renderDopplerArterialMmii(value: unknown, style: "CLASSICO_COMPLETO" | "OBJETIVO" = "CLASSICO_COMPLETO"): string {
  const validation = validateDopplerArterialMmii(value);
  if (!validation.success || !validation.data) throw new Error(validation.issues.map((i) => `${i.path}: ${i.message}`).join(" "));
  const data = validation.data;
  const bodies: string[] = [];
  const conclusions: string[] = [];
  for (const side of ["right", "left"] as const) {
    if (!requested(data, side)) continue;
    const limb = limbLabel(side);
    const lines = [`${limb.toUpperCase()}:`];
    const findings: string[] = [];
    const preserved: string[] = [];
    const biphasic: string[] = [];
    const incomplete: string[] = [];
    for (const id of DOPPLER_ARTERIAL_MMII_SEGMENTS) {
      const s = data.sides[side].segments.find((segment) => segment.id === id);
      const label = DOPPLER_ARTERIAL_MMII_SEGMENT_LABELS[id];
      if (!s || s.assessment === "not_assessed") {
        if (DOPPLER_ARTERIAL_MMII_REQUIRED.includes(id)) incomplete.push(lower(label));
        continue;
      }
      if (s.assessment === "limited") {
        incomplete.push(lower(label));
        lines.push(`${label}: avaliação limitada. ${sentence(s.limitation!)}`);
      }
      if (s.noFlow) {
        const extra = [
          s.noFlow.collaterals === "present" ? "circulação colateral identificada" : s.noFlow.collaterals === "absent" ? "sem circulação colateral identificada" : "",
          s.noFlow.reconstitution ? `reenchimento em ${s.noFlow.reconstitution.replace(/[.\s]+$/u, "")}` : "",
        ].filter(Boolean).join("; ");
        lines.push(`${label}: fluxo não detectado ao Doppler colorido e espectral${extra ? `; ${extra}` : ""}.`);
        findings.push(s.noFlow.occlusionConfirmed
          ? `Oclusão da ${lower(label)} do ${limb}${s.noFlow.reconstitution ? `, com reenchimento em ${s.noFlow.reconstitution.replace(/[.\s]+$/u, "")}` : ""}.`
          : `Fluxo não detectado ao Doppler na ${lower(label)} do ${limb}.`);
        continue;
      }
      const parts: string[] = [];
      if (s.waveform !== "not_assessed") parts.push(`fluxo de padrão ${waveformLabel[s.waveform]}`);
      if (s.psvCms !== undefined) parts.push(`VPS de ${pt(s.psvCms)} cm/s`);
      if (s.plaque === "present") parts.push("placas ateromatosas parietais");
      if (s.plaque === "absent" && !s.stenosis) parts.push("sem placas ateromatosas");
      if (s.stenosis) {
        const st = s.stenosis;
        const ratio = dopplerArterialMmiiVelocityRatio(st);
        parts.push(`aceleração focal do fluxo com VPS de ${pt(st.lesionPsvCms)} cm/s${st.referencePsvCms ? `, VPS de referência proximal de ${pt(st.referencePsvCms)} cm/s e razão de velocidades de ${pt(ratio!)}` : ""}`);
        const measures = `VPS de ${pt(st.lesionPsvCms)} cm/s${ratio !== null ? `; razão de velocidades de ${pt(ratio)}` : ""}`;
        findings.push(st.grade !== "not_classified"
          ? `Estenose estimada em ${gradeLabel[st.grade]} na ${lower(label)} do ${limb} (${measures}).`
          : `Aumento focal da velocidade de pico sistólico na ${lower(label)} do ${limb} (${measures}), sem graduação confirmada.`);
      } else if (s.plaque === "present") findings.push(`Placas ateromatosas na ${lower(label)} do ${limb}, sem aceleração focal do fluxo documentada.`);
      if (s.waveform === "monophasic") findings.push(`Padrão espectral monofásico na ${lower(label)} do ${limb}.`);
      if (s.waveform === "biphasic") biphasic.push(lower(label));
      const isPreserved = s.assessment === "evaluated" && s.waveform === "triphasic" && s.plaque !== "present" && !s.stenosis;
      if (isPreserved) {
        // Já resumido na frase de segmentos preservados; a linha própria só traz a medida.
        preserved.push(lower(label));
        if (s.psvCms !== undefined) lines.push(`${label}: VPS de ${pt(s.psvCms)} cm/s.`);
      } else if (s.assessment === "evaluated" && parts.length) lines.push(`${label}: ${parts.join(", ")}.`);
    }
    const abi = dopplerArterialMmiiAbi(data, side);
    if (abi !== null) {
      const ankle = Math.max(...[data.abi[side].posteriorTibialMmHg, data.abi[side].dorsalisPedisMmHg].filter((v): v is number => v !== undefined));
      const brachial = Math.max(data.abi.brachialRightMmHg!, data.abi.brachialLeftMmHg!);
      lines.push(`Índice tornozelo-braquial (ITB): ${pt(abi)} (maior pressão sistólica no tornozelo de ${pt(ankle, 0)} mmHg; maior pressão braquial de ${pt(brachial, 0)} mmHg).`);
      const abiText = abiConclusion(abi, side);
      if (abiText) findings.push(abiText);
    }
    if (!findings.length && !incomplete.length) {
      conclusions.push(biphasic.length
        ? `Fluxo detectável nos segmentos avaliados do ${limb}, sem aceleração focal ou ausência de fluxo documentadas; padrão espectral bifásico em: ${biphasic.join("; ")}.`
        : `Artérias avaliadas do ${limb} pérvias, com fluxo de padrão trifásico, sem sinais ecográficos de estenose hemodinamicamente significativa.`);
    }
    conclusions.push(...findings);
    if (incomplete.length) conclusions.push(`Avaliação incompleta do ${limb}; segmentos não avaliados ou com limitação: ${incomplete.join("; ")}.`);
    if (preserved.length) lines.splice(1, 0, `Fluxo de padrão trifásico, sem placas ou aceleração focal, nos seguintes segmentos: ${preserved.join("; ")}.`);
    bodies.push(lines.join("\n"));
  }
  const title = data.laterality === "bilateral"
    ? "ULTRASSONOGRAFIA COM DOPPLER ARTERIAL DOS MEMBROS INFERIORES"
    : `ULTRASSONOGRAFIA COM DOPPLER ARTERIAL DO ${limbLabel(data.laterality).toUpperCase()}`;
  const technique = "Exame realizado com transdutores linear e convexo multifrequenciais, com avaliação em modo B, Doppler colorido e espectral, ângulo de insonação igual ou inferior a 60°.";
  return `${title}\n\n${style === "OBJETIVO" ? "TÉCNICA" : "COMENTÁRIOS"}:\n${technique}\n\n${style === "OBJETIVO" ? "ACHADOS" : "OS SEGUINTES ASPECTOS FORAM OBSERVADOS"}:\n${bodies.join("\n\n")}\n\n${style === "OBJETIVO" ? "IMPRESSÃO" : "CONCLUSÃO"}:\n${conclusions.join("\n")}`;
}
