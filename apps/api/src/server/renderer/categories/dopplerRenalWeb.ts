import { z } from "zod";
import { linhaUnica, renderSharedKidney, SharedKidneySchema } from "./sharedUrinary";

const Assessment = z.enum(["not_assessed", "normal", "abnormal", "limited"]);
const Territory = z.enum(["upper_pole", "middle_pole", "lower_pole", "unspecified"]);
const RiTerritory = z.enum(["upper_pole", "middle_pole", "lower_pole", "summary_unspecified"]);
const Positive = z.number().finite().positive();
const NonNegative = z.number().finite().nonnegative();

const Limitation = z.string().trim().min(1).max(500).nullable();
const Psv = z.object({
  segment: z.enum(["ostial_or_proximal", "middle", "distal", "maximum_unspecified"]),
  value: Positive,
}).strict();
const Point = <T extends z.ZodTypeAny>(territory: T, value = NonNegative) =>
  z.object({ territory, value }).strict();

const RenalSide = z.object({
  assessment: Assessment,
  limitation: Limitation,
  kidney: SharedKidneySchema,
  artery: z.object({
    psv_cms: z.array(Psv).max(8),
    documented_rar: NonNegative.nullable(),
  }).strict(),
  intrarenal: z.object({
    ri: z.array(Point(RiTerritory)).max(8),
    spectral_pattern: z.enum(["not_assessed", "normal", "tardus_parvus", "indeterminate"]),
    acceleration_time_ms: z.array(Point(Territory)).max(8),
    acceleration_index_cms2: z.array(Point(Territory)).max(8),
  }).strict(),
}).strict().superRefine((side, ctx) => {
  const hasData = side.artery.psv_cms.length > 0 || side.artery.documented_rar !== null ||
    side.intrarenal.ri.length > 0 || side.intrarenal.spectral_pattern !== "not_assessed" ||
    side.intrarenal.acceleration_time_ms.length > 0 || side.intrarenal.acceleration_index_cms2.length > 0;
  if (side.assessment === "not_assessed") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["assessment"], message: "lado bilateral precisa ser avaliado" });
  }
  if (side.assessment === "not_assessed" && hasData) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "lado não avaliado não pode conter medidas" });
  }
  if (side.assessment === "abnormal" && !hasData) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "estado alterado exige pelo menos um achado vascular objetivo" });
  }
  if (side.assessment === "normal" && side.artery.psv_cms.some((item) => item.value > 250)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["artery", "psv_cms"], message: "VPS acima de 250 cm/s conflita com avaliação sem alteração" });
  }
  if (side.assessment === "normal" && ["tardus_parvus", "indeterminate"].includes(side.intrarenal.spectral_pattern)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["intrarenal", "spectral_pattern"], message: "padrão espectral alterado ou indeterminado conflita com avaliação sem alteração" });
  }
  const unique = (values: string[], path: string) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: "não repita o mesmo segmento ou território" });
    }
  };
  unique(side.artery.psv_cms.map((item) => item.segment), "artery.psv_cms");
  unique(side.intrarenal.ri.map((item) => item.territory), "intrarenal.ri");
  unique(side.intrarenal.acceleration_time_ms.map((item) => item.territory), "intrarenal.acceleration_time_ms");
  unique(side.intrarenal.acceleration_index_cms2.map((item) => item.territory), "intrarenal.acceleration_index_cms2");
  if (side.assessment === "limited" && !side.limitation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["limitation"], message: "avaliação limitada exige motivo" });
  }
  if (side.assessment !== "limited" && side.limitation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["limitation"], message: "limitação exige estado limitado" });
  }
});

export const DopplerRenalWebInputSchema = z.object({
  contract_version: z.literal("doppler-renal/web-v1"),
  category_code: z.literal("DOPPLER_RENAL"),
  laterality: z.literal("bilateral"),
  aorta: z.object({
    assessment: Assessment,
    limitation: Limitation,
    psv_cms: Positive.nullable(),
  }).strict(),
  sides: z.object({ right: RenalSide, left: RenalSide }).strict(),
  // Valores derivados pelo navegador nunca são autoridade clínica. São aceitos
  // apenas para compatibilidade e sempre recalculados abaixo.
  derived: z.object({
    maximum_renal_measurement_difference_cm: NonNegative.nullable(),
    right_maximum_measurement_cm: Positive.nullable(),
    left_maximum_measurement_cm: Positive.nullable(),
    conclusion_candidate_strict_gt_1_8_cm: z.boolean(),
  }).strict(),
}).strict().superRefine((data, ctx) => {
  if (data.aorta.assessment === "not_assessed" && data.aorta.psv_cms !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aorta", "psv_cms"], message: "aorta não avaliada não pode conter VPS" });
  }
  if (data.aorta.assessment === "abnormal" && data.aorta.psv_cms === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aorta", "psv_cms"], message: "aorta alterada exige VPS objetiva" });
  }
  if (data.aorta.assessment === "limited" && !data.aorta.limitation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aorta", "limitation"], message: "avaliação limitada exige motivo" });
  }
  if (data.aorta.assessment !== "limited" && data.aorta.limitation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aorta", "limitation"], message: "limitação exige estado limitado" });
  }
});

type Input = z.infer<typeof DopplerRenalWebInputSchema>;
type Side = "right" | "left";

const labels = {
  right: { kidney: "direito", artery: "direita" },
  left: { kidney: "esquerdo", artery: "esquerda" },
} as const;

const segment: Record<Input["sides"][Side]["artery"]["psv_cms"][number]["segment"], string> = {
  ostial_or_proximal: "ostial/proximal",
  middle: "médio",
  distal: "distal",
  maximum_unspecified: "não especificado",
};
const territory: Record<string, string> = {
  upper_pole: "polo superior",
  middle_pole: "terço médio",
  lower_pole: "polo inferior",
  summary_unspecified: "território intrarrenal",
  unspecified: "território intrarrenal",
};

function pt(value: number, digits = 2): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);
}

function vascularBody(side: Side, data: Input["sides"][Side]): string[] {
  const label = labels[side];
  const body: string[] = [];
  if (data.assessment === "normal") body.push(`Artéria renal ${label.artery} com fluxo preservado ao estudo Doppler.`);
  if (data.assessment === "limited" && data.limitation) body.push(`Avaliação da artéria renal ${label.artery} limitada por ${linhaUnica(data.limitation).replace(/\.+$/, "")}.`);
  for (const psv of data.artery.psv_cms) {
    body.push(`Artéria renal ${label.artery}, segmento ${segment[psv.segment]}: VPS de ${pt(psv.value)} cm/s.`);
  }
  if (data.artery.documented_rar !== null) {
    body.push(`Relação aorto-renal (RAR) à ${label.artery} de ${pt(data.artery.documented_rar, 3)}.`);
  }
  for (const ri of data.intrarenal.ri) {
    body.push(`Índice de resistência (IR) no ${territory[ri.territory]} do rim ${label.kidney}: ${pt(ri.value, 3)}.`);
  }
  if (data.intrarenal.spectral_pattern === "normal") body.push(`Padrão espectral intrarrenal preservado no rim ${label.kidney}.`);
  if (data.intrarenal.spectral_pattern === "tardus_parvus") body.push(`Padrão espectral tardus-parvus nas artérias intrarrenais do rim ${label.kidney}.`);
  if (data.intrarenal.spectral_pattern === "indeterminate") body.push(`Padrão espectral intrarrenal indeterminado no rim ${label.kidney}.`);
  for (const ta of data.intrarenal.acceleration_time_ms) {
    body.push(`Tempo de aceleração no ${territory[ta.territory]} do rim ${label.kidney}: ${pt(ta.value)} ms.`);
  }
  for (const ia of data.intrarenal.acceleration_index_cms2) {
    body.push(`Índice de aceleração no ${territory[ia.territory]} do rim ${label.kidney}: ${pt(ia.value)} cm/s².`);
  }
  return body;
}

function strictDifference(data: Input): number | null {
  const right = data.sides.right.kidney.medidas_cm;
  const left = data.sides.left.kidney.medidas_cm;
  if (!right || right.length !== 3 || !left || left.length !== 3) return null;
  return Math.abs(Math.max(...right) - Math.max(...left));
}

function formatConclusion(items: string[]): string[] {
  if (items.length < 2) return items;
  return items.map((item, index) => `${index + 1}) ${item}`);
}

export type DopplerRenalWebRenderResult =
  | { ok: true; text: string }
  | { ok: false; error: string; issues: Array<{ path: string; message: string }> };

/** Renderer canônico do formulário Web. Nenhuma prosa clínica é montada no navegador. */
export function renderDopplerRenalWeb(input: unknown, style: string): DopplerRenalWebRenderResult {
  const parsed = DopplerRenalWebInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "dados estruturados do Doppler renal estão incompletos ou conflitantes",
      issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    };
  }
  const data = parsed.data;
  const rightKidney = renderSharedKidney(data.sides.right.kidney, "direito");
  const leftKidney = renderSharedKidney(data.sides.left.kidney, "esquerdo");
  const body = [
    ...(data.aorta.psv_cms !== null
      ? [`Aorta abdominal com VPS de ${pt(data.aorta.psv_cms)} cm/s ao nível da emergência das artérias renais.`]
      : []),
    ...(data.aorta.assessment === "limited" && data.aorta.limitation
      ? [`Avaliação da aorta limitada por ${linhaUnica(data.aorta.limitation).replace(/\.+$/, "")}.`]
      : []),
    ...rightKidney.body,
    ...vascularBody("right", data.sides.right),
    ...leftKidney.body,
    ...vascularBody("left", data.sides.left),
  ];

  const conclusion: string[] = [];
  if (!rightKidney.isNormal) conclusion.push(...rightKidney.conclusion);
  if (!leftKidney.isNormal) conclusion.push(...leftKidney.conclusion);
  for (const side of ["right", "left"] as const) {
    const maximum = Math.max(0, ...data.sides[side].artery.psv_cms.map((item) => item.value));
    if (maximum > 250) {
      conclusion.push(`Artéria renal ${labels[side].artery} com sinais ecográficos de estenose hemodinamicamente significativa (VPS de ${pt(maximum)} cm/s).`);
    }
  }
  const difference = strictDifference(data);
  if (difference !== null && difference > 1.8 && Math.abs(difference - 1.8) > 1e-10 * Math.max(1, difference, 1.8)) {
    conclusion.push(`Assimetria renal, com diferença de ${pt(difference)} cm entre as maiores medidas dos rins.`);
  }
  const bothNormal = data.sides.right.assessment === "normal" && data.sides.left.assessment === "normal";
  if (bothNormal && !conclusion.some((item) => /estenose/i.test(item))) {
    conclusion.push("Artérias renais com fluxo preservado bilateralmente, sem evidência ecográfica de estenose hemodinamicamente significativa.");
  }

  const classic = style === "CLASSICO_COMPLETO";
  const commentsHeader = classic ? "COMENTÁRIOS:" : "TÉCNICA:";
  const findingsHeader = classic ? "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:" : "ACHADOS:";
  const conclusionHeader = classic ? "CONCLUSÃO:" : "IMPRESSÃO:";
  const technique = "Exame realizado com transdutor convexo (3-5 MHz). Ângulo Doppler ≤ 60° para as aferições descritas.";
  const blocks = [
    "ULTRASSONOGRAFIA COM DOPPLER COLORIDO DAS ARTÉRIAS RENAIS",
    `${commentsHeader}\n${technique}`,
    `${findingsHeader}\n${body.join("\n")}`,
  ];
  if (conclusion.length > 0) blocks.push(`${conclusionHeader}\n${formatConclusion(conclusion).join("\n")}`);
  return { ok: true, text: blocks.join("\n\n") };
}
