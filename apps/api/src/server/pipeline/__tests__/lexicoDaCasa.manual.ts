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
igual("ecogênico sozinho sem categoria", "material ecogênico endoluminal");
igual("isoecoico", "nódulo isoecoico ao parênquima");

// "ecogênico" sozinho → "hiperecoico" (Luiz 10/10), fora a obstetrícia e o golf ball
eq("foco ecogênico", "foco ecogênico na parede", "foco hiperecoico na parede", "VIAS_URINARIAS");
eq("material ecogênico", "com material ecogênico heterogêneo", "com material hiperecoico heterogêneo", "MUSCULOESQUELETICO_V2");
eq("hilo ecogênico", "com hilo ecogênico preservado", "com hilo hiperecoico preservado", "CERVICAL");
eq("centro ecogênico", "centro ecogênico definido", "centro hiperecoico definido", "CERVICAL");
eq("debris ecogênicos", "com debris ecogênicos no interior", "com debris hiperecoicos no interior", "ABDOMEN_TOTAL");
eq("parede ecogênica", "Parede espessada/ecogênica.", "Parede espessada/hiperecoica.", "DOPPLER_VENOSO_MMII");
eq("Ecogênicas maiúscula", "Ecogênicas e móveis.", "Hiperecoicas e móveis.", "ABDOMEN_TOTAL");
eq("ECOGÊNICO título", "MATERIAL ECOGÊNICO", "MATERIAL HIPERECOICO", "ABDOMEN_TOTAL");
eq("sem acento", "foco ecogenico", "foco hiperecoico", "PELVE_FEMININA");
igual("golf ball fora da obstetrícia", "foco ecogênico intracardíaco", "ABDOMEN_TOTAL");
igual("golf ball plural", "focos ecogênicos intracardíacos", "PELVE_FEMININA");
igual("obstetrícia: golf ball sem 'intracardíaco'", "Foco ecogênico no ventrículo esquerdo, medindo 0,2 cm.", "OBSTETRICA");
igual("morfológico", "Foco ecogênico intracardíaco no ventrículo esquerdo.", "MORFOLOGICO");
igual("doppler obstétrico", "foco ecogênico", "DOPPLER_OBSTETRICO");
igual("comparativo mais", "fígado mais ecogênico que o baço", "ABDOMEN_TOTAL");
igual("comparativo pouco", "conteúdo pouco ecogênico", "ABDOMEN_TOTAL");
igual("ecogenicidade", "ecogenicidade aumentada", "ABDOMEN_TOTAL");
eq("prefixado continua", "focos hiperecogênicos", "focos hiperecoicos", "OBSTETRICA");
eq("caixa alta prefixado", "MATERIAL HIPOECOGÊNICO", "MATERIAL HIPOECOICO", "DOPPLER_VENOSO_MMII");

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

// "bolsa" → "bursa" no MSK (Luiz 10/10)
eq("bolsa MSK", "Bolsa subacromial subdeltoidea com líquido", "Bursa subacromial-subdeltoidea com líquido", "MUSCULOESQUELETICO_V2");
eq("bolsa suprapatelar", "Pequeno derrame na bolsa suprapatelar.", "Pequeno derrame na bursa suprapatelar.", "MUSCULOESQUELETICO_V2");
eq("bolsas sinoviais", "as bolsas sinoviais radial e ulnar não", "as bursas sinoviais radial e ulnar não", "MUSCULOESQUELETICO");
eq("BOLSA caixa alta", "BOLSA RETROCALCÂNEA", "BURSA RETROCALCÂNEA", "MUSCULOESQUELETICO_V2");
igual("bolsa escrotal", "Ultrassonografia da bolsa escrotal", "ESCROTAL");
igual("bolsa vertical", "maior bolsa vertical mede 4,4 cm", "OBSTETRICA");
igual("bolsa de Blake", "cisto da bolsa de Blake", "MORFOLOGICO");
igual("bolsa escrotal no abdome", "estendendo-se para a bolsa escrotal", "ABDOMEN_TOTAL");
igual("bolsonaro não é bolsa", "embolsado e bolsão", "MUSCULOESQUELETICO_V2");

// "modificação do padrão ecotextural" no MSK (Luiz 10/10)
eq("alteração do padrão", "Tendão com alteração do padrão ecotextural.", "Tendão com modificação do padrão ecotextural.", "MUSCULOESQUELETICO_V2");
eq("alteração ecotextural", "discreto espessamento e alteração ecotextural, sem sinais de rotura", "discreto espessamento e modificação do padrão ecotextural, sem sinais de rotura", "MUSCULOESQUELETICO_V2");
eq("da ecotextura", "com espessamento e alteração da ecotextura", "com espessamento e modificação do padrão ecotextural", "MUSCULOESQUELETICO");
eq("no padrão", "alteração no padrão ecotextural", "modificação do padrão ecotextural", "MUSCULOESQUELETICO_V2");
eq("adjetivo no meio", "Alteração difusa do padrão ecotextural", "Modificação difusa do padrão ecotextural", "MUSCULOESQUELETICO_V2");
eq("plural", "alterações ecotexturais nos tendões", "modificações do padrão ecotextural nos tendões", "MUSCULOESQUELETICO_V2");
eq("sem alteração", "sem alteração ecotextural ou de espessura", "sem modificação do padrão ecotextural ou de espessura", "MUSCULOESQUELETICO_V2");
igual("já certa", "modificação do padrão ecotextural", "MUSCULOESQUELETICO_V2");
igual("tireoide fica", "sem evidência de alteração ecotextural ou de imagem nodular", "TIREOIDE");
igual("alteração de outra coisa", "alteração do padrão fibrilar", "MUSCULOESQUELETICO_V2");

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
// rollback por entrada
assert.equal(aplicarLexico("bolsa suprapatelar", { categoria: "MUSCULOESQUELETICO_V2", camada: "saida", desligadas: new Set(["bolsa-para-bursa"]) }).texto, "bolsa suprapatelar"); ok++;
assert.equal(aplicarLexico("foco ecogênico", { categoria: "ABDOMEN_TOTAL", camada: "ditado", desligadas: new Set(["ecogenico-sozinho"]) }).texto, "foco ecogênico"); ok++;
// trocas auditáveis
const r = aplicarLexico("imagem anecóica no quadrante super lateral", { categoria: "MAMARIA", camada: "saida" });
assert.deepEqual(r.trocas.map((x) => x.id), ["ecoico-sem-acento", "quadrante-mama-grafia"]); ok++;
// idempotência: aplicar duas vezes = uma
for (const e of LEXICO_DA_CASA) void e;
const amostra = "Imagem anecóica, quadrante super lateral, 4º compartimento, segmento 4, bolsa subacromial subdeltoidea, " +
  "foco ecogênico, alteração ecotextural.";
for (const c of ["MAMARIA", "MUSCULOESQUELETICO_V2", "ABDOMEN_TOTAL", "OBSTETRICA"]) {
  const uma = t(amostra, c);
  assert.equal(t(uma, c), uma, `idempotente ${c}`); ok++;
}

console.log(`léxico da casa: ${ok} verificações passaram (${LEXICO_DA_CASA.length} entradas).`);
