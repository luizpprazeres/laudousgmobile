/**
 * GOLDEN de render local da TIREOIDE estilo OBJETIVO (Sprint 1). Determinístico
 * (sem LLM): renderTireoide(findings, prefs, { objetivo: true }) → asserções de
 * estrutura (TÉCNICA/ACHADOS/IMPRESSÃO), categoria ACR TI-RADS correta por caso,
 * ausência de escore Domingos no objetivo, e conduta em seção própria com toggle.
 * Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/tireoide-objetivo-golden.manual.ts
 */
import {
  renderTireoide,
  calcAcrTirads,
  type TireoideFindings,
  type TireoidePreferences,
} from "../categories/TIREOIDE";
import { F, L, N } from "./tireoide-objetivo-fixtures";

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

const render = (f: TireoideFindings, prefs?: Partial<TireoidePreferences>) =>
  renderTireoide(f, prefs, { objetivo: true });

const A = (
  composicao: "cistico" | "espongiforme" | "misto" | "solido",
  ecogenicidade: "anecoico" | "hiper_ou_isoecoico" | "hipoecoico" | "muito_hipoecoico",
  forma: "mais_larga_que_alta" | "mais_alta_que_larga" = "mais_larga_que_alta",
  margem: "lisa" | "mal_definida" | "lobulada_ou_irregular" | "extensao_extratireoidiana" = "lisa",
  focos_ecogenicos: Array<"nenhum_ou_cauda_cometa" | "macrocalcificacoes" | "calcificacoes_perifericas" | "focos_puntiformes"> = ["nenhum_ou_cauda_cometa"],
) => ({ composicao, ecogenicidade, forma, margem, focos_ecogenicos });

// ── Estrutura objetivo (cabeçalhos) ──
{
  const l = render(F({}));
  check("estrutura: título 'ULTRASSONOGRAFIA DA TIREOIDE'", /^ULTRASSONOGRAFIA DA TIREOIDE/.test(l), l);
  check("estrutura: cabeçalho 'TÉCNICA:'", /\nTÉCNICA:\n/.test(l), l);
  check("estrutura: cabeçalho 'ACHADOS:'", /\nACHADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'IMPRESSÃO:'", /\nIMPRESSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(l), l);
  check("normal: técnica 'transdutor linear de alta frequência'", /transdutor linear de alta frequência/.test(l), l);
  check("normal: 'Não foram caracterizadas lesões sólidas ou císticas'", /Não foram caracterizadas lesões sólidas ou císticas/.test(l), l);
  check("normal: 'Volume total:' presente", /Volume total: 13,5 ml\./.test(l), l);
  check("normal: 'Não há evidência de linfonodomegalias'", /Não há evidência de linfonodomegalias/.test(l), l);
  check("normal: IMPRESSÃO 'dentro dos padrões da normalidade'", /Estudo ultrassonográfico dentro dos padrões da normalidade\./.test(l), l);
  check("normal: SEM ACR TI-RADS quando não há nódulo", !/ACR TI-RADS/.test(l), l);
}

// ── Sem escore Domingos no objetivo (qualquer caso) ──
{
  const l = render(
    F({
      lobo_direito: L({
        medidas_cm: [5.0, 1.8, 1.6],
        volume_ml: 7.0,
        nodulos: [N({ ecogenicidade: "hipoecoica", margem: "espiculada", forma: "mais_alta_que_larga", calcificacoes: "micro", medidas_cm: [1.2, 1.0, 0.9] })],
      }),
    }),
  );
  check("objetivo: SEM 'NOTA FINAL' (Domingos)", !/NOTA FINAL/.test(l), l);
  check("objetivo: SEM 'Domingos'", !/Domingos/i.test(l), l);
}

// ── Categorias ACR por caso ──
function nodulo(p: Parameters<typeof N>[0]): TireoideFindings {
  return F({
    lobo_direito: L({ medidas_cm: [5.0, 1.8, 1.6], volume_ml: 7.0, nodulos: [N(p)] }),
  });
}

{
  // TR2: misto regular
  const f = nodulo({ ecogenicidade: "solida_areas_anecoicas", margem: "regular", forma: "mais_larga_que_alta", acr_tirads: A("misto", "hiper_ou_isoecoico"), medidas_cm: [0.8, 0.6, 0.5] });
  const acr = calcAcrTirads(f.lobo_direito.nodulos[0]!);
  check("TR2: pontos=2, categoria=2", acr?.pontos === 2 && acr?.categoria === 2, JSON.stringify(acr));
  check("TR2: impressão '(ACR TI-RADS 2'", /\(ACR TI-RADS 2/.test(render(f)), render(f));
}
{
  // TR3: iso regular
  const f = nodulo({ ecogenicidade: "isoecoica", margem: "regular", forma: "mais_larga_que_alta", calcificacoes: "sem", acr_tirads: A("solido", "hiper_ou_isoecoico"), medidas_cm: [1.8, 1.4, 1.2] });
  const acr = calcAcrTirads(f.lobo_direito.nodulos[0]!);
  check("TR3: pontos=3, categoria=3", acr?.pontos === 3 && acr?.categoria === 3, JSON.stringify(acr));
  check("TR3: impressão '(ACR TI-RADS 3, características intermediárias)'", /\(ACR TI-RADS 3, características intermediárias\)/.test(render(f)), render(f));
}
{
  // TR4: hipo + irregular
  const f = nodulo({ ecogenicidade: "hipoecoica", margem: "irregular", forma: "mais_larga_que_alta", acr_tirads: A("solido", "hipoecoico", "mais_larga_que_alta", "lobulada_ou_irregular"), medidas_cm: [1.6, 1.2, 1.0] });
  const acr = calcAcrTirads(f.lobo_direito.nodulos[0]!);
  check("TR4: pontos=6, categoria=4", acr?.pontos === 6 && acr?.categoria === 4, JSON.stringify(acr));
  check("TR4: impressão '(ACR TI-RADS 4, características suspeitas)'", /\(ACR TI-RADS 4, características suspeitas\)/.test(render(f)), render(f));
}
{
  // TR5: hipo + alta + espiculada + micro
  const f = nodulo({ ecogenicidade: "hipoecoica", margem: "espiculada", forma: "mais_alta_que_larga", calcificacoes: "micro", acr_tirads: A("solido", "hipoecoico", "mais_alta_que_larga", "lobulada_ou_irregular", ["focos_puntiformes"]), medidas_cm: [1.2, 1.0, 0.9] });
  const acr = calcAcrTirads(f.lobo_direito.nodulos[0]!);
  check("TR5: pontos=12, categoria=5", acr?.pontos === 12 && acr?.categoria === 5, JSON.stringify(acr));
  check("TR5: impressão '(ACR TI-RADS 5, altamente suspeitas)'", /\(ACR TI-RADS 5, altamente suspeitas\)/.test(render(f)), render(f));
}
{
  // Cisto → TR1
  const f = nodulo({ ecogenicidade: "anecoica_homogenea", acr_tirads: A("cistico", "anecoico"), medidas_cm: [0.9, 0.7, 0.6] });
  const acr = calcAcrTirads(f.lobo_direito.nodulos[0]!);
  check("Cisto: pontos=0, categoria=1", acr?.pontos === 0 && acr?.categoria === 1, JSON.stringify(acr));
  const l = render(f);
  check("Cisto: ACHADOS descreve composição cística e conteúdo anecoico", /cística ou quase totalmente cística, anecoica/i.test(l), l);
  check("Cisto: impressão 'Cisto simples ... (ACR TI-RADS 1)'", /Cisto simples.*\(ACR TI-RADS 1\)/.test(l), l);
}

// ── calcAcrTirads: sem ecogenicidade → null ──
{
  const acr = calcAcrTirads(N({ margem: "irregular", forma: "mais_alta_que_larga", medidas_cm: [1.0] }));
  check("calc: ecogenicidade null → null", acr === null, JSON.stringify(acr));
}

// ── Override ti_rads_ditado vence o cálculo ──
{
  const f = nodulo({ ecogenicidade: "isoecoica", margem: "regular", forma: "mais_larga_que_alta", ti_rads_ditado: "5", medidas_cm: [1.0, 0.8, 0.7] });
  const acr = calcAcrTirads(f.lobo_direito.nodulos[0]!);
  check("override: categoria ditada=5 vence (calcularia 3)", acr?.categoria === 5, JSON.stringify(acr));
  check("override: impressão '(ACR TI-RADS 5'", /\(ACR TI-RADS 5/.test(render(f)), render(f));
}

// ── Bócio ──
{
  const l = render(F({ volume_glandular: "aumentado" }));
  check("bócio: ACHADOS 'dimensões aumentadas'", /dimensões aumentadas/.test(l), l);
  check("bócio: IMPRESSÃO 'Bócio'", /Bócio/.test(l), l);
}

// ── Tireoidopatia difusa ──
{
  const l = render(
    F({
      lobo_direito: L({ medidas_cm: [5.0, 1.8, 1.6], volume_ml: 7.0, ecotextura_alterada: "com ecotextura difusamente heterogênea, compatível com tireoidite crônica" }),
    }),
  );
  check("difusa: ACHADOS reflete ecotextura ditada", /difusamente heterogênea, compatível com tireoidite crônica/.test(l), l);
  check("difusa: IMPRESSÃO 'Sinais ecográficos de tireoidopatia'", /Sinais ecográficos de tireoidopatia/.test(l), l);
}

// ── 2 nódulos: maior categoria na conduta (toggle on) ──
{
  const f = F({
    lobo_direito: L({ medidas_cm: [5.0, 1.8, 1.6], volume_ml: 7.0, nodulos: [N({ ecogenicidade: "solida_areas_anecoicas", margem: "regular", forma: "mais_larga_que_alta", acr_tirads: A("misto", "hiper_ou_isoecoico"), medidas_cm: [0.7, 0.5, 0.4] })] }),
    lobo_esquerdo: L({ medidas_cm: [4.8, 1.7, 1.5], volume_ml: 6.0, nodulos: [N({ ecogenicidade: "hipoecoica", margem: "irregular", forma: "mais_larga_que_alta", acr_tirads: A("solido", "hipoecoico", "mais_larga_que_alta", "lobulada_ou_irregular"), medidas_cm: [1.7, 1.3, 1.1] })] }),
  });
  const l = render(f, { show_conduct_recommendation: true });
  check("2 nódulos: impressão tem TR2 e TR4", /\(ACR TI-RADS 2/.test(l) && /\(ACR TI-RADS 4/.test(l), l);
  check("2 nódulos: conduta usa a maior categoria (TR4)", /Conduta sugerida:\nACR TI-RADS 4\./.test(l), l);
  check("2 nódulos: conduta TR4 1,7 cm → PAAF", /Conduta sugerida:[\s\S]*PAAF/.test(l), l);
}

// ── Conduta toggle OFF (default): sem seção de conduta ──
{
  const f = nodulo({ ecogenicidade: "hipoecoica", margem: "irregular", forma: "mais_larga_que_alta", acr_tirads: A("solido", "hipoecoico", "mais_larga_que_alta", "lobulada_ou_irregular"), medidas_cm: [1.6, 1.2, 1.0] });
  const l = render(f);
  check("conduta OFF: SEM 'Conduta sugerida:'", !/Conduta sugerida:/.test(l), l);
}

// ── Conduta toggle ON: TR4 1,6 cm → PAAF em seção própria ──
{
  const f = nodulo({ ecogenicidade: "hipoecoica", margem: "irregular", forma: "mais_larga_que_alta", acr_tirads: A("solido", "hipoecoico", "mais_larga_que_alta", "lobulada_ou_irregular"), medidas_cm: [1.6, 1.2, 1.0] });
  const l = render(f, { show_conduct_recommendation: true });
  check("conduta ON: seção 'Conduta sugerida:' fora da impressão", /\nConduta sugerida:\nACR TI-RADS 4\. punção aspirativa por agulha fina \(PAAF\)\./.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
