/**
 * Golden PURO do prompt do PELVE writer_guarded (sem LLM). Garante que o prompt base
 * carrega o roteiro da casa (4 vias + regras críticas) e que os few-shots cobrem os
 * padrões que não podem regredir (menopausa, anti-líquido-livre, FIGO, pós-abort).
 * Rodar: tsx src/server/pipeline/__tests__/pelve-writer-prompt.manual.ts
 */
import { buildPelveWriterSystemMessage } from "../../renderer/categories/PELVE_FEMININA";
import { PELVE_FEWSHOTS } from "../../renderer/categories/pelveFewshots";
import { tabelaFigoParaPrompt } from "@laudousg/schemes";
import { WRITER_OUTPUT_RULE } from "../writerOutputGuard";

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
// W14 (revisão W13, A03): exemplo com mioma sem FIGO no ditado não pode trazer FIGO na saída.
check("few-shots: mioma presente", PELVE_FEWSHOTS.some((f) => /miomatos/.test(f.laudo)));
check("few-shots: FIGO só onde o ditado traz FIGO", PELVE_FEWSHOTS.every((f) => !/FIGO/.test(f.laudo) || /figo/i.test(f.raw)));
check("few-shots: caso pós-abortamento", PELVE_FEWSHOTS.some((f) => /produtos retidos/.test(f.laudo)));
check("few-shots: TV puro (sem bexiga)", PELVE_FEWSHOTS.some((f) =>
  /^ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL/.test(f.laudo) && !/Bexiga/.test(f.laudo)));

// W10a (10/10/2026): padrão real dos laudos finais e defeitos da revisão.
check("técnica TV sem '06 fotos'", /pela técnica transvaginal\. A documentação fotográfica foi obtida segundo protocolo/.test(p) && !/06 fotos/.test(p));
check("ovários 'e o esquerdo {Y} cm³' (sem 'com')", /e o esquerdo \{Y\} cm³/.test(p) && !/e o esquerdo com/.test(p));
// W14 (A02): dado não ditado omite a oração; [REVISAR] só para ditado ilegível/ambíguo.
check("dado não ditado: omite a oração, sem 0,0/____/[REVISAR] por falta", /omita a oração — nunca invente, nem "0,0", "____" ou \[REVISAR\] por falta/.test(p));
check("[REVISAR] só para ditado ilegível ou ambíguo", /\[REVISAR: …\] só para ditado ilegível ou ambíguo/.test(p));
check("eixos e volumes opcionais ([ ] = só se ditado)", /\[ \] = só se ditado/.test(p) && /Ovário \{direito\|esquerdo\}\[ medindo/.test(p) && /Útero de volume normal\[ \(\{V\} cm³\)\]/.test(p));
// W12: localização ↔ FIGO pela tabela única (@laudousg/schemes), nos dois sentidos; nada ditado → nada.
check("W12: tabela FIGO no prompt, da fonte única", p.includes(tabelaFigoParaPrompt()) && /5 = subseroso com mais de 50% intramural/.test(p));
check("W12: só a FIGO → localização; localização unívoca → FIGO; genérica → sem FIGO", /Só a FIGO ditada → a localização dela; só a localização, se for uma da tabela → a FIGO dela/.test(p) && /"subseroso" ou "submucoso" sem detalhe → sem FIGO/.test(p));
check("W12: incompatíveis → como ditadas + [REVISAR]", /incompatíveis \(ex\.: submucoso \+ FIGO 6\) \+ \[REVISAR: localização e FIGO não conferem\]/.test(p));
// Decisão do Luiz (10/10): vizinhas (4↔5, 5↔6…) ficam como ditadas, sem aviso.
check("FIGO2: vizinhas como ditadas, sem aviso", /as duas ditadas → como ditadas: vizinhas \(FIGO adjacente à da localização, ex\.: "intramural \(categoria FIGO 5\)"\) sem aviso/.test(p));
check("W12: nada ditado → nenhuma das duas", /nada ditado → nenhuma das duas/.test(p));
check("miomas M1/M2: vários miomas num item só, com a numeração do corpo", /Vários miomas, um item só, com a mesma numeração do corpo/.test(p) && /nódulos miomatosos: M1 - \{localização\} \(categoria FIGO \{N\}\), M2 - /.test(p));
check("miomas M1/M2: corpo com uma linha por mioma, (M1) - …, e inúmeros", /Dois ou mais: numere na ordem em que o médico ditou/.test(p) && /UMA LINHA POR MIOMA: "\(M1\) - medindo/.test(p) && /as maiores assim descritas:/.test(p) && /impede a avaliação individualizada/.test(p));
check("W12: FIGO não vai no corpo (0/24 finais)", /FIGO não vai no corpo/.test(p));
check("W12: 'em região fúndica'", /em região fúndica/.test(p));
check("legenda FIGO só com FIGO no laudo", /Com FIGO no laudo, após a conclusão, uma vez e sem número/.test(p));
check("endométrio normal só com espessura ditada", /Com espessura ditada: "O endométrio tem espessura normal/.test(p));
check("legenda FIGO uma vez e sem número", /uma vez e sem número: "FIGO: Federação/.test(p));
check("título de contagem de folículos", /PARA CONTAGEM DE FOLÍCULOS/.test(p));
check("posição do útero não ditada = anteversão", /\(posição não ditada: anteversão\)/.test(p));
check("via não ditada = transabdominal + transvaginal", /Via não ditada: transabdominal \+ transvaginal/.test(p));
check("correlação do ciclo ditada vai na conclusão do endométrio", /a frase dele substitui esta, aqui, e o corpo fica só com a medida/.test(p));
check("exemplos ensinam só o estilo", /exemplos da conversa ensinam só o estilo; fatos, só do ditado\./.test(p));
// O léxico vem da regra comum de saída que o writer anexa ao system (W14/W10b): uma vez no system final.
check("léxico da casa (W13 M03): hipoecoico/hiperecoico/anecoico, uma vez no system final", (`${p}\n\n${WRITER_OUTPUT_RULE}`.match(/Vocabulário da casa: hipoecoico, hiperecoico, anecoico e isoecoico/g) ?? []).length === 1 && !/hipoecoico\/a, hiperecoico\/a, anecoico\/a/.test(p));
check("unidade ditada (saco gestacional em mm)", /saco gestacional e folículos costumam vir em mm/.test(p));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
