import { env } from "../env";
import type { GenerationMode } from "./modelResolver";

export type GenerationPath = {
  path: "renderer" | "writer-pure";
  ragFewShots: boolean;
  guardsMode: "full" | "advisory-only";
};

export function resolveGenerationPath(
  ctx: { mode: GenerationMode; categoryCode: string },
  config: Pick<ReturnType<typeof env>, "HARD_MODE_ENABLED" | "RENDERER_CATEGORIES" | "DOPPLER_STANDALONE_V2"> = env(),
): GenerationPath {
  const hardEnabled =
    ctx.mode === "hard" && config.HARD_MODE_ENABLED === "true";
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
  config: Pick<ReturnType<typeof env>, "RENDERER_CATEGORIES" | "DOPPLER_STANDALONE_V2"> = env(),
): boolean {
  if (categoryCode === "DOPPLER_OBSTETRICO" && config.DOPPLER_STANDALONE_V2 !== "false") {
    return true;
  }
  return config.RENDERER_CATEGORIES.split(",")
    .map((category) => category.trim())
    .filter(Boolean)
    .includes(categoryCode);
}
