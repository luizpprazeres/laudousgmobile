/**
 * Golden PURO do prompt do PARTES_MOLES writer_guarded (sem LLM). Garante que o
 * prompt base carrega o roteiro da casa + as regras críticas — a "rédea" da
 * categoria aberta (mesma receita do MSK).
 * Rodar: tsx src/server/pipeline/__tests__/partes-moles-writer-prompt.manual.ts
 */
import { buildPartesMolesWriterSystemMessage } from "../../renderer/categories/PARTES_MOLES";
import { PARTES_MOLES_FEWSHOTS } from "../../renderer/categories/partesMolesFewshots";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}`); }
}

const p = buildPartesMolesWriterSystemMessage();

// Roteiro da casa presente — bloco normal exato + catálogo de tipos de lesão.
check("bloco normal exato da casa", /Planos musculares e tecidos subcutâneos com ecogenicidade e ecotextura normais\./.test(p));
check("conclusão normal da casa", /Ausência de alterações detectáveis pelo método\./.test(p));
check("catálogo: nódulo sólido", /Imagem nodular sólida/.test(p));
check("catálogo: cisto⁄coleção com natureza só se ditada", /a natureza SÓ quando o médico a disser/.test(p));
check("catálogo: corpo estranho (reverberação)", /reverberação posterior/.test(p));
check("catálogo: hérnia (solução de continuidade)", /Solução de continuidade/.test(p));
check("detalhes extra-catálogo entram na redação do médico", /ENTRAM no corpo, na redação dele/.test(p));

// Regras críticas (corpo≠conclusão, não inventar, não dropar, comandos, garble).
check("regra corpo=morfologia / conclusão=diagnóstico", /CORPO = MORFOLOGIA/.test(p) && /CONCLUSÃO = interpretação diagnóstica/.test(p));
check("proíbe 'compatível com' no corpo", /NÃO escreva "compatível com X" no corpo/.test(p));
check("diagnóstico-só → morfologia típica", /ditar SÓ o diagnóstico/.test(p));
check("anti-deriva MSK (não citar tendões/articulações)", /NÃO cite tendões, articulações/.test(p));
check("preserva medida/lado; nunca ____", /Preserve TODA medida/.test(p) && /nunca escreva "____"/.test(p));
check("comandos são instruções (pode colocar/na verdade)", /pode colocar assim/.test(p) && /na verdade/.test(p));
check("corrige garble sem ecoar", /NUNCA ecoe o garble/.test(p));
check("não drope nada ditado", /NÃO drope NADA/.test(p));
check("laudo colado → preservar", /COLAR um laudo já formatado/.test(p));
check("estilo da conclusão da casa (diagnóstico mais provável)", /O diagnóstico mais provável é/.test(p));
check("numeração da conclusão 1) 2) 3)", /"1\) 2\) 3\)"/.test(p));

// Few-shots: pares reais assinados carregados e no estilo da casa.
check("few-shots: ≥4 pares", PARTES_MOLES_FEWSHOTS.length >= 4);
check("few-shots: todo laudo tem os cabeçalhos da casa", PARTES_MOLES_FEWSHOTS.every((f) =>
  /^ULTRASSONOGRAFIA D/.test(f.laudo) && f.laudo.includes("COMENTÁRIOS:") &&
  f.laudo.includes("OS SEGUINTES ASPECTOS FORAM OBSERVADOS:") && f.laudo.includes("CONCLUSÃO:")));
check("few-shots: caso palato duro (comandos misturados) presente", PARTES_MOLES_FEWSHOTS.some((f) =>
  /pode colocar assim/i.test(f.raw) && /palato duro/i.test(f.laudo)));
check("few-shots: caso laudo colado (cervical) presente", PARTES_MOLES_FEWSHOTS.some((f) =>
  /^ULTRASSONOGRAFIA DAS PARTES MOLES DA REGIÃO CERVICAL DIREITA/.test(f.raw)));
check("few-shots: caso normal presente", PARTES_MOLES_FEWSHOTS.some((f) =>
  f.laudo.includes("Ausência de alterações detectáveis pelo método.")));
check("few-shots: medidas com vírgula decimal e 'x'", PARTES_MOLES_FEWSHOTS.some((f) =>
  f.laudo.includes("1,1 x 0,8 x 0,9 cm")));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
