export type ColorTokens = {
  /** Identifies which palette is active — useful for components that need
   *  different alphas/saturation in dark mode (Banner tints, etc). */
  mode: "light" | "dark";
  brand: string;
  brandLight: string;
  brandDeep: string;
  bg: string;
  card: string;
  text: string;
  text2: string;
  textSec: string;
  textMute: string;
  textGhost: string;
  separator: string;
  sep2: string;
  fill1: string;
  fill2: string;
  danger: string;
  warningBg: string;
  warningText: string;
  /** "Laudo" — cor principal do wordmark, alinhado com iOS BrandColor.primaryDeep */
  wordmark: string;
  /** "USG" — accent secundário do wordmark, alinhado com iOS BrandColor.primary */
  wordmarkAccent: string;
  /** Tagline embaixo do wordmark (40-45% opacity do wordmark) */
  wordmarkSub: string;
};

export const TAGLINE = "Laudos rápidos e inteligentes" as const;

export const lightTokens: ColorTokens = {
  mode: "light",
  brand: "#059669",
  brandLight: "#D1FAE5",
  brandDeep: "#065F46",
  bg: "#F2F2F7",
  card: "#FFFFFF",
  text: "#000000",
  text2: "rgba(60,60,67,0.78)",
  textSec: "rgba(60,60,67,0.6)",
  textMute: "rgba(60,60,67,0.42)",
  textGhost: "rgba(60,60,67,0.28)",
  separator: "rgba(60,60,67,0.12)",
  sep2: "rgba(60,60,67,0.06)",
  fill1: "rgba(120,120,128,0.12)",
  fill2: "rgba(120,120,128,0.08)",
  danger: "#FF3B30",
  warningBg: "rgba(245,158,11,0.15)",
  warningText: "#B45309",
  wordmark: "#065F46",
  wordmarkAccent: "#059669",
  wordmarkSub: "rgba(6,95,70,0.45)",
};

export const darkTokens: ColorTokens = {
  mode: "dark",
  brand: "#10B981",
  brandLight: "rgba(16,185,129,0.18)",
  brandDeep: "#34D399",
  bg: "#0B0B0F",
  card: "#1C1C1E",
  text: "#FFFFFF",
  text2: "rgba(235,235,245,0.78)",
  textSec: "rgba(235,235,245,0.6)",
  textMute: "rgba(235,235,245,0.42)",
  textGhost: "rgba(235,235,245,0.28)",
  separator: "rgba(84,84,88,0.45)",
  sep2: "rgba(84,84,88,0.25)",
  fill1: "rgba(118,118,128,0.24)",
  fill2: "rgba(118,118,128,0.16)",
  danger: "#FF453A",
  warningBg: "rgba(255,159,10,0.15)",
  warningText: "#FF9F0A",
  wordmark: "#6ee7b7",
  wordmarkAccent: "rgba(110,231,183,0.65)",
  wordmarkSub: "rgba(110,231,183,0.45)",
};

// Backwards compatibility: existing screens import `C` (light tokens).
// New screens should prefer `useColorTokens()` from "@/ui/useColorTokens".
export const C = lightTokens;

export const FONT = {
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  black: "Inter_900Black",
  display: "Barlow_700Bold",
  displayBold: "Barlow_800ExtraBold",
} as const;

/**
 * IDs aqui devem bater EXATAMENTE com category_code da tabela `categories`
 * do Supabase (ver packages/db/src/seeds/data.ts). Se trocar um ID, o
 * /api/generate não acha RAG nem aceita a categoria.
 *
 * 9 listadas (cobertura piloto + comuns). DB tem 32 ativas — quando expandir
 * pra cobertura completa, idealmente buscar de /api/categories ao invés
 * de hardcoded.
 */
export const CATS = [
  { id: "ABDOMEN_TOTAL",         label: "Abdome Total",        color: "#059669", sub: "Fígado, vias biliares, pâncreas…" },
  { id: "TIREOIDE",              label: "Tireoide",            color: "#0EA5E9", sub: "Tireoide e paratireoides" },
  { id: "MAMARIA",               label: "Mamária",             color: "#F43F5E", sub: "BI-RADS" },
  { id: "PELVE_FEMININA",        label: "Pelve",               color: "#A855F7", sub: "Útero, ovários, anexos" },
  { id: "OBSTETRICA",            label: "Obstétrica",          color: "#EC4899", sub: "USG obstétrico" },
  { id: "DOPPLER_OBSTETRICO",    label: "Doppler Obstétrico",  color: "#F97316", sub: "Avaliação hemodinâmica" },
  { id: "MORFOLOGICO",           label: "Morfológico",         color: "#8B5CF6", sub: "Anatomia fetal completa" },
  { id: "VIAS_URINARIAS",        label: "Vias Urinárias",      color: "#06B6D4", sub: "Rins, ureteres, bexiga" },
  { id: "MUSCULOESQUELETICO_V2", label: "Musculoesquelético",  color: "#84CC16", sub: "Articulações e partes moles" },
  { id: "CERVICAL",              label: "Cervical",            color: "#0EA5E9", sub: "Linfonodos, massas e cistos cervicais" },
] as const;

export type Category = (typeof CATS)[number];
