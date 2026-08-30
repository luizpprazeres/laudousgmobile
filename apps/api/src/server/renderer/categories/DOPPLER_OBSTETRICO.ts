import { z } from "zod";
import { buildIgInput, computeIg, type IgRawFields } from "../ig";
import { applyGolfBall, stripGolfBallEcho, type GolfBall } from "./golfBall";
import {
  ObstetricaFindingsSchema,
  OBSTETRICA_JSON_SCHEMA,
  fetoApresentacaoFrase,
  biometriaLinhas,
  EMPTY_FETO,
  biometriaLinhasObj,
  pesoLinhaObj,
  placentaFraseObj,
  TECNICA_OBJ,
  filterFreeBodyItems,
  filterFreeConclusionItems,
} from "./OBSTETRICA";
import {
  type DopplerData,
  buildDopplervelocimetriaSection,
  buildDopplerConclusionItems,
  deriveUmbilicalSafety,
} from "../../pipeline/dopplerOverlay";
import { type PesoFetalData, buildPesoFetalItems } from "../../pipeline/pesoFetalGuard";
import { renderCervicometriaBloco } from "./CERVICOMETRIA";

/**
 * DET — Renderer determinístico de DOPPLER_OBSTETRICO.
 *
 * Antes esta categoria caía no writer LLM + remendos (correctDopplerConclusion),
 * o que gerava: IG re-datada sem a regra Domingos, percentis (que JÁ vêm no input)
 * descartados, placeholders "____", rótulo de líquido trocado (MBV↔ILA) e a
 * conclusão Doppler variando por execução (boletins 21/23/28-jun + mineração das
 * correções do Luiz). Aqui o laudo é montado por CONSTRUÇÃO, reusando:
 *  - o corpo obstétrico de OBSTETRICA (apresentação, biometria) + helpers locais
 *    de líquido/placenta/peso fiéis ao MODELO_BASE do Doppler (review dex1);
 *  - a regra de IG (Domingos) de `renderer/ig.ts`;
 *  - a seção DOPPLERVELOCIMETRIA + os itens canônicos de conclusão de `dopplerOverlay`;
 *  - os itens de peso fetal (<P3/<P10/>P95) de `pesoFetalGuard`.
 *
 * ESCOPO v1: feto único, > 14s, COM VITALIDADE. Gestação inicial e óbito/ausência
 * de vitalidade caem no writer (throw → fallback no route) — o renderer NÃO pode
 * afirmar vitalidade/anatomia normal não medida (caso crítico cf262e82, review dex1).
 *
 * Gating: só roda quando `DOPPLER_OBSTETRICO` está na env `RENDERER_CATEGORIES`.
 * Flag OFF = cai no writer atual (byte-idêntico). Rollback = remover da env.
 */

// ---------------------------------------------------------------------------
// Schema — OBSTETRICA + bloco Doppler. Extends → estruturalmente compatível com
// os helpers de OBSTETRICA (ObstetricaFindings é subconjunto de DopplerObstetrico).
// ---------------------------------------------------------------------------

export const DopplerObstetricoFindingsSchema = ObstetricaFindingsSchema.extend({
  // Doppler — IP por vaso (umbilical/ACM manuais; uterinas automáticas).
  ip_umbilical: z.number().nullable(),
  perc_umbilical: z.number().nullable(),
  ip_acm: z.number().nullable(),
  perc_acm: z.number().nullable(),
  ip_uterina_dir: z.number().nullable(),
  ip_uterina_esq: z.number().nullable(),
  ip_medio_uterinas: z.number().nullable(),
  perc_medio_uterinas: z.number().nullable(),
  // Ducto venoso: IP numérico OU descrição qualitativa (onda A reversa/ausente).
  ducto_venoso_ip: z.number().nullable(),
  ducto_venoso_qualitativo: z.string().nullable(),
  rcp: z.number().nullable(),
  // Flags de alteração — só quando o médico VERBALIZA (não auto-percentiliza).
  umbilical_alterado: z.boolean().nullable(),
  acm_alterado: z.boolean().nullable(),
  incisura: z.boolean().nullable(),
  ectasia: z.boolean().nullable(),
  pre_centralizacao: z.boolean().nullable(),
  centralizacao: z.boolean().nullable(),
  uterinas_acima_p95: z.boolean().nullable(),
  // Restrição de crescimento ditada → item de Gratacós junto ao peso.
  restricao_crescimento: z.boolean().nullable(),
  // SEGURANÇA: óbito/ausência de vitalidade (BCF ausente). true → renderer NÃO
  // assume feto vivo; cai no writer (não afirma normalidade não medida).
  vitalidade_ausente: z.boolean().nullable(),
});

export type DopplerObstetricoFindings = z.infer<typeof DopplerObstetricoFindingsSchema>;

const dnum = { type: ["number", "null"] } as const;
const dstr = { type: ["string", "null"] } as const;
const dbool = { type: ["boolean", "null"] } as const;

const DOPPLER_EXTRA_REQUIRED = [
  "ip_umbilical", "perc_umbilical", "ip_acm", "perc_acm",
  "ip_uterina_dir", "ip_uterina_esq", "ip_medio_uterinas", "perc_medio_uterinas",
  "ducto_venoso_ip", "ducto_venoso_qualitativo", "rcp",
  "umbilical_alterado", "acm_alterado", "incisura", "ectasia",
  "pre_centralizacao", "centralizacao", "uterinas_acima_p95",
  "restricao_crescimento", "vitalidade_ausente",
];

export const DOPPLER_OBSTETRICO_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...OBSTETRICA_JSON_SCHEMA.required, ...DOPPLER_EXTRA_REQUIRED],
  properties: {
    ...OBSTETRICA_JSON_SCHEMA.properties,
    ip_umbilical: dnum, perc_umbilical: dnum,
    ip_acm: dnum, perc_acm: dnum,
    ip_uterina_dir: dnum, ip_uterina_esq: dnum,
    ip_medio_uterinas: dnum, perc_medio_uterinas: dnum,
    ducto_venoso_ip: dnum, ducto_venoso_qualitativo: dstr, rcp: dnum,
    umbilical_alterado: dbool, acm_alterado: dbool,
    incisura: dbool, ectasia: dbool,
    pre_centralizacao: dbool, centralizacao: dbool, uterinas_acima_p95: dbool,
    restricao_crescimento: dbool, vitalidade_ausente: dbool,
  },
} as const;

export const DOPPLER_OBSTETRICO_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada. Valor não ditado → null.

REGRAS OBSTÉTRICAS (idênticas à categoria OBSTETRICA):
1. numero_fetos: 1 = único; 2+ = gemelar. gestacao_inicial: true só em gestação inicial (≤13s6d).
2. fetos[]: um objeto por feto (apresentacao, dorso, polo_cefalico, bcf_bpm, biometria).
3. BIOMETRIA — NÃO ASSUMA UNIDADE. PRESERVE a casa decimal (vírgula → ponto: "6,63"→6.63).
   Só converta cm→mm (×10) quando "cm" for EXPLÍCITO ("DBP 6,63 cm"→dbp_mm 66.3).
   DBP→dbp_mm, CC→cc_mm, CA→ca_mm, CF/fêmur→cf_mm. Não ditado → null.
4. peso_g em gramas; peso_variacao_g e percentil (do PESO) só se ditados.
   restricao_crescimento: true se o médico disser "restrição do crescimento"/"RCIU"/"Gratacós".
5. placenta (localizacao, ecotextura, grau Grannum 0/1/2/3), líquido (liquido_tipo:
   "mbv" com liquido_mbv_por_feto_cm [1 valor no feto único], "ila" com liquido_ila_cm,
   "alterado" com liquido_classe). PRESERVE a casa decimal. NUNCA troque bolsão por ILA.
6. ig_semanas/ig_dias: IG ATUAL da BIOMETRIA deste exame (âncora). Ex.: "IG pela biometria:
   24s6d" → ig_semanas 24, ig_dias 6. PREFIRA o valor com dias.
6b. BLOCO ESTRUTURADO DE IG (gerado pelo app, formato fixo) — REGRA OBRIGATÓRIA: quando o
   input tiver "IG pela biometria: As Bd" E ("IG pela ultrassonografia precoce: Xs Yd" OU
   "IG pela DUM: Xs Yd"), você DEVE preencher TODOS estes campos (NUNCA deixe null):
   ig_semanas=A, ig_dias=B; ig_referencia_hoje_semanas=X, ig_referencia_hoje_dias=Y;
   referencia_fonte="usg_precoce" se a linha disser "ultrassonografia precoce", "dum" se disser
   "DUM". Deixe corrigir_ig=null (o sistema decide a correção sozinho pela regra dos 5 dias).
7. ÉPICO IG — referência precoce (só quando ditada; senão null): data_exame; primeira_us_data
   + primeira_us_ig_semanas/dias (1ª US: data + IG NAQUELA data); ig_referencia_hoje_semanas/dias
   (IG da referência já corrigida p/ hoje — ex.: "IG pela DUM: 26s6d" quando essa é a referência);
   referencia_fonte ("usg_precoce"|"dum" — a fonte a USAR p/ corrigir); corrigir_ig
   (true="corrija/correlacione", false="não corrigir", null se não mencionar).
8. achados_adicionais: SOMENTE alterações patológicas reais, nas palavras do médico (não frases
   de normalidade). itens_conclusao_livres: só conteúdo de conclusão sem campo próprio; [] vazio.

REGRAS DO DOPPLER:
9. IP por vaso (número entre 0 e ~3, preserve decimal): ip_umbilical (artéria umbilical),
   ip_acm (artéria cerebral média), ip_uterina_dir, ip_uterina_esq, ip_medio_uterinas (IP médio
   das uterinas), rcp (relação cérebro-placentária, se ditada).
10. PERCENTIS: o ditado costuma trazer uma linha "→ Percentis (...): AU IP X (P46) · ACM IP Y (P88)
    · Uterinas média IP Z (P37)". EXTRAIA esses percentis: perc_umbilical=46, perc_acm=88,
    perc_medio_uterinas=37. NUNCA descarte os percentis que vierem no input.
11. ducto venoso: se vier IP numérico ("IP ducto venoso: 0.46") → ducto_venoso_ip 0.46. Se vier
    descrição ("onda A reversa/ausente") → ducto_venoso_qualitativo com o texto.
12. Flags (true só quando o médico VERBALIZA a alteração; senão null): umbilical_alterado,
    acm_alterado, incisura (incisura protodiastólica nas uterinas), ectasia, pre_centralizacao,
    centralizacao (brain sparing/redistribuição), uterinas_acima_p95 (uterinas "acima do P95").
13. SEGURANÇA — vitalidade_ausente: true se o médico disser ÓBITO/"sem vitalidade"/"BCF ausente"/
    "sem batimentos"/"sem atividade cardíaca". Caso contrário null. NUNCA invente vitalidade.
14. ACHADOS ALTERADOS POR FETO — herdados da categoria OBSTETRICA e com as MESMAS
    regras: fetos[].bcf_alteracao ("ausente"/"bradicardia"/"taquicardia"),
    fetos[].movimentos_fetais ("ausentes"/"reduzidos"), fetos[].cranio_achado +
    cranio_medida_mm + cranio_lateralidade, fetos[].cordao_vasos ("tres" normal,
    "dois" = artéria umbilical única), placenta_achado ("descolamento" com
    placenta_achado_medidas / "acretismo" / "lagos_venosos") e
    placenta_relacao_orificio ("insercao_baixa"/"marginal"/"previa" +
    placenta_distancia_orificio_mm). TODOS null quando não ditados — silêncio
    nunca vira achado.
    RELAÇÃO COM O ITEM 13: vitalidade_ausente é do EXAME e continua valendo;
    fetos[].bcf_alteracao diz de QUAL feto. Com óbito, preencha os DOIS —
    vitalidade_ausente=true e bcf_alteracao="ausente" no feto certo. No gemelar
    é o segundo que carrega a informação, porque "o exame tem um óbito" não diz
    se o feto morto é o A ou o B.
15. cervicometria: segue a MESMA regra da categoria OBSTETRICA. null quando não
    realizada. Preencha o objeto apenas quando o médico pedir/acrescentar a
    cervicometria ou ditar a medida do colo; nunca deduza do exame obstétrico.`;

// ---------------------------------------------------------------------------
// Helpers locais
// ---------------------------------------------------------------------------

type Feto = DopplerObstetricoFindings["fetos"][number];

function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}
/** pt-BR até 2 casas (espelha numFmt de dopplerOverlay) — p/ ducto venoso IP. */
function numPt(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function bcfFrag(v: number | null): string {
  return v !== null ? ptBr(v) : "____";
}
/** "esquerda"/"direita" cru → "à esquerda"/"à direita" (extração às vezes tira o "à"). */
function dorsoFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  return /^(direita|esquerda)$/i.test(t) ? `à ${t.toLowerCase()}` : t;
}
/** Feto[0] com o dorso normalizado (preposição). */
function feto0(f: DopplerObstetricoFindings): Feto {
  const ft = f.fetos[0] ?? EMPTY_FETO;
  return { ...ft, dorso: dorsoFmt(ft.dorso) };
}
function grauPlacenta(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().replace(/^grau\s*/i, "");
  const romano: Record<string, string> = { "0": "0", "1": "I", "2": "II", "3": "III" };
  return `grau ${romano[t] ?? t}`;
}
function numberConclusao(itens: string[]): string {
  if (itens.length === 1) return itens[0] ?? "";
  return itens.map((it, i) => `${i + 1}) ${it}`).join("\n");
}

/** Peso fetal Doppler — usa "g" (MODELO_BASE do Doppler; review dex1). */
function pesoLinhaDoppler(ft: Feto): string {
  const extras: string[] = [];
  if (ft.peso_variacao_g !== null) extras.push(`+- ${ptBr(ft.peso_variacao_g)} g`);
  if (ft.percentil !== null) extras.push(`percentil ${ptBr(ft.percentil)}`);
  const sufixo = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `Peso aproximado de ${ft.peso_g !== null ? ptBr(ft.peso_g) : "____"} g${sufixo}.`;
}

/**
 * Líquido amniótico Doppler — frase canônica do Luiz (mineração/review dex1):
 * corpo "O maior bolsão vertical mede X cm."; conclusão "Líquido amniótico DE
 * quantidade normal (...)". NUNCA rotula bolsão como ILA.
 */
function liquidoDoppler(f: DopplerObstetricoFindings): { corpo: string; conclusao: string } {
  const tipo = f.liquido_tipo ?? "normal";
  if (tipo === "mbv" && f.liquido_mbv_por_feto_cm && f.liquido_mbv_por_feto_cm.length > 0) {
    const v = f.liquido_mbv_por_feto_cm[0];
    const t = v !== undefined ? `${ptBr(v)} cm` : "____ cm";
    return {
      corpo: `O maior bolsão vertical mede ${t}.`,
      conclusao: `Líquido amniótico de quantidade normal (maior bolsão vertical mede ${t}).`,
    };
  }
  if (tipo === "ila" && f.liquido_ila_cm !== null) {
    return {
      corpo: `Índice do líquido amniótico de ${ptBr(f.liquido_ila_cm)} cm.`,
      conclusao: `Líquido amniótico de quantidade normal (ILA de ${ptBr(f.liquido_ila_cm)} cm).`,
    };
  }
  if (tipo === "alterado" && f.liquido_classe) {
    return {
      corpo: `Líquido amniótico em quantidade alterada (${f.liquido_classe}).`,
      conclusao: `${f.liquido_classe.charAt(0).toUpperCase()}${f.liquido_classe.slice(1)}.`,
    };
  }
  return {
    corpo: "Líquido amniótico de quantidade normal pela análise subjetiva.",
    conclusao: "Líquido amniótico de quantidade normal.",
  };
}

/** Placenta Doppler (clássico) — termina com "de acordo com a fase da gestação". */
function placentaDoppler(f: DopplerObstetricoFindings): string | null {
  const grau = grauPlacenta(f.placenta_grau);
  if (!f.placenta_localizacao && !f.placenta_ecotextura && !grau) return null;
  let s = "Placenta";
  if (f.placenta_localizacao) s += ` de localização ${f.placenta_localizacao}`;
  if (grau) s += `, ${grau}`;
  if (f.placenta_ecotextura) s += `, com ecotextura ${f.placenta_ecotextura}`;
  return `${s}, de acordo com a fase da gestação.`;
}

/**
 * Remove a linha numérica "Perfil hemodinâmico fetal: X." da SEÇÃO do corpo (a
 * conclusão usa "...é normal, menor de 1.0", que fica). Fidelidade ao final
 * aceito (d213131b não trazia essa linha; review dex1).
 */
function stripPerfilLine(section: string): string {
  return section.replace(/\nPerfil hemodinâmico fetal: [0-9][^\n]*/g, "");
}

const COMENTARIOS_DOPPLER =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. Foi utilizado Doppler colorido para avaliação hemodinâmica fetal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";

const TITULO = "ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO";

/** IG determinística (Domingos). enabled=false neutraliza a referência. */
function igResultDoppler(f: DopplerObstetricoFindings, enabled: boolean) {
  const raw: IgRawFields = {
    biometriaSemanas: f.ig_semanas,
    biometriaDias: f.ig_dias,
    dataExame: enabled ? f.data_exame : null,
    dum: enabled ? f.dum : null,
    primeiraUsData: enabled ? f.primeira_us_data : null,
    primeiraUsIgSemanas: enabled ? f.primeira_us_ig_semanas : null,
    primeiraUsIgDias: enabled ? f.primeira_us_ig_dias : null,
    igRefHojeSemanas: enabled ? f.ig_referencia_hoje_semanas : null,
    igRefHojeDias: enabled ? f.ig_referencia_hoje_dias : null,
    referenciaFonte: enabled ? f.referencia_fonte : null,
    corrigirComando: enabled ? f.corrigir_ig : null,
  };
  return computeIg(
    buildIgInput(raw, {
      leadAncora: "Gestação em torno de ",
      leadBase: "Gestação em torno de ",
    }),
  );
}

/** Campos tipados → DopplerData (reuso dos builders sem reparsear texto). */
function toDopplerData(f: DopplerObstetricoFindings): DopplerData {
  const ductoVenoso =
    f.ducto_venoso_qualitativo ??
    (f.ducto_venoso_ip !== null ? `IP ${numPt(f.ducto_venoso_ip)}` : undefined);
  return {
    ipUmbilical: f.ip_umbilical ?? undefined,
    percUmbilical: f.perc_umbilical ?? undefined,
    ipACM: f.ip_acm ?? undefined,
    percACM: f.perc_acm ?? undefined,
    ipUterinaDir: f.ip_uterina_dir ?? undefined,
    ipUterinaEsq: f.ip_uterina_esq ?? undefined,
    ipMedioUterinas: f.ip_medio_uterinas ?? undefined,
    percMedioUterinas: f.perc_medio_uterinas ?? undefined,
    ductoVenoso,
    rcp: f.rcp ?? undefined,
    umbilicalAlterado: f.umbilical_alterado ?? undefined,
    acmAlterado: f.acm_alterado ?? undefined,
    incisura: f.incisura ?? undefined,
    ectasia: f.ectasia ?? undefined,
    preCentralizacao: f.pre_centralizacao ?? undefined,
    centralizacao: f.centralizacao ?? undefined,
    uterinasAcimaP95: f.uterinas_acima_p95 ?? undefined,
  };
}

/** Percentil do peso (no feto) + restrição → PesoFetalData (itens de Gratacós/PIG/GIG). */
function toPesoFetalData(f: DopplerObstetricoFindings): PesoFetalData {
  const ft = f.fetos[0] ?? EMPTY_FETO;
  const d: PesoFetalData = { restricao: f.restricao_crescimento ?? undefined };
  if (ft.percentil !== null) {
    if (ft.percentil < 3) d.abaixoP3 = true;
    else if (ft.percentil < 10) d.abaixoP10 = true;
    else if (ft.percentil > 95) d.acimaP95 = true;
  }
  return d;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderClassico(f: DopplerObstetricoFindings, igCorrection: boolean, golfBall: GolfBall | null = null, flexivel = false, safety?: { umbilical?: boolean; rawInput?: string }): string {
  const ig = igResultDoppler(f, igCorrection);
  let d = toDopplerData(f);
  // SEGURANÇA P0 (flag DOPPLER_UMBILICAL_SAFETY): nunca afirmar IP umbilical normal
  // com diástole zero/reversa ditada ou IP bruto grosseiramente elevado.
  if (safety?.umbilical) d = deriveUmbilicalSafety(d, safety.rawInput);
  const ft = feto0(f);

  const aspectos: string[] = [
    fetoApresentacaoFrase(ft, false),
    `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${bcfFrag(ft.bcf_bpm)} bpm).`,
    "Os movimentos fetais são ativos.",
    "",
    "As considerações sobre a anatomia fetal são as seguintes:",
    "As estruturas cranianas e da coluna vertebral são normais.",
    "O estômago e a bexiga foram bem identificados e com ecotextura homogênea.",
    "",
    "A biometria fetal é a seguinte:",
    ...biometriaLinhas(ft),
    pesoLinhaDoppler(ft),
  ];
  const plc = placentaDoppler(f);
  if (plc) aspectos.push(`\n${plc}`);
  const liq = liquidoDoppler(f);
  aspectos.push(liq.corpo);
  aspectos.push(`\n${stripPerfilLine(buildDopplervelocimetriaSection(d))}`);

  const conclusao = [
    ig.conclusaoClassico,
    liq.conclusao,
    ...buildPesoFetalItems(toPesoFetalData(f)),
    ...buildDopplerConclusionItems(d),
  ];

  // Golf ball (flag): corpo no bloco de anatomia + item de conclusão (eco fetal ~28s).
  if (golfBall) applyGolfBall(aspectos, conclusao, golfBall);

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }

  // Camada flexível (flag): observações livres de corpo (após dedup) nos aspectos,
  // e itens livres na conclusão. Espelha OBSTETRICA (dex1: não dropar o inusitado).
  if (flexivel) {
    aspectos.push(...filterFreeBodyItems(f.observacoes_corpo_livres));
    conclusao.push(...filterFreeConclusionItems(f.itens_conclusao_livres));
  }

  if (f.cervicometria) {
    const cervico = renderCervicometriaBloco(f.cervicometria, f.ig_semanas);
    aspectos.push("\nCERVICOMETRIA:", ...cervico.achados);
    conclusao.push(...cervico.conclusao);
  }

  const dumLinha = f.dum ? `\nDUM: ${f.dum}.\n` : "";
  const igProse = ig.fraseReferencia ? `${ig.fraseReferencia}\n` : "";

  return [
    TITULO,
    dumLinha,
    igProse,
    f.cervicometria
      ? `${COMENTARIOS_DOPPLER}\nFoi realizada avaliação complementar do colo uterino pela via transvaginal.`
      : COMENTARIOS_DOPPLER,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    numberConclusao(conclusao),
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderObjetivo(f: DopplerObstetricoFindings, igCorrection: boolean, golfBall: GolfBall | null = null, flexivel = false, safety?: { umbilical?: boolean; rawInput?: string }): string {
  const ig = igResultDoppler(f, igCorrection);
  let d = toDopplerData(f);
  if (safety?.umbilical) d = deriveUmbilicalSafety(d, safety.rawInput);
  const ft = feto0(f);

  const achados: string[] = [];
  const apres = ft.apresentacao ? `, em apresentação ${ft.apresentacao}` : "";
  achados.push(`Feto único${apres}${ft.dorso ? `, com dorso ${ft.dorso}` : ""}.`);
  achados.push(
    `Batimentos cardíacos fetais (BCF): ${bcfFrag(ft.bcf_bpm)} bpm. Movimentos fetais ativos.`,
  );
  achados.push("\nBiometria fetal:");
  achados.push(...biometriaLinhasObj(ft));
  achados.push(pesoLinhaObj(ft));
  const plc = placentaFraseObj(f);
  if (plc) achados.push(plc);
  const liq = liquidoDoppler(f);
  achados.push(liq.corpo);
  achados.push(`\n${stripPerfilLine(buildDopplervelocimetriaSection(d))}`);

  // Golf ball (flag): linha nos achados ANTES dos adicionais (posição estável).
  const impressao = [
    ...ig.conclusaoObjetivo,
    liq.conclusao,
    ...buildPesoFetalItems(toPesoFetalData(f)),
    ...buildDopplerConclusionItems(d),
  ];
  if (golfBall) applyGolfBall(achados, impressao, golfBall);

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push(`\n${f.achados_adicionais.trim()}`);
  }

  // Camada flexível (flag): corpo-livre nos achados, itens-livres na impressão.
  if (flexivel) {
    achados.push(...filterFreeBodyItems(f.observacoes_corpo_livres));
    impressao.push(...filterFreeConclusionItems(f.itens_conclusao_livres));
  }

  if (f.cervicometria) {
    const cervico = renderCervicometriaBloco(f.cervicometria, f.ig_semanas);
    achados.push("\nCERVICOMETRIA:", ...cervico.achados);
    impressao.push(...cervico.conclusao);
  }

  const dumLinha = f.dum ? `\nDUM: ${f.dum}.` : "";
  const igProse = ig.fraseReferencia ? `\n${ig.fraseReferencia}` : "";
  const impressaoTxt =
    impressao.length === 1
      ? impressao[0] ?? ""
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  return [
    TITULO,
    dumLinha,
    igProse,
    "",
    "TÉCNICA:",
    f.cervicometria
      ? `${TECNICA_OBJ} Avaliação complementar do colo uterino realizada pela via transvaginal.`
      : TECNICA_OBJ,
    "",
    "ACHADOS:",
    achados.join("\n"),
    "",
    "IMPRESSÃO:",
    impressaoTxt,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * SEGURANÇA — sobrescreve os campos de IG com o BLOCO ESTRUTURADO gerado pelo app
 * (formato fixo "IG pela biometria/DUM/ultrassonografia precoce: Xs Yd"). O valor
 * estruturado é a fonte de verdade; a extração LLM erra quando o prose tem garble
 * de ASR (caso d213131b: "hoje com 20...6 dias" sobrescrevia "IG pela DUM: 26s6d").
 * Determinístico: sem esse bloco, retorna `f` intocado (confia na extração).
 */
export function mergeStructuredIg(
  f: DopplerObstetricoFindings,
  rawInput: string,
): DopplerObstetricoFindings {
  const biom = rawInput.match(/IG\s+pela\s+biometria:\s*(\d+)\s*s\s*(\d+)\s*d/i);
  const precoce = rawInput.match(
    /IG\s+pela\s+ultrassonografia\s+precoce:\s*(\d+)\s*s\s*(\d+)\s*d/i,
  );
  const dum = rawInput.match(/IG\s+pela\s+DUM:\s*(\d+)\s*s\s*(\d+)\s*d/i);
  const ref = precoce ?? dum;
  if (!biom && !ref) return f;
  const out = { ...f };
  if (biom) {
    out.ig_semanas = Number(biom[1]);
    out.ig_dias = Number(biom[2]);
  }
  if (ref) {
    out.ig_referencia_hoje_semanas = Number(ref[1]);
    out.ig_referencia_hoje_dias = Number(ref[2]);
    out.referencia_fonte = precoce ? "usg_precoce" : "dum";
  }
  return out;
}

export function renderDopplerObstetrico(
  f: DopplerObstetricoFindings,
  _prefs?: unknown,
  opts?: { objetivo?: boolean; igCorrection?: boolean; flexivel?: boolean; golfBall?: GolfBall | null; umbilicalSafety?: boolean; rawInput?: string },
): string {
  // SEGURANÇA (review dex1): gestação inicial e óbito/ausência de vitalidade saem
  // do escopo v1 — lança erro → fallback writer no route (route.ts:812). O renderer
  // NÃO pode afirmar vitalidade/anatomia normal que não foram medidas.
  if (f.gestacao_inicial || f.vitalidade_ausente === true) {
    throw new Error(
      "DOPPLER_OBSTETRICO: gestação inicial ou sem vitalidade fora do escopo do renderer determinístico (v1) → fallback writer",
    );
  }
  // SEGURANÇA CRÍTICA (boletim 2026-06-30, laudo 9cb5204c): o renderer v1 é FETO
  // ÚNICO — usa feto0() e descartaria silenciosamente o 2º feto + seus Dopplers
  // (AU/ACM/DV) numa gestação gemelar. Gemelar → fallback writer (preserva os dois).
  if ((f.numero_fetos ?? 1) >= 2 || f.fetos.length >= 2) {
    throw new Error(
      "DOPPLER_OBSTETRICO: gestação gemelar (2+ fetos) fora do escopo do renderer determinístico (v1) → fallback writer",
    );
  }
  const igc = opts?.igCorrection ?? false;
  const g = opts?.golfBall ?? null;
  // Golf ball (flag): dedup do eco cru nos achados adicionais (o snippet substitui).
  if (g && f.achados_adicionais) {
    f = { ...f, achados_adicionais: stripGolfBallEcho(f.achados_adicionais) || null };
  }
  const flx = opts?.flexivel ?? false;
  const safety = opts?.umbilicalSafety
    ? { umbilical: true, rawInput: opts.rawInput }
    : undefined;
  return opts?.objetivo
    ? renderObjetivo(f, igc, g, flx, safety)
    : renderClassico(f, igc, g, flx, safety);
}
