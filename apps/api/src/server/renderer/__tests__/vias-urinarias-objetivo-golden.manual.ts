/**
 * GOLDEN de render local de VIAS URINÁRIAS estilo OBJETIVO. Determinístico (sem
 * LLM): renderViasUrinarias(findings, { objetivo: true }) → asserções de
 * estrutura (TÉCNICA/ACHADOS/IMPRESSÃO), normal (silêncio → normalidade), e
 * descrição+impressão por tipo de achado.
 *
 * REGRA PRINCIPAL coberta (decisão Luiz, DIFERENTE do clássico): no objetivo a
 * frase do rim é ENXUTA — "Rim X de topografia, ecotextura do seio renal e
 * ecotextura corticomedular normais." (sem "diâmetros longitudinal e
 * anteroposterior") — e os achados vão em LINHAS SEPARADAS (um por linha,
 * capitalizados), seguidos das medidas do rim e do parênquima. Sequência fixa de
 * cada achado: imagem → ecogenicidade → tamanho → localização → fenômeno
 * acústico. Litíase → cálices; cisto → terço. Cobre também: hidronefrose em
 * linha própria, cisto complexo na impressão (aspecto inespecífico),
 * situação/rotação e DRC (bilateral → item único na impressão).
 *
 * Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/vias-urinarias-objetivo-golden.manual.ts
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

const render = (f: ViasUrinariasFindings) =>
  renderViasUrinarias(f, { objetivo: true });

// ── Estrutura objetivo (cabeçalhos) ──
{
  const l = render(F());
  check("estrutura: título 'ULTRASSONOGRAFIA DAS VIAS URINÁRIAS'", /^ULTRASSONOGRAFIA DAS VIAS URINÁRIAS/.test(l), l);
  check("estrutura: cabeçalho 'TÉCNICA:'", /\nTÉCNICA:\n/.test(l), l);
  check("estrutura: cabeçalho 'ACHADOS:'", /\nACHADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'IMPRESSÃO:'", /\nIMPRESSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(l), l);
  check("estrutura: técnica 'transdutor convexo multifrequencial'", /transdutor convexo multifrequencial/.test(l), l);
}

// ── Normal (silêncio → normalidade) ──
{
  const l = render(F());
  check("normal: rim direito frase enxuta (sem diâmetros)", /Rim direito de topografia, ecotextura do seio renal e ecotextura corticomedular normais\./.test(l), l);
  check("normal: rim esquerdo frase enxuta (sem diâmetros)", /Rim esquerdo de topografia, ecotextura do seio renal e ecotextura corticomedular normais\./.test(l), l);
  check("normal: objetivo NÃO usa 'diâmetros longitudinal e anteroposterior'", !/diâmetros longitudinal e anteroposterior/.test(l), l);
  check("normal: bexiga normal", /Bexiga de forma, contorno e ecotextura normais\./.test(l), l);
  check("normal: IMPRESSÃO 1. Rins ecograficamente normais", /1\. Rins ecograficamente normais\./.test(l), l);
  check("normal: IMPRESSÃO sem dilatação ureteral", /Não há sinais de dilatação ureteral\./.test(l), l);
  check("normal: IMPRESSÃO Bexiga ecograficamente normal", /Bexiga ecograficamente normal\./.test(l), l);
  check("normal: nenhum achado inventado", !/Litíase|Cisto|hidronefrose|Hidronefrose|nodular|Ectasia/i.test(l.split("IMPRESSÃO:")[0] ?? ""), l);
  check("normal: placeholder de medida do rim", /Medida do rim direito: ____ x ____ x ____ cm\./.test(l), l);
}

// ── Litíase renal (INCORPORADA na frase do rim; cálices; sombra acústica) ──
{
  const l = render(
    F({
      rim_direito: Rim({
        medidas_cm: [10.2, 4.8, 5.1],
        espessura_parenquima_cm: 1.6,
        achados: [Ach({ tipo: "litiase", medidas_cm: [0.6], localizacao: "cálices inferiores" })],
      }),
    }),
  );
  check(
    "litíase: frase do rim enxuta + achado em linha separada (capitalizado)",
    /Rim direito de topografia, ecotextura do seio renal e ecotextura corticomedular normais\.\nImagem hiperecoica, medindo 0,6 cm no seu maior eixo, situada em cálices inferiores, ocasionando sombra acústica\./.test(l),
    l,
  );
  check("litíase: impressão 'Litíase no rim direito, em cálices inferiores'", /Litíase no rim direito, em cálices inferiores\./.test(l), l);
  check("litíase: rins NÃO 'ecograficamente normais'", !/Rins ecograficamente normais/.test(l), l);
}

// ── Hidronefrose (INCORPORADA: imagens anecóicas no sistema pielocalicial) ──
{
  const l = render(
    F({
      rim_esquerdo: Rim({ medidas_cm: [11.0, 5.0, 5.5], hidronefrose: "moderada" }),
    }),
  );
  check(
    "hidronefrose: frase do rim enxuta + linha própria",
    /Rim esquerdo de topografia, ecotextura do seio renal e ecotextura corticomedular normais\.\nImagens anecóicas no sistema pielocalicial\./.test(l),
    l,
  );
  check("hidronefrose: impressão 'Hidronefrose moderada grau 2 à esquerda'", /Hidronefrose moderada grau 2 à esquerda\./.test(l), l);
}

// ── Cisto renal simples (INCORPORADO; terço; reforço acústico) ──
{
  const l = render(
    F({
      rim_esquerdo: Rim({
        achados: [Ach({ tipo: "cisto_simples", medidas_cm: [2.0, 1.8, 1.7], localizacao: "terço superior" })],
      }),
    }),
  );
  check(
    "cisto simples: linha separada, anecóico, margens regulares, terço, reforço",
    /\nImagem anecóica, com margens regulares, medindo 2,0 x 1,8 x 1,7 cm, situada no terço superior, ocasionando reforço acústico\./.test(l),
    l,
  );
  check("cisto simples: impressão 'Cisto simples no rim esquerdo, no terço superior'", /Cisto simples no rim esquerdo, no terço superior\./.test(l), l);
}

// ── Cisto complexo (impressão reescrita: aspecto inespecífico) ──
{
  const l = render(
    F({
      rim_direito: Rim({
        achados: [Ach({ tipo: "cisto_complexo", caracteristica: "com calcificação periférica", medidas_cm: [3.0, 2.5, 2.4], localizacao: "terço médio" })],
      }),
    }),
  );
  check("cisto complexo: linha separada com a complexidade", /\nImagem cística, com calcificação periférica, medindo 3,0 x 2,5 x 2,4 cm, situada no terço médio\./.test(l), l);
  check(
    "cisto complexo: impressão reescrita 'aspecto inespecífico'",
    /Cisto no rim direito apresentando calcificação periférica, de aspecto inespecífico\./.test(l),
    l,
  );
}

// ── Múltiplos achados no MESMO rim (separados por ponto e vírgula) ──
{
  const l = render(
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
    "múltiplos: dois achados em LINHAS SEPARADAS (uma por achado)",
    /\nImagem hiperecoica, medindo 0,6 cm no seu maior eixo, situada em cálices inferiores, ocasionando sombra acústica\.\nImagem anecóica, com margens regulares, medindo 0,8 x 0,7 x 0,6 cm, situada no terço inferior, ocasionando reforço acústico\./.test(l),
    l,
  );
}

// ── Rim de situação/rotação alterada ──
{
  const l = render(
    F({
      rim_direito: Rim({
        dimensao: "reduzida_discreta",
        situacao_baixa: true,
        rotacao: true,
      }),
    }),
  );
  check(
    "situação/rotação: frase enxuta com dimensão + situação/rotação",
    /Rim direito de dimensões discretamente reduzidas, de situação baixa e com rotação, de topografia, ecotextura do seio renal e ecotextura corticomedular normais\./.test(l),
    l,
  );
  check("situação/rotação: impressão 'Rim direito de situação baixa e com rotação'", /Rim direito de situação baixa e com rotação\./.test(l), l);
}

// ── Doença renal crônica (DRC) bilateral → item único ──
{
  const l = render(
    F({
      rim_direito: Rim({ drc: true, medidas_cm: [8.0, 3.5, 4.0], espessura_parenquima_cm: 0.9 }),
      rim_esquerdo: Rim({ drc: true, medidas_cm: [8.2, 3.6, 4.1], espessura_parenquima_cm: 1.0 }),
    }),
  );
  check(
    "DRC: frase enxuta com dimensões reduzidas + diferenciação reduzida",
    /Rim direito de dimensões reduzidas, com redução da diferenciação corticomedular\./.test(l),
    l,
  );
  check("DRC bilateral: impressão item único 'Sinais de doença renal crônica.'", /Sinais de doença renal crônica\./.test(l), l);
  {
    const impressao = l.split("IMPRESSÃO:")[1] ?? "";
    const ocorrencias = (impressao.match(/doença renal crônica/gi) ?? []).length;
    check("DRC bilateral: impressão NÃO repete DRC por rim (1 ocorrência)", ocorrencias === 1, `ocorrências=${ocorrencias}\n${l}`);
  }
}

// ── Nódulo renal sólido ──
{
  const l = render(
    F({ rim_direito: Rim({ achados: [Ach({ tipo: "nodulo", medidas_cm: [2.2, 2.0, 1.9], localizacao: "no polo inferior" })] }) }),
  );
  check("nódulo: linha separada imagem nodular sólida", /\nImagem nodular sólida, medindo 2,2 x 2,0 x 1,9 cm, situada no polo inferior\./.test(l), l);
  check("nódulo: impressão 'a esclarecer'", /Imagem nodular sólida no rim direito, no polo inferior, a esclarecer\. Correlacionar com dados clínicos\./.test(l), l);
}

// ── Resíduo pós-miccional + volume pré-miccional ──
{
  const l = render(
    F({ bexiga: Bex({ volume_pre_miccional_ml: 320, residuo_pos_miccional_ml: 85 }) }),
  );
  check("resíduo: corpo volume pré-miccional", /Volume pré-miccional de 320,0 mL\./.test(l), l);
  check("resíduo: impressão resíduo pós-miccional cm³", /Resíduo pós-miccional de 85,0 cm³\./.test(l), l);
}

// ── Bexiga não avaliável ──
{
  const l = render(F({ bexiga: Bex({ avaliada: false }) }));
  check("bexiga não avaliável: corpo", /repleção insuficiente no momento do exame/.test(l), l);
  check("bexiga não avaliável: impressão", /Bexiga com repleção insuficiente para adequada avaliação\./.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
