import { env } from "../env";
import type { GenerationMode } from "./modelResolver";

export type GenerationPath = {
  path: "renderer" | "writer-pure";
  ragFewShots: boolean;
  guardsMode: "full" | "advisory-only";
};

export function resolveGenerationPath(
  ctx: { mode: GenerationMode; categoryCode: string },
  config: Pick<ReturnType<typeof env>, "HARD_MODE_ENABLED" | "RENDERER_CATEGORIES"> = env(),
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

  const rendererCategories = config.RENDERER_CATEGORIES.split(",")
    .map((category) => category.trim())
    .filter(Boolean);
  return {
    path: rendererCategories.includes(ctx.categoryCode)
      ? "renderer"
      : "writer-pure",
    ragFewShots: true,
    guardsMode: "full",
  };
}
