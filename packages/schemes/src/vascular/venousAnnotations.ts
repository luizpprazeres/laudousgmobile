import type { MapaVenoso, VenousAnnotation } from "./venousMap";
import type { VenousCoords4, CelulaVenosa, VistaVenosa } from "./venousRaster";
import type { LadoVenoso, SegmentoVenoso } from "./findings";
import type { Ponto } from "./venousSvg";

/**
 * Layout DETERMINÍSTICO das anotações manuscritas (C5/D3) sobre a cartografia de
 * 4 vistas. Roda no cliente a partir do MESMO `MapaVenoso` + `VenousCoords4` que
 * alimentam o recolor → RN/iOS desenham anotações IDÊNTICAS. Aqui só a GEOMETRIA +
 * texto; cada cliente desenha o texto (fonte manuscrita) + o traço curto até o vaso.
 *
 * Estilo (decisão Luiz D3): texto curto ao lado do vaso (cm/mm), NÃO callout em
 * pílula. Coordenadas em ESPAÇO DA ARTE (2048×3072), como coords/recolor.
 */

export type VenousAnnotationLabel = {
  id: string;
  texto: string;
  tipo: VenousAnnotation["tipo"];
  anchor: Ponto; // ponto no vaso (espaço da arte)
  textPos: Ponto; // borda do texto MAIS PRÓXIMA do vaso (= fim do traço-guia)
  side: "left" | "right"; // margem em que o texto fica → alinhamento no cliente:
  // "left" = texto na margem esquerda, alinhado à DIREITA terminando em textPos;
  // "right" = texto na margem direita, alinhado à ESQUERDA começando em textPos.
};

export type VenousAnnotationLayout = {
  width: number;
  height: number;
  labels: VenousAnnotationLabel[];
};

export type AnnotationLayoutOpts = {
  textWidth?: number; // largura reservada p/ o texto na margem (espaço da arte)
  lineHeight?: number; // altura reservada por rótulo (anti-overlap)
  margin?: number; // respiro na borda da célula
  minGap?: number; // vão mínimo entre o vaso e o texto (evita sobreposição)
};

const COLS: VistaVenosa[] = ["lateral", "anterior", "medial", "posterior"];
const ROW_INDEX: Record<LadoVenoso, number> = { direito: 0, esquerdo: 1 };

/** Vista onde cada segmento anotável é desenhado. */
const VIEW_BY_SEGMENT: Partial<Record<SegmentoVenoso, VistaVenosa>> = {
  safena_magna: "medial",
  safena_parva: "posterior",
  safena_acessoria_anterior: "anterior",
};

/** Fração de altura da célula por topografia da perfurante (aprox., v1). */
const TOPO_YFRAC: Record<
  NonNullable<VenousAnnotation["topografia"]>,
  number
> = {
  coxa: 0.2,
  joelho: 0.48,
  perna_medial: 0.66,
  panturrilha: 0.8,
};

function cellKeyFor(ann: VenousAnnotation): CelulaVenosa | null {
  let vista: VistaVenosa | undefined;
  if (ann.segmento) vista = VIEW_BY_SEGMENT[ann.segmento];
  else if (ann.topografia) vista = "posterior"; // perfurantes: vista posterior
  if (!vista) return null;
  return `${ann.lado}__${vista}` as CelulaVenosa;
}

function pointAtYFraction(pts: Ponto[], frac: number): Ponto {
  if (pts.length === 0) return [0, 0];
  const ys = pts.map((p) => p[1]);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const targetY = yMin + (yMax - yMin) * frac;
  // ponto do traçado mais próximo do y alvo
  let best = pts[0]!;
  let bestD = Infinity;
  for (const p of pts) {
    const d = Math.abs(p[1] - targetY);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/**
 * Monta as anotações posicionadas. Cada `VenousAnnotation` do MapaVenoso é
 * ancorada no vaso (célula/vista via segmento; perfurante por topografia) e o
 * texto vai para a margem lateral próxima, empilhado por y sem sobreposição.
 * Anotações sem coords (segmento não desenhado) são omitidas (ficam no texto).
 */
export function buildVenousAnnotations4(
  mapa: MapaVenoso,
  coords: VenousCoords4,
  opts: AnnotationLayoutOpts = {},
): VenousAnnotationLayout {
  const width = coords.width;
  const height = coords.height;
  const textW = opts.textWidth ?? 180;
  const lineH = opts.lineHeight ?? 46;
  const margin = opts.margin ?? 12;
  const minGap = opts.minGap ?? 26;
  const colW = width / 4;
  const rowH = height / 2;

  const anns = mapa.anotacoes ?? [];
  type Pending = VenousAnnotationLabel & { cellCol: number; cellRow: number };
  const pending: Pending[] = [];

  anns.forEach((ann, i) => {
    const key = cellKeyFor(ann);
    if (!key) return;
    const cell = coords.vistas[key];
    if (!cell) return;
    // Polilinha do vaso na célula: pelo segmento, ou a parva (posterior) p/ perfurante.
    const seg = ann.segmento ?? "safena_parva";
    const pts = cell[seg] ?? Object.values(cell)[0];
    if (!pts || pts.length === 0) return;

    const anchor = ann.topografia
      ? pointAtYFraction(pts, TOPO_YFRAC[ann.topografia])
      : pts[Math.floor(pts.length / 2)]!;

    const col = COLS.indexOf(key.split("__")[1] as VistaVenosa);
    const row = ROW_INDEX[ann.lado];
    const cellX0 = col * colW;
    const cellX1 = cellX0 + colW;
    // Texto vai para a MARGEM da célula (longe do vaso, nunca por cima). Escolhe
    // a margem com mais espaço; a borda do texto próxima ao vaso (= fim do
    // traço-guia) fica a pelo menos `minGap` do vaso.
    const roomRight = cellX1 - anchor[0];
    const roomLeft = anchor[0] - cellX0;
    const side: "left" | "right" = roomRight >= roomLeft ? "right" : "left";
    // textPos = borda do texto voltada para o vaso (extremidade do traço-guia).
    const nearX =
      side === "right"
        ? Math.max(anchor[0] + minGap, cellX1 - margin - textW)
        : Math.min(anchor[0] - minGap, cellX0 + margin + textW);
    const textPos: Ponto = [nearX, anchor[1]];

    pending.push({
      id: `ann-${i}`,
      texto: ann.texto,
      tipo: ann.tipo,
      anchor,
      textPos,
      side,
      cellCol: col,
      cellRow: row,
    });
  });

  // Anti-overlap: por célula (col,row) + lado, empilha por y respeitando lineH.
  const groups = new Map<string, Pending[]>();
  for (const p of pending) {
    const k = `${p.cellCol}_${p.cellRow}_${p.side}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(p);
  }
  const labels: VenousAnnotationLabel[] = [];
  for (const [, group] of groups) {
    group.sort((a, b) => a.textPos[1] - b.textPos[1]);
    const rowTop = group[0]!.cellRow * rowH + margin;
    const rowBot = (group[0]!.cellRow + 1) * rowH - margin;
    let cursor = rowTop;
    for (const p of group) {
      let y = Math.max(cursor, p.textPos[1] - lineH / 2);
      if (y + lineH > rowBot) y = rowBot - lineH;
      labels.push({
        id: p.id,
        texto: p.texto,
        tipo: p.tipo,
        anchor: p.anchor,
        textPos: [p.textPos[0], y + lineH / 2],
        side: p.side,
      });
      cursor = y + lineH;
    }
  }

  return { width, height, labels };
}
