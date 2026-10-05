import {
  DOPPLER_VENOSO_MMII_SEGMENTS,
  dopplerVenosoMmiiRefluxThreshold,
  type DopplerVenosoMmiiInput,
  type DopplerVenosoMmiiSegmentId,
} from "@laudousg/shared";
import {
  buildMapaVenoso,
  VenosoMMIIFindingsSchema,
  type MapaVenoso,
  type SegmentoVenoso,
  type SegmentoVenosoFinding,
  type VenosoMMIIFindings,
} from "@laudousg/schemes/vascular";

const projection: Record<DopplerVenosoMmiiSegmentId, SegmentoVenoso> = {
  common_femoral: "femoral_comum", saphenofemoral_junction: "jsf",
  femoral_proximal: "femoral", femoral_mid: "femoral", femoral_distal: "femoral",
  deep_femoral: "femoral_profunda", popliteal: "poplitea", posterior_tibial: "tibial_posterior",
  fibular: "fibular", anterior_tibial: "tibial_anterior", gastrocnemius: "gastrocnemias", soleal: "soleares",
  great_saphenous_proximal_thigh: "safena_magna", great_saphenous_mid_thigh: "safena_magna",
  great_saphenous_distal_thigh: "safena_magna", great_saphenous_knee: "safena_magna",
  great_saphenous_proximal_calf: "safena_magna", great_saphenous_mid_calf: "safena_magna", great_saphenous_distal_calf: "safena_magna",
  saphenopopliteal_junction: "jsp", small_saphenous_proximal: "safena_parva", small_saphenous_distal: "safena_parva",
  anterior_accessory_saphenous: "safena_acessoria_anterior", giacomini: "giacomini",
};

/**
 * O desenho legado considera normal qualquer segmento sem alteração. Por isso
 * só publicamos a projeção quando TODOS os segmentos representados possuem
 * compressibilidade e pesquisa de refluxo documentadas. Laudo válido não implica
 * mapa válido: TVP isolada, limitação e localização livre de perfurante não são
 * convertidas silenciosamente em normalidade ou em coordenadas aproximadas.
 */
export function projectStructuredVenousMap(data: DopplerVenosoMmiiInput): MapaVenoso | null {
  if (data.protocol === "tvp_only") return null;
  const empty = () => ({ avaliado: false, profundo_pervio: null, compressibilidade_profunda: null, segmentos: [], perfurantes: [] });
  const findings: VenosoMMIIFindings = {
    lados: { direito: empty(), esquerdo: empty() }, tvp_presente: false, observacoes_do_medico: null,
  };
  for (const side of ["right", "left"] as const) {
    if (data.laterality !== "bilateral" && data.laterality !== side) continue;
    const source = data.sides[side];
    // O contrato usa localização livre; não inventar topografia de desenho.
    if (source.perforators.length) return null;
    const target = findings.lados[side === "right" ? "direito" : "esquerdo"];
    target.avaliado = true;
    const projectedStates = new Map<SegmentoVenoso, string>();
    for (const id of DOPPLER_VENOSO_MMII_SEGMENTS) {
      const segment = source.segments.find((item) => item.id === id);
      if (!segment || segment.assessment !== "evaluated" || !segment.reflux.tested || !segment.reflux.time) return null;
      const duration = segment.reflux.time.value / (segment.reflux.time.unit === "ms" ? 1000 : 1);
      const threshold = dopplerVenosoMmiiRefluxThreshold(id);
      if (threshold === null && duration > 0) return null;
      const item: SegmentoVenosoFinding = {
        segmento: projection[id], tipo: "outro", refluxo_tempo_s: null, trombose_extensao: null,
        trombose_idade: null, calibre_mm: segment.diameter ? segment.diameter.value * (segment.diameter.unit === "cm" ? 10 : 1) : null,
        termo_do_medico: null, descricao_livre: null,
      };
      if (segment.thrombosis) {
        // Não adivinhar grau de oclusão nem transformar achado superficial em TVP.
        if (threshold === 0.5 && ["jsf", "jsp", "safena_magna", "safena_parva", "safena_acessoria_anterior", "giacomini"].includes(item.segmento)) return null;
        if (segment.thrombosis.occlusion !== "occlusive" && segment.thrombosis.occlusion !== "partial") return null;
        item.tipo = "trombose";
        item.trombose_extensao = segment.thrombosis.occlusion === "occlusive" ? "oclusiva" : "parcial";
        findings.tvp_presente = true;
      } else if (threshold !== null && duration > threshold) {
        item.tipo = "refluxo";
        item.refluxo_tempo_s = duration;
      }
      // A arte não distingue os terços do mesmo vaso. Uma lesão focal não
      // pode colorir todo o trajeto como se a extensão estivesse confirmada.
      const state = `${item.tipo}:${item.trombose_extensao ?? ""}:${item.calibre_mm ?? ""}`;
      const previous = projectedStates.get(item.segmento);
      if (previous !== undefined && previous !== state) return null;
      projectedStates.set(item.segmento, state);
      if (item.tipo !== "outro" || item.calibre_mm !== null) target.segmentos.push(item);
    }
  }
  const validated = VenosoMMIIFindingsSchema.safeParse(findings);
  return validated.success ? buildMapaVenoso(validated.data) : null;
}
