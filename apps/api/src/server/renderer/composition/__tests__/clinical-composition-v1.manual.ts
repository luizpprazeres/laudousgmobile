import assert from "node:assert/strict";
import {
  CLINICAL_COMPOSITION_CONTRACT_VERSION,
  ClinicalCompositionRequestV1Schema,
  ClinicalCompositionResponseV1Schema,
  type ClinicalCompositionRequestV1,
} from "@laudousg/shared";
import { achadoNormalDe, mesclarFundo } from "../../catalog/modeloNormal";
import { modeloNormalDe } from "../../catalog/modeloNormalRegistry";
import { adaptarMamaria } from "../../../../../../web/src/lib/catalog/mamariaParaCatalogo";
import { mamaria } from "../../../../../../web/src/lib/deterministic";
import {
  assembleClinicalCompositionFullText,
  renderClinicalComposition,
} from "../renderClinicalComposition";

const IDS = {
  request: "00000000-0000-4000-8000-000000000001",
  composition: "00000000-0000-4000-8000-000000000002",
  abdomen: "00000000-0000-4000-8000-000000000003",
  prostate: "00000000-0000-4000-8000-000000000004",
  breast: "00000000-0000-4000-8000-000000000005",
  pelvis: "00000000-0000-4000-8000-000000000006",
  contextUrinary: "00000000-0000-4000-8000-000000000007",
  contextBreast: "00000000-0000-4000-8000-000000000008",
  contextPelvis: "00000000-0000-4000-8000-000000000009",
  bladder: "00000000-0000-4000-8000-000000000010",
} as const;

const ABDOMEN_TEMPLATE = `ULTRASSONOGRAFIA DO ABDOME TOTAL

COMENTÁRIOS:
Exame realizado com transdutor convexo multifrequencial.

OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
{{orgao:figado|Fígado sem alterações.}}
{{orgao:veia_porta|Veia porta de calibre normal.}}
{{orgao:vesicula|Vesícula biliar sem alterações.}}
{{orgao:vias_biliares|Vias biliares de calibre normal.}}
{{orgao:baco|Baço sem alterações.}}
{{orgao:pancreas|Pâncreas sem alterações.}}
{{orgao:rim_direito|Rim direito sem alterações.}}
{{orgao:rim_esquerdo|Rim esquerdo sem alterações.}}
{{orgao:veia_cava|Veia cava inferior de calibre normal.}}
{{orgao:aorta|Aorta abdominal de calibre normal.}}
{{orgao:bexiga|Bexiga sem alterações.}}
{{extra_abdominais}}

CONCLUSÃO:
{{conclusao}}`;

function normalData(category: string): Record<string, unknown> {
  const model = modeloNormalDe(category);
  assert.ok(model, `modelo ausente: ${category}`);
  return mesclarFundo(
    achadoNormalDe(model.schema) as Record<string, unknown>,
    model.seed ?? {},
  );
}

const bladder = {
  replecao: "adequada",
  parede: "normal",
  espessura_parede_mm: null,
  volume_pre_miccional_ml: 320,
  residuo_estado: "valor",
  residuo_pos_miccional_ml: 35,
  residuo_primeira_miccao_ml: null,
  residuo_segunda_miccao_ml: null,
  jatos: {
    estado: "presentes_simetrico",
    lateralidade: null,
    calculo_associado_mm: null,
  },
  achados: [
    {
      tipo: "diverticulo",
      medidas_cm: [2, 1.5],
      descricao: null,
      mobilidade: null,
      lateralidade: null,
      multiplos: false,
      nivel_liquido: false,
      doppler: "nao_avaliado",
      topografia: null,
      calculo_associado_mm: null,
    },
  ],
} as const;

function urinaryRequest(style: "CLASSICO_COMPLETO" | "OBJETIVO" = "OBJETIVO") {
  const abdomen = mesclarFundo(normalData("ABDOMEN_TOTAL"), {
    bexiga_detalhada: bladder,
  });
  const prostate = mesclarFundo(normalData("PROSTATA_SUPRAPUBICA"), {
    prostata_d1_cm: 4,
    prostata_d2_cm: 3.2,
    prostata_d3_cm: 2.8,
    bexiga_detalhada: bladder,
  });
  return ClinicalCompositionRequestV1Schema.parse({
    contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
    requestId: IDS.request,
    compositionId: IDS.composition,
    revision: 4,
    associationCode: "ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA",
    writingStyle: style,
    components: [
      {
        componentId: IDS.abdomen,
        categoryCode: "ABDOMEN_TOTAL",
        acquisitionContextId: IDS.contextUrinary,
        data: { alteracoes: [], dados: abdomen },
      },
      {
        componentId: IDS.prostate,
        categoryCode: "PROSTATA_SUPRAPUBICA",
        acquisitionContextId: IDS.contextUrinary,
        data: { alteracoes: [], dados: prostate },
      },
    ],
    sharedStructures: [
      {
        sharedStructureId: IDS.bladder,
        structureCode: "URINARY_BLADDER",
        acquisitionContextId: IDS.contextUrinary,
        componentIds: [IDS.abdomen, IDS.prostate],
        sourceComponentId: IDS.abdomen,
      },
    ],
  });
}

function womenRequest(): ClinicalCompositionRequestV1 {
  return ClinicalCompositionRequestV1Schema.parse({
    contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
    requestId: IDS.request,
    compositionId: IDS.composition,
    revision: 8,
    associationCode: "MAMARIA__PELVE_FEMININA",
    writingStyle: "OBJETIVO",
    components: [
      {
        componentId: IDS.breast,
        categoryCode: "MAMARIA",
        acquisitionContextId: IDS.contextBreast,
        data: {
          alteracoes: [],
          dados: mesclarFundo(normalData("MAMARIA"), { escopo_exame: "mamas_axilas" }),
        },
      },
      {
        componentId: IDS.pelvis,
        categoryCode: "PELVE_FEMININA",
        acquisitionContextId: IDS.contextPelvis,
        data: {
          alteracoes: [],
          dados: mesclarFundo(normalData("PELVE_FEMININA"), { via: "tv" }),
        },
      },
    ],
    sharedStructures: [],
  });
}

function initialBreastState(): Record<string, unknown> {
  const state: Record<string, unknown> = { __opts: { escopo_exame: "mamas_axilas" } };
  for (const section of mamaria.sections) {
    if (section.module) state[section.id] = section.module.initialState();
  }
  return state;
}

function compositionWithRealBreastAdapter(
  breastState: Record<string, unknown>,
): { request: ClinicalCompositionRequestV1; adapted: ReturnType<typeof adaptarMamaria> } {
  const adapted = adaptarMamaria(breastState);
  const pelvis = normalData("PELVE_FEMININA");
  pelvis.via = "tv";
  return {
    adapted,
    request: ClinicalCompositionRequestV1Schema.parse({
      contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
      requestId: IDS.request,
      compositionId: IDS.composition,
      revision: 9,
      associationCode: "MAMARIA__PELVE_FEMININA",
      writingStyle: "OBJETIVO",
      components: [
        {
          componentId: IDS.breast,
          categoryCode: "MAMARIA",
          acquisitionContextId: IDS.contextBreast,
          data: { alteracoes: adapted.alteracoes, dados: adapted.dados },
        },
        {
          componentId: IDS.pelvis,
          categoryCode: "PELVE_FEMININA",
          acquisitionContextId: IDS.contextPelvis,
          data: { alteracoes: [], dados: pelvis },
        },
      ],
      sharedStructures: [],
    }),
  };
}

const resolveContext = async (category: string) =>
  category === "ABDOMEN_TOTAL" ? { templateBody: ABDOMEN_TEMPLATE } : {};

let checks = 0;
async function check(name: string, run: () => void | Promise<void>) {
  await run();
  checks += 1;
  console.log(`✓ ${name}`);
}

async function main() {
await check("Abdome + próstata deduplica bexiga e preserva rins, próstata e resíduo", async () => {
  const response = await renderClinicalComposition(urinaryRequest(), { resolveContext });
  assert.equal(response.status, "complete");
  if (response.status !== "complete") return;
  ClinicalCompositionResponseV1Schema.parse(response);

  assert.match(response.document.title, /ABDOME TOTAL E DA PRÓSTATA/);
  assert.match(response.document.findings, /Rim direito/i);
  assert.match(response.document.findings, /Próstata medindo 4,0 x 3,2 x 2,8 cm/);
  assert.match(
    response.document.findings,
    /Vesículas seminais de dimensões, ecogenicidade e contornos normais/,
  );
  assert.match(response.document.findings, /Imagem sacular comunicante/);
  assert.match(response.document.conclusion, /Divertículo vesical/);
  assert.match(response.document.conclusion, /Resíduo pós-miccional de 35 mL/);
  assert.equal(
    response.blocks.filter((block) => block.structureCode === "URINARY_BLADDER").length,
    2,
  );
  for (const block of response.blocks.filter((item) => item.categoryCodes.length === 1)) {
    assert.doesNotMatch(block.text, /Divertículo vesical|Resíduo pós-miccional de 35 mL/);
  }
  const { fullText: _fullText, ...withoutFullText } = response.document;
  assert.equal(
    response.document.fullText,
    assembleClinicalCompositionFullText("OBJETIVO", withoutFullText),
  );
});

await check("ordem dos componentes não altera documento nem IDs dos blocos", async () => {
  const direct = urinaryRequest();
  const reversed = { ...direct, components: [...direct.components].reverse() } as ClinicalCompositionRequestV1;
  const a = await renderClinicalComposition(direct, { resolveContext });
  const b = await renderClinicalComposition(reversed, { resolveContext });
  assert.equal(a.status, "complete");
  assert.equal(b.status, "complete");
  if (a.status !== "complete" || b.status !== "complete") return;
  assert.equal(a.document.fullText, b.document.fullText);
  assert.deepEqual(a.blocks.map((block) => block.blockId), b.blocks.map((block) => block.blockId));
});

await check("o assembler também aceita as seções clássicas canônicas", async () => {
  const response = await renderClinicalComposition(urinaryRequest("CLASSICO_COMPLETO"), {
    resolveContext,
  });
  assert.equal(response.status, "complete");
  if (response.status !== "complete") return;
  assert.match(response.document.fullText, /COMENTÁRIOS:/);
  assert.match(response.document.fullText, /OS SEGUINTES ASPECTOS FORAM OBSERVADOS:/);
  assert.match(response.document.fullText, /CONCLUSÃO:/);
  assert.doesNotMatch(response.document.fullText, /\nTÉCNICA:\n/);
});

await check("Mamas + pelve também compõe o estilo clássico sem misturar classificações", async () => {
  const request = { ...womenRequest(), writingStyle: "CLASSICO_COMPLETO" as const };
  const response = await renderClinicalComposition(request);
  assert.equal(response.status, "complete");
  if (response.status !== "complete") return;
  assert.match(response.document.fullText, /COMENTÁRIOS:/);
  const pelvis = response.blocks.find(
    (block) => block.section === "conclusion" && block.categoryCodes[0] === "PELVE_FEMININA",
  );
  assert.doesNotMatch(pelvis?.text ?? "", /BI-RADS/);
});

await check("Mamas + pelve preserva escopo, via e restringe BI-RADS à mama", async () => {
  const response = await renderClinicalComposition(womenRequest());
  assert.equal(response.status, "complete");
  if (response.status !== "complete") return;
  assert.match(response.document.title, /MAMAS, REGIÕES AXILARES E DA PELVE FEMININA/);
  assert.match(response.document.technique, /transvaginal/i);
  const breast = response.blocks.find(
    (block) => block.section === "conclusion" && block.categoryCodes[0] === "MAMARIA",
  );
  const pelvis = response.blocks.find(
    (block) => block.section === "conclusion" && block.categoryCodes[0] === "PELVE_FEMININA",
  );
  assert.match(breast?.text ?? "", /BI-RADS/);
  assert.doesNotMatch(pelvis?.text ?? "", /BI-RADS/);
});

await check("estado inicial real do adaptador Mamária atravessa composição", async () => {
  const { request, adapted } = compositionWithRealBreastAdapter(initialBreastState());
  assert.deepEqual(adapted.pendencias.filter((item) => item.bloqueia), []);
  assert.equal(Object.hasOwn(adapted.dados, "birads_final"), false);
  assert.equal(Object.hasOwn(adapted.dados, "exames_anteriores"), false);
  const response = await renderClinicalComposition(request);
  assert.equal(response.status, "complete", JSON.stringify(response));
});

await check("achado real do adaptador preserva BI-RADS confirmado na composição", async () => {
  const state = initialBreastState();
  const breast = state.mamas as Record<string, unknown>;
  breast.achados_ids = ["achado-confirmado"];
  breast["achados.achado-confirmado.tipo"] = "nodulo";
  breast["achados.achado-confirmado.lado"] = "direita";
  breast["achados.achado-confirmado.medidas"] = "1,2 x 0,9 x 0,8";
  breast["achados.achado-confirmado.eco"] = "hipoecoico";
  breast["achados.achado-confirmado.forma"] = "irregular";
  breast["achados.achado-confirmado.margem"] = "espiculada";
  breast["achados.achado-confirmado.orientacao"] = "nao_paralela";
  breast["achados.achado-confirmado.birads"] = "4A";

  const { request, adapted } = compositionWithRealBreastAdapter(state);
  assert.deepEqual(adapted.pendencias.filter((item) => item.bloqueia), []);
  const findings = adapted.dados.achados as Array<Record<string, unknown>>;
  assert.equal(findings[0]?.birads_ditado, "4A");
  assert.equal(findings[0]?.permitir_birads_calculado, false);

  const response = await renderClinicalComposition(request);
  assert.equal(response.status, "complete", JSON.stringify(response));
  if (response.status !== "complete") return;
  const breastConclusion = response.blocks.find(
    (block) => block.section === "conclusion" && block.categoryCodes[0] === "MAMARIA",
  );
  assert.match(breastConclusion?.text ?? "", /BI-RADS® 4A/);
});

await check("schema de sucesso rejeita IDs duplicados, categoria trocada e origem de bloco órfã", async () => {
  const response = await renderClinicalComposition(womenRequest());
  assert.equal(response.status, "complete");
  if (response.status !== "complete") return;

  assert.equal(
    ClinicalCompositionResponseV1Schema.safeParse({
      ...response,
      components: [response.components[0]!, { ...response.components[1]!, componentId: response.components[0]!.componentId }],
    }).success,
    false,
    "componentId não pode se repetir",
  );
  assert.equal(
    ClinicalCompositionResponseV1Schema.safeParse({
      ...response,
      components: [response.components[0]!, { ...response.components[1]!, categoryCode: response.components[0]!.categoryCode }],
    }).success,
    false,
    "categorias/status devem formar o par da associação",
  );
  assert.equal(
    ClinicalCompositionResponseV1Schema.safeParse({
      ...response,
      blocks: [{ ...response.blocks[0], componentIds: [IDS.prostate] }, ...response.blocks.slice(1)],
    }).success,
    false,
    "blocos só podem referenciar componentes presentes na resposta",
  );
});

await check("estado vesical divergente falha fechado sem documento parcial", async () => {
  const request = urinaryRequest();
  const prostate = request.components.find(
    (component) => component.categoryCode === "PROSTATA_SUPRAPUBICA",
  );
  assert.ok(prostate?.data.dados);
  prostate.data.dados.bexiga_detalhada = { ...bladder, residuo_pos_miccional_ml: 36 };
  const response = await renderClinicalComposition(request, { resolveContext });
  assert.equal(response.status, "error");
  if (response.status !== "error") return;
  assert.equal(response.error.code, "SHARED_STRUCTURE_CONFLICT");
  assert.equal(response.requestId, request.requestId);
  assert.equal(response.revision, request.revision);
  assert.equal("document" in response, false);
  assert.ok(response.components?.every((component) => component.status === "blocked"));
});

await check("erro de um componente bloqueia o documento inteiro e marca proveniência", async () => {
  const request = womenRequest();
  request.components[0]!.data.alteracoes = ["inexistente"];
  const response = await renderClinicalComposition(request);
  assert.equal(response.status, "error");
  if (response.status !== "error") return;
  assert.equal(response.error.code, "UNKNOWN_ALTERATION");
  assert.equal("document" in response, false);
  assert.equal(response.components?.filter((item) => item.status === "error").length, 1);
  assert.equal(response.components?.filter((item) => item.status === "blocked").length, 1);
});

await check("falha ao obter contexto canônico também retorna envelope fechado", async () => {
  const request = urinaryRequest("CLASSICO_COMPLETO");
  const response = await renderClinicalComposition(request, {
    resolveContext: async (category) => {
      if (category === "ABDOMEN_TOTAL") throw new Error("banco indisponível");
      return {};
    },
  });
  assert.equal(response.status, "error");
  if (response.status !== "error") return;
  assert.equal(response.error.code, "COMPONENT_RENDER_FAILED");
  assert.equal(response.requestId, request.requestId);
  assert.equal("document" in response, false);
});

await check("chave clínica desconhecida, inclusive aninhada, não é descartada", async () => {
  const request = urinaryRequest();
  const abdomen = request.components.find((component) => component.categoryCode === "ABDOMEN_TOTAL");
  assert.ok(abdomen?.data.dados);
  abdomen.data.dados.bexiga_detalhada = { ...bladder, fantasma: "não pode sumir" };
  const response = await renderClinicalComposition(request, { resolveContext });
  assert.equal(response.status, "error");
  if (response.status !== "error") return;
  assert.equal(response.error.code, "INVALID_COMPONENT_DATA");
  assert.match(response.error.message, /bexiga_detalhada\.fantasma/);
  assert.equal("document" in response, false);
});

await check("limites estruturais bloqueiam texto excessivo antes do renderer", async () => {
  const request = womenRequest();
  const breast = request.components.find((component) => component.categoryCode === "MAMARIA");
  assert.ok(breast?.data.dados);
  breast.data.dados.achados_adicionais = "x".repeat(20_001);
  const response = await renderClinicalComposition(request);
  assert.equal(response.status, "error");
  if (response.status !== "error") return;
  assert.equal(response.error.code, "PAYLOAD_LIMIT_EXCEEDED");
  assert.equal("document" in response, false);
});

await check("versão desconhecida e par incompatível são rejeitados no contrato", () => {
  const current = womenRequest();
  assert.equal(
    ClinicalCompositionRequestV1Schema.safeParse({ ...current, contractVersion: "clinical-composition/v2" }).success,
    false,
  );
  assert.equal(
    ClinicalCompositionRequestV1Schema.safeParse({
      ...current,
      components: [current.components[0], urinaryRequest().components[0]],
    }).success,
    false,
  );
});

console.log(`\n${checks} grupos de composição clínica v1: PASS`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
