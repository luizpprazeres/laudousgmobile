import { env } from "../env";
import type { GenerationMode } from "./modelResolver";

type GenerationPathConfig = Pick<
  ReturnType<typeof env>,
  "HARD_MODE_ENABLED" | "RENDERER_CATEGORIES" | "DOPPLER_STANDALONE_V2"
> & Partial<Pick<ReturnType<typeof env>, "DOPPLER_HEPATICO_WRITER_ENABLED" | "DOPPLER_RENAL_WRITER_ENABLED" | "DOPPLER_VENOSO_MMII_WRITER_ENABLED" | "CLINICAL_MODELS_V1_ENABLED" | "FULL_WRITER_CATEGORIES">>;

type RendererCategoryConfig = Pick<
  ReturnType<typeof env>,
  "RENDERER_CATEGORIES" | "DOPPLER_STANDALONE_V2"
> & Partial<Pick<ReturnType<typeof env>, "DOPPLER_HEPATICO_WRITER_ENABLED" | "DOPPLER_RENAL_WRITER_ENABLED" | "DOPPLER_VENOSO_MMII_WRITER_ENABLED" | "CLINICAL_MODELS_V1_ENABLED" | "FULL_WRITER_CATEGORIES">>;

/**
 * MIGRAÇÃO HAIKU 5.5 (09/10/2026) — tabela de roteamento.
 *
 *  - Família obstétrica (OBSTETRICA, DOPPLER_OBSTETRICO, MORFOLOGICO,
 *    CERVICOMETRIA) e os cinco renderers clínicos: renderer + Haiku extrator.
 *  - Writers dedicados (MSK, partes moles, Doppler renal/hepático/venoso):
 *    continuam dedicados, escritos pelo Haiku.
 *  - PELVE_FEMININA: caminho atual; vai ao writer completo se listada abaixo.
 *  - Demais: writer completo (bundle com few-shots + guards full), Haiku.
 *
 * Este é o DEFAULT de `FULL_WRITER_CATEGORIES`: as categorias que hoje rodam no
 * renderer em produção e passam ao writer completo. CERVICAL fica de fora — é a
 * única com personalização publicada na Biblioteca, que só se aplica no
 * renderer (decisão pendente do Luiz; docs/stories/haiku-migration/W1-relatorio.md).
 * As demais categorias da tabela já são writer hoje e não precisam constar.
 *
 * TIREOIDE e PROSTATA_SUPRAPUBICA saíram em 10/10 (bancada W10c/W4): renderer +
 * Haiku extrator foi melhor que o writer (tireoide: A 5,70 × writer 5,58;
 * próstata: R 7,33 × writer 5,75). Seguem no renderer.
 */
export const DEFAULT_FULL_WRITER_CATEGORIES = [
  "ABDOMEN_TOTAL",
  "ABDOMEN_SUPERIOR",
  "MAMARIA",
  "VIAS_URINARIAS",
  "DOPPLER_CAROTIDAS",
] as const;

/** Nunca vão ao writer completo, mesmo listadas: têm contrato fail-closed próprio. */
const FULL_WRITER_LOCKED = new Set([
  "ABDOMEN_TOTAL_DOPPLER",
  "DOPPLER_VENOSO_MMSS",
  "DOPPLER_ARTERIAL_MMSS",
  "TORAX",
  "QUADRIL_INFANTIL",
  "DOPPLER_RENAL",
  "DOPPLER_HEPATICO",
  "DOPPLER_VENOSO_MMII",
  "DOPPLER_VENOSO_MMII_MEDIDAS",
  "LIVRE",
  "TESTE",
]);

const warnedLocked = new Set<string>();

/**
 * Categorias tiradas do renderer para o writer completo. `undefined` (env não
 * definida) = default do código; string vazia = nenhuma.
 */
export function fullWriterCategories(
  config: Partial<Pick<ReturnType<typeof env>, "FULL_WRITER_CATEGORIES">> = env(),
): Set<string> {
  const listed =
    config.FULL_WRITER_CATEGORIES === undefined
      ? [...DEFAULT_FULL_WRITER_CATEGORIES]
      : config.FULL_WRITER_CATEGORIES.split(",").map((c) => c.trim()).filter(Boolean);
  const out = new Set<string>();
  for (const category of listed) {
    if (FULL_WRITER_LOCKED.has(category)) {
      if (!warnedLocked.has(category)) {
        warnedLocked.add(category);
        console.warn(`[routing] FULL_WRITER_CATEGORIES ignora ${category}: contrato fail-closed próprio.`);
      }
      continue;
    }
    out.add(category);
  }
  return out;
}

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
  ctx: { mode: GenerationMode; categoryCode: string; objetivo?: boolean },
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
    path: rendererCategoryEnabled(ctx.categoryCode, config, { objetivo: ctx.objetivo })
      ? "renderer"
      : "writer-pure",
    ragFewShots: true,
    guardsMode: "full",
  };
}

export function rendererCategoryEnabled(
  categoryCode: string,
  config: RendererCategoryConfig = env(),
  opts: { objetivo?: boolean } = {},
): boolean {
  // Migração Haiku: a categoria listada sai do renderer (e de writer dedicado
  // que viva dentro dele, como PELVE/MSK/PARTES_MOLES) para o writer completo.
  // Só no estilo clássico: o objetivo fica no renderer (mesma regra de PELVE e
  // PARTES_MOLES — e TIREOIDE/VIAS_URINARIAS nem têm bundle OBJETIVO curado).
  if (!opts.objetivo && fullWriterCategories(config).has(categoryCode)) return false;
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
