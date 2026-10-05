import { z } from "zod";

/**
 * Doppler das artérias temporais superficiais — contrato Web MVP (pendente de revisão clínica).
 * Preflight: docs/competitor-research/laudario/audits/preflight-doppler-arterias-temporais-2026-10-03.md.
 * Lado × ramo com estado explícito; ramo não avaliado nunca vira normal. Halo, compressão e
 * espessura de parede são descritos; nenhuma medida isolada classifica. A hipótese de
 * arterite só entra na conclusão com halo e um segundo marcador no mesmo ramo, mais
 * confirmação médica. Não há limiar de espessura aprovado nesta versão.
 */
export const DOPPLER_ARTERIAS_TEMPORAIS_VERSION = "doppler-arterias-temporais/web-v1" as const;
export const DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES = ["common_trunk", "frontal", "parietal"] as const;
export type DopplerArteriasTemporaisBranchId = typeof DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES[number];
export const DOPPLER_ARTERIAS_TEMPORAIS_BRANCH_LABELS: Record<DopplerArteriasTemporaisBranchId, string> = {
  common_trunk: "tronco comum", frontal: "ramo frontal", parietal: "ramo parietal",
};
/** Espessura acima disso indica provável troca de unidade (cm/mm), não medida de parede. */
export const DOPPLER_ARTERIAS_TEMPORAIS_MAX_WALL_MM = 3;

const BranchSchema = z.object({
  id: z.enum(DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES),
  assessment: z.enum(["not_assessed", "evaluated", "limited"]),
  limitation: z.string().trim().min(3).max(500).optional(),
  flow: z.enum(["not_assessed", "detected", "not_detected"]),
  halo: z.enum(["not_assessed", "absent", "present", "indeterminate"]),
  compression: z.enum(["not_tested", "negative", "positive"]),
  wallThicknessMm: z.number().finite().positive().optional(),
  psvCms: z.number().finite().positive().optional(),
}).strict();
const SideSchema = z.object({ branches: z.array(BranchSchema).max(6) }).strict();
export const DopplerArteriasTemporaisSchema = z.object({
  schemaVersion: z.literal(1),
  categoryCode: z.literal("DOPPLER_ARTERIAS_TEMPORAIS"),
  laterality: z.enum(["right", "left", "bilateral"]),
  sides: z.object({ right: SideSchema, left: SideSchema }).strict(),
  corticosteroid: z.object({
    status: z.enum(["not_informed", "no", "yes"]),
    durationDays: z.number().int().positive().max(3650).optional(),
  }).strict(),
  arteritisHypothesis: z.object({ include: z.boolean(), physicianConfirmed: z.boolean() }).strict(),
}).strict();
export type DopplerArteriasTemporaisInput = z.infer<typeof DopplerArteriasTemporaisSchema>;
export type DopplerArteriasTemporaisBranch = z.infer<typeof BranchSchema>;
export type DopplerArteriasTemporaisIssue = { code: string; path: string; message: string };
export type DopplerArteriasTemporaisValidation = { success: boolean; data: DopplerArteriasTemporaisInput | null; issues: DopplerArteriasTemporaisIssue[] };
type Side = "right" | "left";

export function createInitialDopplerArteriasTemporaisInput(): DopplerArteriasTemporaisInput {
  const side = () => ({ branches: DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES.map((id): DopplerArteriasTemporaisBranch => ({ id, assessment: "not_assessed", flow: "not_assessed", halo: "not_assessed", compression: "not_tested" })) });
  return {
    schemaVersion: 1, categoryCode: "DOPPLER_ARTERIAS_TEMPORAIS", laterality: "bilateral",
    sides: { right: side(), left: side() },
    corticosteroid: { status: "not_informed" }, arteritisHypothesis: { include: false, physicianConfirmed: false },
  };
}

const requested = (data: DopplerArteriasTemporaisInput, side: Side) => data.laterality === "bilateral" || data.laterality === side;
const hasResult = (b: DopplerArteriasTemporaisBranch) => !!b.limitation || b.flow !== "not_assessed" || b.halo !== "not_assessed" ||
  b.compression !== "not_tested" || b.wallThicknessMm !== undefined || b.psvCms !== undefined;
/** Dado mínimo para a hipótese: halo e um segundo marcador no mesmo ramo avaliado. */
const supportsHypothesis = (b: DopplerArteriasTemporaisBranch) =>
  b.assessment !== "not_assessed" && b.halo === "present" && (b.compression === "positive" || b.wallThicknessMm !== undefined);

export function validateDopplerArteriasTemporais(value: unknown): DopplerArteriasTemporaisValidation {
  const parsed = DopplerArteriasTemporaisSchema.safeParse(value);
  if (!parsed.success) return { success: false, data: null, issues: parsed.error.issues.map((i) => ({ code: "SCHEMA_INVALID", path: i.path.join("."), message: i.message })) };
  const data = parsed.data;
  const issues: DopplerArteriasTemporaisIssue[] = [];
  const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });
  for (const side of ["right", "left"] as const) {
    const path = `sides.${side}`;
    const branches = data.sides[side].branches;
    if (!requested(data, side)) {
      if (branches.some((b) => b.assessment !== "not_assessed" || hasResult(b))) issue("UNREQUESTED_SIDE_HAS_RESULTS", path, "Há resultados em um lado não incluído no exame.");
      continue;
    }
    if (!branches.some((b) => b.assessment !== "not_assessed")) issue("COVERAGE_REQUIRED", path, "Registre ao menos um segmento avaliado ou limitado neste lado, ou ajuste a lateralidade.");
    const seen = new Set<string>();
    for (const b of branches) {
      const p = `${path}.branches.${b.id}`;
      if (seen.has(b.id)) issue("DUPLICATE_BRANCH", p, "O mesmo segmento foi informado mais de uma vez.");
      seen.add(b.id);
      if (b.assessment === "not_assessed") {
        if (hasResult(b)) issue("NOT_ASSESSED_HAS_RESULTS", p, "Segmento não avaliado contém resultados.");
        continue;
      }
      if (b.assessment === "limited" && !b.limitation) issue("LIMITATION_REQUIRED", `${p}.limitation`, "Descreva a limitação técnica.");
      if (b.assessment !== "limited" && b.limitation) issue("LIMITATION_STATE_CONFLICT", p, "Marque o segmento como limitado para registrar uma limitação.");
      if (b.assessment === "evaluated" && b.flow === "not_assessed") issue("FLOW_REQUIRED", `${p}.flow`, "Informe se há fluxo detectável ou marque a avaliação como limitada.");
      if (b.assessment === "evaluated" && b.flow === "detected" && b.halo === "not_assessed") issue("HALO_REQUIRED", `${p}.halo`, "Informe a pesquisa de halo parietal ou marque a avaliação como limitada.");
      if (b.flow === "not_detected" && b.psvCms !== undefined) issue("NO_FLOW_CONFLICT", p, "Fluxo não detectado não admite VPS no mesmo segmento.");
      if (b.wallThicknessMm !== undefined && b.wallThicknessMm > DOPPLER_ARTERIAS_TEMPORAIS_MAX_WALL_MM) issue("WALL_THICKNESS_SCALE", `${p}.wallThicknessMm`, `Espessura acima de ${DOPPLER_ARTERIAS_TEMPORAIS_MAX_WALL_MM} mm: confira a unidade (mm).`);
    }
  }
  if (data.corticosteroid.status !== "yes" && data.corticosteroid.durationDays !== undefined) issue("CORTICOSTEROID_DURATION_CONFLICT", "corticosteroid", "Tempo de uso só se aplica quando o uso de corticoide é informado.");
  const h = data.arteritisHypothesis;
  if (h.include) {
    const supported = (["right", "left"] as const).some((side) => requested(data, side) && data.sides[side].branches.some(supportsHypothesis));
    if (!supported) issue("HYPOTHESIS_DATA_INSUFFICIENT", "arteritisHypothesis", "A hipótese exige halo presente e um segundo achado (compressão positiva ou espessura medida) no mesmo segmento.");
    if (!h.physicianConfirmed) issue("HYPOTHESIS_CONFIRMATION_REQUIRED", "arteritisHypothesis", "Confirme a hipótese diagnóstica antes de incluí-la na conclusão.");
  } else if (h.physicianConfirmed) issue("CONFIRMATION_WITHOUT_HYPOTHESIS", "arteritisHypothesis", "A confirmação exige que a hipótese seja incluída.");
  return { success: issues.length === 0, data, issues };
}

const pt = (n: number, digits = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const sentence = (s: string) => `${s.trim().replace(/[.;,:\s]+$/u, "")}.`;
const artery = (side: Side) => `artéria temporal superficial ${side === "right" ? "direita" : "esquerda"}`;
const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1);
const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;

export function renderDopplerArteriasTemporais(value: unknown, style: "CLASSICO_COMPLETO" | "OBJETIVO" = "CLASSICO_COMPLETO"): string {
  const validation = validateDopplerArteriasTemporais(value);
  if (!validation.success || !validation.data) throw new Error(validation.issues.map((i) => `${i.path}: ${i.message}`).join(" "));
  const data = validation.data;
  const bodies: string[] = [];
  const conclusions: string[] = [];
  const hypothesisBranches: string[] = [];
  for (const side of ["right", "left"] as const) {
    if (!requested(data, side)) continue;
    const name = artery(side);
    const lines = [`${name.toUpperCase()}:`];
    const preserved: string[] = [];
    const findings: string[] = [];
    const incomplete: string[] = [];
    for (const id of DOPPLER_ARTERIAS_TEMPORAIS_BRANCHES) {
      const b = data.sides[side].branches.find((branch) => branch.id === id);
      const label = DOPPLER_ARTERIAS_TEMPORAIS_BRANCH_LABELS[id];
      if (!b || b.assessment === "not_assessed") { incomplete.push(label); continue; }
      if (b.assessment === "limited") {
        incomplete.push(label);
        lines.push(`${capitalize(label)}: avaliação limitada. ${capitalize(sentence(b.limitation!))}`);
      }
      const isNormal = b.assessment === "evaluated" && b.flow === "detected" && b.halo === "absent" && b.compression !== "positive";
      const parts: string[] = [];
      if (!isNormal) {
        if (b.flow === "detected") parts.push("fluxo detectável ao Doppler");
        if (b.flow === "not_detected") parts.push("fluxo não detectado ao Doppler colorido e espectral");
        if (b.halo === "present") parts.push("halo hipoecogênico parietal");
        if (b.halo === "indeterminate") parts.push("pesquisa de halo parietal indeterminada");
        if (b.halo === "absent") parts.push("sem halo parietal");
      }
      if (b.compression === "positive") parts.push("sinal de compressão positivo (parede visível à compressão)");
      if (b.compression === "negative" && !isNormal) parts.push("sinal de compressão negativo");
      if (b.wallThicknessMm !== undefined) parts.push(`espessura parietal de ${pt(b.wallThicknessMm)} mm`);
      if (b.psvCms !== undefined) parts.push(`VPS de ${pt(b.psvCms)} cm/s`);
      if (isNormal) {
        preserved.push(b.compression === "negative" ? `${label} (sinal de compressão negativo)` : label);
        if (parts.length) lines.push(`${capitalize(label)}: ${parts.join(", ")}.`);
      } else if (parts.length) lines.push(`${capitalize(label)}: ${parts.join(", ")}.`);
      const where = `no ${label} da ${name}`;
      if (b.halo === "present") findings.push(`Halo hipoecogênico parietal ${where}${b.compression === "positive" ? ", com sinal de compressão positivo" : ""}.`);
      else if (b.compression === "positive") findings.push(`Sinal de compressão positivo ${where}.`);
      if (b.halo === "indeterminate") findings.push(`Pesquisa de halo parietal indeterminada ${where}.`);
      if (b.flow === "not_detected") findings.push(`Fluxo não detectado ao Doppler ${where}.`);
      if (supportsHypothesis(b)) hypothesisBranches.push(`${label} ${side === "right" ? "direito" : "esquerdo"}`);
    }
    if (preserved.length) lines.splice(1, 0, `Fluxo detectável, sem halo parietal, em: ${list(preserved)}.`);
    conclusions.push(...findings);
    if (!findings.length && !incomplete.length) conclusions.push(`Sem alterações ecográficas nos segmentos avaliados da ${name}.`);
    else if (preserved.length) conclusions.push(`Sem alterações ecográficas nos segmentos avaliados da ${name} (${list(preserved.map((p) => p.replace(/ \(.*\)$/u, "")))}).`);
    if (incomplete.length) conclusions.push(`Avaliação incompleta da ${name}; segmentos não avaliados ou com limitação: ${list(incomplete)}.`);
    bodies.push(lines.join("\n"));
  }
  if (data.arteritisHypothesis.include && data.arteritisHypothesis.physicianConfirmed) {
    conclusions.push(`Achados ecográficos compatíveis com arterite de células gigantes (${list(hypothesisBranches)}), conforme avaliação médica; correlacionar com dados clínicos e laboratoriais.`);
  }
  if (data.corticosteroid.status === "yes") {
    conclusions.push(`Uso prévio de corticosteroide informado${data.corticosteroid.durationDays ? ` (${data.corticosteroid.durationDays} dias)` : ""}, o que pode reduzir a sensibilidade do método.`);
  }
  const title = data.laterality === "bilateral"
    ? "ULTRASSONOGRAFIA COM DOPPLER DAS ARTÉRIAS TEMPORAIS SUPERFICIAIS"
    : `ULTRASSONOGRAFIA COM DOPPLER DA ${artery(data.laterality).toUpperCase()}`;
  const technique = "Exame realizado com transdutor linear de alta frequência, com avaliação em modo B, Doppler colorido e espectral do tronco comum e dos ramos frontal e parietal nos segmentos indicados.";
  return `${title}\n\n${style === "OBJETIVO" ? "TÉCNICA" : "COMENTÁRIOS"}:\n${technique}\n\n${style === "OBJETIVO" ? "ACHADOS" : "OS SEGUINTES ASPECTOS FORAM OBSERVADOS"}:\n${bodies.join("\n\n")}\n\n${style === "OBJETIVO" ? "IMPRESSÃO" : "CONCLUSÃO"}:\n${conclusions.join("\n")}`;
}
