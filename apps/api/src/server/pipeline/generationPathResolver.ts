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

  // O modo experimental PRECISA forçar o caminho do writer.
  //
  // Sem isto o toggle é decorativo: numa categoria do renderer (obstétrica,
  // tireoide, abdome) o pipeline monta o laudo deterministicamente e o provider
  // alternativo NUNCA é chamado — o médico ligaria o experimento, geraria um
  // laudo normal e acharia que era o outro modelo.
  //
  // Consequência assumida: em categoria de renderer isto não troca só o modelo,
  // troca o pipeline (writer-pure, guards advisory). É inevitável — no renderer
  // não existe writer LLM para comparar. Quem liga o modo está comparando
  // "renderer" contra "writer com o outro provider", e precisa saber disso.
  if (ctx.mode === "experimental") {
    return {
      path: "writer-pure",
      ragFewShots: false,
      guardsMode: "advisory-only",
    };
  }

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
