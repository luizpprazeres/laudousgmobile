import { resolveMorfologicoCategory } from "../../pipeline/morfologicoRouteSelection";
import {
  MorfologicoFindingsSchema,
  renderMorfologico,
  type MorfologicoFindings,
} from "../categories/MORFOLOGICO";

const BASE = {
  trimestre: "2t",
  apresentacao: null,
  dorso: null,
  polo_cefalico: null,
  bcf_bpm: null,
  vitalidade: null,
  movimentos_fetais: null,
  cordao_vasos: null,
  liquido_avaliacao: null,
  anatomia_avaliada: null,
  anatomia_alterada: null,
  ccn_mm: null,
  tn_mm: null,
  osso_nasal: null,
  regurgitacao_tricuspide: null,
  ducto_venoso: null,
  uterina_ip_direita: null,
  uterina_ip_esquerda: null,
  dbp_mm: null,
  cc_mm: null,
  cerebelo_mm: null,
  cisterna_magna_mm: null,
  binocular_mm: null,
  ca_mm: null,
  femur_mm: null,
  tibia_mm: null,
  fibula_mm: null,
  umero_mm: null,
  radio_mm: null,
  ulna_mm: null,
  peso_g: null,
  peso_variacao_g: null,
  percentil: null,
  genitalia: null,
  placenta_localizacao: null,
  placenta_grau: null,
  ila_cm: null,
  ig_semanas: 22,
  ig_dias: 3,
  dum: null,
  data_exame: null,
  primeira_us_data: null,
  primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null,
  ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null,
  referencia_fonte: null,
  corrigir_ig: null,
  achados_adicionais: null,
  itens_conclusao_livres: [],
  cervicometria: null,
  doppler: null,
  crescimento_fetal: null,
} as const;

let pass = 0;
let fail = 0;

function check(nome: string, condicao: boolean, detalhe?: string): void {
  if (condicao) {
    pass += 1;
    console.log(`✓ ${nome}`);
    return;
  }
  fail += 1;
  console.error(`✗ ${nome}${detalhe ? `\n  ${detalhe}` : ""}`);
}

function findings(patch: Partial<MorfologicoFindings> = {}): MorfologicoFindings {
  return MorfologicoFindingsSchema.parse({ ...BASE, ...patch });
}

function estilos(patch: Partial<MorfologicoFindings>): Array<{ nome: string; texto: string }> {
  const f = findings(patch);
  return [
    { nome: "Clássico", texto: renderMorfologico(f) },
    { nome: "Objetivo", texto: renderMorfologico(f, null, { objetivo: true }) },
  ];
}

// Entrada silenciosa do iOS: o servidor não completa o que não foi informado.
for (const estilo of estilos({})) {
  check(`${estilo.nome}: mantém o título do 2º trimestre`, estilo.texto.includes("MORFOLÓGICA DO SEGUNDO TRIMESTRE"), estilo.texto);
  check(`${estilo.nome}: não inventa apresentação cefálica`, !estilo.texto.includes("apresentação cefálica"), estilo.texto);
  check(`${estilo.nome}: não inventa vitalidade`, !/Batimentos cardíacos (?:fetais )?(?:presentes|não identificados)/.test(estilo.texto), estilo.texto);
  check(`${estilo.nome}: não inventa movimentos`, !/movimentos fetais/i.test(estilo.texto), estilo.texto);
  check(`${estilo.nome}: não inventa cordão de três vasos`, !/duas artérias e uma veia/.test(estilo.texto), estilo.texto);
  check(`${estilo.nome}: não inventa líquido normal`, !/Líquido amniótico de quantidade normal/.test(estilo.texto), estilo.texto);
  check(`${estilo.nome}: não inventa survey anatômico normal`, !/estruturas cranianas.+normais|Anatomia fetal sem alterações|Estruturas avaliadas sem alterações/.test(estilo.texto), estilo.texto);
}

const NORMAL: Partial<MorfologicoFindings> = {
  apresentacao: "cefálica",
  bcf_bpm: 145,
  vitalidade: "normal",
  movimentos_fetais: "normais",
  cordao_vasos: "tres",
  liquido_avaliacao: "normal",
  anatomia_avaliada: true,
  anatomia_alterada: [],
};

for (const estilo of estilos(NORMAL)) {
  check(`${estilo.nome}: estado normal explícito preserva apresentação`, estilo.texto.includes("apresentação cefálica"), estilo.texto);
  check(`${estilo.nome}: estado normal explícito preserva vitalidade`, estilo.texto.includes("BCF = 145 bpm"), estilo.texto);
  check(`${estilo.nome}: estado normal explícito preserva movimentos`, estilo.texto.includes("movimentos fetais são ativos"), estilo.texto);
  check(`${estilo.nome}: estado normal explícito preserva cordão`, estilo.texto.includes("duas artérias e uma veia"), estilo.texto);
  check(`${estilo.nome}: estado normal explícito preserva líquido`, estilo.texto.includes("Líquido amniótico de quantidade normal"), estilo.texto);
  check(`${estilo.nome}: estado normal explícito conclui morfologia normal`, estilo.texto.includes("Morfologia fetal sem evidência de alteração"), estilo.texto);
}

for (const estilo of estilos({
  ...NORMAL,
  anatomia_alterada: ["snc"],
  achados_adicionais: "Ventriculomegalia bilateral, medindo 12 mm.",
  itens_conclusao_livres: ["Ventriculomegalia bilateral leve."],
})) {
  check(`${estilo.nome}: ventriculomegalia chega ao corpo`, estilo.texto.includes("Ventriculomegalia bilateral, medindo 12 mm"), estilo.texto);
  check(`${estilo.nome}: ventriculomegalia chega à conclusão`, estilo.texto.includes("Ventriculomegalia bilateral leve"), estilo.texto);
  check(`${estilo.nome}: retira normalidade incompatível de SNC`, !/estruturas cranianas.+normais|crânio, SNC e coluna/.test(estilo.texto), estilo.texto);
  check(`${estilo.nome}: mantém os demais sistemas avaliados`, /Coração com quatro câmaras|coração com quatro câmaras/.test(estilo.texto), estilo.texto);
  check(`${estilo.nome}: não conclui morfologia normal`, !estilo.texto.includes("Morfologia fetal sem evidência de alteração"), estilo.texto);
}

for (const estilo of estilos({
  ...NORMAL,
  vitalidade: "bradicardia",
  bcf_bpm: 96,
  cordao_vasos: "dois",
  ila_cm: 3,
})) {
  check(`${estilo.nome}: bradicardia no corpo`, estilo.texto.includes("bradicardia (BCF = 96 bpm)"), estilo.texto);
  check(`${estilo.nome}: bradicardia na conclusão`, estilo.texto.includes("Bradicardia fetal"), estilo.texto);
  check(`${estilo.nome}: artéria umbilical única na conclusão`, estilo.texto.includes("Artéria umbilical única"), estilo.texto);
  check(`${estilo.nome}: oligoâmnio substitui líquido normal`, estilo.texto.includes("Oligoâmnio (ILA de 3 cm)") && !estilo.texto.includes("Líquido amniótico de quantidade normal"), estilo.texto);
}

for (const estilo of estilos({
  ...NORMAL,
  apresentacao: null,
  polo_cefalico: "à direita",
  dorso: "à esquerda",
})) {
  check(`${estilo.nome}: transversa usa polo cefálico`, estilo.texto.includes("situação transversa, com polo cefálico à direita"), estilo.texto);
  check(`${estilo.nome}: transversa não usa apresentação`, !/apresentação transversa|apresentação córmica/.test(estilo.texto), estilo.texto);
}

const rotas = [
  ["MORFOLOGICO", "Morfológico do primeiro trimestre, TN 1,5 mm", "MORFOLOGICO"],
  ["OBSTETRICA", "Morfológico do segundo trimestre, anatomia fetal completa", "MORFOLOGICO"],
  ["DOPPLER_OBSTETRICO", "Morfológico do terceiro trimestre com Doppler", "MORFOLOGICO"],
  ["OBSTETRICA", "Ultrassonografia obstétrica de 32 semanas", "OBSTETRICA"],
  ["DOPPLER_OBSTETRICO", "Doppler obstétrico isolado", "DOPPLER_OBSTETRICO"],
] as const;

for (const [detectada, ditado, esperada] of rotas) {
  const rota = resolveMorfologicoCategory(detectada, ditado);
  check(`roteamento: ${ditado}`, rota.category === esperada, `obtido ${rota.category}, esperado ${esperada}`);
}

for (const estilo of estilos({
  ...NORMAL,
  cervicometria: {
    colo_oi_oe_cm: 2.2,
    orificio_interno_fechado: true,
    placenta_distancia_cm: null,
    placenta_distante: false,
    cerclagem: false,
    observacoes: null,
  },
})) {
  check(`${estilo.nome}: cervicometria permanece no morfológico`, estilo.texto.includes("MORFOLÓGICA DO SEGUNDO TRIMESTRE") && estilo.texto.includes("CERVICOMETRIA:"), estilo.texto);
  check(`${estilo.nome}: cervicometria usa técnica transvaginal`, estilo.texto.includes("via transvaginal"), estilo.texto);
}

for (const estilo of estilos({
  ...NORMAL,
  doppler: {
    ir_uterina_dir: null,
    ip_uterina_dir: 0.82,
    ir_uterina_esq: null,
    ip_uterina_esq: 0.9,
    ip_medio_uterinas: 0.86,
    perc_medio_uterinas: 42,
    ir_umbilical: null,
    ip_umbilical: 1.05,
    perc_umbilical: 51,
    fluxo_diastolico_umbilical: "presente",
    ir_acm: null,
    ip_acm: 1.6,
    perc_acm: 48,
    ir_ducto_venoso: null,
    ip_ducto_venoso: null,
    perc_ducto_venoso: null,
    ducto_venoso_qualitativo: null,
    rcp: 1.52,
    perc_rcp: 46,
    perfil_hemodinamico: 1.52,
    umbilical_alterado: false,
    acm_alterado: false,
    incisura: false,
    ectasia: false,
    pre_centralizacao: false,
    centralizacao: false,
    uterinas_acima_p95: false,
  },
  crescimento_fetal: {
    efwPercentile: 35,
    efwPercentileSource: "Fetal Medicine Barcelona v2021",
    dopplerAssessmentCompleteAndNormal: true,
    cprBelowP5: { present: false, confirmed: false },
    mcaPiBelowP5: { present: false, confirmed: false },
    meanUterinePiAboveP95: false,
    umbilicalArteryEndDiastolicFlow: "present",
    umbilicalFlowConfirmedInRequiredInterval: false,
    ductusVenosus: {
      piAboveP95: false,
      diastolicFlow: "present",
      persistentDicroticVenousPulsations: false,
      confirmedAfter6To12Hours: false,
    },
    pathologicalCtg: false,
  },
})) {
  check(`${estilo.nome}: Doppler permanece complemento`, estilo.texto.includes("MORFOLÓGICA DO SEGUNDO TRIMESTRE COM DOPPLER COLORIDO") && estilo.texto.includes("DOPPLERVELOCIMETRIA:"), estilo.texto);
  check(`${estilo.nome}: índices Doppler entram na seção própria`, estilo.texto.includes("Artéria umbilical com índice de pulsatilidade de 1,05"), estilo.texto);
  check(`${estilo.nome}: crescimento permanece complemento`, estilo.texto.includes("CRESCIMENTO FETAL:"), estilo.texto);
  check(`${estilo.nome}: fonte do percentil é preservada`, estilo.texto.includes("Fetal Medicine Barcelona v2021"), estilo.texto);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
