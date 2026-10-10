/**
 * Teste manual do guard de volume.
 * Rodar: npx tsx src/server/pipeline/__tests__/volumeGuard.manual.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyVolumePolicy, requestedVolumeCalc } from "../volumeGuard";
import { GLOBAL_RULES_BLOCK, GLOBAL_RULES_LEAN, VOLUME_CALCULO_RULE } from "../../prompts/global";

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
};

// ── Detecção de pedido ──
check("pede: 'calcule o volume'", requestedVolumeCalc("calcule o volume da tireoide"));
check("pede: 'me dá o volume'", requestedVolumeCalc("me dá o volume dos lobos"));
check("pede: 'qual o volume'", requestedVolumeCalc("qual o volume da tireoide?"));
check("NÃO pede: exame normal", !requestedVolumeCalc("tireoide de aspecto normal, sem nódulos"));
check("NÃO pede: cita volume ditado", !requestedVolumeCalc("lobo direito 4x2x1,5, volume 6 ml"));

// ── Padrão: NUNCA calcular (não pediu, não mencionou volume) ──
const inlineComputed = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de 6,2 ml), normal.";
check(
  "padrão: zera volume inline inventado → ____",
  applyVolumePolicy(inlineComputed, "tireoide normal sem nódulos").includes("(volume de ____ ml)"),
  applyVolumePolicy(inlineComputed, "tireoide normal sem nódulos"),
);
const pelveConc = "1) Útero de volume normal (57,9 cm³).";
check(
  "padrão: zera volume da conclusão pélvica → ____",
  applyVolumePolicy(pelveConc, "útero 7,2 por 4,1 por 3,8, ovários normais").includes("(____ cm³)"),
  applyVolumePolicy(pelveConc, "útero 7,2 por 4,1 por 3,8, ovários normais"),
);

// ── On request: calcula determinístico ──
const inlinePlaceholder = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de ____ ml), normal.";
const calcd = applyVolumePolicy(inlinePlaceholder, "tireoide, calcule o volume dos lobos");
check("on-request: 4×2×1,5×0,52 = 6,2 ml", /\(volume de 6,2 ml\)/.test(calcd), calcd);
const comPor = "Lobo esquerdo medindo 5 por 2 por 3 cm (volume de ____ ml).";
const calcdPor = applyVolumePolicy(comPor, "calcular o volume");
check("on-request com 'por': 5×2×3×0,52 = 15,6 ml", /\(volume de 15,6 ml\)/.test(calcdPor), calcdPor);
// recomputa mesmo se o LLM já tinha posto um número
const inlineWrong = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de 99 ml).";
check(
  "on-request recomputa valor errado do LLM",
  /\(volume de 6,2 ml\)/.test(applyVolumePolicy(inlineWrong, "calcule o volume")),
);

// ── On request: total da glândula = soma dos lobos (não o número errado do LLM) ──
const tireoideCompleta = `Lobo direito medindo 4 x 2 x 1,5 cm (volume de ____ ml).
Lobo esquerdo medindo 4,2 x 2,1 x 1,6 cm (volume de ____ ml).
Tireoide de volume normal (26,11 ml), sem nódulos.`;
const tcalc = applyVolumePolicy(tireoideCompleta, "calcule o volume dos lobos");
check("on-request: lobos 6,2 e 7,3", /6,2 ml/.test(tcalc) && /7,3 ml/.test(tcalc), tcalc);
// Soma dos volumes exibidos (6,2 + 7,3), como no renderer da tireoide (W10c, 10/10).
check(
  "on-request: total = soma dos lobos exibidos (13,5), não o 26,11 do LLM",
  /volume normal \(13,5 ml\)/.test(tcalc),
  tcalc,
);

// ── Médico ditou volume (mencionou, não pediu cálculo) → não mexe ──
const dictated = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de 6 ml).";
check(
  "ditou volume: preserva (não zera nem recalcula)",
  applyVolumePolicy(dictated, "lobo direito 4x2x1,5, volume de 6 ml") === dictated,
);

// ── Decisão do Luiz 10/10 (rodada 2): "calcule o volume" ──
check("pede: 'calcule pelas medidas' depois de volume", requestedVolumeCalc("com volume aumentado (calcule pelas medidas que forneci)"));
check("pede: 'cálculo do volume'", requestedVolumeCalc("faça o cálculo do volume do istmo"));
check("NÃO pede: 'não calcule o volume'", !requestedVolumeCalc("lobo direito 4 x 2 x 1,5, não calcule o volume"));
check("NÃO pede: 'sem calcular volume'", !requestedVolumeCalc("útero 7 x 4 x 3, sem calcular volume"));

// Exemplo da decisão: lobos com volume ditado, istmo calculado, VT = V1 + V2 + istmo.
const ditadoDecisao =
  "lobo direito medindo 4,1 x 1,6 x 1,8 com volume de 6,0, lobo esquerdo medindo 4,0 x 1,5 x 1,7 com volume de 5,5, istmo medindo 2,0 x 0,4 x 1,5, calcule o volume";
const laudoDecisao = `Lobo direito medindo 4,1 x 1,6 x 1,8 cm (volume de 6,0 ml), de ecogenicidade e ecotextura normais.
Lobo esquerdo medindo 4,0 x 1,5 x 1,7 cm (volume de 5,5 ml), de ecogenicidade e ecotextura normais.
Istmo medindo 2,0 x 0,4 x 1,5 cm (volume de 0,7 ml), de ecogenicidade e ecotextura normais.
Tireoide de volume normal (11,5 ml), sem evidência de alteração ecotextural ou de imagem nodular.`;
const dec = applyVolumePolicy(laudoDecisao, ditadoDecisao);
check("decisão: lobo direito ditado (6,0) não é recalculado (seria 6,1)", dec.includes("(volume de 6,0 ml)"), dec);
check("decisão: lobo esquerdo ditado (5,5) não é recalculado (seria 5,3)", dec.includes("(volume de 5,5 ml)"), dec);
check("decisão: istmo 2,0 x 0,4 x 1,5 x 0,52 = 0,6", dec.includes("Istmo medindo 2,0 x 0,4 x 1,5 cm (volume de 0,6 ml)"), dec);
check("decisão: VT = 6,0 + 5,5 + 0,6 = 12,1", dec.includes("Tireoide de volume normal (12,1 ml)"), dec);

// Writer completo (abdome): conta errada do LLM vira a do código, uma casa decimal.
const abd = applyVolumePolicy(
  "Rim direito apresentando imagem anecoica medindo 3,0 x 2,0 x 1,5 cm (volume de 4,8 cm³), no polo superior.",
  "rim direito com cisto de 3 por 2 por 1,5 cm no polo superior, calcule o volume do cisto",
);
check("abdome: 3,0 x 2,0 x 1,5 x 0,52 = 4,7 (o LLM pôs 4,8)", abd.includes("(volume de 4,7 cm³)"), abd);
const umaCasa = applyVolumePolicy("Imagem medindo 4 x 2,4 x 1 cm (volume de 5 cm³).", "calcule o volume");
check("uma casa decimal sempre: 4,992 → 5,0", umaCasa.includes("(volume de 5,0 cm³)"), umaCasa);
const comVirgula = applyVolumePolicy(
  "Coleção medindo 5,0 x 3,0 x 2,0 cm, com volume aproximado de 16 cm³.",
  "coleção de 5 por 3 por 2, calcule o volume",
);
check("forma ', com volume aproximado de' também é ligada às medidas (15,6)", comVirgula.includes("com volume aproximado de 15,6 cm³"), comVirgula);

// O mesmo valor na conclusão acompanha; conclusão sem volume no corpo liga pelo nome da estrutura.
const pelve1 = applyVolumePolicy(
  "Útero em retroversão, medindo 5,9 x 4,0 x 3,8 cm (volume de 47,0 cm³).\n\nCONCLUSÃO:\n1) Útero de volume normal (47,0 cm³).",
  "útero em retroversão medindo 5,9 x 4,0 x 3,8, calcule o volume do útero",
);
check("pelve: corpo e conclusão com 46,6", (pelve1.match(/46,6 cm³/g) ?? []).length === 2, pelve1);
const pelve2 = applyVolumePolicy(
  "Útero em retroversão, de contornos regulares, medindo 5,9 x 4,0 x 3,8 cm.\n\nCONCLUSÃO:\n2) Útero de volume normal (47,0 cm³).",
  "útero em retroversão medindo 5,9 x 4,0 x 3,8, calcule o volume do utero",
  { soPedido: true },
);
check("pelve (caso real 8b72f549): só conclusão → 46,6 pelos eixos do corpo", pelve2.includes("Útero de volume normal (46,6 cm³)"), pelve2);

// Volume ditado de uma estrutura fica; a outra, pedida, é calculada (caso real c3ffcd46).
const pelve3 = applyVolumePolicy(
  "Útero em anteversão, medindo 9,9 x 3,8 x 5,1 cm (volume de 103,7 cm³).\nImagem anecoica com finos septos, medindo 10,6 x 6,4 x 10,8 cm (volume aproximado de 384,8 cm³).",
  "Utero em anteversão medindo 9.9 por 3.8 por 5.1 com volume de 103.7. imagem anecoica com finos septos, medindo 10.6 x 6.4 x 10.8 cm, com volume aumentado (calcule pelas medidas que forneci)",
  { soPedido: true },
);
check("ditado 103,7 fica (0,52 daria 99,8)", pelve3.includes("(volume de 103,7 cm³)"), pelve3);
check("pedido: 10,6 x 6,4 x 10,8 x 0,52 = 381,0", pelve3.includes("(volume aproximado de 381,0 cm³)"), pelve3);

// Volume sem 3 eixos ao lado nem estrutura com eixos: fica como está.
const bexiga = "Volume pré-miccional de 453 mL.\nPróstata de volume aumentado (peso aproximado de 35,7 gramas).";
check("sem eixos ligáveis: nada muda", applyVolumePolicy(bexiga, "calcule o volume da próstata, volume pré-miccional de 453") === bexiga);

// Writers dedicados: sem pedido, o guard não mexe (nem zera).
const pmInventado = "Imagem cística medindo 2,0 x 1,0 x 1,0 cm (volume de 1,0 cm³).";
check("dedicado sem pedido: não mexe", applyVolumePolicy(pmInventado, "cisto de 2 por 1 por 1", { soPedido: true }) === pmInventado);
check("writer completo sem pedido: zera como hoje", applyVolumePolicy(pmInventado, "cisto de 2 por 1 por 1").includes("(volume de ____ cm³)"));
// Pedido negado não calcula.
const negado = "Lobo direito medindo 4 x 2 x 1,5 cm (volume de ____ ml).";
check("'não calcule o volume': slot fica", applyVolumePolicy(negado, "lobo direito 4 x 2 x 1,5, não calcule o volume").includes("____"));

// ── Regra do prompt: uma só, no global enxuto e nos writers dedicados ──
check("regra: 0,52, uma casa, só com pedido", /0,52/.test(VOLUME_CALCULO_RULE) && /uma casa decimal/.test(VOLUME_CALCULO_RULE) && /Só calcule quando o médico pedir/.test(VOLUME_CALCULO_RULE));
check("global enxuto (writer completo) carrega a regra", GLOBAL_RULES_LEAN.includes(VOLUME_CALCULO_RULE));
check("bloco obstétrico antigo intocado (sem a regra nova)", !GLOBAL_RULES_BLOCK.includes(VOLUME_CALCULO_RULE));
for (const w of ["pelveWriter", "mskWriter", "partesMolesWriter", "dopplerRenalWriter"]) {
  const src = readFileSync(join(__dirname, "..", `${w}.ts`), "utf8");
  check(`writer dedicado ${w} carrega a regra`, src.includes("${VOLUME_CALCULO_RULE}"));
}

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
