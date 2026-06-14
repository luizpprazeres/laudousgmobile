/**
 * GOLDEN de render local da MAMARIA (DET-5) — trava as DECISÕES clínicas
 * aprovadas pelo Luiz em 2026-06-14 (curadoria-mamaria-obstetrico-2026-06-14.md).
 * Determinístico (sem LLM): renderMamaria(findings) → asserções de presença/
 * proibição/formato. Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/mamaria-golden.manual.ts
 */
import { renderMamaria } from "../categories/MAMARIA";
import { A, F } from "./mamaria-fixtures";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

const loc = {
  medidas_cm: [1.2, 1.0, 0.9],
  localizacao: "quadrante superolateral",
  horario: "10 horas",
  dist_pele_cm: 0.8,
  dist_mamilo_cm: 3.0,
};

// ── Regra global: sem "N fotos" ──
{
  const l = renderMamaria(F({}));
  check("fotos: sem 'em NN fotos'", !/\d+\s+fotos/i.test(l), l);
  check("fotos: 'obtida segundo protocolo'", /obtida segundo protocolo/.test(l));
}

// ── P3: uma casa decimal em medidas (1 → 1,0) ──
{
  const l = renderMamaria(
    F({ achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "oval", margem: "circunscrita", orientacao: "paralela", ...loc })] }),
  );
  check("P3: '1,0' (não '1') nas medidas", /1,2 x 1,0 x 0,9 cm/.test(l), l);
  check("P3: distância '3,0 cm' (não '3 cm')", /3,0 cm até o mamilo/.test(l), l);
}

// ── #3 cistos bilaterais ──
{
  const l = renderMamaria(
    F({ achados: [
      A({ tipo: "multiplos_cistos", lado: "direita", ecogenicidade: "anecoico", margem: "circunscrita", medidas_cm: [0.6, 0.5, 0.5], localizacao: "quadrante superolateral", horario: "11 horas" }),
      A({ tipo: "multiplos_cistos", lado: "esquerda", ecogenicidade: "anecoico", margem: "circunscrita", medidas_cm: [0.7, 0.6, 0.5], localizacao: "quadrante inferomedial", horario: "04 horas" }),
    ] }),
  );
  check("#3: corpo separa as duas mamas", /de mama direita/.test(l) && /de mama esquerda/.test(l), l);
  check("#3: conclusão 'bilateralmente, subcentimétricos'", /Cistos mamários simples bilateralmente, subcentimétricos \(Categoria BI-RADS® 2\)/.test(l), l);
}

// ── #4 microcistos ──
{
  const l = renderMamaria(F({ achados: [A({ tipo: "microcistos_agrupados", lado: "esquerda", ...loc })] }));
  check("#4: 'coalescentes' + 'medindo em conjunto' + 'situadas'", /coalescentes, com margens circunscritas, medindo em conjunto .* situadas/.test(l), l);
}

// ── #5 cisto complicado ──
{
  const l = renderMamaria(F({ achados: [A({ tipo: "cisto_complicado", descritores: "com finos ecos internos que formam nível líquido-líquido", ...loc })] }));
  check("#5: conclusão 'Cisto de conteúdo espesso'", /Cisto de conteúdo espesso/.test(l), l);
  check("#5: NÃO usa 'Cisto complicado'", !/Cisto complicado/.test(l), l);
  check("#5: corpo com 'nível líquido-líquido'", /nível líquido-líquido/.test(l), l);
}

// ── #7 calcificações grosseiras (corpo não repete conclusão) ──
{
  const l = renderMamaria(F({ achados: [A({ tipo: "calcificacoes", lado: "esquerda", calcificacoes: "grosseiras_benignas", medidas_cm: [0.4, 0, 0] })] }));
  check("#7: corpo 'Imagens hiperecoicas, medindo até'", /Imagens hiperecoicas, medindo até 0,4 cm.*ocasionando sombra acústica/.test(l), l);
  check("#7: corpo NÃO repete 'de aspecto benigno' (só na conclusão)", (l.match(/de aspecto benigno/g) ?? []).length === 1, l);
}

// ── #8 microcalcificações ──
{
  const l = renderMamaria(F({ achados: [A({ tipo: "calcificacoes", calcificacoes: "microcalcificacoes", localizacao: "quadrante superolateral", horario: "10 horas", medidas_cm: [0.2, 0, 0] })] }));
  check("#8: 'puntiformes, que não ocasionam sombras'", /Imagens hiperecoicas puntiformes, que não ocasionam sombras acústicas, agrupadas/.test(l), l);
}

// ── #16 NML ──
{
  const l = renderMamaria(F({ achados: [A({ tipo: "achado_nao_nodular", medidas_cm: [2.4, 2.0], localizacao: "quadrante superolateral", horario: "11 horas" })] }));
  check("#16: 'Área heterogênea de mama X, sem configuração nodular'", /Área heterogênea de mama direita, sem configuração nodular, medindo aproximadamente 2,4 por 2,0 cm/.test(l), l);
  check("#16: NÃO duplica 'medindo aproximadamente'", (l.match(/medindo aproximadamente/g) ?? []).length === 1, l);
}

// ── #17 ginecomastia ──
{
  const l = renderMamaria(F({ mama_masculina: true, achados: [A({ tipo: "ginecomastia", lado: "esquerda" })] }));
  check("#17: corpo SEM 'compatível com ginecomastia'", !/com aumento do tecido fibroglandular retroareolar, compatível/.test(l), l);
  check("#17: conclusão 'Ginecomastia à esquerda'", /Ginecomastia à esquerda/.test(l), l);
}

// ── #18 próteses ──
{
  const l = renderMamaria(F({ com_protese: true, achados: [A({ tipo: "proteses", lado: "bilateral", descritores: "predominantemente retromusculares" })] }));
  check("#18: frase 'Não há sinais…' permanece (P1)", /Não há sinais evidentes de imagem nodular sólida, cística ou complexa\./.test(l), l);
  check("#18: plano cirúrgico ditado aparece", /predominantemente retromusculares/.test(l), l);
}

// ── #3-item3 (confirmação Luiz): frase 'Não há sinais' em calcificações e ginecomastia ──
{
  const calc = renderMamaria(F({ achados: [A({ tipo: "calcificacoes", calcificacoes: "grosseiras_benignas", medidas_cm: [0.4, 0, 0] })] }));
  check("frase 'Não há sinais' presente em calcificações", /Não há sinais evidentes de imagem nodular/.test(calc), calc);
}

// ── #20 conduta em seção própria ──
{
  const l = renderMamaria(
    F({ achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", forma: "oval", margem: "espiculada", orientacao: "paralela", ...loc })] }),
    { show_conduct_recommendation: true },
  );
  check("#20: seção 'Conduta sugerida:' fora da conclusão", /\nConduta sugerida:\nBI-RADS 4C\. Biópsia para avaliação histopatológica\./.test(l), l);
  check("#20: conduta SEM 'Recomenda-se'", !/Conduta sugerida:[\s\S]*Recomenda-se/.test(l), l);
  check("#20: conduta NÃO numerada na conclusão", !/\d+\.\s*Conduta sugerida/.test(l), l);
}

// ── BI-RADS escalada (gradação aprovada) ──
const solido = (p: object) => renderMamaria(F({ achados: [A({ tipo: "nodulo_solido", ecogenicidade: "hipoecoico", ...loc, ...p })] }));
{
  check("BI-RADS 3 (tripé benigno)", /\(Categoria BI-RADS® 3\)/.test(solido({ forma: "oval", margem: "circunscrita", orientacao: "paralela", posterior: "nenhuma" })));
  check("BI-RADS 4A", /\(Categoria BI-RADS® 4A\)/.test(solido({ forma: "redonda", margem: "circunscrita", orientacao: "paralela", posterior: "nenhuma" })));
  check("BI-RADS 4B (2 moderadas)", /\(Categoria BI-RADS® 4B\)/.test(solido({ forma: "oval", margem: "microlobulada", orientacao: "nao_paralela", posterior: "nenhuma" })));
  check("BI-RADS 4C (1 forte)", /\(Categoria BI-RADS® 4C\)/.test(solido({ forma: "oval", margem: "espiculada", orientacao: "paralela", posterior: "nenhuma" })));
  check("BI-RADS 5 (2 fortes)", /\(Categoria BI-RADS® 5\)/.test(solido({ forma: "irregular", margem: "espiculada", orientacao: "nao_paralela", posterior: "sombra" })));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
