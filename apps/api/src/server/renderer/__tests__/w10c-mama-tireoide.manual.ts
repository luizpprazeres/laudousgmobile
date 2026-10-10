/**
 * W10c (10/10/2026) — ajustes medidos na bancada de mama e tireoide; casos sintéticos, sem LLM.
 * Rodar: pnpm exec tsx src/server/renderer/__tests__/w10c-mama-tireoide.manual.ts
 */
import assert from "node:assert/strict";
import { F as T, L, N } from "./tireoide-objetivo-fixtures";
import { renderTireoide } from "../categories/TIREOIDE";
import { getCategoryContract } from "../../prompts/contracts";
import { MAMARIA_CONTRACT, MAMARIA_MODELO_BASE } from "../../prompts/contracts/MAMARIA";
import { buildSystemMessage } from "../../prompts/buildSystemMessage";
import { TIREOIDE_EXTRACTION_PROMPT } from "../categories/TIREOIDE";

let total = 0;
function test(name: string, fn: () => void) {
  fn();
  total++;
  console.log(`✓ ${name}`);
}

// Tireoide — localização sem preposição (o Haiku extrator omite o "no").
test("tireoide: 'terço médio' extraído sem preposição sai 'situada no terço médio'", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: "isoecoica", localizacao: "terço médio" })] }) }));
  assert.match(out, /situada no terço médio/);
  assert.match(out, /imagem isoecoica no terço médio com NOTA FINAL/);
  assert.doesNotMatch(out, /situada terço/);
});
test("tireoide: localização já preposicionada fica intacta", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: "isoecoica", localizacao: "no terço inferior" })] }) }));
  assert.match(out, /situada no terço inferior/);
  assert.doesNotMatch(out, /no no terço/);
});
test("tireoide: objetivo também recebe a preposição", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: "isoecoica", localizacao: "terço superior" })] }) }), undefined, { objetivo: true });
  assert.doesNotMatch(out, /situad[oa] terço/);
});

// Tireoide — TI-3: rodapé do escore só com imagem nodular.
test("tireoide: sem imagem nodular, sem rodapé de Domingos/ACR", () => {
  const out = renderTireoide(T({}));
  assert.doesNotMatch(out, /Domingos Correia da Rocha|American College of Radiology/);
  assert.match(out, /CONCLUSÃO:\n[^\n]+$/);
});
test("tireoide: com imagem nodular, rodapé mantido", () => {
  const out = renderTireoide(T({ lobo_esquerdo: L({ nodulos: [N({ ecogenicidade: "anecoica_finos_ecos" })] }) }));
  assert.match(out, /Domingos Correia da Rocha/);
  assert.match(out, /ACR - American College of Radiology\*$/);
});

// Mama — contrato do writer completo (W10c).
test("mama: contrato sem '06 fotos' e com a frase de documentação dos finais", () => {
  for (const txt of [MAMARIA_CONTRACT, MAMARIA_MODELO_BASE]) {
    assert.doesNotMatch(txt, /\d+ fotos/);
    assert.match(txt, /A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias\./);
  }
});
test("mama: contrato ensina 'de mama' no corpo, conclusão da casa e BI-RADS 1 do normal", () => {
  assert.match(MAMARIA_CONTRACT, /Imagem \[eco\] de mama \[lado\]/);
  assert.match(MAMARIA_CONTRACT, /"Cisto simples em mama direita\."/);
  assert.match(MAMARIA_CONTRACT, /"Imagem sólida em mama direita no quadrante superolateral\."/);
  assert.match(MAMARIA_CONTRACT, /Mamas ecograficamente normais \(Categoria BI-RADS® 1\)\./);
  assert.match(MAMARIA_CONTRACT, /Imagens ovais, com a periferia hipoecoica e o centro hiperecoico, nas axilas\./);
});
test("mama: rodapé BI-RADS também no laudo colado", () => {
  assert.match(MAMARIA_CONTRACT, /Este rodapé fecha todo laudo de mama, inclusive o laudo pronto colado pelo médico\./);
});
test("mama: o nome do exame ('Mamas e axilas') não pede axilas", () => {
  assert.match(MAMARIA_CONTRACT, /O nome do exame na tela \("Mamas e axilas"\) e um "e" solto no ditado \("mamas e com imagens"\) não contam\./);
});
test("mama: estilo objetivo continua recebendo o contrato convertido", () => {
  const obj = getCategoryContract("MAMARIA", "OBJETIVO");
  assert.ok(obj && /MODELO BASE OBJETIVO/.test(obj));
});

// W14 — achados da revisão independente (W13), cenários sintéticos.
const sysMama = buildSystemMessage({ categoryCode: "MAMARIA", categoryLabel: "Mamas", writingStyleCode: "CLASSICO_COMPLETO", ragBlocks: [], inputMode: "raw" });
test("A05: exclusão explícita de axilas vence a mera menção", () => {
  assert.match(MAMARIA_CONTRACT, /Não, ou as exclui \("sem axilas", "só mamas", "axilas não avaliadas"\)/);
});
test("AXILA: axilas citadas sem achado = normais, com o item na conclusão", () => {
  assert.match(MAMARIA_CONTRACT, /"Linfonodos axilares normais\." como último item da conclusão \(axilas citadas sem achado = normais\)/);
});
test("A05: axila alterada não recebe a frase normal", () => {
  assert.match(MAMARIA_CONTRACT, /Exceção, só com alteração axilar ditada .*: a descrição ditada substitui a frase axilar daquela axila e vira item próprio da conclusão, sem "Linfonodos axilares normais\." para ela\./);
});
test("A06: system da mama não manda trocar margem por 'circunscrita'", () => {
  assert.doesNotMatch(sysMama, /sempre "circunscritas"/);
  assert.match(sysMama, /circunscrita, lobulada, microlobulada, irregular ou espiculada; "regular" ditado = circunscrita/);
});
test("A07 (decisão do Luiz 10/10): '2 9 cm' = 2,9 cm sem marca; só eixo faltando ou achado sem unidade é sinalizado", () => {
  assert.match(MAMARIA_CONTRACT, /algarismos separados antes da unidade \("2 9 cm"\) → 2,9 cm, sem marca/);
  assert.doesNotMatch(MAMARIA_CONTRACT, /sem unidade → cm/);
  assert.match(MAMARIA_CONTRACT, /Só o realmente ambíguo — eixo faltando \("medindo 1,2 x cm"\) ou achado sem cm\/mm em nenhuma das suas medidas: reproduza como falado e marque "\[REVISAR — medida ambígua\]"/);
});
test("A07: mama normal continua BI-RADS 1 no system efetivo", () => {
  assert.match(sysMama, /Mamas ecograficamente normais \(Categoria BI-RADS® 1\)\./);
});
test("A12: extração não converte 'com áreas' incompleto em áreas anecoicas", () => {
  assert.doesNotMatch(TIREOIDE_EXTRACTION_PROMPT, /ou só "… com áreas"/);
  assert.match(TIREOIDE_EXTRACTION_PROMPT, /"Com áreas" sem dizer de quê:\s+ecogenicidade null/);
});
test("A12: imagem sem ecogenicidade não ganha nota e a pendência aparece", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: null, margem: "regular", medidas_cm: [1.2, 0.8, 1.0], localizacao: "no terço médio", descricao_raw: "imagem isoecoica com áreas, com margem regular" })] }) }));
  assert.doesNotMatch(out, /NOTA FINAL/);
  assert.match(out, /imagem nodular no terço médio \[REVISAR — ecogenicidade não ditada\]/);
});
test("A12: nota ditada sem ecogenicidade não recebe a marca", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: null, nota_domingos_ditada: "3" })] }) }));
  assert.match(out, /NOTA FINAL 3/);
  assert.doesNotMatch(out, /ecogenicidade não ditada/);
});

// W14b — rodada 2 da revisão: a pendência do A12 não pode sumir quando há ACR.
test("A12 (rodada 2): sem ecogenicidade e com ACR TI-RADS ditado, a pendência aparece", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: null, margem: "regular", medidas_cm: [1.2, 0.8, 1.0], localizacao: "no terço médio", ti_rads_ditado: "3", descricao_raw: "imagem isoecoica com áreas, TI-RADS 3" })] }) }));
  assert.doesNotMatch(out, /NOTA FINAL/);
  assert.match(out, /ACR TI-RADS 3 \[REVISAR — ecogenicidade não ditada\]/);
});
test("A12 (rodada 2): sem ecogenicidade e com composição ACR extraída, a pendência aparece", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: null, medidas_cm: [1.2, 0.8, 1.0], acr_tirads: { composicao: "misto", ecogenicidade: "hiper_ou_isoecoico", forma: "mais_larga_que_alta", margem: "lisa", focos_ecogenicos: ["nenhum_ou_cauda_cometa"] } })] }) }));
  assert.doesNotMatch(out, /NOTA FINAL/);
  assert.match(out, /ACR TI-RADS \d \[REVISAR — ecogenicidade não ditada\]/);
});
test("A12 (rodada 2): com ecogenicidade, ACR sai sem a marca", () => {
  const out = renderTireoide(T({ lobo_direito: L({ nodulos: [N({ ecogenicidade: "isoecoica", ti_rads_ditado: "3" })] }) }));
  assert.match(out, /NOTA FINAL/);
  assert.doesNotMatch(out, /ecogenicidade não ditada/);
});

// Decisão do Luiz 10/10 — VT da tireoide sempre somado, com o istmo (exceção à regra de não calcular volume).
test("VT: soma lobo direito + lobo esquerdo + istmo", () => {
  const out = renderTireoide(T({ lobo_direito: L({ volume_ml: 3.6 }), lobo_esquerdo: L({ volume_ml: 2.8 }), istmo: L({ volume_ml: 0.1 }) }));
  assert.match(out, /Tireoide de volume normal \(6,5 ml\)/);
});
test("VT: istmo sem volume ditado não é estimado — VT fica em aberto", () => {
  const out = renderTireoide(T({ lobo_direito: L({ volume_ml: 3.6 }), lobo_esquerdo: L({ volume_ml: 2.8 }), istmo: L({ medidas_cm: [0.7, 0.2, 1.6], volume_ml: null }) }));
  assert.match(out, /Istmo medindo 0,7 x 0,2 x 1,6 cm \(volume de ____ ml\)/);
  assert.match(out, /Tireoide de volume normal \(____ ml\)/);
});
test("VT: objetivo também soma o istmo", () => {
  const out = renderTireoide(T({ lobo_direito: L({ volume_ml: 3.6 }), lobo_esquerdo: L({ volume_ml: 2.8 }), istmo: L({ volume_ml: 0.1 }) }), undefined, { objetivo: true });
  assert.match(out, /6,5 ml/);
});
test("VT: exceção documentada no contrato e no extrator", () => {
  assert.match(getCategoryContract("TIREOIDE", "CLASSICO_COMPLETO") ?? "", /exceção aprovada à regra geral de só calcular volume se o médico pedir: o VT da tireoide é sempre somado, com o istmo/);
  assert.match(TIREOIDE_EXTRACTION_PROMPT, /nunca calcule, nem com "calcule o volume" — o código calcula e soma o VT/);
});

console.log(`\n${total} verificações W10c passaram.`);
