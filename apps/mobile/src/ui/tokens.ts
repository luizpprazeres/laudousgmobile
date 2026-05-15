export const C = {
  brand: "#059669",
  brandLight: "#D1FAE5",
  brandDeep: "#047857",
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
} as const;

export const FONT = {
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  display: "Barlow_700Bold",
  displayBold: "Barlow_800ExtraBold",
} as const;

export const CATS = [
  { id: "OBSTETRICA", label: "Obstétrica", color: "#EC4899", sub: "USG obstétrico — 2º trim." },
  { id: "DOPPLER_OB", label: "Doppler Obstétrico", color: "#F97316", sub: "Avaliação hemodinâmica" },
  { id: "MORFO", label: "Morfológico", color: "#8B5CF6", sub: "Anatomia fetal completa" },
  { id: "ABDOMEN", label: "Abdome Total", color: "#059669", sub: "Fígado, vias biliares, pâncreas…" },
  { id: "TIRE", label: "Tireoide", color: "#0EA5E9", sub: "Tireoide e paratireoides" },
  { id: "MAMA", label: "Mamária", color: "#F43F5E", sub: "BI-RADS" },
  { id: "PELVE", label: "Pelve Feminina", color: "#A855F7", sub: "Útero, ovários, anexos" },
  { id: "VIAS", label: "Vias Urinárias", color: "#06B6D4", sub: "Rins, ureteres, bexiga" },
  { id: "MUSCESQ", label: "Musculoesquelético", color: "#84CC16", sub: "Articulações e partes moles" },
] as const;

export type Category = (typeof CATS)[number];
