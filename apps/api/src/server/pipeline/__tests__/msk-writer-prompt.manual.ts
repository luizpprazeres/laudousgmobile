/**
 * Golden PURO do prompt do MSK writer_guarded (sem LLM). Garante que o prompt base
 * carrega o roteiro da casa + as regras críticas — a "rédea" que evita over-coverage.
 * Rodar: tsx src/server/pipeline/__tests__/msk-writer-prompt.manual.ts
 */
import { buildMskWriterSystemMessage } from "../../renderer/categories/MUSCULOESQUELETICO";

let pass = 0, fail = 0;
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}`); }
}

const p = buildMskWriterSystemMessage();

// Roteiro da casa presente (cobertura exata) — a rédea contra over-coverage.
check("prompt tem o roteiro (título DO JOELHO)", /ULTRASSONOGRAFIA DO JOELHO:/.test(p));
check("roteiro tem pata de ganso", /pata de ganso/.test(p));
check("roteiro tem os 8 segmentos", ["OMBRO","JOELHO","PÉ","MÃO","PUNHO","COTOVELO","TORNOZELO","QUADRIL"].every((s) => p.includes(s)));
check("proíbe estrutura fora do roteiro (menisco)", /NÃO cite meniscos/.test(p));

// Regras críticas (corpo≠conclusão, não inventar, não dropar, comandos, garble).
check("regra corpo=morfologia / conclusão=diagnóstico", /CORPO = MORFOLOGIA/.test(p) && /CONCLUSÃO = DIAGNÓSTICO/.test(p));
check("proíbe 'compatível com' no corpo", /compatível com X.*no corpo|não escreva "compatível com X" no corpo/i.test(p));
check("diagnóstico-só → morfologia canônica", /ditar SÓ o diagnóstico/.test(p));
check("preserva medida/lado; nunca ____", /Preserve TODA medida/.test(p) && /nunca escreva "____"/.test(p));
check("comandos são instruções (quer dizer/pode colocar)", /quer dizer/.test(p) && /pode colocar/.test(p));
check("corrige garble sem ecoar", /NUNCA ecoe o garble/.test(p));
check("não drope nada ditado", /NÃO drope NADA/.test(p));
check("técnica fixa da casa presente", /transdutor linear de alta frequência 12 MHz/.test(p));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
