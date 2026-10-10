/**
 * W10c (10/10/2026) — ajustes medidos na bancada de mama e tireoide; casos sintéticos, sem LLM.
 * Rodar: pnpm exec tsx src/server/renderer/__tests__/w10c-mama-tireoide.manual.ts
 */
import assert from "node:assert/strict";
import { F as T, L, N } from "./tireoide-objetivo-fixtures";
import { renderTireoide } from "../categories/TIREOIDE";
import { getCategoryContract } from "../../prompts/contracts";
import { MAMARIA_CONTRACT, MAMARIA_MODELO_BASE } from "../../prompts/contracts/MAMARIA";

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
  assert.match(MAMARIA_CONTRACT, /O nome do exame na tela \("Mamas e axilas"\) não conta\./);
});
test("mama: estilo objetivo continua recebendo o contrato convertido", () => {
  const obj = getCategoryContract("MAMARIA", "OBJETIVO");
  assert.ok(obj && /MODELO BASE OBJETIVO/.test(obj));
});

console.log(`\n${total} verificações W10c passaram.`);
