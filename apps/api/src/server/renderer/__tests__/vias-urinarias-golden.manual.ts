/**
 * GOLDEN de render local de VIAS URINÁRIAS estilo CLÁSSICO. Determinístico (sem LLM):
 * renderViasUrinarias(findings) → asserções de estrutura (cabeçalhos Clássico),
 * normal (silêncio → normalidade), e descrição+conclusão por tipo de achado.
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
  check("normal: rim direito normal", /Rim direito com diâmetros longitudinais e anteroposterior dentro dos limites normais/.test(l), l);
  check("normal: rim esquerdo normal", /Rim esquerdo com diâmetros longitudinais e anteroposterior dentro dos limites normais/.test(l), l);
  check("normal: córtico-medular", /ecotextura córtico-medular normais/.test(l), l);
  check("normal: bexiga normal", /Bexiga de forma, contorno e ecotextura normais\./.test(l), l);
  check("normal: conclusão 1) Rins ecograficamente normais", /1\) Rins ecograficamente normais\./.test(l), l);
  check("normal: conclusão 2) sem dilatação ureteral", /2\) Não há sinais de dilatação ureteral\./.test(l), l);
  check("normal: conclusão 3) Bexiga ecograficamente normal", /3\) Bexiga ecograficamente normal\./.test(l), l);
  check("normal: nenhum achado inventado", !/Litíase|Cisto|hidronefrose|Hidronefrose|nodular|Ectasia/i.test(l.split("CONCLUSÃO:")[0] ?? ""), l);
  check("normal: placeholder de medida do rim", /Medida do rim direito: ____ x ____ x ____ cm\./.test(l), l);
}

// ── Litíase renal ──
{
  const l = renderViasUrinarias(
    F({
      rim_direito: Rim({
        medidas_cm: [10.2, 4.8, 5.1],
        espessura_parenquima_cm: 1.6,
        achados: [Ach({ tipo: "litiase", medidas_cm: [0.6], localizacao: "em cálices inferiores" })],
      }),
    }),
  );
  check("litíase: corpo imagem hiperecoica com sombra", /imagem hiperecoica com sombra acústica posterior/.test(l), l);
  check("litíase: medida única 0,6 cm", /medindo 0,6 cm no seu maior eixo/.test(l), l);
  check("litíase: localização", /situada em cálices inferiores/.test(l), l);
  check("litíase: conclusão 'Litíase no rim direito'", /Litíase no rim direito em cálices inferiores\./.test(l), l);
  check("litíase: rins NÃO 'ecograficamente normais'", !/Rins ecograficamente normais/.test(l), l);
}

// ── Hidronefrose ──
{
  const l = renderViasUrinarias(
    F({
      rim_esquerdo: Rim({ medidas_cm: [11.0, 5.0, 5.5], hidronefrose: "moderada" }),
    }),
  );
  check("hidronefrose: corpo dilatação pielocalicial grau II", /Dilatação do sistema pielocalicial do rim esquerdo, de grau moderada \(grau II\)\./.test(l), l);
  check("hidronefrose: conclusão 'Hidronefrose moderada à esquerda'", /Hidronefrose moderada \(grau II\) à esquerda\./.test(l), l);
}

// ── Cisto renal simples ──
{
  const l = renderViasUrinarias(
    F({
      rim_esquerdo: Rim({
        achados: [Ach({ tipo: "cisto_simples", medidas_cm: [2.0, 1.8, 1.7], localizacao: "no polo superior" })],
      }),
    }),
  );
  check("cisto: corpo imagem anecoica homogênea, margem regular", /apresentando imagem anecoica homogênea, com margem regular, medindo 2,0 x 1,8 x 1,7 cm/.test(l), l);
  check("cisto: conclusão 'Cisto simples no rim esquerdo'", /Cisto simples no rim esquerdo no polo superior\./.test(l), l);
}

// ── Cisto complexo (não chamar de simples) ──
{
  const l = renderViasUrinarias(
    F({
      rim_direito: Rim({
        achados: [Ach({ tipo: "cisto_complexo", caracteristica: "com calcificação periférica", medidas_cm: [3.0, 2.5, 2.4], localizacao: "no terço médio" })],
      }),
    }),
  );
  check("cisto complexo: corpo com a complexidade", /apresentando imagem cística, com calcificação periférica/.test(l), l);
  check("cisto complexo: NÃO chama de cisto simples no corpo", !/anecoica homogênea/.test(l), l);
  check("cisto complexo: conclusão 'Imagem cística no rim direito'", /Imagem cística no rim direito com calcificação periférica\./.test(l), l);
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
  check("nódulo: corpo imagem nodular sólida", /apresentando imagem nodular sólida, medindo 2,2 x 2,0 x 1,9 cm/.test(l), l);
  check("nódulo: conclusão 'a esclarecer'", /Imagem nodular sólida no rim direito no polo inferior, a esclarecer\. Correlacionar com dados clínicos\./.test(l), l);
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
