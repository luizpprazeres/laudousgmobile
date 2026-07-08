import type { MapaVenoso, EstadoSegmento } from "./venousMap";
import type { SegmentoVenoso, LadoVenoso } from "../findingsSchemas/DOPPLER_VENOSO_MMII";
import { NOME_SEGMENTO } from "./venousMap";

/**
 * Motor de composição do ESQUEMA VISUAL venoso (SVG vetorial, server-side).
 *
 * Escopo (Luiz 08/07): SÓ o DESENHO. Recebe o `MapaVenoso` (saída determinística
 * de `buildMapaVenoso`) + as coordenadas dos segmentos traçadas sobre a base
 * line-art das pernas, e devolve uma STRING SVG — a mesma lógica dos protótipos,
 * agora vetorial e sem DOM (pode rasterizar p/ PNG/PDF no fluxo push-schema).
 *
 * Puro e sem dependências: `renderVenousSvg(...)` → string.
 */

export type Ponto = [number, number];
/** chave `${lado}__${segmento}` → polilinha (proximal→distal) na base. */
export type SegCoords = Partial<Record<string, Ponto[]>>;

const SISTEMA: Record<SegmentoVenoso, "profundo" | "superficial" | "juncao"> = {
  femoral_comum: "profundo",
  femoral: "profundo",
  femoral_profunda: "profundo",
  poplitea: "profundo",
  tibial_posterior: "profundo",
  tibial_anterior: "profundo",
  fibular: "profundo",
  gastrocnemias: "profundo",
  soleares: "profundo",
  safena_magna: "superficial",
  safena_parva: "superficial",
  safena_acessoria_anterior: "superficial",
  giacomini: "superficial",
  jsf: "juncao",
  jsp: "juncao",
};

export type VenousSvgTheme = {
  vein: string; // veia pérvia (normal)
  reflux: string;
  thrombus: string;
  ink: string;
  muted: string;
  pill: string;
  pillBorder: string;
};

const THEME_LIGHT: VenousSvgTheme = {
  vein: "#2f6ea5",
  reflux: "#d1841a",
  thrombus: "#b03a4a",
  ink: "#142130",
  muted: "#6a7d90",
  pill: "#ffffff",
  pillBorder: "#d5dfea",
};

function widthFor(sistema: "profundo" | "superficial" | "juncao"): number {
  return sistema === "profundo" ? 7 : sistema === "juncao" ? 8 : 5;
}

function styleFor(
  estado: EstadoSegmento,
  sistema: "profundo" | "superficial" | "juncao",
  t: VenousSvgTheme,
): { stroke: string; width: number; dash: string } {
  const base = widthFor(sistema);
  switch (estado) {
    case "refluxo":
    case "varicosidade":
      return { stroke: t.reflux, width: base + 3, dash: "" };
    case "trombose_oclusiva":
      return { stroke: t.thrombus, width: base + 5, dash: "" };
    case "trombose_parcial":
      return { stroke: t.thrombus, width: base + 3, dash: `stroke-dasharray="12 8"` };
    case "recanalizada":
      return { stroke: t.thrombus, width: base, dash: `stroke-dasharray="6 6"` };
    default:
      return { stroke: t.vein, width: base, dash: "" };
  }
}

function fnum(n: number): string {
  return n.toFixed(1);
}
function polyToPath(pts: Ponto[]): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${fnum(p[0])} ${fnum(p[1])}`).join(" ");
}
function segLen(pts: Ponto[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
}
function along(pts: Ponto[], t: number): Ponto {
  const total = segLen(pts);
  let target = t * total;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (target <= l) {
      const f = l === 0 ? 0 : target / l;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }
    target -= l;
  }
  return pts[pts.length - 1]!;
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type RenderVenousSvgOpts = {
  mapa: MapaVenoso;
  segCoords: SegCoords;
  width: number;
  height: number;
  /** data-URI (ou URL) da base line-art das pernas; opcional. */
  legBaseHref?: string;
  theme?: VenousSvgTheme;
};

/** MapaVenoso + coordenadas → string SVG do esquema venoso. Determinístico. */
export function renderVenousSvg(opts: RenderVenousSvgOpts): string {
  const { mapa, segCoords, width, height } = opts;
  const t = opts.theme ?? THEME_LIGHT;
  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Esquema venoso dos membros inferiores">`,
  );
  if (opts.legBaseHref) {
    out.push(
      `<image href="${opts.legBaseHref}" x="0" y="0" width="${width}" height="${height}"/>`,
    );
  }

  // 1) Vasos: cada segmento com coord vira um path, recolorido pelo estado.
  const chevrons: string[] = [];
  for (const key of Object.keys(segCoords)) {
    const pts = segCoords[key];
    if (!pts || pts.length < 2) continue;
    const [lado, seg] = key.split("__") as [LadoVenoso, SegmentoVenoso];
    const sistema = SISTEMA[seg] ?? "superficial";
    const estado = mapa.lados[lado]?.segmentos[seg] ?? "normal";
    const st = styleFor(estado, sistema, t);
    out.push(
      `<path d="${polyToPath(pts)}" fill="none" stroke="${st.stroke}" stroke-width="${st.width}" ${st.dash} stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    if (estado === "refluxo") {
      for (const tt of [0.34, 0.55, 0.76]) {
        const p = along(pts, tt);
        chevrons.push(
          `<path d="M${fnum(p[0] - 9)} ${fnum(p[1] - 7)} L${fnum(p[0])} ${fnum(p[1] + 7)} L${fnum(p[0] + 9)} ${fnum(p[1] - 7)}" fill="none" stroke="${t.reflux}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
        );
      }
    }
  }
  out.push(...chevrons);

  // 2) Callouts (lesões + perfurantes) empilhados nas margens externas.
  const slot: Record<"left" | "right", number> = { left: height * 0.18, right: height * 0.18 };
  const step = height * 0.1;
  const emitCallout = (
    lado: LadoVenoso,
    anchor: Ponto,
    titulo: string,
    sub: string,
    cor: string,
  ) => {
    const right = lado === "esquerdo";
    const side = right ? "right" : "left";
    const y = slot[side];
    slot[side] += step;
    const labelX = right ? width - 14 : 14;
    const anchorAttr = right ? "end" : "start";
    // largura estimada do texto (sem DOM): título 19px, sub 13.5px mono.
    const wTitle = titulo.length * 11;
    const wSub = sub.length * 8.2;
    const boxW = Math.max(wTitle, wSub) + 22;
    const boxH = sub ? 52 : 34;
    const boxX = right ? labelX - boxW : labelX;
    const elbowX = right ? width * 0.82 : width * 0.18;
    const edgeX = right ? boxX : boxX + boxW;
    return [
      `<path d="M${fnum(anchor[0])} ${fnum(anchor[1])} L${fnum(elbowX)} ${fnum(y + 4)} L${fnum(edgeX)} ${fnum(y + 4)}" fill="none" stroke="${t.muted}" stroke-width="1.6" opacity="0.6"/>`,
      `<rect x="${fnum(boxX)}" y="${fnum(y - 22)}" width="${fnum(boxW)}" height="${boxH}" rx="10" fill="${t.pill}" stroke="${cor}" stroke-width="1.2"/>`,
      `<text x="${labelX}" y="${y}" text-anchor="${anchorAttr}" font-family="Inter, system-ui, sans-serif" font-size="19" font-weight="600" fill="${cor}">${esc(titulo)}</text>`,
      sub
        ? `<text x="${labelX}" y="${y + 20}" text-anchor="${anchorAttr}" font-family="ui-monospace, monospace" font-size="13.5" fill="${t.muted}">${esc(sub)}</text>`
        : "",
      `<circle cx="${fnum(anchor[0])}" cy="${fnum(anchor[1])}" r="8" fill="${cor}" stroke="${t.pill}" stroke-width="2.5"/>`,
    ].join("");
  };

  for (const les of mapa.lesoes) {
    const pts = segCoords[`${les.lado}__${les.segmento}`];
    if (!pts || pts.length < 2) continue;
    const cor =
      les.estado === "refluxo" || les.estado === "varicosidade" ? t.reflux : t.thrombus;
    out.push(emitCallout(les.lado, along(pts, 0.4), les.label, les.sub, cor));
  }
  for (const p of mapa.perfurantes) {
    // âncora aproximada: meio da safena magna do lado (fallback), se houver.
    const ref = segCoords[`${p.lado}__safena_magna`];
    const anchor = ref && ref.length >= 2 ? along(ref, 0.5) : ([width / 2, height / 2] as Ponto);
    out.push(emitCallout(p.lado, anchor, p.label, p.sub, t.reflux));
  }

  out.push("</svg>");
  return out.join("");
}

export { NOME_SEGMENTO };
