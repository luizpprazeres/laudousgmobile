/**
 * GOLDEN do render ABDOMEN_TOTAL estilo OBJETIVO (Sprint 3). Determinístico:
 * monta o laudo objetivo (TÉCNICA/ACHADOS/IMPRESSÃO) a partir de achados tipados,
 * exatamente como o pipeline faz APÓS a extração e os free-slots — aqui os casos
 * usam só o catálogo (sem achados "outro"), então não há LLM secundário. Valida:
 * estrutura objetiva, ordem fixa dos órgãos, frases de órgão reusadas (mesmas do
 * clássico), conclusão → IMPRESSÃO, 1 casa decimal. Falha = regressão.
 * Rodar: tsx src/server/renderer/__tests__/abdomen-objetivo-golden.manual.ts
 */
import {
  renderOrgan,
  renderExtraAbdominal,
  assembleAbdomenObjetivo,
  type OrganRender,
  type FreeSlotRenderedAbdomen,
} from "../phrases/ABDOMEN_TOTAL";
import {
  ABDOMEN_ORGAN_KEYS,
  type AbdomenOrganKey,
  type AbdomenTotalFindings,
  type AbdomenOrganState,
  type AbdomenFinding,
} from "../findingsSchemas/ABDOMEN_TOTAL";

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

const finding = (p: Partial<AbdomenFinding>): AbdomenFinding => ({
  tipo: "outro",
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

const NORMAL: AbdomenOrganState = { status: "normal", achados: [] };

/** Constrói findings com todos os órgãos normais, mesclando overrides. */
function F(
  overrides: Partial<Record<AbdomenOrganKey, AbdomenOrganState>>,
  extra: AbdomenFinding[] = [],
): AbdomenTotalFindings {
  const orgaos = Object.fromEntries(
    ABDOMEN_ORGAN_KEYS.map((k) => [k, overrides[k] ?? NORMAL]),
  ) as AbdomenTotalFindings["orgaos"];
  return { orgaos, achados_extra_abdominais: extra, observacoes_do_medico: null };
}

/** Replica a montagem do pipeline (sem free-slots — casos só catálogo). */
function render(f: AbdomenTotalFindings): string {
  const organRenders = new Map<AbdomenOrganKey, OrganRender>();
  for (const organ of ABDOMEN_ORGAN_KEYS) {
    organRenders.set(organ, renderOrgan(organ, f.orgaos[organ]));
  }
  const extraRenders = f.achados_extra_abdominais.map(renderExtraAbdominal);
  return assembleAbdomenObjetivo({
    organRenders,
    freeByOrgan: new Map<string, FreeSlotRenderedAbdomen[]>(),
    extraRenders,
    allOrganKeys: ABDOMEN_ORGAN_KEYS,
  });
}

// ── 1. Abdome totalmente normal ──
{
  const l = render(F({}));
  check("normal: título", /ULTRASSONOGRAFIA DE ABDOME TOTAL/.test(l), l);
  check("normal: TÉCNICA:", /\nTÉCNICA:\n/.test(l), l);
  check("normal: ACHADOS:", /\nACHADOS:\n/.test(l), l);
  check("normal: IMPRESSÃO:", /\nIMPRESSÃO:\n?/.test(l), l);
  check("normal: NÃO usa cabeçalhos clássicos", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:|OPINIÃO:|ANÁLISE:/.test(l), l);
  check("normal: fígado normal", /Fígado com forma, dimensões e contornos preservados\./.test(l), l);
  check("normal: vesícula normal", /Vesícula biliar de topografia usual e parede fina/.test(l), l);
  check("normal: bexiga normal", /Bexiga com adequada repleção/.test(l), l);
  check("normal: impressão sem alterações", /Estudo ultrassonográfico do abdome sem alterações significativas\./.test(l), l);
  // Ordem fixa: fígado antes de vesícula antes de baço antes de rins antes de aorta antes de bexiga.
  const idx = (s: string) => l.indexOf(s);
  check(
    "normal: ordem fixa dos órgãos",
    idx("Fígado") < idx("Vesícula") && idx("Vesícula") < idx("Baço") && idx("Baço") < idx("Rim direito") && idx("Rim direito") < idx("Aorta") && idx("Aorta") < idx("Bexiga"),
    l,
  );
}

// ── 2. Esteatose moderada (frase de órgão reusada do clássico) ──
{
  const l = render(F({ figado: { status: "alterado", achados: [finding({ tipo: "esteatose", grau: "moderado" })] } }));
  check("esteatose: corpo aumento difuso da ecogenicidade", /aumento difuso da ecogenicidade parenquimatosa/.test(l), l);
  check("esteatose: impressão", /Esteatose hepática, grau moderado\./.test(l), l);
}

// ── 3. Litíase vesicular única (1 casa, frase reusada) ──
{
  const l = render(F({ vesicula: { status: "alterado", achados: [finding({ tipo: "litiase", quantidade: "unica", medidas_cm: [1.2] })] } }));
  check("litíase vesícula: corpo imagem hiperecoica", /apresentando imagem hiperecoica.*ocasionando sombra acústica/.test(l), l);
  check("litíase vesícula: 1 casa '1,2 centímetros'", /1,2 centímetros/.test(l), l);
  check("litíase vesícula: impressão", /Litíase da vesícula biliar\./.test(l), l);
}

// ── 4. Cisto renal simples direito ──
{
  const l = render(F({ rim_direito: { status: "alterado", achados: [finding({ tipo: "cisto_simples", medidas_cm: [2.1, 1.8, 1.6], localizacao: "terço médio" })] } }));
  check("cisto renal: corpo imagem anecoica", /apresentando imagem anecoica homogênea, com margem regular/.test(l), l);
  check("cisto renal: 1 casa '2,1 x 1,8 x 1,6 cm'", /2,1 x 1,8 x 1,6 cm/.test(l), l);
  check("cisto renal: impressão", /Cisto simples no rim direito\./.test(l), l);
}

// ── 5. Múltiplos achados → IMPRESSÃO numerada na ordem fixa ──
{
  const l = render(
    F({
      figado: { status: "alterado", achados: [finding({ tipo: "esteatose", grau: "leve" })] },
      vesicula: { status: "alterado", achados: [finding({ tipo: "litiase", quantidade: "unica", medidas_cm: [0.8] })] },
    }),
  );
  check("multi: impressão numerada", /1\. Esteatose hepática, grau leve\.\n2\. Litíase da vesícula biliar\./.test(l), l);
}

// ── 6. Colecistectomia (frase de órgão, sem conclusão) ──
{
  const l = render(F({ vesicula: { status: "ausente_cirurgico", achados: [] } }));
  check("colecistectomia: corpo", /Ausência da imagem da vesícula biliar \(paciente submetida à colecistectomia\)\./.test(l), l);
  check("colecistectomia: NÃO na impressão", /Estudo ultrassonográfico do abdome sem alterações significativas\./.test(l), l);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
