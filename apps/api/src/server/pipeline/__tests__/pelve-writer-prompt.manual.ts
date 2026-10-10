/**
 * Golden PURO do prompt do PELVE writer_guarded (sem LLM). Garante que o prompt base
 * carrega o roteiro da casa (4 vias + regras críticas) e que os few-shots cobrem os
 * padrões que não podem regredir (menopausa, anti-líquido-livre, FIGO, pós-abort).
 * Rodar: tsx src/server/pipeline/__tests__/pelve-writer-prompt.manual.ts
 */
import { buildPelveWriterSystemMessage } from "../../renderer/categories/PELVE_FEMININA";
import { PELVE_FEWSHOTS } from "../../renderer/categories/pelveFewshots";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}`); }
}
const p = buildPelveWriterSystemMessage();

// Vias e títulos.
check("via TA+TV com título", /ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL E TRANSVAGINAL/.test(p));
check("via TV com título", /ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL/.test(p));
check("via TA com título + obs endométrio limitado", /ULTRASSONOGRAFIA DA PELVE TRANSABDOMINAL\b/.test(p) && /avaliação do endométrio é limitada pela via transabdominal/.test(p));
check("COMENTÁRIOS 4.0 MHz e 6.5 MHz", /transdutor de 4\.0 MHz/.test(p) && /transdutor de 6\.5 MHz/.test(p));

// Ordem do corpo + frases canônicas.
check("bexiga só com via TA", /Bexiga \(só com via transabdominal\)/.test(p));
check("miométrio normal", /Miométrio com ecogenicidade e ecotextura normais/.test(p));
check("ovário normal 'imagens anecoicas'", /apresentando imagens anecoicas/.test(p));

// Regras críticas (a preservar do renderer).
check("MENOPAUSA: poucas imagens anecoicas", /poucas imagens anecoicas/.test(p));
check("MENOPAUSA: praticamente sem folículos", /ambos praticamente sem fol[íi]culos/.test(p));
check("MENOPAUSA: faixa etária da menopausa", /faixa etária da menopausa/.test(p));
check("ANTI-LÍQUIDO-LIVRE: coleção ovariana não vira líquido livre", /nunca "líquido livre"/.test(p));
check("FIGO footer", /FIGO: Federação Internacional de Ginecologia e Obstetrícia/.test(p));
check("Naboth", /Cistos de Naboth/.test(p));
check("DIU normoposicionado", /Dispositivo intrauterino \(D\.I\.U\.\) normoposicionado/.test(p));
check("istmocele → nicho de cicatriz cesárea", /Nicho de cicatriz cesárea/.test(p));
check("pós-aborto → produtos retidos", /produtos retidos da concepção/.test(p));
check("volume ditado, não recalcular", /volume ditado, sem recalcular/.test(p));
check("comandos são instruções", /Comandos \(.*\) são instruções: execute, nunca transcreva/.test(p));
check("não drope nada / silêncio = normal", /Não drope nada ditado/.test(p) && /Estrutura não citada = normal/.test(p));
check("vírgula decimal", /vírgula decimal/.test(p));

// Few-shots: cobertura dos padrões.
check("few-shots: ≥6 pares", PELVE_FEWSHOTS.length >= 6);
check("few-shots: todo laudo tem os cabeçalhos da casa", PELVE_FEWSHOTS.every((f) =>
  /^ULTRASSONOGRAFIA/.test(f.laudo) && f.laudo.includes("COMENTÁRIOS:") &&
  f.laudo.includes("OS SEGUINTES ASPECTOS FORAM OBSERVADOS:") && f.laudo.includes("CONCLUSÃO:")));
check("few-shots: caso menopausa (praticamente sem folículos)", PELVE_FEWSHOTS.some((f) =>
  /menopausa/i.test(f.raw) && /praticamente sem folículos/.test(f.laudo)));
check("few-shots: caso O-RADS/anti-líquido-livre (sem 'líquido livre' no laudo)", PELVE_FEWSHOTS.some((f) =>
  /O-RADS 2/.test(f.laudo) && !/líquido livre/i.test(f.laudo)));
check("few-shots: caso FIGO (mioma)", PELVE_FEWSHOTS.some((f) => /categoria FIGO/.test(f.laudo)));
check("few-shots: caso pós-abortamento", PELVE_FEWSHOTS.some((f) => /produtos retidos/.test(f.laudo)));
check("few-shots: TV puro (sem bexiga)", PELVE_FEWSHOTS.some((f) =>
  /^ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL/.test(f.laudo) && !/Bexiga/.test(f.laudo)));

// W10a (10/10/2026): padrão real dos laudos finais e defeitos da revisão.
check("técnica TV sem '06 fotos'", /pela técnica transvaginal\. A documentação fotográfica foi obtida segundo protocolo/.test(p) && !/06 fotos/.test(p));
check("ovários 'e o esquerdo {Y} cm³' (sem 'com')", /e o esquerdo \{Y\} cm³/.test(p) && !/e o esquerdo com/.test(p));
check("medida não ditada: nunca 0,0 nem ____, usa [REVISAR]", /nunca "0,0" nem "____"/.test(p) && /\[REVISAR:/.test(p));
check("endométrio normal só com espessura ditada", /Com espessura ditada: "O endométrio tem espessura normal/.test(p));
check("legenda FIGO uma vez e sem número", /uma vez e sem número: "FIGO: Federação/.test(p));
check("título de contagem de folículos", /PARA CONTAGEM DE FOLÍCULOS/.test(p));
check("unidade ditada (saco gestacional em mm)", /saco gestacional e folículos costumam vir em mm/.test(p));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
