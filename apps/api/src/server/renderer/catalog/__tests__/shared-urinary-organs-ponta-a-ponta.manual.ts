import assert from "node:assert/strict";
import { renderizarSelecao } from "../alteracoes";
import { adaptarAbdome } from "../../../../../../web/src/lib/catalog/abdomeParaCatalogo";
import { adaptarPelve } from "../../../../../../web/src/lib/catalog/pelveParaCatalogo";
import { adaptarProstataSuprapubica } from "../../../../../../web/src/lib/catalog/prostataParaCatalogo";
import { adaptarViasUrinarias } from "../../../../../../web/src/lib/catalog/viasUrinariasParaCatalogo";
import {
  abdomeTotal,
  pelveFeminina,
  prostataSuprapubica,
  viasUrinarias,
  type ExamCategory,
} from "../../../../../../web/src/lib/deterministic";

type State = Record<string, unknown>;

const ABDOMEN_TEMPLATE = [
  "ULTRASSONOGRAFIA DE ABDOME TOTAL",
  ...["figado", "veia_porta", "vesicula", "vias_biliares", "baco", "pancreas", "rim_direito", "rim_esquerdo", "veia_cava", "aorta", "bexiga"]
    .map((organ) => `{{orgao:${organ}|${organ} sem alterações.}}`),
  "{{extra_abdominais}}",
  "CONCLUSÃO:",
  "{{conclusao}}",
].join("\n");

function initial(category: ExamCategory): State {
  return Object.fromEntries(category.sections.flatMap((section) => section.module ? [[section.id, section.module.initialState()]] : []));
}

function patch(state: State, section: string, values: State): State {
  return { ...state, [section]: { ...((state[section] as State | undefined) ?? {}), ...values } };
}

function render(category: string, data: Record<string, unknown>, templateBody?: string, style = "CLASSICO_COMPLETO"): string {
  const result = renderizarSelecao(category, style, [], data, templateBody ? { templateBody } : undefined);
  assert.equal(result.ok, true, `${category} deveria renderizar: ${JSON.stringify(result)}`);
  return (result as { ok: true; texto: string }).texto;
}

function noBlockingPending(result: { pendencias: Array<{ bloqueia?: boolean; motivo: string }> }): void {
  assert.deepEqual(result.pendencias.filter((item) => item.bloqueia), []);
}

let checks = 0;
const check = (name: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`✓ ${name}`);
};

check("estado inicial não preenche medidas não obtidas nem cria placeholders no fluxo compartilhado", () => {
  const adapted = adaptarViasUrinarias(initial(viasUrinarias));
  noBlockingPending(adapted);
  const kidneys = adapted.dados.rins_detalhados;
  assert.equal(kidneys.direito.medidas_cm, null);
  assert.equal(kidneys.esquerdo.espessura_parenquima_cm, null);
  assert.equal(adapted.dados.bexiga_detalhada.volume_pre_miccional_ml, null);
  const report = render("VIAS_URINARIAS", adapted.dados);
  assert.doesNotMatch(report, /____/);
});

check("mesma seleção vesical atravessa Abdome e Vias com precisão, lado e repleção preservados", () => {
  const bladder = {
    replecao: "moderada",
    parede: "normal",
    conteudo: ["calculo"],
    "conteudo.calculo.dimensao": "0,5 mm",
    "conteudo.calculo.mobilidade": "juv",
    "conteudo.calculo.lado": "direita",
    "conteudo.calculo.multiplicidade": "unico",
    jatos: "ausencia_unilateral",
    "jatos.ausencia_unilateral.lado": "esquerda",
    "jatos.ausencia_unilateral.calculo_mm": "0,5 cm",
  };
  const abdomen = adaptarAbdome(patch(initial(abdomeTotal), "bexiga", bladder));
  const vias = adaptarViasUrinarias(patch(initial(viasUrinarias), "bexiga", bladder));
  noBlockingPending(abdomen);
  noBlockingPending(vias);
  const abdomenReport = render("ABDOMEN_TOTAL", abdomen.dados, ABDOMEN_TEMPLATE);
  const viasReport = render("VIAS_URINARIAS", vias.dados);
  for (const report of [abdomenReport, viasReport]) {
    assert.match(report, /repleção moderada/i);
    assert.match(report, /0,05 cm/);
    assert.match(report, /junção ureterovesical direita/i);
    assert.match(report, /não observado à esquerda/i);
    assert.match(report, /5 mm/);
    assert.doesNotMatch(report, /adequada repleção/i);
    assert.doesNotMatch(report, /Bexiga ecograficamente normal/i);
  }
});

check("repleção pequena aparece e não vira normalidade global vesical", () => {
  const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "bexiga", { replecao: "pequena" }));
  noBlockingPending(adapted);
  const report = render("VIAS_URINARIAS", adapted.dados);
  assert.match(report, /pequena repleção/i);
  assert.doesNotMatch(report, /Bexiga ecograficamente normal/i);
});

check("normal, insuficiente e vazia permanecem estados distintos", () => {
  const normal = adaptarViasUrinarias(initial(viasUrinarias));
  assert.match(render("VIAS_URINARIAS", normal.dados), /Bexiga ecograficamente normal/);
  for (const [state, phrase] of [["insuficiente", "repleção insuficiente"], ["vazia", "Bexiga vazia"]] as const) {
    const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "bexiga", { replecao: state }));
    noBlockingPending(adapted);
    assert.match(render("VIAS_URINARIAS", adapted.dados), new RegExp(phrase, "i"));
  }
});

check("todas as novas opções vesicais chegam ao renderer real", () => {
  const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "bexiga", {
    conteudo: ["debris", "calculo", "coagulo", "sonda", "diverticulo", "ureterocele", "lesao_focal"],
    "conteudo.debris.nivel_liquido": "sim",
    "conteudo.calculo.dimensao": "0,8 cm",
    "conteudo.calculo.mobilidade": "movel",
    "conteudo.calculo.multiplicidade": "unico",
    "conteudo.coagulo.dimensoes": "2,0 x 1,0 cm",
    "conteudo.coagulo.descricao": "Material ecogênico móvel",
    "conteudo.coagulo.doppler": "sem_fluxo",
    "conteudo.diverticulo.dimensoes": "2,0 x 1,5 cm",
    "conteudo.ureterocele.lado": "esquerda",
    "conteudo.ureterocele.dimensoes": "1,5 x 1,0 cm",
    "conteudo.ureterocele.calculo_mm": "4 mm",
    "conteudo.lesao_focal.topografia": "parede lateral direita",
    "conteudo.lesao_focal.dimensoes": "2,0 x 1,5 x 1,0 cm",
    "conteudo.lesao_focal.descricao": "Imagem polipoide",
    "conteudo.lesao_focal.doppler": "com_fluxo",
    residuo_estado: "dupla_miccao",
    "residuo_estado.dupla_miccao.primeira_ml": "80 mL",
    "residuo_estado.dupla_miccao.segunda_ml": "20 mL",
  }));
  noBlockingPending(adapted);
  const report = render("VIAS_URINARIAS", adapted.dados);
  for (const phrase of [
    "nível líquido-líquido",
    "móvel às mudanças de decúbito",
    "Material ecogênico móvel",
    "sem fluxo detectável ao Doppler",
    "Balão de sonda vesical",
    "Imagem sacular comunicante",
    "Ureterocele à esquerda",
    "Lesão focal vesical",
    "parede lateral direita",
    "com fluxo detectável ao Doppler",
    "Volume após a primeira micção de 80 mL",
    "Volume após a segunda micção de 20 mL",
  ]) assert.match(report, new RegExp(phrase, "i"));
  assert.doesNotMatch(report, /cistite|neurogênic|endometriose|carcinoma|tumor histológico/i);
});

check("resíduo valida a chave ativa nova e o fallback legado, sem regex parcial ou negativos", () => {
  const cases: State[] = [
    { residuo_estado: "valor", "residuo_estado.valor.ml": "abc5" },
    { residuo_estado: "valor", "residuo_estado.valor.ml": "-2" },
    { residuo_estado: "valor", "residuo_estado.valor.ml": "", "residuo.valor.ml": "abc5" },
  ];
  for (const bladder of cases) {
    const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "bexiga", bladder));
    assert.ok(adapted.pendencias.some((item) => item.bloqueia && /resíduo pós-miccional/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  }
});

check("medidas renais rejeitam texto parcial e valor negativo", () => {
  for (const value of ["abc5", "-2", "1 x 0 x 2"]) {
    const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "rim_direito", { medidas: value }));
    assert.ok(adapted.pendencias.some((item) => item.bloqueia && /medidas renais/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  }
});

check("espessura renal escalar rejeita duas dimensões sem truncar", () => {
  const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "rim_direito", { espessura: "1 x 2" }));
  assert.ok(adapted.pendencias.some((item) => item.bloqueia && /espessura do parênquima/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  assert.equal(adapted.dados.rim_direito.espessura_parenquima_cm, null);
});

check("medida vesical com eixo zero é rejeitada por inteiro", () => {
  const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "bexiga", {
    conteudo: ["lesao_focal"],
    "conteudo.lesao_focal.topografia": "parede lateral direita",
    "conteudo.lesao_focal.dimensoes": "1 x 0 x 2",
  }));
  assert.ok(adapted.pendencias.some((item) => item.bloqueia && /dimensões.*inválid|dimensões válidas/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  assert.equal(adapted.dados.bexiga_detalhada.achados[0]?.medidas_cm, null);
});

check("JUV, ureterocele e jato unilateral exigem lado escolhido pelo médico", () => {
  const cases: State[] = [
    { conteudo: ["calculo"], "conteudo.calculo.mobilidade": "juv" },
    { conteudo: ["ureterocele"] },
    { jatos: "reduzido_unilateral" },
    { jatos: "ausencia_unilateral" },
  ];
  for (const bladder of cases) {
    const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "bexiga", bladder));
    assert.ok(adapted.pendencias.some((item) => item.bloqueia && /lateralidade/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  }
});

check("enums vesicais antigos inválidos bloqueiam em vez de virar normalidade silenciosa", () => {
  const cases: Array<{ bladder: State; legacy?: boolean }> = [
    { bladder: { replecao: "lotada" } },
    { bladder: { parede: "irregular_desconhecida" } },
    { bladder: { parede: ["outra"] } },
    { bladder: { conteudo: ["massa_sem_contrato"] } },
    { bladder: { achados: ["achado_antigo_desconhecido"] }, legacy: true },
    { bladder: { jatos: "ausentes_sem_lado" } },
  ];
  for (const current of cases) {
    const state = current.legacy
      ? { ...initial(viasUrinarias), bexiga: current.bladder }
      : patch(initial(viasUrinarias), "bexiga", current.bladder);
    const adapted = adaptarViasUrinarias(state);
    assert.ok(adapted.pendencias.some((item) => item.bloqueia && /inválid/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  }
});

check("pelve transvaginal pura não envia nem declara avaliação da bexiga", () => {
  const state = initial(pelveFeminina);
  const tv = adaptarPelve(state, { via: "tv" });
  assert.equal(tv.dados.bexiga, null);
  assert.doesNotMatch(render("PELVE_FEMININA", tv.dados), /Bexiga/i);
  const ta = adaptarPelve(state, { via: "ta" });
  assert.notEqual(ta.dados.bexiga, null);
  assert.match(render("PELVE_FEMININA", ta.dados), /Bexiga/i);
});

check("pelve preserva resíduo com valor e desprezível nos estilos clássico e objetivo", () => {
  const cases = [
    { patch: { residuo_estado: "valor", "residuo_estado.valor.ml": "35" }, phrase: "Resíduo pós-miccional de 35 mL" },
    { patch: { residuo_estado: "desprezivel" }, phrase: "Resíduo pós-miccional desprezível" },
  ];
  for (const current of cases) {
    const adapted = adaptarPelve(patch(initial(pelveFeminina), "bexiga", current.patch), { via: "ta" });
    noBlockingPending(adapted);
    const classic = render("PELVE_FEMININA", adapted.dados);
    const objective = render("PELVE_FEMININA", adapted.dados, undefined, "OBJETIVO");
    assert.match(classic, new RegExp(current.phrase, "i"));
    assert.match(objective, new RegExp(current.phrase, "i"));
    assert.equal(objective.match(new RegExp(current.phrase, "gi"))?.length, 1);
    assert.doesNotMatch(objective, /Bexiga ecograficamente normal/i);
  }
});

check("próstata preserva medida de resíduo sem aplicar limiar inventado", () => {
  const state = patch(initial(prostataSuprapubica), "bexiga", {
    residuo_estado: "valor",
    "residuo_estado.valor.ml": "120",
  });
  const adapted = adaptarProstataSuprapubica(state);
  noBlockingPending(adapted);
  const report = render("PROSTATA_SUPRAPUBICA", adapted.dados);
  assert.match(report, /Resíduo pós-miccional de 120 mL/);
  assert.doesNotMatch(report, /elevado/i);
});

check("rins compartilham semântica entre Abdome e Vias, preservando lados e omitindo medidas ausentes", () => {
  const right = {
    dimensoes: "reduzida_discreta",
    diferenciacao: "reduzida",
    litiase: ["calculo"],
    "litiase.calculo.dimensao": "5 mm",
    "litiase.calculo.polo": "inf",
    cistos: ["simples", "multiplos"],
    "cistos.simples.dimensao": "12 x 10 mm",
    lesoes: ["angiomiolipoma", "cisto_complexo", "nodulo", "ectasia"],
    "lesoes.angiomiolipoma.dimensao": "8 mm",
    "lesoes.cisto_complexo.dimensao": "14 x 12 mm",
    "lesoes.cisto_complexo.carac": "septado",
    "lesoes.nodulo.dimensao": "9 mm",
    "lesoes.ectasia.local": "pelve renal",
    raros: ["nefrocalcinose"],
    medidas: "",
    espessura: "",
  };
  const abdomen = adaptarAbdome(patch(initial(abdomeTotal), "rim_direito", right));
  const vias = adaptarViasUrinarias(patch(initial(viasUrinarias), "rim_direito", right));
  noBlockingPending(abdomen);
  noBlockingPending(vias);
  const reports = [
    render("ABDOMEN_TOTAL", abdomen.dados, ABDOMEN_TEMPLATE),
    render("VIAS_URINARIAS", vias.dados),
  ];
  for (const report of reports) {
    for (const phrase of ["Litíase no rim direito", "Cisto simples no rim direito", "Cistos simples múltiplos", "angiomiolipoma", "Cisto complexo", "Imagem nodular sólida", "Ectasia pielocalicial", "Nefrocalcinose"]) {
      assert.match(report, new RegExp(phrase, "i"));
    }
    assert.match(report, /Rim esquerdo[^\n]*(?:preservada|ecograficamente normal)/i);
    assert.doesNotMatch(report, /Medidas do rim direito: ____|Medida do rim direito: ____/i);
  }
});

check("todos os tipos renais legados de Vias permanecem no contrato", () => {
  const state = { ...initial(viasUrinarias), rim_direito: {
    dimensao: "reduzida",
    estrutura: ["situacao_baixa", "rotacao", "drc"],
    hidronefrose: "moderada",
    achados: ["litiase", "cisto_simples", "cisto_complexo", "nodulo", "ectasia"],
    "achados.litiase.medida": "0,6",
    "achados.litiase.local": "cálices inferiores",
    "achados.cisto_simples.medidas": "2 x 1,8",
    "achados.cisto_complexo.medidas": "1,4 x 1,2",
    "achados.cisto_complexo.carac": "septado",
    "achados.nodulo.medidas": "0,9",
    "achados.ectasia.local": "pelve renal",
  } };
  const adapted = adaptarViasUrinarias(state);
  noBlockingPending(adapted);
  assert.deepEqual(adapted.dados.rim_direito.achados.map((item: { tipo: string }) => item.tipo), ["litiase", "cisto_simples", "cisto_complexo", "nodulo", "ectasia"]);
  assert.equal(adapted.dados.rim_direito.dimensao, "reduzida");
  assert.equal(adapted.dados.rim_direito.hidronefrose, "moderada");
  assert.equal(adapted.dados.rim_direito.drc, true);
});

check("opções vesicais legadas de Abdome, Vias e Próstata são preservadas", () => {
  const abdomen = adaptarAbdome({
    ...initial(abdomeTotal),
    bexiga: { replecao: "adequada", parede: "trabeculada", conteudo: ["debris", "calculo", "sonda", "diverticulo"], residuo: "20" },
  });
  const abdomenBladder = abdomen.dados.bexiga_detalhada as { achados: Array<{ tipo: string }>; residuo_pos_miccional_ml: number | null };
  assert.deepEqual(abdomenBladder.achados.map((item) => item.tipo), ["debris", "calculo", "sonda", "diverticulo"]);
  assert.equal(abdomenBladder.residuo_pos_miccional_ml, 20);

  for (const parede of ["espessada", "trabeculada"]) {
    const vias = adaptarViasUrinarias({
      ...initial(viasUrinarias),
      bexiga: { avaliada: "sim", parede: [parede], conteudo: ["debris", "calculo", "sonda"], volume_pre: "", espessura_parede: "", residuo: "20" },
    });
    assert.equal(vias.dados.bexiga_detalhada.parede, parede);
    assert.deepEqual(vias.dados.bexiga_detalhada.achados.map((item: { tipo: string }) => item.tipo), ["debris", "calculo", "sonda"]);
  }

  for (const finding of ["espessamento", "trabeculacao", "calculo", "diverticulo"]) {
    const prostate = adaptarProstataSuprapubica({
      ...initial(prostataSuprapubica),
      bexiga: { achados: [finding], volume_pre: "", residuo: "nao_informado", "residuo.valor.ml": "" },
    });
    assert.equal(prostate.dados.bexiga_detalhada.achados.length + (prostate.dados.bexiga_detalhada.parede === "normal" ? 0 : 1), 1);
  }
});

check("reset remove achado de um órgão sem contaminar os demais", () => {
  const base = initial(viasUrinarias);
  const withFindings = patch(patch(base, "rim_direito", { litiase: ["calculo"], "litiase.calculo.dimensao": "5 mm" }), "bexiga", { conteudo: ["debris"] });
  const before = adaptarViasUrinarias(withFindings);
  assert.match(render("VIAS_URINARIAS", before.dados), /Litíase no rim direito/i);
  const resetRight = viasUrinarias.sections.find((section) => section.id === "rim_direito")?.module?.initialState();
  assert.ok(resetRight);
  const after = adaptarViasUrinarias({ ...withFindings, rim_direito: resetRight });
  const report = render("VIAS_URINARIAS", after.dados);
  assert.doesNotMatch(report, /Litíase no rim direito/i);
  assert.match(report, /Debris no interior da bexiga/i);
});

check("chaves raiz reservadas são ignoradas pelos adapters", () => {
  const state = initial(abdomeTotal);
  const plain = adaptarAbdome(state);
  const reserved = adaptarAbdome({ ...state, __recommendations: { qualquer: "valor" }, __hepatic: { medida: 42 } });
  assert.deepEqual(reserved, plain);
});

check("edição renal nova vence valores legados ainda presentes", () => {
  const state = initial(viasUrinarias);
  state.rim_direito = {
    ...((state.rim_direito as State) ?? {}),
    dimensao: "reduzida",
    hidronefrose: "moderada",
    achados: ["litiase"],
    "achados.litiase.medida": "0,7",
    "achados.litiase.local": "cálices inferiores",
    dimensoes: "normal",
    dilatacao: "ausente",
    litiase: [],
  };
  const adapted = adaptarViasUrinarias(state);
  noBlockingPending(adapted);
  assert.equal(adapted.dados.rim_direito.dimensao, "normal");
  assert.equal(adapted.dados.rim_direito.hidronefrose, "ausente");
  assert.deepEqual(adapted.dados.rim_direito.achados, []);
});

check("edição de um grupo renal não apaga grupos legados ainda não editados", () => {
  const state = initial(viasUrinarias);
  state.rim_direito = {
    dimensao: "normal",
    estrutura: [],
    hidronefrose: "ausente",
    achados: ["litiase", "cisto_simples"],
    "achados.litiase.medida": "0,7",
    "achados.cisto_simples.medidas": "2,0 x 1,8",
    litiase: [],
  };
  const adapted = adaptarViasUrinarias(state);
  noBlockingPending(adapted);
  assert.deepEqual(adapted.dados.rim_direito.achados.map((item: { tipo: string }) => item.tipo), ["cisto_simples"]);
});

check("reset compartilhado não ressuscita achados vesicais legados", () => {
  const state = initial(viasUrinarias);
  state.bexiga = {
    achados: ["espessamento", "calculo"],
    avaliada: "nao",
    residuo: "35",
    ...((state.bexiga as State) ?? {}),
  };
  const adapted = adaptarViasUrinarias(state);
  noBlockingPending(adapted);
  assert.equal(adapted.dados.bexiga_detalhada.replecao, "adequada");
  assert.equal(adapted.dados.bexiga_detalhada.parede, "normal");
  assert.equal(adapted.dados.bexiga_detalhada.residuo_estado, "nao_informado");
  assert.deepEqual(adapted.dados.bexiga_detalhada.achados, []);
});

check("enums renais inválidos bloqueiam em vez de virar normalidade", () => {
  const cases: State[] = [
    { dimensoes: "gigante" },
    { diferenciacao: "indefinida" },
    { estrutura: ["ectopia_desconhecida"] },
    { dilatacao: "grau_inventado" },
    { litiase: ["outro"] },
    { cistos: ["complexo_desconhecido"] },
    { lesoes: ["lesao_desconhecida"] },
    { raros: ["raro_desconhecido"] },
  ];
  for (const kidney of cases) {
    const adapted = adaptarViasUrinarias(patch(initial(viasUrinarias), "rim_direito", kidney));
    assert.ok(adapted.pendencias.some((item) => item.bloqueia && /inválid|desconhecid/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  }
});

check("enums renais legados e itens não textuais também bloqueiam", () => {
  const legacyCases: State[] = [
    { dimensao: "gigante", estrutura: [], hidronefrose: "ausente", achados: [] },
    { dimensao: "normal", estrutura: [], hidronefrose: "grau_4", achados: [] },
    { dimensao: "normal", estrutura: [], hidronefrose: "ausente", achados: ["tumor_desconhecido"] },
  ];
  for (const kidney of legacyCases) {
    const adapted = adaptarViasUrinarias({ ...initial(viasUrinarias), rim_direito: kidney });
    assert.ok(adapted.pendencias.some((item) => item.bloqueia && /inválid/.test(item.motivo)), JSON.stringify(adapted.pendencias));
  }
  const nonText = adaptarViasUrinarias(patch(initial(viasUrinarias), "rim_direito", { lesoes: [123] }));
  assert.ok(nonText.pendencias.some((item) => item.bloqueia && /formato inválido/.test(item.motivo)), JSON.stringify(nonText.pendencias));
});

check("subcampos ocultos renais e vesicais não bloqueiam nem reaparecem", () => {
  const state = patch(
    patch(initial(viasUrinarias), "rim_direito", {
      litiase: [],
      "litiase.calculo.dimensao": "abc5",
      lesoes: [],
      "lesoes.nodulo.dimensao": "1 x 0 x 2",
    }),
    "bexiga",
    {
      conteudo: [],
      "conteudo.lesao_focal.dimensoes": "1 x 0 x 2",
      "conteudo.ureterocele.calculo_mm": "abc5",
      jatos: "nao_avaliados",
      "jatos.ausencia_unilateral.calculo_mm": "abc5",
    },
  );
  const adapted = adaptarViasUrinarias(state);
  noBlockingPending(adapted);
  assert.deepEqual(adapted.dados.rim_direito.achados, []);
  assert.deepEqual(adapted.dados.bexiga_detalhada.achados, []);
});

console.log(`\nGO — ${checks} grupos de regressão urinária passaram.`);
