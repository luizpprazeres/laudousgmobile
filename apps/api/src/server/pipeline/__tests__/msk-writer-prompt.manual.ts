/**
 * Golden PURO do prompt do MSK writer_guarded (sem LLM). Garante que o prompt base
 * carrega o roteiro da casa + as regras críticas — a "rédea" que evita over-coverage.
 * Rodar: tsx src/server/pipeline/__tests__/msk-writer-prompt.manual.ts
 */
import { comentariosPadrao } from "@laudousg/schemes";
import { buildMskWriterSystemMessage } from "../../renderer/categories/MUSCULOESQUELETICO";
import { WRITER_OUTPUT_RULE } from "../writerOutputGuard";

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
// W14 (revisão W13, A09): achado ditado fora do roteiro não é dropado.
check("achado ditado fora do roteiro entra em linha própria", /Achado DITADO de estrutura fora da lista entra em linha própria/.test(p) && /mais os achados ditados fora dele, e nada presumido/.test(p) && !/e só elas/.test(p));

// Regras críticas (corpo≠conclusão, não inventar, não dropar, comandos, garble).
check("regra corpo=morfologia / conclusão=diagnóstico", /CORPO = MORFOLOGIA/.test(p) && /CONCLUSÃO = DIAGNÓSTICO/.test(p));
check("proíbe 'compatível com' no corpo", /compatível com X.*no corpo|não escreva "compatível com X" no corpo/i.test(p));
check("diagnóstico-só → morfologia canônica", /ditar SÓ o diagnóstico/.test(p));
check("preserva medida/lado; nunca ____", /Preserve TODA medida/.test(p) && /nunca escreva "____"/.test(p));
check("comandos são instruções (quer dizer/pode colocar)", /quer dizer/.test(p) && /pode colocar/.test(p));
check("corrige garble sem ecoar", /NUNCA ecoe o garble/.test(p));
check("não drope nada ditado", /NÃO drope NADA/.test(p));
check("multiarticular exige bloco por segmento+lado", /cada combinação segmento\+lado/.test(p));
check("mesmo lado não encobre outro segmento", /nunca cobre outro segmento/i.test(p));
check("placeholders da biblioteca não podem vazar", /NUNCA imprima colchetes, alternativas, lacunas ou placeholders/.test(p));
check("técnica fixa da casa presente", /transdutor linear de alta frequência 12 MHz/.test(p));

// W9 (09/10/2026): cobertura na ordem, frase normal literal, padrão "normal + , com", sem paráfrase/ressalva,
// numeração por laudo e conferência final.
check("roteiro na ordem, uma linha por estrutura", /NA ORDEM abaixo, uma linha cada/.test(p));
check("frase normal copiada literalmente", /copie a frase do roteiro LITERALMENTE/.test(p));
check("padrão 'frase normal + , com' com exemplo real", /sem o ponto \+ ", com/.test(p) && /preservadas, com irregularidade cortical e osteófitos marginais na origem do tendão patelar/.test(p));
check("estrutura alterada mantém o sujeito do roteiro", /o mesmo sujeito da frase do roteiro/.test(p));
check("proíbe paráfrase e ressalva inventada", /NÃO parafraseie nem inverta/.test(p) && /sem alteração identificável/.test(p));
check("'sem evidência de rotura' é padrão da casa, não ressalva proibida", /termina com ", sem evidência de rotura" \(padrão da casa\)/.test(p) && !/ressalvas[^\n]*"sem evidência de rotura"/.test(p));
check("numeração só na conclusão e recomeça por laudo", /existe SÓ dentro da CONCLUSÃO e recomeça em "1\)"/.test(p));
check("conferência final por laudo", /CONFERÊNCIA FINAL, laudo por laudo/.test(p));

// W14 (revisão W13, M01): fórmula da hipótese no dedicado (não recebe o global) e exemplos só de estilo.
check("hipótese: 'que tem como diagnóstico mais provável'", /na conclusão: "\{achado\}, que tem como diagnóstico mais provável \{X\}/.test(p));
check("exemplos ensinam só o estilo", /exemplos da conversa ensinam só o estilo; fatos, só do ditado\./.test(p));
{
  const { MSK_FEWSHOTS } = require("../../renderer/categories/mskFewshots");
  const gerados = (MSK_FEWSHOTS as { raw: string; laudo: string }[]).filter((f) => !/^ULTRASSONOGRAFIA/.test(f.raw));
  check("few-shots: sem 'compatível com' no corpo", gerados.every((f) => !/compatível com/.test(f.laudo.split("CONCLUSÃO:")[0] ?? "")));
  check("few-shots: hipótese na fórmula da casa", gerados.every((f) => !/O diagnóstico mais provável é/.test(f.laudo)));
  check("few-shots: 'sem evidência de rotura' (singular)", gerados.every((f) => !/sem evidência de roturas/.test(f.laudo)));
  // W15 (decisão do Luiz, 10/10): técnica padrão com 12 MHz; "abrangendo a avaliação do {segmento}" é variante antiga.
  const todos = MSK_FEWSHOTS as { raw: string; laudo: string }[];
  check("few-shots: técnica da casa (W15), sem a variante antiga", todos.every((f) => f.laudo.includes(`COMENTÁRIOS:\n${comentariosPadrao("MUSCULOESQUELETICO_V2")}\n`) && !/abrangendo a avaliação d/.test(f.laudo)));
}

// O léxico vem da regra comum de saída que o writer anexa ao system (W14/W10b): uma vez no system final.
check("léxico da casa (W13 M03): hipoecoico/hiperecoico/anecoico, uma vez no system final", (`${p}\n\n${WRITER_OUTPUT_RULE}`.match(/Vocabulário da casa: hipoecoico, hiperecoico, anecoico e isoecoico/g) ?? []).length === 1 && !/hipoecoico\/a, hiperecoico\/a, anecoico\/a/.test(p));
const pComBiblioteca = buildMskWriterSystemMessage({
  validatedLibrary: "FRASE VALIDADA: Tendão infraespinhal com espessamento.",
});
check("injeta biblioteca validada do banco", /BIBLIOTECA CLÍNICA VALIDADA/.test(pComBiblioteca) && /Tendão infraespinhal/.test(pComBiblioteca));

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
