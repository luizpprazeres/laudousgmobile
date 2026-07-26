// Demo E2E do C4: aplica recolorVenousPixels4 na arte real v3 + coords reais,
// com um MapaVenoso aproximando o caso Alana 2023 (magna refluxo bilateral,
// parva refluxo à esquerda, varicosidade de face lateral à direita).
import * as fs from "fs";
import { PNG } from "pngjs";
import { recolorVenousPixels4, type VenousCoords4 } from "../../packages/schemes/src/vascular/venousRaster";
import type { MapaVenoso } from "../../packages/schemes/src/vascular/venousMap";

const DIR = "tmp-review/referencias-cartografia";
const png = PNG.sync.read(fs.readFileSync(`${DIR}/veias-8vistas-v3.png`));
const coords = JSON.parse(fs.readFileSync(`${DIR}/coords-8vistas-v2.json`, "utf8")) as VenousCoords4;

const mapa: MapaVenoso = {
  lados: {
    direito: { avaliado: true, segmentos: { safena_magna: "refluxo", safena_acessoria_anterior: "varicosidade" } },
    esquerdo: { avaliado: true, segmentos: { safena_magna: "refluxo", safena_parva: "refluxo" } },
  },
  lesoes: [
    { lado: "direito", segmento: "safena_acessoria_anterior", estado: "varicosidade", label: "Varicosidade", sub: "faces anterior e lateral da coxa" },
  ],
  perfurantes: [],
  tvp_presente: false,
};

const n = recolorVenousPixels4(png.data, png.width, png.height, mapa, coords, { radius: 13 });
console.log("pixels recoloridos:", n);
fs.writeFileSync(`${DIR}/render-c4-demo.png`, PNG.sync.write(png));
console.log("escrito:", `${DIR}/render-c4-demo.png`);
