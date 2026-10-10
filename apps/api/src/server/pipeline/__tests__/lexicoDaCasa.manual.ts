/**
 * Léxico da casa (W11): positivos E negativos por entrada, escopo por categoria e camada, flag.
 * Rodar (de apps/api): pnpm exec tsx src/server/pipeline/__tests__/lexicoDaCasa.manual.ts
 */
import assert from "node:assert/strict";
import { aplicarLexico, lexicoAtivo, LEXICO_DA_CASA } from "../lexicoDaCasa";

let ok = 0;
const t = (texto: string, categoria?: string, camada: "ditado" | "saida" = "saida") => aplicarLexico(texto, { categoria, camada }).texto;
function eq(nome: string, entrada: string, esperado: string, categoria?: string) {
  assert.equal(t(entrada, categoria), esperado, nome);
  ok++;
}
const igual = (nome: string, entrada: string, categoria?: string) => eq(`${nome} (não toca)`, entrada, entrada, categoria);

// ecoico sem acento
eq("anecóica", "Imagem anecóica, homogênea.", "Imagem anecoica, homogênea.");
eq("Anecóicas maiúscula", "Anecóicas no lobo.", "Anecoicas no lobo.");
eq("isoecóico", "nódulo isoecóico", "nódulo isoecoico");
eq("hiperecóicas", "imagens hiperecóicas", "imagens hiperecoicas");
igual("anecoica já certa", "Imagem anecoica.");

// -ecogênico → -ecoico
eq("hiperecogênicos", "focos hiperecogênicos", "focos hiperecoicos");
eq("hipoecogênica", "área hipoecogênica", "área hipoecoica");
eq("isoecogênico", "nódulo isoecogênico", "nódulo isoecoico");
igual("ecogenicidade", "aumento difuso da ecogenicidade parenquimatosa");
igual("ecogênico sozinho (decisão do Luiz)", "foco ecogênico intracardíaco");
igual("isoecoico", "nódulo isoecoico ao parênquima");

// quadrantes da mama
eq("super lateral", "situada no quadrante super lateral, às 10 horas", "situada no quadrante superolateral, às 10 horas", "MAMARIA");
eq("superlateral", "no quadrante superlateral", "no quadrante superolateral", "MAMARIA");
eq("súpero-lateral", "quadrante súpero-lateral", "quadrante superolateral", "MAMARIA");
eq("ínfero medial", "quadrante ínfero medial", "quadrante inferomedial", "MAMARIA");
eq("quadrante inferior lateral", "no quadrante inferior lateral da mama direita", "no quadrante inferolateral da mama direita", "MAMARIA");
eq("quadrantes superior medial", "união dos quadrantes superior medial", "união dos quadrantes superomedial", "MAMARIA");
igual("inferior lateral sem 'quadrante'", "porção inferior lateral do músculo", "MAMARIA");
igual("superolateral já certo", "quadrante superolateral", "MAMARIA");
igual("horário e BI-RADS", "às 10 horas, distando 2,1 cm (Categoria BI-RADS® 3)", "MAMARIA");
igual("fora da mama", "quadrante super lateral", "PARTES_MOLES");

// compartimentos (MSK)
eq("4º compartimento", "Tendões do 4º compartimento extensor", "Tendões do IV compartimento extensor", "MUSCULOESQUELETICO_V2");
eq("quarto compartimento", "tenossinovite do quarto compartimento extensor", "tenossinovite do IV compartimento extensor", "MUSCULOESQUELETICO_V2");
eq("lista 1º ao 6º", "do 1º ao 6º compartimentos extensores", "do I ao VI compartimentos extensores", "MUSCULOESQUELETICO_V2");
eq("Primeiro maiúsculo", "Primeiro compartimento extensor", "I compartimento extensor", "MUSCULOESQUELETICO_V2");
igual("quarto dedo", "tendão flexor do quarto dedo", "MUSCULOESQUELETICO_V2");
igual("IV já certo", "IV compartimento extensor", "MUSCULOESQUELETICO_V2");
igual("fora do MSK", "4º compartimento", "ABDOMEN_TOTAL");

// segmento hepático
eq("segmento 4", "imagem situada no segmento 4.", "imagem situada no segmento IV.", "ABDOMEN_TOTAL");
eq("segmentos 6 e 7", "nos segmentos 6 e 7 do fígado", "nos segmentos VI e VII do fígado", "ABDOMEN_TOTAL");
eq("segmento hepático oito", "segmento hepático oito", "segmento hepático VIII", "ABDOMEN_SUPERIOR");
igual("segmento com medida", "segmento 4 cm", "ABDOMEN_TOTAL");
igual("segmento decimal", "segmento 4,2 x 3,1 cm", "ABDOMEN_TOTAL");
igual("segmento de", "segmento de 4 cm da aorta", "ABDOMEN_TOTAL");
igual("segmento um", "segmento um pouco espessado", "ABDOMEN_TOTAL");
igual("fora do fígado", "segmento 4", "VIAS_URINARIAS");

// bursa
eq("sem hífen", "bursa subacromial subdeltoidea com líquido", "bursa subacromial-subdeltoidea com líquido");
eq("com 'e'", "bursa subacromial e subdeltoidea", "bursa subacromial-subdeltoidea");
eq("acento", "bursa subacromial-subdeltóidea", "bursa subacromial-subdeltoidea");
eq("bolsa preservada", "Bolsa subacromial subdeltoidea", "Bolsa subacromial-subdeltoidea");
igual("já certa", "bursa subacromial-subdeltoidea");

// metacarpofalangiana
eq("falangeana", "articulação metacarpofalangeana", "articulação metacarpofalangiana");
eq("metacarpo falangiana", "metacarpo falangianas", "metacarpofalangianas");
igual("já certa", "articulação metacarpofalangiana do segundo dedo");

// números e medidas intocados em qualquer categoria
for (const c of ["MAMARIA", "ABDOMEN_TOTAL", "MUSCULOESQUELETICO_V2", undefined]) {
  igual(`medidas ${c}`, "medindo 1,2 x 0,8 x 1,0 cm, TI-RADS 3, às 4 horas", c);
}

// camada e flag
assert.equal(aplicarLexico("4º compartimento", { categoria: "MUSCULOESQUELETICO_V2", camada: "ditado" }).texto, "IV compartimento"); ok++;
assert.equal(lexicoAtivo("MAMARIA", undefined), true); ok++;
assert.equal(lexicoAtivo("MAMARIA", ""), false); ok++;
assert.equal(lexicoAtivo("MAMARIA", "TIREOIDE,MAMARIA"), true); ok++;
assert.equal(lexicoAtivo("ABDOMEN_TOTAL", "TIREOIDE,MAMARIA"), false); ok++;
assert.equal(lexicoAtivo(undefined, "*"), true); ok++;
// trocas auditáveis
const r = aplicarLexico("imagem anecóica no quadrante super lateral", { categoria: "MAMARIA", camada: "saida" });
assert.deepEqual(r.trocas.map((x) => x.id), ["ecoico-sem-acento", "quadrante-mama-grafia"]); ok++;
// idempotência: aplicar duas vezes = uma
for (const e of LEXICO_DA_CASA) void e;
const amostra = "Imagem anecóica, quadrante super lateral, 4º compartimento, segmento 4, bursa subacromial subdeltoidea.";
for (const c of ["MAMARIA", "MUSCULOESQUELETICO_V2", "ABDOMEN_TOTAL"]) {
  const uma = t(amostra, c);
  assert.equal(t(uma, c), uma, `idempotente ${c}`); ok++;
}

console.log(`léxico da casa: ${ok} verificações passaram (${LEXICO_DA_CASA.length} entradas).`);
