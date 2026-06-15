/**
 * GOLDEN de render local de ABDOME SUPERIOR estilo CLÁSSICO. Determinístico (sem
 * LLM): renderAbdomenSuperior(findings) → asserções de estrutura (cabeçalhos
 * Clássico), normal (silêncio → normalidade), e descrição+conclusão por achado
 * (esteatose por grau, litíase vesicular única/múltipla, cisto hepático,
 * ateromatose, colecistectomia). Reusa a clínica do ABDOMEN_TOTAL.
 * Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/abdomen-superior-golden.manual.ts
 */
import {
  renderAbdomenSuperior,
  type AbdomenSuperiorFindings,
} from "../categories/ABDOMEN_SUPERIOR";

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

type OrganState = AbdomenSuperiorFindings["orgaos"]["figado"];
type Finding = OrganState["achados"][number];

const Fnd = (p: Partial<Finding> & { tipo: Finding["tipo"] }): Finding => ({
  grau: null,
  quantidade: null,
  lateralidade: null,
  mobilidade: null,
  localizacao: null,
  medidas_cm: null,
  valor_ml: null,
  termo_do_medico: null,
  descricao_livre: null,
  ...p,
});

const normal: OrganState = { status: "normal", achados: [] };

const F = (over: Partial<AbdomenSuperiorFindings["orgaos"]>): AbdomenSuperiorFindings => ({
  orgaos: {
    figado: normal,
    veia_porta: normal,
    vesicula: normal,
    vias_biliares: normal,
    baco: normal,
    pancreas: normal,
    aorta: normal,
    veia_cava: normal,
    ...over,
  },
  observacoes_do_medico: null,
});

// ── Estrutura clássica (cabeçalhos) ──
{
  const l = renderAbdomenSuperior(F({}));
  check("estrutura: título 'ULTRASSONOGRAFIA DO ABDOME SUPERIOR'", /^ULTRASSONOGRAFIA DO ABDOME SUPERIOR/.test(l), l);
  check("estrutura: cabeçalho 'COMENTÁRIOS:'", /\nCOMENTÁRIOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:'", /\nOS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'CONCLUSÃO:'", /\nCONCLUSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do objetivo", !/TÉCNICA:|ACHADOS:|IMPRESSÃO:/.test(l), l);
  check("estrutura: transdutor de 4.0 MHz", /transdutor de 4\.0 MHz/.test(l), l);
  check("estrutura: NÃO menciona rins", !/[Rr]im |[Rr]enal|[Rr]ins/.test(l), l);
  check("estrutura: NÃO menciona bexiga", !/[Bb]exiga|miccional/.test(l), l);
}

// ── Normal (silêncio → normalidade) ──
{
  const l = renderAbdomenSuperior(F({}));
  check("normal: fígado normal", /Fígado de dimensões normais, contornos regulares e ecotextura homogênea\./.test(l), l);
  check("normal: vasos intra-hepáticos", /Os vasos intra-hepáticos são bem visíveis e de calibre anatômico\./.test(l), l);
  check("normal: veia porta", /Veia porta de calibre normal\./.test(l), l);
  check("normal: vesícula sem cálculo", /Vesícula biliar de topografia usual e de parede fina, sem cálculo\./.test(l), l);
  check("normal: vias biliares", /Canal hepático e canal colédoco de calibre normal\./.test(l), l);
  check("normal: pâncreas", /Pâncreas de ecotextura habitual para a faixa etária\./.test(l), l);
  check("normal: baço", /Baço de dimensões normais e ecotextura sólida e homogênea\./.test(l), l);
  check("normal: aorta", /Aorta abdominal de calibre e contornos normais\./.test(l), l);
  check("normal: veia cava", /Veia cava inferior de calibre e contornos normais\./.test(l), l);
  check("normal: conclusão 'sem evidência de alterações'", /Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas\./.test(l), l);
  check("normal: nenhum achado inventado", !/[Ee]steatose|[Ll]itíase|[Cc]isto|ateroma|esclarecer/.test(l), l);
}

// ── Esteatose hepática leve ──
{
  const l = renderAbdomenSuperior(
    F({ figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "leve" })] } }),
  );
  check("esteatose leve: corpo discreto aumento", /discreto aumento da ecogenicidade parenquimatosa/.test(l), l);
  check("esteatose leve: conclusão grau leve", /Esteatose hepática, grau leve\./.test(l), l);
  check("esteatose leve: conclusão numerada com fechamento", /1\. Esteatose hepática, grau leve\./.test(l) && /Demais órgãos e estruturas abdominais/.test(l), l);
}

// ── Esteatose hepática moderada ──
{
  const l = renderAbdomenSuperior(
    F({ figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "moderado" })] } }),
  );
  check("esteatose moderada: aumento difuso + atenuação", /aumento difuso da ecogenicidade parenquimatosa e atenuação sonora/.test(l), l);
  check("esteatose moderada: conclusão grau moderado", /Esteatose hepática, grau moderado\./.test(l), l);
}

// ── Cisto hepático ──
{
  const l = renderAbdomenSuperior(
    F({
      figado: {
        status: "alterado",
        achados: [Fnd({ tipo: "cisto_simples", medidas_cm: [1.2, 1.0], localizacao: "segmento VII" })],
      },
    }),
  );
  // formatNumberPtBr (helper reusado do ABDOMEN_TOTAL) preserva inteiros ditados: 1.0 → "1".
  check("cisto: corpo imagem anecoica homogênea", /Imagem anecoica homogênea, com margem regular, medindo 1,2 x 1 cm, situada no segmento VII\./.test(l), l);
  check("cisto: conclusão cisto hepático sem septações", /Cisto hepático sem septações no segmento VII\./.test(l), l);
}

// ── Litíase vesicular única ──
{
  const l = renderAbdomenSuperior(
    F({
      vesicula: {
        status: "alterado",
        achados: [Fnd({ tipo: "litiase", quantidade: "unica", medidas_cm: [0.8] })],
      },
    }),
  );
  check("litíase única: prefixo topografia usual e parede fina", /Vesícula biliar de topografia usual e parede fina, apresentando imagem hiperecoica/.test(l), l);
  check("litíase única: móvel à mudança de decúbito (default)", /móvel à mudança de decúbito/.test(l), l);
  check("litíase única: ocasionando sombra acústica", /ocasionando sombra acústica\./.test(l), l);
  check("litíase única: conclusão", /Litíase da vesícula biliar\./.test(l), l);
}

// ── Litíase vesicular múltipla ──
{
  const l = renderAbdomenSuperior(
    F({
      vesicula: {
        status: "alterado",
        achados: [Fnd({ tipo: "litiase", quantidade: "multiplas", medidas_cm: [0.4] })],
      },
    }),
  );
  check("litíase múltipla: múltiplas imagens hiperecoicas", /apresentando múltiplas imagens hiperecoicas, móveis à mudança de decúbito/.test(l), l);
  check("litíase múltipla: ocasionando sombras acústicas", /ocasionando sombras acústicas\./.test(l), l);
}

// ── Colecistectomia (NÃO entra na conclusão) ──
{
  const l = renderAbdomenSuperior(F({ vesicula: { status: "ausente_cirurgico", achados: [] } }));
  check("colecistectomia: corpo ausência da vesícula", /Ausência da imagem da vesícula biliar \(paciente submetida à colecistectomia\)\./.test(l), l);
  check("colecistectomia: NÃO entra na conclusão (todos normais)", /Órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas\./.test(l), l);
}

// ── Ateromatose da aorta ──
{
  const l = renderAbdomenSuperior(
    F({ aorta: { status: "alterado", achados: [Fnd({ tipo: "ateromatose" })] } }),
  );
  check("ateromatose: corpo imagens hiperecoicas aderidas", /Aorta abdominal de calibre normal, apresentando imagens hiperecoicas aderidas às suas paredes\./.test(l), l);
  check("ateromatose: conclusão placas de ateromas", /Placas de ateromas na aorta abdominal\./.test(l), l);
}

// ── Pâncreas não avaliável por gases ──
{
  const l = renderAbdomenSuperior(F({ pancreas: { status: "nao_avaliado_gases", achados: [] } }));
  check("gases: pâncreas visualizado parcialmente", /Pâncreas visualizado parcialmente devido à interposição de gases intestinais\./.test(l), l);
}

// ── Múltiplos achados → conclusão numerada com fechamento ──
{
  const l = renderAbdomenSuperior(
    F({
      figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "leve" })] },
      vesicula: { status: "alterado", achados: [Fnd({ tipo: "litiase", quantidade: "unica", medidas_cm: [0.9] })] },
    }),
  );
  check("múltiplos: item 1 esteatose", /1\. Esteatose hepática, grau leve\./.test(l), l);
  check("múltiplos: item 2 litíase", /2\. Litíase da vesícula biliar\./.test(l), l);
  check("múltiplos: fechamento numerado", /3\. Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas\./.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
