/**
 * GOLDEN do render MAMARIA estilo OBJETIVO (Sprint 3). Determinístico (sem LLM):
 * renderMamaria(f, prefs, { objetivo: true }) → asserções de estrutura
 * (TÉCNICA/ACHADOS/IMPRESSÃO), BI-RADS calculável (maior-vence, ditado-vence,
 * rótulo só no maior), margens nunca "regulares", "de mama direita/esquerda",
 * 1 casa decimal, conduta em seção própria. Falha = regressão.
 * Rodar: tsx src/server/renderer/__tests__/mamaria-objetivo-golden.manual.ts
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

const render = (f: Parameters<typeof renderMamaria>[0], prefs?: { show_conduct_recommendation: boolean }) =>
  renderMamaria(f, prefs ?? null, { objetivo: true });

// ── Estrutura objetivo (cabeçalhos) + normal ──
{
  const l = render(F({ titulo_com_axilas: true, achados: [] }));
  check("normal: título mamas e axilas", /ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES/.test(l), l);
  check("normal: cabeçalho TÉCNICA:", /\nTÉCNICA:\n/.test(l), l);
  check("normal: cabeçalho ACHADOS:", /\nACHADOS:\n/.test(l), l);
  check("normal: cabeçalho IMPRESSÃO:", /\nIMPRESSÃO:\n/.test(l), l);
  check("normal: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(l), l);
  check("normal: ausência de lesão", /Não há sinais evidentes de imagem nodular/.test(l), l);
  check("normal: BI-RADS 1", /Mamas ecograficamente normais \(Categoria BI-RADS® 1\)\./.test(l), l);
  check("normal: linfonodos axilares normais", /Linfonodos axilares normais\./.test(l), l);
  check("normal: rodapé BI-RADS", /Breast Imaging Reporting and Data System/.test(l), l);
}

// ── Cisto simples → BI-RADS 2 ──
{
  const l = render(F({ titulo_com_axilas: false, achados: [
    A({ tipo: "cisto_simples", lado: "esquerda", medidas_cm: [1, 0.8, 0.7], localizacao: "quadrante superolateral" }),
  ] }));
  check("cisto: título sem axilas", /ULTRASSONOGRAFIA DAS MAMAS\n/.test(l), l);
  check("cisto: 'de mama esquerda' no corpo", /de mama esquerda/.test(l), l);
  check("cisto: 1 casa decimal '1,0 x 0,8 x 0,7 cm'", /1,0 x 0,8 x 0,7 cm/.test(l), l);
  check("cisto: impressão BI-RADS 2", /Cisto simples em mama esquerda.*\(Categoria BI-RADS® 2\)\./.test(l), l);
}

// ── Nódulo sólido suspeito (ditado vence) BI-RADS 4B + maior vence sobre cisto ──
{
  const l = render(F({ achados: [
    A({ tipo: "cisto_simples", lado: "direita", medidas_cm: [0.9, 0.8, 0.7] }),
    A({ tipo: "nodulo_solido", lado: "esquerda", ecogenicidade: "hipoecoico", margem: "microlobulada", orientacao: "nao_paralela", medidas_cm: [1.4, 1.1, 1.0], localizacao: "quadrante superolateral", birads_ditado: "4B" }),
  ] }));
  check("nódulo: margem nunca 'regular'", !/margem regular/.test(l), l);
  check("nódulo: margem microlobulada", /com margem microlobulada/.test(l), l);
  check("nódulo: ditado vence → BI-RADS 4B no nódulo", /Imagem sólida em mama esquerda.*\(Categoria BI-RADS® 4B\)\./.test(l), l);
  check("nódulo: maior vence → cisto SEM rótulo", /Cisto simples em mama direita\.\n/.test(l) && !/Cisto simples em mama direita.*BI-RADS/.test(l), l);
}

// ── Calcificações suspeitas (em nódulo) → BI-RADS 4 ──
{
  const l = render(F({ achados: [
    A({ tipo: "calcificacoes", lado: "direita", calcificacoes: "em_nodulo", medidas_cm: [0.3], localizacao: "quadrante inferomedial" }),
  ] }));
  check("calc: corpo calcificações", /Calcificações no interior de imagem nodular/.test(l), l);
  check("calc: impressão BI-RADS 4", /\(Categoria BI-RADS® 4\)\./.test(l), l);
}

// ── Conduta toggle ON ──
{
  const l = render(F({ achados: [
    A({ tipo: "nodulo_solido", lado: "direita", ecogenicidade: "hipoecoico", margem: "espiculada", forma: "irregular", medidas_cm: [2.0, 1.5, 1.4] }),
  ] }), { show_conduct_recommendation: true });
  check("conduta: seção própria 'Conduta sugerida:'", /Conduta sugerida:\n/.test(l), l);
  check("conduta: BI-RADS 5 (2 fortes) → biópsia", /BI-RADS 5\. Biópsia/.test(l), l);
}

// ── Conduta toggle OFF (default) → sem seção ──
{
  const l = render(F({ achados: [
    A({ tipo: "nodulo_solido", lado: "direita", ecogenicidade: "hipoecoico", margem: "espiculada", forma: "irregular", medidas_cm: [2.0, 1.5, 1.4] }),
  ] }));
  check("conduta OFF: sem seção", !/Conduta sugerida:/.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
