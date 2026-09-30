import type { MapaVenoso } from "@laudousg/schemes";
import type { GenerateSSEEvent } from "@/shared";
import { z } from "zod";

type SchemeEvent = Extract<GenerateSSEEvent, { type: "scheme" }>;

const side = z.enum(["direito", "esquerdo"]);
const state = z.enum(["normal", "refluxo", "trombose_oclusiva", "trombose_parcial", "recanalizada", "varicosidade"]);
const segment = z.enum(["femoral_comum", "femoral", "femoral_profunda", "poplitea", "tibial_posterior", "tibial_anterior", "fibular", "gastrocnemias", "soleares", "safena_magna", "safena_parva", "safena_acessoria_anterior", "giacomini", "jsf", "jsp"]);
const topography = z.enum(["coxa", "joelho", "perna_medial", "panturrilha"]);
const leg = z.object({ avaliado: z.boolean(), segmentos: z.record(state) });
const mapSchema = z.object({
  lados: z.object({ direito: leg, esquerdo: leg }),
  lesoes: z.array(z.object({ lado: side, segmento: segment, estado: state, label: z.string(), sub: z.string() })),
  perfurantes: z.array(z.object({ lado: side, topografia: topography, incompetente: z.boolean(), label: z.string(), sub: z.string() })),
  tvp_presente: z.boolean(),
  anotacoes: z.array(z.object({ lado: side, tipo: z.enum(["calibre", "perfurante", "refluxo"]), texto: z.string(), segmento: segment.optional(), topografia: topography.optional() })).optional(),
});

/** O mapa via SSE é `unknown`; não entregar outro esquema ou payload incompleto ao Skia. */
export function venousSchemeFromEvent(
  event: SchemeEvent,
): { map: MapaVenoso; assetVersion: string } | null {
  if (event.exam_type !== "VENOSO_MMII") return null;
  if (event.asset_version !== "venoso-anterior-1" && event.asset_version !== "venous-4view-1") return null;
  const parsed = mapSchema.safeParse(event.map);
  if (!parsed.success) return null;
  return { map: parsed.data as MapaVenoso, assetVersion: event.asset_version };
}
