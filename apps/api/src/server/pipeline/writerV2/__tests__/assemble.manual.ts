/**
 * Teste manual do motor determinístico do Writer V2 (assemble + audit).
 * Roda: pnpm -s tsx apps/api/src/server/pipeline/writerV2/__tests__/assemble.manual.ts
 * Valida contra o GABARITO (o que o renderer produz) sem chamar LLM.
 */
import { loadSpecV2 } from "../loadSpec";
import { assemble } from "../assemble";
import { auditFidelity } from "../audit";
import { editPlanSchema } from "../types";

const spec = loadSpecV2("ABDOMEN_TOTAL");
if (!spec) throw new Error("spec ABDOMEN_TOTAL não carregou");

let pass = true;
function check(nome: string, cond: boolean, extra?: string) {
  if (!cond) {
    pass = false;
    console.log(`  ✗ ${nome}${extra ? " — " + extra : ""}`);
  } else {
    console.log(`  ✓ ${nome}`);
  }
}

// --- Cenário 1: NORMAL (plano vazio) → conclusão item único SEM número ---
const laudoNormal = assemble(spec, editPlanSchema.parse({}));
check("normal: título correto", laudoNormal.startsWith("ULTRASSONOGRAFIA DO ABDOME TOTAL"));
check(
  "normal: conclusão item único sem número",
  /CONCLUSÃO:\nÓrgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas\.\s*$/.test(
    laudoNormal,
  ),
);
check("normal: sem '1.' na conclusão", !/CONCLUSÃO:\n1\./.test(laudoNormal));

// --- Cenário 2: esteatose moderada + cálculo vesícula (2 achados) ---
const plan2 = editPlanSchema.parse({
  slots: [
    {
      slotId: "figado",
      corpo:
        "Fígado de dimensões normais, apresentando aumento difuso da ecogenicidade parenquimatosa e atenuação sonora.",
    },
    {
      slotId: "vesicula",
      corpo:
        "Vesícula biliar de topografia usual e parede fina, apresentando imagem hiperecoica, móvel, medindo 1,2 cm no seu maior eixo, ocasionando sombra acústica.",
    },
  ],
  conclusao: ["Esteatose hepática, grau moderado.", "Litíase da vesícula biliar."],
});
const laudo2 = assemble(spec, plan2);
check("2 achados: corpo troca fígado (esteatose)", laudo2.includes("aumento difuso da ecogenicidade"));
check("2 achados: corpo troca vesícula (sem 'cálculo' no corpo)", laudo2.includes("imagem hiperecoica, móvel, medindo 1,2 cm"));
check("2 achados: vias biliares mantém frase normal", laudo2.includes("Canal hepático e canal colédoco de calibre normal."));
check(
  "2 achados: conclusão numerada 1. 2. + fechamento 3.",
  laudo2.includes("1. Esteatose hepática, grau moderado.") &&
    laudo2.includes("2. Litíase da vesícula biliar.") &&
    laudo2.includes("3. Demais órgãos e estruturas abdominais estudadas sem evidência de alterações ecográficas."),
);

// audit: a medida 1,2 cm está no laudo → sem divergência
const div2 = auditFidelity({ ditadoCru: "cálculo de 1,2 cm na vesícula", laudo: laudo2, spec, plan: plan2 });
check("2 achados: auditoria sem divergência (medida presente)", div2.length === 0, JSON.stringify(div2));

// --- Cenário 3: auditoria PEGA medida omitida ---
const planOmite = editPlanSchema.parse({
  slots: [{ slotId: "vesicula", corpo: "Vesícula biliar apresentando imagem hiperecoica, móvel, ocasionando sombra acústica." }],
  conclusao: ["Litíase da vesícula biliar."],
});
const laudoOmite = assemble(spec, planOmite);
const divOmite = auditFidelity({ ditadoCru: "cálculo de 0,8 cm na vesícula", laudo: laudoOmite, spec, plan: planOmite });
check("auditoria detecta medida omitida (0,8)", divOmite.some((d) => d.tipo === "medida_ausente" && d.detalhe.includes("0,8")));

// --- Cenário 4: MODO POR_ESTRUTURA (pelve/obstétrica) — conclusão item-por-estrutura ---
// Spec sintético mínimo: o motor deve montar a conclusão a partir das
// frase_conclusao dos slots, independente do LLM listar todos os itens.
import { reportSpecSchema } from "../types";
const specPE = reportSpecSchema.parse({
  base: [
    { id: "titulo", frase_normal: "ULTRASSONOGRAFIA PÉLVICA" },
    { id: "comentarios", frase_normal: "Exame realizado por via transvaginal." },
    { id: "utero", frase_normal: "Útero em AVF, contornos regulares.", frase_conclusao: "Útero de volume normal." },
    { id: "endometrio", frase_normal: "Eco endometrial homogêneo.", frase_conclusao: "Eco endometrial de espessura normal." },
    { id: "ovario_dir", frase_normal: "Ovário direito de dimensões normais.", frase_conclusao: "Ovário direito de aspecto normal." },
    { id: "ovario_esq", frase_normal: "Ovário esquerdo de dimensões normais.", frase_conclusao: "Ovário esquerdo de aspecto normal." },
  ],
  dictionary: [],
  contract: { titulo: "ULTRASSONOGRAFIA PÉLVICA", numeracao_conclusao: "1)", conclusao_modo: "por_estrutura" },
});

// 4a: NORMAL → conclusão lista TODAS as estruturas numeradas (1) a 4))
const pe1 = assemble(specPE, editPlanSchema.parse({}));
check(
  "por_estrutura normal: conclusão lista as 4 estruturas numeradas",
  pe1.includes("1) Útero de volume normal.") &&
    pe1.includes("2) Eco endometrial de espessura normal.") &&
    pe1.includes("3) Ovário direito de aspecto normal.") &&
    pe1.includes("4) Ovário esquerdo de aspecto normal."),
);

// 4b: achado no ovário direito (cisto) → item 3 vira o diagnóstico; resto normal
const pe2 = assemble(
  specPE,
  editPlanSchema.parse({
    slots: [
      {
        slotId: "ovario_dir",
        corpo: "Ovário direito apresentando imagem anecoica, de paredes finas, medindo 3,0 cm.",
        conclusao: "Cisto simples no ovário direito, medindo 3,0 cm.",
      },
    ],
  }),
);
check(
  "por_estrutura achado: item da estrutura vira diagnóstico, resto normal",
  pe2.includes("3) Cisto simples no ovário direito, medindo 3,0 cm.") &&
    pe2.includes("1) Útero de volume normal.") &&
    pe2.includes("4) Ovário esquerdo de aspecto normal.") &&
    !pe2.includes("Ovário direito de aspecto normal."),
);

// 4c: omitSlots remove o item; avulso (plan.conclusao) vai ao fim
const pe3 = assemble(
  specPE,
  editPlanSchema.parse({
    omitSlots: ["ovario_esq"],
    conclusao: ["Correlacionar com dosagens hormonais."],
  }),
);
check(
  "por_estrutura omit+avulso: 3 estruturas + avulso ao fim, sem ovário esq",
  !pe3.includes("Ovário esquerdo") &&
    pe3.includes("3) Ovário direito de aspecto normal.") &&
    pe3.includes("4) Correlacionar com dosagens hormonais."),
);

// 4d: conclusao_ordem desacopla a ordem da conclusão da ordem do corpo
const specOrdem = reportSpecSchema.parse({
  base: [
    { id: "titulo", frase_normal: "US OBSTÉTRICA" },
    { id: "comentarios", frase_normal: "Exame transabdominal." },
    { id: "biometria", frase_normal: "Biometria compatível.", frase_conclusao: "Idade gestacional em torno de ____ semanas." },
    { id: "placenta", frase_normal: "Placenta anterior.", frase_conclusao: "Placenta de aspecto normal." },
    { id: "liquido", frase_normal: "Líquido normal.", frase_conclusao: "Líquido amniótico em quantidade normal." },
    { id: "vitalidade", frase_normal: "Feto vivo.", frase_conclusao: "Gestação tópica única, feto vivo." },
  ],
  dictionary: [],
  contract: {
    titulo: "US OBSTÉTRICA",
    numeracao_conclusao: "1)",
    conclusao_modo: "por_estrutura",
    // corpo sai biometria→placenta→líquido→vitalidade; conclusão sai vitalidade→IG→líquido→placenta
    conclusao_ordem: ["vitalidade", "biometria", "liquido", "placenta"],
  },
});
const ordemLaudo = assemble(specOrdem, editPlanSchema.parse({}));
check(
  "conclusao_ordem: conclusão segue a ordem do contrato, não a do corpo",
  /1\) Gestação tópica única, feto vivo\.\n2\) Idade gestacional em torno de ____ semanas\.\n3\) Líquido amniótico em quantidade normal\.\n4\) Placenta de aspecto normal\./.test(
    ordemLaudo,
  ),
);

// --- Cenário 5: SPECS REAIS por_estrutura ---
function requireSpec(categoryCode: string) {
  const loaded = loadSpecV2(categoryCode);
  if (!loaded) throw new Error(`spec ${categoryCode} não carregou`);
  return loaded;
}

// 5a: PELVE — normal completo; menopausa + ovário direito alterado substituem
// exatamente os respectivos itens, sem inserir bexiga/fundo de saco.
const pelveSpec = requireSpec("PELVE_FEMININA");
const pelveNormal = assemble(pelveSpec, editPlanSchema.parse({}));
check(
  "PELVE normal: conclusão completa na ordem tradicional",
  /CONCLUSÃO:\n1\) Útero de volume normal \(____ cm³\)\.\n2\) O endométrio tem espessura normal para a fase do ciclo menstrual\.\n3\) Ovário direito de aspecto normal\.\n4\) Ovário esquerdo de aspecto normal\.\s*$/.test(
    pelveNormal,
  ),
);
const pelveAchados = assemble(
  pelveSpec,
  editPlanSchema.parse({
    slots: [
      {
        slotId: "endometrio",
        corpo: "Endométrio medindo 0,3 cm de espessura.",
        conclusao: "O endométrio tem espessura normal para a faixa etária da menopausa.",
      },
      {
        slotId: "ovario_dir",
        corpo: "Ovário direito apresentando imagem de baixa ecogenicidade com aspecto em vidro fosco.",
        conclusao: "Ovário direito apresentando imagem hipoecoica que tem como diagnóstico mais provável endometrioma (O-RADS 2).",
      },
    ],
  }),
);
check(
  "PELVE achados: endométrio e ovário substituem os itens normais",
  pelveAchados.includes("2) O endométrio tem espessura normal para a faixa etária da menopausa.") &&
    pelveAchados.includes(
      "3) Ovário direito apresentando imagem hipoecoica que tem como diagnóstico mais provável endometrioma (O-RADS 2).",
    ) &&
    !pelveAchados.includes("Ovário direito de aspecto normal."),
);

// 5b: OBSTÉTRICA — vitalidade→IG→líquido→placenta; líquido alterado substitui
// só o item da sua estrutura.
const obstetricaSpec = requireSpec("OBSTETRICA");
const obstetricaNormal = assemble(obstetricaSpec, editPlanSchema.parse({}));
check(
  "OBSTETRICA normal: conclusão completa na ordem do contrato",
  /CONCLUSÃO:\n1\) Gestação tópica única, feto vivo\.\n2\) Idade gestacional em torno de ____ semanas\.\n3\) Líquido amniótico em quantidade normal\.\n4\) Placenta de aspecto normal\.\s*$/.test(
    obstetricaNormal,
  ),
);
const obstetricaAchado = assemble(
  obstetricaSpec,
  editPlanSchema.parse({
    slots: [
      {
        slotId: "liquido_amniotico",
        corpo: "Índice de líquido amniótico (ILA) de 6,5 cm.",
        conclusao: "Líquido amniótico em quantidade reduzida (ILA mede 6,5 cm).",
      },
    ],
  }),
);
check(
  "OBSTETRICA achado: líquido substitui o normal sem apagar os demais itens",
  obstetricaAchado.includes("3) Líquido amniótico em quantidade reduzida (ILA mede 6,5 cm).") &&
    obstetricaAchado.includes("1) Gestação tópica única, feto vivo.") &&
    obstetricaAchado.includes("4) Placenta de aspecto normal.") &&
    !obstetricaAchado.includes("3) Líquido amniótico em quantidade normal."),
);

// 5c: DOPPLER — conclusão completa por componente; líquido reduzido e diástole
// reversa substituem apenas seus itens (guard umbilical nunca fica "normal").
const dopplerSpec = requireSpec("DOPPLER_OBSTETRICO");
const dopplerNormal = assemble(dopplerSpec, editPlanSchema.parse({}));
check(
  "DOPPLER normal: conclusão completa na ordem do contrato",
  /CONCLUSÃO:\n1\) Gestação tópica única, feto vivo\.\n2\) Idade gestacional em torno de ____ semanas\.\n3\) Líquido amniótico em quantidade normal\.\n4\) Placenta de aspecto normal\.\n5\) Índice de pulsatilidade normal na artéria umbilical\.\n6\) Índice de pulsatilidade normal na artéria cerebral média\.\n7\) Índice de pulsatilidade normal nas artérias uterinas\.\n8\) Ausência de sinais de incisuras\.\n9\) Não há sinais de pré-centralização ou de centralização\.\n10\) Perfil hemodinâmico fetal é normal, menor de 1\.0\.\s*$/.test(
    dopplerNormal,
  ),
);
const dopplerAchados = assemble(
  dopplerSpec,
  editPlanSchema.parse({
    slots: [
      {
        slotId: "liquido_amniotico",
        corpo: "Maior bolsão vertical de 1,7 cm.",
        conclusao: "Líquido amniótico em quantidade reduzida (MBV mede 1,7 cm).",
      },
      {
        slotId: "arteria_umbilical",
        corpo: "Artéria umbilical apresentando diástole reversa.",
        conclusao: "Artéria umbilical com diástole reversa.",
      },
    ],
  }),
);
check(
  "DOPPLER achados: líquido e umbilical substituem; diástole reversa nunca fica normal",
  dopplerAchados.includes("3) Líquido amniótico em quantidade reduzida (MBV mede 1,7 cm).") &&
    dopplerAchados.includes("5) Artéria umbilical com diástole reversa.") &&
    !dopplerAchados.includes("Índice de pulsatilidade normal na artéria umbilical."),
);

// 5d: MORFOLÓGICO — vitalidade→IG→líquido→placenta→morfologia; alteração
// morfológica e líquido aumentado substituem os dois itens correspondentes.
const morfologicoSpec = requireSpec("MORFOLOGICO");
const morfologicoNormal = assemble(morfologicoSpec, editPlanSchema.parse({}));
check(
  "MORFOLOGICO normal: conclusão completa na ordem do contrato",
  /CONCLUSÃO:\n1\) Gestação tópica única, feto vivo\.\n2\) Idade gestacional em torno de ____ semanas\.\n3\) Líquido amniótico em quantidade normal\.\n4\) Placenta de aspecto normal\.\n5\) Morfologia fetal sem evidência de alteração detectável pelo método\.\s*$/.test(
    morfologicoNormal,
  ),
);
const morfologicoAchados = assemble(
  morfologicoSpec,
  editPlanSchema.parse({
    slots: [
      {
        slotId: "liquido_amniotico",
        corpo: "Índice do líquido amniótico de 25,5 cm.",
        conclusao: "Líquido amniótico em quantidade aumentada (ILA mede 25,5 cm).",
      },
      {
        slotId: "morfologia",
        corpo: "Identifica-se alteração morfológica fetal descrita nos achados.",
        conclusao: "Morfologia fetal com alteração detectável pelo método.",
      },
    ],
  }),
);
check(
  "MORFOLOGICO achados: líquido e morfologia substituem os itens normais",
  morfologicoAchados.includes("3) Líquido amniótico em quantidade aumentada (ILA mede 25,5 cm).") &&
    morfologicoAchados.includes("5) Morfologia fetal com alteração detectável pelo método.") &&
    !morfologicoAchados.includes("Morfologia fetal sem evidência de alteração detectável pelo método."),
);

console.log(pass ? "\nwriterV2 assemble+audit: PASS" : "\nwriterV2 assemble+audit: FAIL");
if (!pass) process.exit(1);
