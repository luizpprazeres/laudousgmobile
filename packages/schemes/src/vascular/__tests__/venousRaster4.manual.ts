/**
 * Verificador GOLDEN (manual) de `recolorVenousPixels4` — o motor de recolor da
 * cartografia venosa de 4 vistas (C4). Sintético e determinístico: pinta veias
 * azuis em coords conhecidas num buffer RGBA e checa o isolamento por célula.
 *
 * Rodar: npx tsx packages/schemes/src/vascular/__tests__/venousRaster4.manual.ts
 * Sai 0 se tudo passar; 1 no 1º fracasso.
 */
import {
  recolorVenousPixels4,
  VENOUS_STATE_RGB,
  isVeinPixel,
  TRIBUTARIA_LATERAL_KEY,
  type VenousCoords4,
} from "../venousRaster";
import type { MapaVenoso, LadoDesenho } from "../venousMap";

const W = 400;
const H = 200;
const BLUE: [number, number, number] = [127, 182, 216]; // #7FB6D8 (veia da arte)

// polilinhas de teste em 3 células (x,y), veias verticais separadas
const COORDS: VenousCoords4 = {
  width: W,
  height: H,
  vistas: {
    direito__medial: { safena_magna: [[60, 20], [60, 180]] },
    direito__posterior: { safena_parva: [[160, 60], [160, 180]] },
    direito__lateral: { [TRIBUTARIA_LATERAL_KEY]: [[260, 20], [260, 180]] },
  },
};

function makeBuffer(): Uint8ClampedArray {
  const px = new Uint8ClampedArray(W * H * 4).fill(255); // fundo branco opaco
  // pinta cada polilinha como uma coluna azul de ~6px de largura
  for (const cell of Object.values(COORDS.vistas)) {
    for (const pts of Object.values(cell!)) {
      const x = pts[0]![0];
      const y0 = pts[0]![1];
      const y1 = pts[pts.length - 1]![1];
      for (let y = y0; y <= y1; y++) {
        for (let dx = -3; dx <= 3; dx++) {
          const i = (y * W + (x + dx)) * 4;
          px[i] = BLUE[0]; px[i + 1] = BLUE[1]; px[i + 2] = BLUE[2]; px[i + 3] = 255;
        }
      }
    }
  }
  return px;
}

/** conta pixels de uma cor exata numa janela vertical ao redor de x. */
function countColor(px: Uint8ClampedArray, xc: number, rgb: [number, number, number]): number {
  let n = 0;
  for (let y = 0; y < H; y++) {
    for (let x = xc - 6; x <= xc + 6; x++) {
      const i = (y * W + x) * 4;
      if (px[i] === rgb[0] && px[i + 1] === rgb[1] && px[i + 2] === rgb[2]) n++;
    }
  }
  return n;
}

function lado(seg: Record<string, string>): LadoDesenho {
  return { avaliado: true, segmentos: seg as LadoDesenho["segmentos"] };
}
function mapa(partial: Partial<MapaVenoso>): MapaVenoso {
  return {
    lados: {
      direito: partial.lados?.direito ?? { avaliado: true, segmentos: {} },
      esquerdo: partial.lados?.esquerdo ?? { avaliado: true, segmentos: {} },
    },
    lesoes: partial.lesoes ?? [],
    perfurantes: partial.perfurantes ?? [],
    tvp_presente: partial.tvp_presente ?? false,
  };
}

let fails = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { console.log("  ✓", msg); }
  else { console.error("  ✗ FALHOU:", msg); fails++; }
}

const REFLUXO = VENOUS_STATE_RGB.refluxo!;
const TROMBOSE = VENOUS_STATE_RGB.trombose_oclusiva!;
const VARIC = VENOUS_STATE_RGB.varicosidade!;

// sanidade da heurística
console.log("Heurística de pixel-de-veia:");
assert(isVeinPixel(BLUE[0], BLUE[1], BLUE[2]), "azul da arte É pixel-de-veia");
assert(!isVeinPixel(255, 255, 255), "branco NÃO é pixel-de-veia");

// Caso 1: magna=refluxo no direito → só a célula medial recolore
console.log("\nCaso 1: direito.safena_magna = refluxo");
{
  const px = makeBuffer();
  const n = recolorVenousPixels4(px, W, H, mapa({ lados: { direito: lado({ safena_magna: "refluxo" }), esquerdo: { avaliado: true, segmentos: {} } } }), COORDS);
  assert(n > 0, `recoloriu pixels (n=${n})`);
  assert(countColor(px, 60, REFLUXO) > 100, "magna (medial) recolorida de refluxo");
  assert(countColor(px, 160, REFLUXO) === 0, "parva (posterior) intacta");
  assert(countColor(px, 260, REFLUXO) === 0, "lateral intacta");
  assert(countColor(px, 160, BLUE) > 100, "parva continua azul");
}

// Caso 2: parva=trombose oclusiva → só a célula posterior
console.log("\nCaso 2: direito.safena_parva = trombose_oclusiva");
{
  const px = makeBuffer();
  recolorVenousPixels4(px, W, H, mapa({ lados: { direito: lado({ safena_parva: "trombose_oclusiva" }), esquerdo: { avaliado: true, segmentos: {} } } }), COORDS);
  assert(countColor(px, 160, TROMBOSE) > 80, "parva (posterior) recolorida de trombose");
  assert(countColor(px, 60, TROMBOSE) === 0, "magna (medial) intacta");
  assert(countColor(px, 60, BLUE) > 100, "magna continua azul");
}

// Caso 3: varicosidade com texto "lateral" → tributaria_lateral pinta
console.log("\nCaso 3: lesão varicosidade texto 'lateral' → tributaria_lateral");
{
  const px = makeBuffer();
  recolorVenousPixels4(px, W, H, mapa({
    lesoes: [{ lado: "direito", segmento: "safena_acessoria_anterior", estado: "varicosidade", label: "Varicosidade", sub: "face lateral da coxa" }],
  }), COORDS);
  assert(countColor(px, 260, VARIC) > 100, "lateral recolorida de varicosidade");
  assert(countColor(px, 60, VARIC) === 0, "medial intacta");
}

// Caso 4: sem menção a "lateral" → tributaria_lateral NÃO pinta (conservador)
console.log("\nCaso 4: varicosidade SEM 'lateral' → tributaria_lateral fica normal");
{
  const px = makeBuffer();
  recolorVenousPixels4(px, W, H, mapa({
    lesoes: [{ lado: "direito", segmento: "safena_magna", estado: "varicosidade", label: "Varicosidade", sub: "face medial" }],
  }), COORDS);
  assert(countColor(px, 260, VARIC) === 0, "lateral NÃO pintada (sem match)");
  assert(countColor(px, 260, BLUE) > 100, "lateral continua azul");
}

// Caso 5: mapa vazio → nada muda
console.log("\nCaso 5: mapa normal → nenhum pixel alterado");
{
  const px = makeBuffer();
  const n = recolorVenousPixels4(px, W, H, mapa({}), COORDS);
  assert(n === 0, "0 pixels alterados");
}

console.log(fails === 0 ? "\n✅ TODOS OS CASOS PASSARAM" : `\n❌ ${fails} ASSERT(S) FALHARAM`);
process.exit(fails === 0 ? 0 : 1);
