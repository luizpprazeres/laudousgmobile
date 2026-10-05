import { env } from "../env";
import type { GenerationMode } from "./modelResolver";

type GenerationPathConfig = Pick<
  ReturnType<typeof env>,
  "HARD_MODE_ENABLED" | "RENDERER_CATEGORIES" | "DOPPLER_STANDALONE_V2"
> & Partial<Pick<ReturnType<typeof env>, "DOPPLER_HEPATICO_WRITER_ENABLED" | "DOPPLER_RENAL_WRITER_ENABLED" | "DOPPLER_VENOSO_MMII_WRITER_ENABLED" | "CLINICAL_MODELS_V1_ENABLED">>;

type RendererCategoryConfig = Pick<
  ReturnType<typeof env>,
  "RENDERER_CATEGORIES" | "DOPPLER_STANDALONE_V2"
> & Partial<Pick<ReturnType<typeof env>, "DOPPLER_HEPATICO_WRITER_ENABLED" | "DOPPLER_RENAL_WRITER_ENABLED" | "DOPPLER_VENOSO_MMII_WRITER_ENABLED" | "CLINICAL_MODELS_V1_ENABLED">>;

const APPROVED_CLINICAL_RENDERERS = new Set([
  "ABDOMEN_TOTAL_DOPPLER",
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
]);

const DOPPLER_VENOSO_MMII_CATEGORIES = new Set([
  "DOPPLER_VENOSO_MMII",
  "DOPPLER_VENOSO_MMII_MEDIDAS",
]);

export type GenerationPath = {
  path: "renderer" | "writer-pure";
  ragFewShots: boolean;
  guardsMode: "full" | "advisory-only";
};

export function resolveGenerationPath(
  ctx: { mode: GenerationMode; categoryCode: string },
  config: GenerationPathConfig = env(),
): GenerationPath {
  // Categorias clínicas aprovadas não podem escapar de seu renderer/writer
  // auditado para o writer genérico, nem quando a tela envia `mode: hard`.
  const dedicatedRenalWriter =
    ctx.categoryCode === "DOPPLER_RENAL" && config.DOPPLER_RENAL_WRITER_ENABLED !== "false";
  const dedicatedHepaticWriter =
    ctx.categoryCode === "DOPPLER_HEPATICO" && config.DOPPLER_HEPATICO_WRITER_ENABLED !== "false";
  const dedicatedVenousWriter =
    DOPPLER_VENOSO_MMII_CATEGORIES.has(ctx.categoryCode) &&
    config.DOPPLER_VENOSO_MMII_WRITER_ENABLED !== "false";
  const approvedClinicalRenderer =
    APPROVED_CLINICAL_RENDERERS.has(ctx.categoryCode) && config.CLINICAL_MODELS_V1_ENABLED !== "false";
  const hardEnabled =
    ctx.mode === "hard" && config.HARD_MODE_ENABLED === "true" &&
    !dedicatedRenalWriter && !dedicatedVenousWriter && !dedicatedHepaticWriter && !approvedClinicalRenderer;
  if (hardEnabled || ctx.categoryCode === "LIVRE" || ctx.categoryCode === "TESTE") {
    return {
      path: "writer-pure",
      ragFewShots: false,
      guardsMode: "advisory-only",
    };
  }

  return {
    path: rendererCategoryEnabled(ctx.categoryCode, config)
      ? "renderer"
      : "writer-pure",
    ragFewShots: true,
    guardsMode: "full",
  };
}

export function rendererCategoryEnabled(
  categoryCode: string,
  config: RendererCategoryConfig = env(),
): boolean {
  if (categoryCode === "DOPPLER_OBSTETRICO" && config.DOPPLER_STANDALONE_V2 !== "false") {
    return true;
  }
  if (categoryCode === "DOPPLER_RENAL") {
    // `false` vence inclusive uma allowlist antiga: este é o rollback inequívoco.
    return config.DOPPLER_RENAL_WRITER_ENABLED !== "false";
  }
  if (categoryCode === "DOPPLER_HEPATICO") return config.DOPPLER_HEPATICO_WRITER_ENABLED !== "false";
  if (DOPPLER_VENOSO_MMII_CATEGORIES.has(categoryCode)) {
    return config.DOPPLER_VENOSO_MMII_WRITER_ENABLED !== "false";
  }
  if (APPROVED_CLINICAL_RENDERERS.has(categoryCode)) {
    // `false` vence inclusive uma allowlist antiga: rollback sem ambiguidade.
    return config.CLINICAL_MODELS_V1_ENABLED !== "false";
  }
  return config.RENDERER_CATEGORIES.split(",")
    .map((category) => category.trim())
    .filter(Boolean)
    .includes(categoryCode);
}
