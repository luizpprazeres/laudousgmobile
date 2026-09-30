import { z } from "zod";

const thyroid = z.object({
  id: z.number().int().positive(),
  kind: z.literal("thyroid"),
  side: z.enum(["direito", "esquerdo", "istmo"]),
  third: z.enum(["superior", "medio", "inferior"]).nullable(),
  type: z.enum(["solid", "cystic", "calcification"]),
}).refine((value) => (value.side === "istmo") === (value.third === null));

const breast = z.object({
  id: z.number().int().positive(),
  kind: z.literal("breast"),
  side: z.enum(["direita", "esquerda"]),
  type: z.enum(["solid", "solid_lobulated", "solid_spiculated", "cyst", "calcification"]),
  hour: z.number().int().min(1).max(12),
  nippleDistanceCm: z.number().min(0).max(6),
});

export const VisualMarkerSchema = z.union([thyroid, breast]);
export type VisualMarker = z.infer<typeof VisualMarkerSchema>;
export type VisualCategory = "TIREOIDE" | "MAMARIA";

export function validMarkers(category: VisualCategory, value: unknown): VisualMarker[] | null {
  const parsed = z.array(VisualMarkerSchema).max(20).safeParse(value);
  if (!parsed.success || parsed.data.some((marker) => marker.kind !== (category === "TIREOIDE" ? "thyroid" : "breast"))) return null;
  if (new Set(parsed.data.map((marker) => marker.id)).size !== parsed.data.length) return null;
  return parsed.data;
}

export const BREAST_VIEW = { width: 1608, height: 1240, anatomyHeight: 1138, cy: 686, rightX: 435, leftX: 1208, rx: 300, ry: 325 } as const;
export const THYROID_VIEW = { width: 760, height: 430 } as const;

/** Mesma geometria do cartograma Web v5; não calcula classificação clínica. */
export function breastPoint(marker: Extract<VisualMarker, { kind: "breast" }>) {
  const radius = Math.min(marker.nippleDistanceCm / 6, 1) * 0.94;
  const angle = marker.hour / 12 * Math.PI * 2 - Math.PI / 2;
  const cx = marker.side === "direita" ? BREAST_VIEW.rightX : BREAST_VIEW.leftX;
  return { x: cx + radius * BREAST_VIEW.rx * Math.cos(angle), y: BREAST_VIEW.cy + radius * BREAST_VIEW.ry * Math.sin(angle) };
}

/** Posições aprovadas das vistas frontal/transversa Web v2. */
export function thyroidPoints(marker: Extract<VisualMarker, { kind: "thyroid" }>) {
  const frontalX = marker.side === "direito" ? 145 : marker.side === "esquerdo" ? 255 : 200;
  const frontY = marker.side === "istmo" ? 252 : marker.third === "superior" ? 188 : marker.third === "inferior" ? 292 : 240;
  const transverseX = marker.side === "direito" ? 500 : marker.side === "esquerdo" ? 630 : 565;
  return [{ x: frontalX, y: frontY }, { x: transverseX, y: marker.side === "istmo" ? 188 : 178 }];
}

export function nextMarkerId(markers: VisualMarker[]): number {
  return Math.max(0, ...markers.map((marker) => marker.id)) + 1;
}
