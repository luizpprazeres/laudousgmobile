import type { MapaVenoso, EstadoSegmento, LesaoDesenho } from "./venousMap";
import type { VenousCoords, RGB } from "./venousRaster";
import { VENOUS_STATE_RGB } from "./venousRaster";
import type { Ponto } from "./venousSvg";

/**
 * Layout DETERMINÍSTICO dos callouts (pílulas) da cartografia venosa. Roda no
 * cliente (iOS/Android/web) a partir do MESMO `MapaVenoso` + `VenousCoords` que
 * alimentam o recolor — então os três renderizam pílulas IDÊNTICAS. Aqui só a
 * GEOMETRIA + texto; cada cliente desenha a pílula/linha-guia com sua API de
 * canvas (CoreGraphics/Skia/Canvas). Ver venousRaster.ts (o desenho dos vasos).
 *
 * Design (08/07, validado): pílula clara nas MARGENS laterais (a arte tem margem
 * generosa de propósito), nome do vaso na cor do estado, subtítulo em cinza, e uma
 * linha-guia da pílula até o vaso. Legenda de estados no rodapé.
 *
 * Coordenadas em ESPAÇO DA ARTE (mesmo dos coords/recolor). O cliente escala a
 * imagem inteira (vasos + pílulas) junto para o tamanho de exibição.
 */

export type VenousCalloutCard = {
  id: string;
  label: string; // nome/achado (ex.: "Refluxo em safena magna")
  sub: string; // detalhe (ex.: "3,1 s")
  estado: EstadoSegmento;
  color: RGB; // cor de acento do estado (nome + linha-guia)
  anchor: Ponto; // ponto no vaso (espaço da arte)
  rect: { x: number; y: number; w: number; h: number }; // pílula (espaço da arte)
  side: "left" | "right";
};

export type VenousLegendItem = { estado: EstadoSegmento; color: RGB; label: string };

export type VenousCalloutLayout = {
  width: number;
  height: number;
  cards: VenousCalloutCard[];
  legend: VenousLegendItem[];
};

export type CalloutLayoutOpts = {
  /** Dimensões da arte; default = coords.width/height ou 944×1666. */
  width?: number;
  height?: number;
  /** Geometria da pílula (espaço da arte). */
  cardWidth?: number;
  cardHeight?: number;
  gap?: number; // espaço vertical mínimo entre pílulas
  margin?: number; // respiro nas bordas da tela
};

const LEGEND_LABEL: Record<EstadoSegmento, string> = {
  normal: "Normal",
  refluxo: "Refluxo",
  varicosidade: "Varicosidade",
  trombose_oclusiva: "TVP oclusiva",
  trombose_parcial: "Trombose parcial",
  recanalizada: "Recanalização",
};

function midpoint(pts: Ponto[]): Ponto {
  if (pts.length === 0) return [0, 0];
  // Ponto do meio do traçado (vértice central) — estável e barato.
  const mid = pts[Math.floor(pts.length / 2)]!;
  return [mid[0], mid[1]];
}

function colorFor(estado: EstadoSegmento): RGB {
  return VENOUS_STATE_RGB[estado] ?? [90, 90, 90];
}

/**
 * Monta o layout dos callouts: cada lesão vira uma pílula ancorada no vaso e
 * empilhada na margem lateral mais próxima (sem sobreposição). Perfurantes ainda
 * não têm coords de topografia — ficam de fora do desenho (seguem no texto do
 * laudo); entram quando houver posição curada. Ver [[onevasc-cartografia-vascular]].
 */
export function buildVenousCallouts(
  mapa: MapaVenoso,
  coords: VenousCoords,
  opts: CalloutLayoutOpts = {},
): VenousCalloutLayout {
  const width = opts.width ?? coords.width ?? 944;
  const height = opts.height ?? coords.height ?? 1666;
  const cardW = opts.cardWidth ?? 210;
  const cardH = opts.cardHeight ?? 96;
  const gap = opts.gap ?? 14;
  const margin = opts.margin ?? 12;

  const legendReserve = 96; // rodapé pra legenda
  const yMin = margin;
  const yMax = height - legendReserve - margin;

  // Ancoragem: cada lesão com coords vira um card com anchor (meio do vaso).
  type Pending = { card: Omit<VenousCalloutCard, "rect">; anchorY: number };
  const pend: Pending[] = [];
  mapa.lesoes.forEach((lz: LesaoDesenho, i) => {
    const pts = coords[lz.lado]?.[lz.segmento];
    if (!pts || pts.length < 1) return; // sem coords → não desenha pílula (fica no texto)
    const anchor = midpoint(pts);
    const side: "left" | "right" = anchor[0] < width / 2 ? "left" : "right";
    pend.push({
      card: {
        id: `lesao-${i}`,
        label: lz.label,
        sub: lz.sub,
        estado: lz.estado,
        color: colorFor(lz.estado),
        anchor,
        side,
      },
      anchorY: anchor[1],
    });
  });

  // Empilhamento por lado: ordena por Y do vaso e resolve sobreposição
  // deslocando pra baixo (respeitando yMin/yMax e o gap).
  const cards: VenousCalloutCard[] = [];
  (["left", "right"] as const).forEach((side) => {
    const x =
      side === "left" ? margin : width - margin - cardW;
    const group = pend
      .filter((p) => p.card.side === side)
      .sort((a, b) => a.anchorY - b.anchorY);
    let cursor = yMin;
    for (const p of group) {
      let y = Math.max(cursor, p.anchorY - cardH / 2);
      if (y + cardH > yMax) y = yMax - cardH;
      if (y < cursor) y = cursor; // garante ordem/sem overlap
      cards.push({ ...p.card, rect: { x, y, w: cardW, h: cardH } });
      cursor = y + cardH + gap;
    }
  });

  // Legenda: só os estados presentes (dedup), na ordem de gravidade natural.
  const seen = new Set<EstadoSegmento>();
  const order: EstadoSegmento[] = [
    "trombose_oclusiva",
    "trombose_parcial",
    "recanalizada",
    "refluxo",
    "varicosidade",
  ];
  const present = new Set<EstadoSegmento>(mapa.lesoes.map((l) => l.estado));
  const legend: VenousLegendItem[] = [];
  for (const e of order) {
    if (present.has(e) && !seen.has(e)) {
      seen.add(e);
      legend.push({ estado: e, color: colorFor(e), label: LEGEND_LABEL[e] });
    }
  }

  return { width, height, cards, legend };
}
