/**
 * GOLDEN de render local de ABDOME SUPERIOR estilo OBJETIVO. Determinístico (sem
 * LLM): renderAbdomenSuperior(findings, { objetivo: true }) → asserções de
 * estrutura (TÉCNICA/ACHADOS/IMPRESSÃO), normal (silêncio → normalidade), e
 * descrição+conclusão por achado (esteatose por grau, litíase vesicular única/
 * múltipla, cisto hepático, ateromatose, colecistectomia). Reusa a clínica do
 * ABDOMEN_TOTAL (renderOrgan, mesmas frases do clássico). É o abdome superior:
 * sem rins/bexiga. Falha = regressão de uma decisão aprovada.
 * Rodar: tsx src/server/renderer/__tests__/abdomen-superior-objetivo-golden.manual.ts
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

const render = (f: AbdomenSuperiorFindings) => renderAbdomenSuperior(f, { objetivo: true });

// ── Estrutura objetiva (cabeçalhos) ──
{
  const l = render(F({}));
  check("estrutura: título 'ULTRASSONOGRAFIA DE ABDOME SUPERIOR'", /^ULTRASSONOGRAFIA DE ABDOME SUPERIOR/.test(l), l);
  check("estrutura: cabeçalho 'TÉCNICA:'", /\nTÉCNICA:\n/.test(l), l);
  check("estrutura: cabeçalho 'ACHADOS:'", /\nACHADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'IMPRESSÃO:'", /\nIMPRESSÃO:\n?/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos clássicos", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:|ANÁLISE:|OPINIÃO/.test(l), l);
  check("estrutura: transdutor convexo multifrequencial", /transdutor convexo multifrequencial/.test(l), l);
  check("estrutura: NÃO menciona rins", !/[Rr]im |[Rr]enal|[Rr]ins/.test(l), l);
  check("estrutura: NÃO menciona bexiga", !/[Bb]exiga|miccional/.test(l), l);
}

// ── Normal (silêncio → normalidade) ──
{
  const l = render(F({}));
  check("normal: fígado normal", /Fígado com forma, dimensões e contornos preservados\./.test(l), l);
  check("normal: parênquima hepático homogêneo", /Parênquima hepático com ecotextura homogênea\./.test(l), l);
  check("normal: veia porta pérvia", /Veia porta pérvia, de calibre preservado\./.test(l), l);
  check("normal: vias biliares sem dilatação", /Vias biliares intra e extra-hepáticas sem sinais de dilatação\./.test(l), l);
  check("normal: vesícula sem cálculos", /Vesícula biliar de topografia usual e parede fina, com conteúdo anecoico\./.test(l), l);
  check("normal: pâncreas normal", /Pâncreas com morfologia e ecotextura normais\./.test(l), l);
  check("normal: baço normal", /Baço com forma, dimensões e contornos preservados\./.test(l), l);
  check("normal: aorta normal", /Aorta com trajeto, calibre e contornos preservados\./.test(l), l);
  check("normal: veia cava normal", /Veia cava inferior de calibre normal\./.test(l), l);
  check("normal: impressão sem alterações", /Estudo ultrassonográfico do abdome superior sem alterações significativas\./.test(l), l);
  check("normal: nenhum achado inventado", !/[Ee]steatose|[Ll]itíase|[Cc]isto|ateroma/.test(l), l);
  // Ordem fixa: fígado < vias biliares < vesícula < pâncreas < baço < aorta.
  const idx = (s: string) => l.indexOf(s);
  check(
    "normal: ordem fixa dos órgãos",
    idx("Fígado") < idx("Vias biliares") && idx("Vias biliares") < idx("Vesícula") && idx("Vesícula") < idx("Pâncreas") && idx("Pâncreas") < idx("Baço") && idx("Baço") < idx("Aorta"),
    l,
  );
}

// ── Esteatose hepática leve ──
{
  const l = render(F({ figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "leve" })] } }));
  check("esteatose leve: corpo discreto aumento", /discreto aumento da ecogenicidade parenquimatosa/.test(l), l);
  check("esteatose leve: impressão grau leve", /Esteatose hepática, grau leve\./.test(l), l);
}

// ── Esteatose hepática moderada ──
{
  const l = render(F({ figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "moderado" })] } }));
  check("esteatose moderada: aumento difuso + atenuação", /aumento difuso da ecogenicidade parenquimatosa e atenuação sonora/.test(l), l);
  check("esteatose moderada: impressão grau moderado", /Esteatose hepática, grau moderado\./.test(l), l);
}

// ── Cisto hepático ──
{
  const l = render(
    F({
      figado: {
        status: "alterado",
        achados: [Fnd({ tipo: "cisto_simples", medidas_cm: [1.2, 1.0], localizacao: "segmento VII" })],
      },
    }),
  );
  check("cisto: corpo imagem anecoica homogênea", /Imagem anecoica homogênea, com margem regular, medindo 1,2 x 1 cm, situada no segmento VII\./.test(l), l);
  check("cisto: impressão cisto hepático sem septações", /Cisto hepático sem septações no segmento VII\./.test(l), l);
}

// ── Litíase vesicular única ──
{
  const l = render(
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
  check("litíase única: impressão", /Litíase da vesícula biliar\./.test(l), l);
}

// ── Litíase vesicular múltipla ──
{
  const l = render(
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

// ── Colecistectomia (NÃO entra na impressão) ──
{
  const l = render(F({ vesicula: { status: "ausente_cirurgico", achados: [] } }));
  check("colecistectomia: corpo ausência da vesícula", /Ausência da imagem da vesícula biliar \(paciente submetida à colecistectomia\)\./.test(l), l);
  check("colecistectomia: NÃO entra na impressão (todos normais)", /Estudo ultrassonográfico do abdome superior sem alterações significativas\./.test(l), l);
}

// ── Ateromatose da aorta ──
{
  const l = render(F({ aorta: { status: "alterado", achados: [Fnd({ tipo: "ateromatose" })] } }));
  check("ateromatose: corpo imagens hiperecoicas aderidas", /Aorta abdominal de calibre normal, apresentando imagens hiperecoicas aderidas às suas paredes\./.test(l), l);
  check("ateromatose: impressão placas de ateromas", /Placas de ateromas na aorta abdominal\./.test(l), l);
}

// ── Pâncreas não avaliável por gases ──
{
  const l = render(F({ pancreas: { status: "nao_avaliado_gases", achados: [] } }));
  check("gases: pâncreas visualizado parcialmente", /Pâncreas visualizado parcialmente devido à interposição de gases intestinais\./.test(l), l);
}

// ── Múltiplos achados → IMPRESSÃO numerada ──
{
  const l = render(
    F({
      figado: { status: "alterado", achados: [Fnd({ tipo: "esteatose", grau: "leve" })] },
      vesicula: { status: "alterado", achados: [Fnd({ tipo: "litiase", quantidade: "unica", medidas_cm: [0.9] })] },
      aorta: { status: "alterado", achados: [Fnd({ tipo: "ateromatose" })] },
    }),
  );
  check("múltiplos: item 1 esteatose", /1\. Esteatose hepática, grau leve\./.test(l), l);
  check("múltiplos: item 2 litíase", /2\. Litíase da vesícula biliar\./.test(l), l);
  check("múltiplos: item 3 ateromatose", /3\. Placas de ateromas na aorta abdominal\./.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
