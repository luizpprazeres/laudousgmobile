// Demo C5: recolor (4 vistas) + anotações manuscritas posicionadas, sobre a arte
// real. Emite HTML (arte data-URI + rótulos como texto cursivo + traços-guia).
import * as fs from "fs";
import { PNG } from "pngjs";
import {
  recolorVenousPixels4,
  buildVenousAnnotations4,
  VENOUS_4VIEW_COORDS,
  type VenousCoords4,
} from "../../packages/schemes/src/vascular";
import type { MapaVenoso } from "../../packages/schemes/src/vascular/venousMap";

const DIR = "tmp-review/referencias-cartografia";
const coords = VENOUS_4VIEW_COORDS as VenousCoords4;
const png = PNG.sync.read(fs.readFileSync(`${DIR}/veias-8vistas-v3.png`));

// Caso Alana-like: refluxo magna bilateral + parva esq; calibres + perfurantes.
const mapa: MapaVenoso = {
  lados: {
    direito: { avaliado: true, segmentos: { safena_magna: "refluxo" } },
    esquerdo: { avaliado: true, segmentos: { safena_magna: "refluxo", safena_parva: "refluxo" } },
  },
  lesoes: [],
  perfurantes: [],
  tvp_presente: false,
  anotacoes: [
    { lado: "direito", tipo: "calibre", texto: "5,8 mm", segmento: "safena_magna" },
    { lado: "direito", tipo: "perfurante", texto: "Ø 3,3 mm", topografia: "panturrilha" },
    { lado: "esquerdo", tipo: "calibre", texto: "4,8 mm", segmento: "safena_magna" },
    { lado: "esquerdo", tipo: "calibre", texto: "3,0 mm", segmento: "safena_parva" },
    { lado: "esquerdo", tipo: "perfurante", texto: "Ø 3,2 mm", topografia: "perna_medial" },
  ],
};

recolorVenousPixels4(png.data, png.width, png.height, mapa, coords, { radius: 13 });
const b64 = PNG.sync.write(png).toString("base64");
const fontB64 = fs.readFileSync("apps/mobile/assets/fonts/Caveat.ttf").toString("base64");
const layout = buildVenousAnnotations4(mapa, coords);
console.log("anotações posicionadas:", layout.labels.length);

const W = coords.width, H = coords.height;
const scale = 0.42; // preview
const lines = layout.labels
  .map(
    (l) =>
      `<line x1="${l.anchor[0]}" y1="${l.anchor[1]}" x2="${l.textPos[0]}" y2="${l.textPos[1]}" stroke="#b03a4a" stroke-width="3"/>` +
      `<circle cx="${l.anchor[0]}" cy="${l.anchor[1]}" r="7" fill="#b03a4a"/>`,
  )
  .join("\n");
const texts = layout.labels
  .map((l) => {
    // side "left" = texto na margem esquerda, alinhado à DIREITA terminando em textPos;
    // side "right" = margem direita, alinhado à ESQUERDA começando em textPos.
    const x = l.textPos[0] * scale;
    const y = l.textPos[1] * scale - 16;
    return l.side === "left"
      ? `<div class="ann" style="right:${W * scale - x}px;top:${y}px;text-align:right">${l.texto}</div>`
      : `<div class="ann" style="left:${x}px;top:${y}px">${l.texto}</div>`;
  })
  .join("\n");

const html = `<!doctype html><meta charset="utf8"><style>
  @font-face{font-family:'Caveat';src:url(data:font/ttf;base64,${fontB64}) format('truetype')}
  body{margin:0;background:#fff;font-family:system-ui}
  .wrap{position:relative;width:${W * scale}px;margin:12px auto}
  img{width:${W * scale}px;display:block}
  svg{position:absolute;inset:0;width:${W * scale}px;height:${H * scale}px}
  .ann{position:absolute;font-family:'Caveat',cursive;
    font-size:${Math.round(64 * scale)}px;color:#7a1f2b;font-weight:600;white-space:nowrap;line-height:1}
  h3{font-family:system-ui;text-align:center;color:#333}
</style>
<h3>C5 — anotações manuscritas (demo, caso Alana-like)</h3>
<div class="wrap">
  <img src="data:image/png;base64,${b64}"/>
  <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${lines}</svg>
  ${texts}
</div>`;
fs.writeFileSync(`${DIR}/render-c5-demo.html`, html);
console.log("escrito:", `${DIR}/render-c5-demo.html`);
