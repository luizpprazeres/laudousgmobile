/**
 * GOLDEN de render local de VIAS URINÁRIAS estilo CLÁSSICO. Determinístico (sem LLM):
 * renderViasUrinarias(findings) → asserções de estrutura (cabeçalhos Clássico),
 * normal (silêncio → normalidade), e descrição+conclusão por tipo de achado.
 *
 * REGRA PRINCIPAL coberta: o achado é INCORPORADO na frase principal do rim
 * (após "apresentando"), nunca em frase separada. Sequência fixa do achado:
 * imagem → ecogenicidade → tamanho → localização → fenômeno acústico. Múltiplos
 * achados no mesmo rim → separados por ponto e vírgula. Litíase → cálices;
 * cisto → terço. Cobre também: hidronefrose incorporada, cisto complexo na
 * conclusão, situação/rotação e doença renal crônica (DRC).
 *
 * Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/vias-urinarias-golden.manual.ts
 */
import {
  renderViasUrinarias,
  type ViasUrinariasFindings,
  type ViasUrinariasRim,
  type ViasUrinariasBexiga,
  type ViasUrinariasAchado,
} from "../categories/VIAS_URINARIAS";

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

// Fábricas de fixtures.
const Rim = (p: Partial<ViasUrinariasRim> = {}): ViasUrinariasRim => ({
  medidas_cm: null,
  espessura_parenquima_cm: null,
  dimensao: null,
  situacao_baixa: false,
  rotacao: false,
  drc: false,
  alteracao_difusa: null,
  hidronefrose: null,
  achados: [],
  ...p,
});
const Bex = (p: Partial<ViasUrinariasBexiga> = {}): ViasUrinariasBexiga => ({
  avaliada: true,
  parede_alterada: null,
  conteudo_alterado: null,
  espessura_parede_mm: null,
  volume_pre_miccional_ml: null,
  residuo_pos_miccional_ml: null,
  ...p,
});
const Ach = (
  p: Partial<ViasUrinariasAchado> & { tipo: ViasUrinariasAchado["tipo"] },
): ViasUrinariasAchado => ({
  medidas_cm: null,
  localizacao: null,
  caracteristica: null,
  descricao_raw: null,
  ...p,
});
const F = (p: Partial<ViasUrinariasFindings> = {}): ViasUrinariasFindings => ({
  rim_direito: Rim(),
  rim_esquerdo: Rim(),
  bexiga: Bex(),
  dilatacao_ureteral: false,
  dilatacao_ureteral_descricao: null,
  achados_adicionais: null,
  ...p,
});

// ── Estrutura clássica (cabeçalhos) ──
{
  const l = renderViasUrinarias(F());
  check("estrutura: título 'ULTRASSONOGRAFIA DAS VIAS URINÁRIAS'", /^ULTRASSONOGRAFIA DAS VIAS URINÁRIAS/.test(l), l);
  check("estrutura: cabeçalho 'COMENTÁRIOS:'", /\nCOMENTÁRIOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:'", /\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'CONCLUSÃO:'", /\nCONCLUSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do objetivo", !/TÉCNICA:|ACHADOS:|IMPRESSÃO:/.test(l), l);
  check("estrutura: transdutor de 4.0 MHz", /transdutor de 4\.0 MHz/.test(l), l);
}

// ── Normal (silêncio → normalidade) ──
{
  const l = renderViasUrinarias(F());
  check("normal: rim direito frase principal", /Rim direito com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura corticomedular normais\./.test(l), l);
  check("normal: rim esquerdo frase principal", /Rim esquerdo com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura corticomedular normais\./.test(l), l);
  check("normal: bexiga normal", /Bexiga de forma, contorno e ecotextura normais\./.test(l), l);
  check("normal: conclusão 1) Rins ecograficamente normais", /1\) Rins ecograficamente normais\./.test(l), l);
  check("normal: conclusão 2) sem dilatação ureteral", /2\) Não há sinais de dilatação ureteral\./.test(l), l);
  check("normal: conclusão 3) Bexiga ecograficamente normal", /3\) Bexiga ecograficamente normal\./.test(l), l);
  check("normal: nenhum achado inventado", !/Litíase|Cisto|hidronefrose|Hidronefrose|nodular|Ectasia/i.test(l.split("CONCLUSÃO:")[0] ?? ""), l);
  check("normal: placeholder de medida do rim", /Medida do rim direito: ____ x ____ x ____ cm\./.test(l), l);
}

// ── Litíase renal (INCORPORADA na frase do rim; cálices; sombra acústica) ──
{
  const l = renderViasUrinarias(
    F({
      rim_direito: Rim({
        medidas_cm: [10.2, 4.8, 5.1],
        espessura_parenquima_cm: 1.6,
        achados: [Ach({ tipo: "litiase", medidas_cm: [0.6], localizacao: "cálices inferiores" })],
      }),
    }),
  );
  check(
    "litíase: incorporada na frase principal do rim (imagem→ecogenicidade→tamanho→local→fenômeno)",
    /Rim direito com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando imagem hiperecoica, medindo 0,6 cm no seu maior eixo, situada em cálices inferiores, ocasionando sombra acústica\./.test(l),
    l,
  );
  check("litíase: NÃO é frase separada (não há 'Rim direito apresentando' isolado)", !/Rim direito apresentando imagem hiperecoica/.test(l), l);
  check("litíase: conclusão 'Litíase no rim direito, em cálices inferiores'", /Litíase no rim direito, em cálices inferiores\./.test(l), l);
  check("litíase: rins NÃO 'ecograficamente normais'", !/Rins ecograficamente normais/.test(l), l);
}

// ── Múltiplos achados no MESMO rim (separados por ponto e vírgula) ──
{
  const l = renderViasUrinarias(
    F({
      rim_direito: Rim({
        medidas_cm: [10.2, 4.8, 5.1],
        espessura_parenquima_cm: 1.6,
        achados: [
          Ach({ tipo: "litiase", medidas_cm: [0.6], localizacao: "cálices inferiores" }),
          Ach({ tipo: "cisto_simples", medidas_cm: [0.8, 0.7, 0.6], localizacao: "terço inferior" }),
        ],
      }),
    }),
  );
  check(
    "múltiplos: dois achados na MESMA frase separados por ';'",
    /apresentando imagem hiperecoica, medindo 0,6 cm no seu maior eixo, situada em cálices inferiores, ocasionando sombra acústica; imagem anecóica, com margens regulares, medindo 0,8 x 0,7 x 0,6 cm, situada no terço inferior, ocasionando reforço acústico\./.test(l),
    l,
  );
  check("múltiplos: conclusão litíase + cisto", /Litíase no rim direito, em cálices inferiores\./.test(l) && /Cisto simples no rim direito, no terço inferior\./.test(l), l);
}

// ── Hidronefrose (INCORPORADA: imagens anecóicas no sistema pielocalicial) ──
{
  const l = renderViasUrinarias(
    F({
      rim_esquerdo: Rim({ medidas_cm: [11.0, 5.0, 5.5], hidronefrose: "moderada" }),
    }),
  );
  check(
    "hidronefrose: incorporada na frase do rim",
    /Rim esquerdo com diâmetros longitudinal e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando imagens anecóicas no sistema pielocalicial\./.test(l),
    l,
  );
  check("hidronefrose: conclusão 'Hidronefrose moderada grau 2 à esquerda'", /Hidronefrose moderada grau 2 à esquerda\./.test(l), l);
}

// ── Cisto renal simples (INCORPORADO; terço; reforço acústico) ──
{
  const l = renderViasUrinarias(
    F({
      rim_esquerdo: Rim({
        achados: [Ach({ tipo: "cisto_simples", medidas_cm: [2.0, 1.8, 1.7], localizacao: "terço superior" })],
      }),
    }),
  );
  check(
    "cisto simples: incorporado, anecóico, margens regulares, terço, reforço",
    /apresentando imagem anecóica, com margens regulares, medindo 2,0 x 1,8 x 1,7 cm, situada no terço superior, ocasionando reforço acústico\./.test(l),
    l,
  );
  check("cisto simples: conclusão 'Cisto simples no rim esquerdo'", /Cisto simples no rim esquerdo, no terço superior\./.test(l), l);
}

// ── Cisto complexo (conclusão reescrita: aspecto inespecífico) ──
{
  const l = renderViasUrinarias(
    F({
      rim_direito: Rim({
        achados: [Ach({ tipo: "cisto_complexo", caracteristica: "com calcificação periférica", medidas_cm: [3.0, 2.5, 2.4], localizacao: "terço médio" })],
      }),
    }),
  );
  check("cisto complexo: corpo incorpora a complexidade", /apresentando imagem cística, com calcificação periférica, medindo 3,0 x 2,5 x 2,4 cm, situada no terço médio\./.test(l), l);
  check("cisto complexo: NÃO chama de cisto simples no corpo", !/anecóica, com margens regulares/.test(l), l);
  check(
    "cisto complexo: conclusão reescrita 'aspecto inespecífico'",
    /Cisto no rim direito apresentando calcificação periférica, de aspecto inespecífico\./.test(l),
    l,
  );
  check("cisto complexo: conclusão NÃO usa 'Correlacionar com dados clínicos'", !/Imagem cística no rim direito/.test(l), l);
}

// ── Rim de situação/rotação alterada (dimensão discretamente reduzida) ──
{
  const l = renderViasUrinarias(
    F({
      rim_direito: Rim({
        dimensao: "reduzida_discreta",
        situacao_baixa: true,
        rotacao: true,
      }),
    }),
  );
  check(
    "situação/rotação: frase do rim",
    /Rim direito com diâmetros longitudinal e anteroposterior discretamente abaixo dos valores usuais, de situação baixa e com rotação, apresentando ecotextura do seio renal e ecotextura corticomedular normais\./.test(l),
    l,
  );
  check("situação/rotação: conclusão 'Rim direito de situação baixa e com rotação'", /Rim direito de situação baixa e com rotação\./.test(l), l);
}

// ── Doença renal crônica (DRC) ──
{
  const l = renderViasUrinarias(
    F({
      rim_direito: Rim({ drc: true, medidas_cm: [8.0, 3.5, 4.0], espessura_parenquima_cm: 0.9 }),
      rim_esquerdo: Rim({ drc: true, medidas_cm: [8.2, 3.6, 4.1], espessura_parenquima_cm: 1.0 }),
    }),
  );
  check(
    "DRC: frase do rim com dimensões reduzidas + diferenciação reduzida",
    /Rim direito com diâmetros longitudinal e anteroposterior reduzidos, medidos pelo flanco, apresentando ecotextura do seio renal e diferenciação corticomedular reduzidas\./.test(l),
    l,
  );
  check("DRC bilateral: conclusão item único 'Sinais de doença renal crônica.'", /Sinais de doença renal crônica\./.test(l), l);
  check("DRC bilateral: NÃO repete a frase longa por rim", !/Rim (direito|esquerdo) de dimensões reduzidas, com redução da diferenciação corticomedular/.test(l), l);
  check("DRC: rins NÃO 'ecograficamente normais'", !/Rins ecograficamente normais/.test(l), l);
}

// ── Resíduo pós-miccional + volume pré-miccional ──
{
  const l = renderViasUrinarias(
    F({ bexiga: Bex({ volume_pre_miccional_ml: 320, residuo_pos_miccional_ml: 85 }) }),
  );
  check("resíduo: corpo volume pré-miccional", /Volume pré-miccional de 320,0 mL\./.test(l), l);
  check("resíduo: conclusão resíduo pós-miccional cm³", /Resíduo pós-miccional de 85,0 cm³\./.test(l), l);
}

// ── Nódulo renal sólido ──
{
  const l = renderViasUrinarias(
    F({ rim_direito: Rim({ achados: [Ach({ tipo: "nodulo", medidas_cm: [2.2, 2.0, 1.9], localizacao: "no polo inferior" })] }) }),
  );
  check("nódulo: corpo incorpora imagem nodular sólida", /apresentando imagem nodular sólida, medindo 2,2 x 2,0 x 1,9 cm, situada no polo inferior\./.test(l), l);
  check("nódulo: conclusão 'a esclarecer'", /Imagem nodular sólida no rim direito, no polo inferior, a esclarecer\. Correlacionar com dados clínicos\./.test(l), l);
}

// ── Dilatação ureteral ──
{
  const l = renderViasUrinarias(
    F({ dilatacao_ureteral: true, dilatacao_ureteral_descricao: "Ureter direito de calibre aumentado" }),
  );
  check("ureter: corpo descrição", /Ureter direito de calibre aumentado\./.test(l), l);
  check("ureter: conclusão dilatação ureteral", /Dilatação ureteral \(Ureter direito de calibre aumentado\)\./.test(l), l);
  check("ureter: NÃO 'sem dilatação ureteral'", !/Não há sinais de dilatação ureteral/.test(l), l);
}

// ── Bexiga não avaliável ──
{
  const l = renderViasUrinarias(F({ bexiga: Bex({ avaliada: false }) }));
  check("bexiga não avaliável: corpo", /repleção insuficiente no momento do exame/.test(l), l);
  check("bexiga não avaliável: conclusão", /Bexiga com repleção insuficiente para adequada avaliação\./.test(l), l);
}

// ── Achados adicionais ──
{
  const l = renderViasUrinarias(F({ achados_adicionais: "Pequena quantidade de líquido livre na pelve." }));
  check("adicionais: aparece no corpo", /Pequena quantidade de líquido livre na pelve\./.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
