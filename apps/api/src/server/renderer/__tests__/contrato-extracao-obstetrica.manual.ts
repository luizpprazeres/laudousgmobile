/**
 * O CONTRATO DE EXTRAÇÃO cobre todos os campos que o renderer consome?
 *
 * POR QUE ISTO EXISTE. Em 16/08 o catálogo ganhou 10 campos de patologia —
 * `bcf_alteracao`, `cranio_achado`, `cordao_vasos`, `placenta_achado`… — e 8
 * deles ficaram SÓ no schema Zod. O `OBSTETRICA_JSON_SCHEMA` não os tinha, o
 * prompt não os mencionava, e o LLM portanto nunca os preenchia. O catálogo
 * inteiro era decorativo: com a flag ligada, os laudos sairiam idênticos aos de
 * antes, e nada acusaria isso — nem typecheck, nem equivalência, nem a matriz
 * de invariantes, porque todas partem de findings construídos à mão.
 *
 * Um campo só existe de verdade quando as TRÊS peças existem:
 *
 *   1. schema Zod          — o tipo, para o parse
 *   2. JSON Schema strict  — o CONTRATO, para o LLM saber que o campo existe
 *   3. prompt de extração  — a REGRA, para o LLM saber quando preenchê-lo
 *
 * O Doppler isolado NÃO herda mais o obstétrico. O vínculo agora é explícito:
 * `OBSTETRICA.doppler` usa o contrato do módulo compartilhado.
 *
 *   pnpm exec tsx src/server/renderer/__tests__/contrato-extracao-obstetrica.manual.ts
 */
import {
  ObstetricaFindingsSchema,
  OBSTETRICA_JSON_SCHEMA,
  OBSTETRICA_EXTRACTION_PROMPT,
} from "../categories/OBSTETRICA";
import {
  DopplerObstetricoFindingsSchema,
  DOPPLER_OBSTETRICO_JSON_SCHEMA,
  DOPPLER_OBSTETRICO_EXTRACTION_PROMPT,
} from "../categories/DOPPLER_OBSTETRICO";

let ok = 0;
const falhas: string[] = [];
function t(nome: string, cond: boolean, detalhe = "") {
  if (cond) ok++;
  else falhas.push(`${nome}${detalhe ? `\n        ${detalhe}` : ""}`);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const schema = OBSTETRICA_JSON_SCHEMA as any;
const fetoJson = schema.properties.fetos.items;

/** Campos do Zod, que é a definição de "o que o renderer pode consumir". */
const camposExame = Object.keys(ObstetricaFindingsSchema.shape);
const fetoShape = (ObstetricaFindingsSchema.shape.fetos as any).element.shape;
const camposFeto = Object.keys(fetoShape);

console.log("\nContrato de extração OBSTETRICA — Zod × JSON Schema × prompt\n");

// ------------------------------------------------ 1 · o LLM sabe que o campo existe
console.log("1 · todo campo do Zod está no JSON Schema (senão o LLM nunca o preenche)");
for (const c of camposExame) {
  t(`exame.${c} em properties`, c in schema.properties);
  t(`exame.${c} em required`, schema.required.includes(c));
}
for (const c of camposFeto) {
  t(`feto.${c} em properties`, c in fetoJson.properties);
  // Modo strict da OpenAI: TODA propriedade precisa estar em `required`. O
  // "opcional" se exprime pelo `null` do tipo, nunca pela ausência da chave.
  t(`feto.${c} em required`, fetoJson.required.includes(c));
}

// ------------------------------------------------------- 2 · nada a mais no contrato
console.log("2 · e o JSON Schema não promete campo que o Zod não sabe ler");
for (const c of Object.keys(schema.properties)) {
  t(`exame.${c} existe no Zod`, camposExame.includes(c),
    "o LLM preencheria um campo que o parse descarta");
}
for (const c of Object.keys(fetoJson.properties)) {
  t(`feto.${c} existe no Zod`, camposFeto.includes(c),
    "o LLM preencheria um campo que o parse descarta");
}

// ---------------------------------------------- 3 · o LLM sabe QUANDO preencher
console.log("3 · todo campo de ACHADO tem regra no prompt");
/**
 * Só os campos de achado. Os de biometria/identificação já são cobertos pelas
 * regras 1–14 por nome de medida, e cobrar menção literal de todos eles
 * transformaria este teste em burocracia.
 */
const CAMPOS_DE_ACHADO = [
  "bcf_alteracao", "movimentos_fetais", "cranio_achado", "cranio_medida_mm",
  "cranio_lateralidade", "cordao_vasos",
  "placenta_achado", "placenta_achado_medidas",
  "placenta_relacao_orificio", "placenta_distancia_orificio_mm",
  // Vísceras (spec §4)
  "pielectasia_direita", "pielectasia_esquerda",
  "pielectasia_direita_mm", "pielectasia_esquerda_mm", "intestino_hiperecogenico",
  "ascite", "derrame_pleural", "derrame_pleural_mm", "hidropsia",
  "estomago_nao_visualizado",
  // Anexos e 1º trimestre (spec §9)
  "ovario_achado", "ovario_lado", "ovario_medidas_cm", "ovario_achado_medida_cm",
  "vesicula_vitelina_mm", "hematoma_perigestacional_medidas",
  "hematoma_perigestacional_lado", "gestacao_inviavel",
];
for (const c of CAMPOS_DE_ACHADO) {
  t(`prompt explica ${c}`, OBSTETRICA_EXTRACTION_PROMPT.includes(c),
    "o campo existe no contrato mas o LLM não sabe quando usá-lo");
}

// ------------------------------------------- 4 · os valores do enum batem nos 3 lugares
console.log("4 · os valores de enum são os mesmos no Zod e no JSON Schema");
function valoresZod(shape: any, campo: string): string[] | null {
  // .nullable().default(null) empilha wrappers; desembrulha até achar o enum.
  let d = shape[campo];
  for (let i = 0; i < 6 && d?._def; i++) {
    if (d._def.typeName === "ZodEnum") return d._def.values as string[];
    d = d._def.innerType ?? d._def.type ?? d._def.schema;
  }
  return null;
}
for (const [origem, shape, json] of [
  ["feto", fetoShape, fetoJson.properties],
  ["exame", ObstetricaFindingsSchema.shape, schema.properties],
] as const) {
  for (const c of Object.keys(shape)) {
    const zod = valoresZod(shape, c);
    if (!zod) continue;
    const doJson = (json as any)[c]?.enum as unknown[] | undefined;
    t(`${origem}.${c}: enum idêntico`,
      Array.isArray(doJson) && zod.every((v) => doJson.includes(v)) &&
        doJson.filter((v) => v !== null).length === zod.length,
      `zod=${JSON.stringify(zod)} json=${JSON.stringify(doJson)}`);
    t(`${origem}.${c}: o enum do JSON aceita null`,
      Array.isArray(doJson) && doJson.includes(null),
      "sem null no enum, o modo strict recusa a ausência do achado");
  }
}

// -------------------------------------------------- 5 · o payload do LLM faz parse
console.log("5 · um payload completo do LLM passa no parse do Zod");
{
  const feto: Record<string, unknown> = {};
  for (const c of camposFeto) feto[c] = null;
  feto.rotulo = null;
  const exame: Record<string, unknown> = {};
  for (const c of camposExame) exame[c] = null;
  Object.assign(exame, {
    numero_fetos: 1, gestacao_inicial: false, fetos: [{ ...feto, bcf_bpm: 142 }],
    itens_conclusao_livres: [], observacoes_corpo_livres: [],
  });
  const r = ObstetricaFindingsSchema.safeParse(exame);
  t("payload com todos os campos nulos faz parse", r.success,
    r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3)));
}
{
  // E um payload com os achados preenchidos — os valores que o prompt manda usar.
  const exame = {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
    fetos: [{
      rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
      polo_cefalico: null, bcf_bpm: null, dbp_mm: 80, cc_mm: 290, ca_mm: 270,
      cf_mm: 60, ccn_mm: null, peso_g: 2400, peso_variacao_g: null, percentil: null,
      bcf_alteracao: "ausente", movimentos_fetais: "reduzidos",
      cranio_achado: "dandy_walker", cranio_medida_mm: null,
      cranio_lateralidade: null, cordao_vasos: "dois",
    }],
    ig_semanas: 32, ig_dias: 0, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null,
    saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
    placenta_quantidade: null, placenta_localizacao: "anterior",
    placenta_ecotextura: null, placenta_grau: null,
    placenta_relacao_orificio: "previa", placenta_distancia_orificio_mm: null,
    placenta_achado: "acretismo", placenta_achado_medidas: null,
    liquido_tipo: null, liquido_ila_cm: null, liquido_mbv_por_feto_cm: null,
    liquido_classe: null, achados_adicionais: null,
    itens_conclusao_livres: [], observacoes_corpo_livres: [],
  };
  const r = ObstetricaFindingsSchema.safeParse(exame);
  t("payload com os achados preenchidos faz parse", r.success,
    r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3)));
}

// -------------------------------------------- 6 · Doppler separado + add-on compartilhado
console.log("6 · Doppler isolado e add-on têm o mesmo contrato vascular");
{
  const dop = DOPPLER_OBSTETRICO_JSON_SCHEMA as any;
  const campos = [
    "ir_uterina_dir", "ip_uterina_dir", "ir_uterina_esq", "ip_uterina_esq",
    "ir_umbilical", "ip_umbilical", "ir_acm", "ip_acm",
    "ir_ducto_venoso", "ip_ducto_venoso", "rcp", "perfil_hemodinamico",
    "incisura", "pre_centralizacao", "centralizacao",
  ];
  for (const c of campos) {
    t(`doppler isolado contém ${c}`, c in dop.properties && dop.required.includes(c));
  }
  t("obstétrica recebe Doppler namespaced", "doppler" in schema.properties && schema.required.includes("doppler"));
  t("prompt obstétrico explica o módulo", /DOPPLER OBSTÉTRICO OPCIONAL/.test(OBSTETRICA_EXTRACTION_PROMPT));
  t("prompt isolado proíbe biometria", /Não extraia biometria fetal/.test(DOPPLER_OBSTETRICO_EXTRACTION_PROMPT));
  t("prompt isolado separa IR e IP", /preserve separadamente IR.*IP/is.test(DOPPLER_OBSTETRICO_EXTRACTION_PROMPT));

  const r = DopplerObstetricoFindingsSchema.safeParse({
    ir_uterina_dir: 0.59, ip_uterina_dir: 0.81,
    ir_uterina_esq: 0.58, ip_uterina_esq: 0.8,
    ip_medio_uterinas: 0.81, perc_medio_uterinas: null,
    ir_umbilical: 0.58, ip_umbilical: 1.02, perc_umbilical: null,
    ir_acm: 0.81, ip_acm: 1.48, perc_acm: null,
    ir_ducto_venoso: 0.4, ip_ducto_venoso: 0.72,
    ducto_venoso_qualitativo: null, rcp: null, perfil_hemodinamico: null,
    umbilical_alterado: false, acm_alterado: false, incisura: false,
    ectasia: null, pre_centralizacao: false, centralizacao: false,
    uterinas_acima_p95: null, observacoes_adicionais: null,
    itens_conclusao_livres: [], ig_semanas: null, cervicometria: null,
  });
  t("payload vascular isolado faz parse", r.success,
    r.success ? "" : JSON.stringify(r.error.issues.slice(0, 3)));
}

// ------------------------------------------------------------------- relatório
const total = ok + falhas.length;
console.log(`\n${"═".repeat(74)}`);
if (falhas.length === 0) {
  console.log(`✓ ${ok}/${total} — o contrato de extração cobre o que o renderer consome`);
} else {
  console.log(`✗ ${falhas.length} de ${total} FALHARAM\n`);
  for (const f of falhas) console.log(`  • ${f}`);
}
console.log(`${"═".repeat(74)}\n`);
if (falhas.length > 0) process.exit(1);
