import type { MapaVenoso, EstadoSegmento } from "./venousMap";
import type { Ponto } from "./venousSvg";
import type { LadoVenoso } from "./findings";

/**
 * Coordenadas dos segmentos traçadas sobre a arte-base, aninhadas por lado
 * (formato do asset gerado): `{ direito: { safena_magna: [[x,y],...] }, esquerdo: {...} }`.
 */
export type VenousCoords = {
  direito: Record<string, Ponto[]>;
  esquerdo: Record<string, Ponto[]>;
  width?: number;
  height?: number;
};

/**
 * Coords da arte de 4 VISTAS (8 células `${lado}__${vista}`, asset 2048×3072).
 * Cada célula guarda as polilinhas dos segmentos DESENHADOS naquela vista — a
 * própria chave codifica a pertinência vista↔segmento (magna só em `*__medial`,
 * parva só em `*__posterior`), então o recolor não precisa de tabela extra.
 * A chave `tributaria_lateral` (vistas `*__lateral`) não é um SegmentoVenoso do
 * schema: é tratada por um passo dedicado (varicosidade de face lateral).
 */
export type VistaVenosa = "lateral" | "anterior" | "medial" | "posterior";
export type CelulaVenosa = `${LadoVenoso}__${VistaVenosa}`;
export type VenousCoords4 = {
  width: number;
  height: number;
  vistas: Partial<Record<CelulaVenosa, Record<string, Ponto[]>>>;
};

/** Chave provisória p/ a rede de face lateral (sem tronco nomeado no schema). */
export const TRIBUTARIA_LATERAL_KEY = "tributaria_lateral";

/**
 * Tube-recolor do esquema venoso ORGÂNICO (produção). Puro e SEM dependência de
 * lib de imagem: recebe o buffer RGBA (do canvas do cliente ou de um decoder no
 * servidor) e recolore, IN-PLACE, só os pixels da veia dentro de um "tubo" ao
 * redor da linha do segmento alterado. Preserva a forma orgânica da arte-base.
 *
 * Arquitetura (08/07): a composição roda no CLIENTE (iOS/Android/web já geram e
 * empurram o PNG via /api/sala/push-schema). O backend entrega o `MapaVenoso`
 * (schema DOPPLER_VENOSO_MMII → buildMapaVenoso) e a referência da arte-base;
 * o cliente decodifica a imagem, chama esta função e empurra o resultado.
 * Não requer sharp/canvas/resvg no backend.
 */

export type RGB = [number, number, number];

/** Cor de recolor por estado (null = mantém a veia como está na arte). */
export const VENOUS_STATE_RGB: Record<EstadoSegmento, RGB | null> = {
  normal: null,
  refluxo: [209, 132, 26],
  varicosidade: [209, 132, 26],
  trombose_oclusiva: [176, 58, 74],
  trombose_parcial: [196, 96, 110],
  recanalizada: [176, 58, 74],
};

/** Heurística de pixel-de-veia (azul sobre line-art claro). Calibrada na arte. */
export function isVeinPixel(r: number, g: number, b: number): boolean {
  return b - r > 14 && b > 108 && r < 205;
}

function distToSeg(px: number, py: number, a: Ponto, b: Ponto): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - a[0]) * dx + (py - a[1]) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}
function distToPolyline(px: number, py: number, pts: Ponto[]): number {
  let m = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const d = distToSeg(px, py, pts[i - 1]!, pts[i]!);
    if (d < m) m = d;
  }
  return m;
}

/** Raio do tubo por sistema (junção mais estreita). */
function tubeRadius(seg: string, base: number): number {
  return seg === "jsf" || seg === "jsp" ? Math.max(10, base - 4) : base;
}

export type RecolorOpts = { radius?: number };

/**
 * Recolore IN-PLACE os pixels-de-veia dentro do tubo (raio R) ao redor de UMA
 * polilinha. Só toca pixels AZUIS (pele/branco intactos). Retorna nº alterados.
 * Núcleo compartilhado por `recolorVenousPixels` e `recolorVenousPixels4`.
 */
function recolorTube(
  pixels: Uint8ClampedArray | Uint8Array | number[],
  width: number,
  height: number,
  pts: Ponto[],
  rgb: RGB,
  R: number,
): number {
  if (pts.length < 2) return 0;
  let changed = 0;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - R - 2));
  const x1 = Math.min(width - 1, Math.ceil(Math.max(...xs) + R + 2));
  const y0 = Math.max(0, Math.floor(Math.min(...ys) - R - 2));
  const y1 = Math.min(height - 1, Math.ceil(Math.max(...ys) + R + 2));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4;
      if (!isVeinPixel(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!)) continue;
      if (distToPolyline(x, y, pts) > R) continue;
      pixels[i] = rgb[0];
      pixels[i + 1] = rgb[1];
      pixels[i + 2] = rgb[2];
      changed++;
    }
  }
  return changed;
}

/**
 * Recolore IN-PLACE os pixels RGBA (`pixels`, largura×altura) conforme o
 * `MapaVenoso`: para cada segmento com estado ≠ normal, pinta os pixels-de-veia
 * dentro do tubo ao redor da polilinha (coords). Retorna nº de pixels alterados.
 */
export function recolorVenousPixels(
  pixels: Uint8ClampedArray | Uint8Array | number[],
  width: number,
  height: number,
  mapa: MapaVenoso,
  coords: VenousCoords,
  opts: RecolorOpts = {},
): number {
  const baseR = opts.radius ?? 17;
  let changed = 0;
  (["direito", "esquerdo"] as LadoVenoso[]).forEach((lado) => {
    const segs = mapa.lados[lado]?.segmentos ?? {};
    for (const seg of Object.keys(segs)) {
      const estado = segs[seg as keyof typeof segs] as EstadoSegmento;
      const rgb = VENOUS_STATE_RGB[estado];
      const pts = coords[lado]?.[seg];
      if (!rgb || !pts || pts.length < 2) continue;
      changed += recolorTube(pixels, width, height, pts, rgb, tubeRadius(seg, baseR));
    }
  });
  return changed;
}

/**
 * Recolor da arte de 4 VISTAS (asset 2048×3072, coords `${lado}__${vista}`).
 * Itera as 8 células; para cada segmento com polilinha na célula, lê o estado
 * em `mapa.lados[lado].segmentos[seg]` e recolore o tubo se ≠ normal. A chave
 * a pertinência vista↔segmento vem das próprias coords (não há tabela de mapa).
 *
 * Passo dedicado para a face LATERAL (sem tronco nomeado no schema, decisão Luiz
 * 20/07): a coord `tributaria_lateral` é pintada com a cor de varicosidade quando
 * há, naquele lado, uma lesão de estado `varicosidade` cujo texto (label+sub)
 * menciona "lateral". Conservador: sem match → não pinta.
 *
 * Raio default = 13 (veia da arte v3 tem ~6px; cobre + folga sem invadir vizinhas).
 */
export function recolorVenousPixels4(
  pixels: Uint8ClampedArray | Uint8Array | number[],
  width: number,
  height: number,
  mapa: MapaVenoso,
  coords: VenousCoords4,
  opts: RecolorOpts = {},
): number {
  const baseR = opts.radius ?? 13;
  let changed = 0;
  // Lados com varicosidade de face lateral (para a coord tributaria_lateral).
  const varicLateral = lateralVaricosidadeLados(mapa);
  for (const cellKey of Object.keys(coords.vistas) as CelulaVenosa[]) {
    const cell = coords.vistas[cellKey];
    if (!cell) continue;
    const lado = cellKey.split("__")[0] as LadoVenoso;
    for (const seg of Object.keys(cell)) {
      const pts = cell[seg];
      if (!pts || pts.length < 2) continue;
      let rgb: RGB | null;
      if (seg === TRIBUTARIA_LATERAL_KEY) {
        rgb = varicLateral.has(lado) ? VENOUS_STATE_RGB.varicosidade : null;
      } else {
        const estado = mapa.lados[lado]?.segmentos?.[seg as keyof MapaVenoso["lados"]["direito"]["segmentos"]] as
          | EstadoSegmento
          | undefined;
        rgb = estado ? VENOUS_STATE_RGB[estado] : null;
      }
      if (!rgb) continue;
      changed += recolorTube(pixels, width, height, pts, rgb, tubeRadius(seg, baseR));
    }
  }
  return changed;
}

/** Lados que têm alguma lesão de varicosidade cujo texto menciona "lateral". */
function lateralVaricosidadeLados(mapa: MapaVenoso): Set<LadoVenoso> {
  const out = new Set<LadoVenoso>();
  for (const l of mapa.lesoes) {
    if (l.estado !== "varicosidade") continue;
    const txt = `${l.label} ${l.sub}`.toLowerCase();
    if (txt.includes("lateral")) out.add(l.lado);
  }
  return out;
}
