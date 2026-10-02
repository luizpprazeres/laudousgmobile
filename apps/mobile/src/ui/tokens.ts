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
 * Spacing & radius scale — espelha o DesignSystem do app Swift
 * (LaudoUSG/DesignSystem/Spacing.swift) pra manter paridade visual.
 */
export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  huge: 96,
} as const;

export const RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  xxl: 16,
  xxxl: 24,
  pill: 999,
} as const;

/**
 * IDs aqui devem bater EXATAMENTE com category_code da tabela `categories`
 * do Supabase (ver packages/db/src/seeds/data.ts). Se trocar um ID, o
 * /api/generate não acha RAG nem aceita a categoria.
 *
 * Conjunto de categorias com cobertura aprovada para o seletor Android.
 * Não espelhar automaticamente todo o seed: há categorias ainda sem cobertura
 * clínica liberada neste fluxo. A Biblioteca busca sua lista separadamente.
 */
type CategoryShape = {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly sub: string;
};

export const RELEASED_CATS = [
  { id: "ABDOMEN_TOTAL",         label: "Abdome Total",        color: "#059669", sub: "Fígado, vias biliares, pâncreas…" },
  { id: "ABDOMEN_SUPERIOR",      label: "Abdome Superior",     color: "#10B981", sub: "Fígado, vesícula, pâncreas e baço" },
  { id: "PAREDE_ABDOMINAL",      label: "Parede abdominal",    color: "#34D399", sub: "Parede abdominal e região de interesse" },
  { id: "VIAS_URINARIAS",        label: "Vias Urinárias",      color: "#06B6D4", sub: "Rins, ureteres, bexiga" },
  { id: "PROSTATA_SUPRAPUBICA", label: "Próstata Suprapúbica", color: "#0891B2", sub: "Próstata por via suprapúbica" },
  { id: "PROSTATA_TRANSRETAL",   label: "Próstata Transretal", color: "#0E7490", sub: "Próstata por via transretal" },
  { id: "ESCROTAL",              label: "Escrotal",            color: "#0284C7", sub: "Testículos e estruturas escrotais" },
  { id: "REGIAO_INGUINAL",      label: "Região Inguinal",     color: "#0369A1", sub: "Região inguinal" },
  { id: "DOPPLER_RENAL",         label: "Doppler Renal",       color: "#06B6D4", sub: "Artérias renais" },
  { id: "DOPPLER_CAROTIDAS",     label: "Doppler Carótidas",   color: "#2563EB", sub: "Carótidas e vertebrais" },
  { id: "DOPPLER_VENOSO_MMII",   label: "Doppler Venoso MMII", color: "#3B82F6", sub: "TVP / insuficiência venosa" },
  { id: "DOPPLER_VENOSO_MMII_MEDIDAS", label: "Doppler Venoso MMII — Completo", color: "#1D4ED8", sub: "Avaliação venosa com medidas" },
  { id: "DOPPLER_ARTERIAL_MMII", label: "Doppler Arterial MMII", color: "#EF4444", sub: "Doença arterial periférica" },
  { id: "DOPPLER_FISTULA_AV",    label: "Doppler Fístula AV", color: "#DC2626", sub: "Avaliação de fístula arteriovenosa" },
  { id: "TIREOIDE",              label: "Tireoide",            color: "#0EA5E9", sub: "Glândula tireoide e nódulos" },
  { id: "PARATIREOIDE",          label: "Paratireoide",        color: "#38BDF8", sub: "Glândulas paratireoides" },
  { id: "CERVICAL",              label: "Cervical",            color: "#0EA5E9", sub: "Linfonodos, massas e cistos cervicais" },
  { id: "GLANDULAS_SALIVARES",   label: "Glândulas Salivares", color: "#14B8A6", sub: "Parótidas e submandibulares" },
  { id: "PARTES_MOLES",         label: "Partes Moles",        color: "#2DD4BF", sub: "Tecidos superficiais" },
  { id: "MAMARIA",               label: "Mamas e axilas",      color: "#F43F5E", sub: "BI-RADS" },
  { id: "PELVE_FEMININA",        label: "Pelve",               color: "#A855F7", sub: "Útero, ovários, anexos" },
  { id: "OBSTETRICA",            label: "Obstétrica",          color: "#EC4899", sub: "USG obstétrico" },
  { id: "DOPPLER_OBSTETRICO",    label: "Obstétrica com Doppler", color: "#F97316", sub: "Obstétrica e avaliação hemodinâmica" },
  { id: "MORFOLOGICO",           label: "Morfológico",         color: "#8B5CF6", sub: "Anatomia fetal completa" },
  { id: "CERVICOMETRIA",        label: "Cervicometria",       color: "#C026D3", sub: "Comprimento do colo uterino" },
  { id: "MUSCULOESQUELETICO_V2", label: "Musculoesquelético",  color: "#84CC16", sub: "Articulações e partes moles" },
  { id: "TRANSFONTANELA",       label: "Transfontanela",      color: "#65A30D", sub: "Ultrassonografia transfontanelar" },
  { id: "OCULAR",               label: "Ocular",              color: "#4F46E5", sub: "Ultrassonografia ocular" },
  { id: "LIVRE",                label: "Laudo Livre",         color: "#64748B", sub: "Exame sem categoria específica" },
] as const satisfies readonly CategoryShape[];

/**
 * Modelos aprovados em 30/09/2026, preparados no Android mas deliberadamente
 * ocultos até Web, iOS, Android e backend fecharem o mesmo gate de lançamento.
 * A ativação é uma mudança de release coordenada, não uma flag remota que possa
 * deixar só um cliente expondo um contrato incompleto.
 */
export const APPROVED_PENDING_CATS = [
  { id: "ABDOMEN_TOTAL_DOPPLER", label: "Abdome Total com Doppler", color: "#047857", sub: "Abdome total e sistema esplâncnico" },
  { id: "DOPPLER_VENOSO_MMSS", label: "Doppler Venoso MMSS", color: "#2563EB", sub: "Membro superior unilateral ou bilateral" },
  { id: "DOPPLER_ARTERIAL_MMSS", label: "Doppler Arterial MMSS", color: "#DC2626", sub: "Membro superior e manobras dinâmicas" },
  { id: "TORAX", label: "Tórax", color: "#475569", sub: "Avaliação pulmonar e pleural" },
  { id: "QUADRIL_INFANTIL", label: "Quadril infantil", color: "#65A30D", sub: "Técnica de Graf, de 0 a 6 meses" },
] as const satisfies readonly CategoryShape[];

/**
 * Modelos hepáticos estruturados (`hepatic-assessment/v1`), preparados no
 * Android e ocultos. Ativar exige categorias ativas no banco e critérios de
 * qualidade aprovados no servidor, em release conjunta com Web e iOS; o fluxo
 * fica em `features/generate/hepaticModels.ts`.
 */
export const HEPATIC_PENDING_CATS = [
  { id: "AVALIACAO_MULTIPARAMETRICA_HEPATICA", label: "Avaliação hepática multiparamétrica", color: "#B45309", sub: "Gordura, rigidez e correlação" },
  { id: "ELASTOGRAFIA_HEPATICA", label: "Elastografia hepática", color: "#92400E", sub: "Rigidez hepática quantitativa" },
] as const satisfies readonly CategoryShape[];

export type Category =
  | (typeof RELEASED_CATS)[number]
  | (typeof APPROVED_PENDING_CATS)[number]
  | (typeof HEPATIC_PENDING_CATS)[number];

// Só mudar para true no commit de ativação simultânea das três plataformas.
export const APPROVED_CLINICAL_MODELS_ENABLED = false;

// Gate dos modelos hepáticos. Mesma regra: só no commit de ativação conjunta.
export const HEPATIC_ANDROID_MODELS_ENABLED = false;

export const CATS: readonly Category[] = [
  ...RELEASED_CATS,
  ...(APPROVED_CLINICAL_MODELS_ENABLED ? APPROVED_PENDING_CATS : []),
  ...(HEPATIC_ANDROID_MODELS_ENABLED ? HEPATIC_PENDING_CATS : []),
];
