/**
 * Verificador GOLDEN (manual) de `buildVenousAnnotations4` (C5 — anotações
 * manuscritas). Usa as coords REAIS de 4 vistas (VENOUS_4VIEW_COORDS) e checa que
 * cada anotação cai na célula/vista certa, dentro dos limites, sem sobreposição.
 *
 * Rodar: ./node_modules/.bin/tsx packages/schemes/src/vascular/__tests__/venousAnnotations.manual.ts
 */
import { buildVenousAnnotations4 } from "../venousAnnotations";
import { VENOUS_4VIEW_COORDS } from "../venous4ViewCoords";
import type { MapaVenoso } from "../venousMap";

const W = VENOUS_4VIEW_COORDS.width;
const H = VENOUS_4VIEW_COORDS.height;
const colW = W / 4;
const rowH = H / 2;
// col index por vista (lateral,anterior,medial,posterior); row: direito=0, esquerdo=1
const COL = { lateral: 0, anterior: 1, medial: 2, posterior: 3 } as const;

function inCell(x: number, y: number, col: number, row: number): boolean {
  return x >= col * colW && x <= (col + 1) * colW && y >= row * rowH && y <= (row + 1) * rowH;
}

function baseMapa(anotacoes: MapaVenoso["anotacoes"]): MapaVenoso {
  return {
    lados: { direito: { avaliado: true, segmentos: {} }, esquerdo: { avaliado: true, segmentos: {} } },
    lesoes: [],
    perfurantes: [],
    tvp_presente: false,
    anotacoes,
  };
}

let fails = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log("  ✓", msg);
  else { console.error("  ✗ FALHOU:", msg); fails++; }
}

// Caso 1: calibre da magna à direita → rótulo na célula direito__medial
console.log("Caso 1: calibre safena_magna (direito) → célula medial");
{
  const layout = buildVenousAnnotations4(
    baseMapa([{ lado: "direito", tipo: "calibre", texto: "5,8 mm", segmento: "safena_magna" }]),
    VENOUS_4VIEW_COORDS,
  );
  assert(layout.labels.length === 1, "1 rótulo");
  const l = layout.labels[0]!;
  assert(l.texto === "5,8 mm", "texto correto");
  assert(inCell(l.anchor[0], l.anchor[1], COL.medial, 0), "âncora na célula direito__medial");
  assert(inCell(l.textPos[0], l.textPos[1], COL.medial, 0), "texto dentro da célula medial");
  assert(Math.abs(l.textPos[0] - l.anchor[0]) >= 26, "texto afastado do vaso (não sobrepõe)");
}

// Caso 2: perfurante à esquerda → rótulo na célula esquerdo__posterior
console.log("\nCaso 2: perfurante panturrilha (esquerdo) → célula posterior");
{
  const layout = buildVenousAnnotations4(
    baseMapa([{ lado: "esquerdo", tipo: "perfurante", texto: "Ø 3,3 mm", topografia: "panturrilha" }]),
    VENOUS_4VIEW_COORDS,
  );
  assert(layout.labels.length === 1, "1 rótulo");
  const l = layout.labels[0]!;
  assert(inCell(l.anchor[0], l.anchor[1], COL.posterior, 1), "âncora na célula esquerdo__posterior");
  assert(l.anchor[1] > rowH + rowH * 0.5, "perfurante panturrilha na metade inferior da perna");
}

// Caso 3: parva → célula posterior; magna+parva no mesmo lado sem overlap
console.log("\nCaso 3: magna + parva (direito) → medial e posterior, sem overlap");
{
  const layout = buildVenousAnnotations4(
    baseMapa([
      { lado: "direito", tipo: "calibre", texto: "6,0 mm", segmento: "safena_magna" },
      { lado: "direito", tipo: "calibre", texto: "3,0 mm", segmento: "safena_parva" },
    ]),
    VENOUS_4VIEW_COORDS,
  );
  assert(layout.labels.length === 2, "2 rótulos");
  const magna = layout.labels.find((l) => l.texto === "6,0 mm")!;
  const parva = layout.labels.find((l) => l.texto === "3,0 mm")!;
  assert(inCell(magna.anchor[0], magna.anchor[1], COL.medial, 0), "magna na medial");
  assert(inCell(parva.anchor[0], parva.anchor[1], COL.posterior, 0), "parva na posterior");
}

// Caso 4: anotação de segmento sem coords (femoral) → omitida
console.log("\nCaso 4: segmento sem coords → omitido");
{
  const layout = buildVenousAnnotations4(
    baseMapa([{ lado: "direito", tipo: "calibre", texto: "9 mm", segmento: "femoral" }]),
    VENOUS_4VIEW_COORDS,
  );
  assert(layout.labels.length === 0, "0 rótulos (femoral não é desenhada)");
}

// Caso 5: sem anotações → vazio
console.log("\nCaso 5: mapa sem anotações → vazio");
{
  const layout = buildVenousAnnotations4(baseMapa([]), VENOUS_4VIEW_COORDS);
  assert(layout.labels.length === 0, "0 rótulos");
}

console.log(fails === 0 ? "\n✅ TODOS OS CASOS PASSARAM" : `\n❌ ${fails} ASSERT(S) FALHARAM`);
process.exit(fails === 0 ? 0 : 1);
