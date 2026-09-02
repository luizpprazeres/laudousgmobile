import { filterFreeConclusionItems } from "./OBSTETRICA";
import { z } from "zod";
import { buildIgInput, computeIg, type IgRawFields, type IgComputed } from "../ig";
import {
  applyGolfBallMorfologico,
  stripGolfBallEcho,
  type GolfBall,
} from "./golfBall";
import {
  CervicometriaAddonSchema,
  CERVICOMETRIA_ADDON_JSON_SCHEMA,
  renderCervicometriaBloco,
} from "./CERVICOMETRIA";
import {
  DOPPLER_MODULE_EXTRACTION_RULES,
  DOPPLER_OBSTETRICO_ADDON_JSON_SCHEMA,
  DOPPLER_TECNICA_CLASSICO,
  DOPPLER_TECNICA_OBJETIVO,
  DopplerObstetricoModuleSchema,
  renderDopplerModule,
} from "./dopplerObstetricoModule";
import {
  FETAL_GROWTH_MODULE_JSON_SCHEMA,
  FetalGrowthModuleSchema,
  renderFetalGrowthModule,
} from "./fetalGrowthModule";

/**
 * DET-5 — Renderer de MORFOLOGICO (1º, 2º e 3º trimestre).
 *
 * Estrutura garantida por construção (resolve o writer que omitia COMENTÁRIOS/
 * OS SEGUINTES ASPECTOS e errava o título). Conteúdo = fonte viva
 * (~/laudousg/lib/categoryDefaults.ts). Trimestre detectado pela extração.
 */

const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const bool = { type: ["boolean", "null"] } as const;

export const MorfologicoFindingsSchema = z.object({
  trimestre: z.enum(["1t", "2t", "3t"]),
  apresentacao: z.string().nullable(),
  dorso: z.string().nullable(),
  polo_cefalico: z.string().nullable(),
  bcf_bpm: z.number().nullable(),
  /** Estados explícitos: null/ausente significa que o médico não informou. */
  vitalidade: z.enum(["normal", "ausente", "bradicardia", "taquicardia"]).nullable().optional(),
  movimentos_fetais: z.enum(["normais", "reduzidos", "ausentes"]).nullable().optional(),
  cordao_vasos: z.enum(["tres", "dois"]).nullable().optional(),
  liquido_avaliacao: z.enum(["normal", "oligoamnio", "polidramnio"]).nullable().optional(),
  /** Survey anatômico explícito e sistemas que devem substituir a frase normal. */
  anatomia_avaliada: z.boolean().nullable().optional(),
  anatomia_alterada: z.array(z.enum(["snc", "face", "coracao", "visceras"])).nullable().optional(),
  // 1º trimestre
  ccn_mm: z.number().nullable(),
  tn_mm: z.number().nullable(),
  osso_nasal: z.enum(["presente", "ausente"]).nullable(),
  regurgitacao_tricuspide: z.enum(["ausente", "presente"]).nullable(),
  ducto_venoso: z.enum(["normal", "alterado"]).nullable(),
  uterina_ip_direita: z.number().nullable(),
  uterina_ip_esquerda: z.number().nullable(),
  // 2º/3º trimestre — biometria
  dbp_mm: z.number().nullable(),
  cc_mm: z.number().nullable(),
  cerebelo_mm: z.number().nullable(),
  cisterna_magna_mm: z.number().nullable(),
  binocular_mm: z.number().nullable(),
  ca_mm: z.number().nullable(),
  femur_mm: z.number().nullable(),
  tibia_mm: z.number().nullable(),
  fibula_mm: z.number().nullable(),
  umero_mm: z.number().nullable(),
  radio_mm: z.number().nullable(),
  ulna_mm: z.number().nullable(),
  peso_g: z.number().nullable(),
  peso_variacao_g: z.number().nullable(),
  percentil: z.number().nullable(),
  genitalia: z.string().nullable(),
  placenta_localizacao: z.string().nullable(),
  placenta_grau: z.string().nullable(),
  ila_cm: z.number().nullable(),
  // comum
  ig_semanas: z.number().nullable(),
  ig_dias: z.number().nullable(),
  dum: z.string().nullable(),
  // Épico IG determinística (Domingos) — referência precoce + data do exame.
  data_exame: z.string().nullable(),
  primeira_us_data: z.string().nullable(),
  primeira_us_ig_semanas: z.number().nullable(),
  primeira_us_ig_dias: z.number().nullable(),
  ig_referencia_hoje_semanas: z.number().nullable(),
  ig_referencia_hoje_dias: z.number().nullable(),
  referencia_fonte: z.enum(["usg_precoce", "dum"]).nullable(),
  corrigir_ig: z.boolean().nullable(),
  achados_adicionais: z.string().nullable(),
  /**
   * OS ITENS DE CONCLUSÃO DO MÉDICO — o canal que faltava.
   *
   * `achados_adicionais` só chega ao CORPO. Um morfológico que encontra
   * ventriculomegalia descrevia o achado e não o concluía: a tela tem um campo
   * de diagnóstico por sistema que não tinha para onde ir, e a conclusão ficava
   * calada sobre a malformação.
   *
   * O mecanismo é o mesmo já usado na obstétrica (camada flexível), incluindo o
   * `filterFreeConclusionItems`, que descarta o que duplica linha determinística
   * — o médico às vezes reescreve na conclusão o que já é campo próprio.
   */
  itens_conclusao_livres: z.array(z.string()).nullish(),
  /** Exame complementar opcional; null = cervicometria não realizada. */
  cervicometria: CervicometriaAddonSchema.nullable().optional(),
  /** Doppler materno-fetal complementar, independente do protocolo do 1º trimestre. */
  doppler: DopplerObstetricoModuleSchema.nullable().optional(),
  crescimento_fetal: FetalGrowthModuleSchema.nullable().optional(),
});

export type MorfologicoFindings = z.infer<typeof MorfologicoFindingsSchema>;

export const MORFOLOGICO_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "trimestre", "apresentacao", "dorso", "polo_cefalico", "bcf_bpm",
    "vitalidade", "movimentos_fetais", "cordao_vasos", "liquido_avaliacao",
    "anatomia_avaliada", "anatomia_alterada",
    "ccn_mm", "tn_mm", "osso_nasal", "regurgitacao_tricuspide", "ducto_venoso",
    "uterina_ip_direita", "uterina_ip_esquerda",
    "dbp_mm", "cc_mm", "cerebelo_mm", "cisterna_magna_mm", "binocular_mm", "ca_mm",
    "femur_mm", "tibia_mm", "fibula_mm", "umero_mm", "radio_mm", "ulna_mm",
    "peso_g", "peso_variacao_g", "percentil", "genitalia",
    "placenta_localizacao", "placenta_grau", "ila_cm",
    "ig_semanas", "ig_dias", "dum",
    "data_exame", "primeira_us_data", "primeira_us_ig_semanas", "primeira_us_ig_dias",
    "ig_referencia_hoje_semanas", "ig_referencia_hoje_dias", "referencia_fonte", "corrigir_ig",
    "achados_adicionais", "cervicometria", "doppler",
    "crescimento_fetal",
  ],
  properties: {
    trimestre: { type: "string", enum: ["1t", "2t", "3t"] },
    apresentacao: str, dorso: str, polo_cefalico: str, bcf_bpm: num,
    vitalidade: { type: ["string", "null"], enum: ["normal", "ausente", "bradicardia", "taquicardia", null] },
    movimentos_fetais: { type: ["string", "null"], enum: ["normais", "reduzidos", "ausentes", null] },
    cordao_vasos: { type: ["string", "null"], enum: ["tres", "dois", null] },
    liquido_avaliacao: { type: ["string", "null"], enum: ["normal", "oligoamnio", "polidramnio", null] },
    anatomia_avaliada: bool,
    anatomia_alterada: {
      type: ["array", "null"],
      items: { type: "string", enum: ["snc", "face", "coracao", "visceras"] },
    },
    ccn_mm: num, tn_mm: num,
    osso_nasal: { type: ["string", "null"], enum: ["presente", "ausente", null] },
    regurgitacao_tricuspide: { type: ["string", "null"], enum: ["ausente", "presente", null] },
    ducto_venoso: { type: ["string", "null"], enum: ["normal", "alterado", null] },
    uterina_ip_direita: num, uterina_ip_esquerda: num,
    dbp_mm: num, cc_mm: num, cerebelo_mm: num, cisterna_magna_mm: num, binocular_mm: num, ca_mm: num,
    femur_mm: num, tibia_mm: num, fibula_mm: num, umero_mm: num, radio_mm: num, ulna_mm: num,
    peso_g: num, peso_variacao_g: num, percentil: num, genitalia: str,
    placenta_localizacao: str, placenta_grau: str, ila_cm: num,
    ig_semanas: num, ig_dias: num, dum: str,
    data_exame: str, primeira_us_data: str,
    primeira_us_ig_semanas: num, primeira_us_ig_dias: num,
    ig_referencia_hoje_semanas: num, ig_referencia_hoje_dias: num,
    referencia_fonte: { type: ["string", "null"], enum: ["usg_precoce", "dum", null] },
    corrigir_ig: { type: ["boolean", "null"] },
    achados_adicionais: str,
    itens_conclusao_livres: { type: ["array", "null"], items: { type: "string" } },
    cervicometria: CERVICOMETRIA_ADDON_JSON_SCHEMA,
    doppler: DOPPLER_OBSTETRICO_ADDON_JSON_SCHEMA,
    crescimento_fetal: FETAL_GROWTH_MODULE_JSON_SCHEMA,
  },
} as const;

export const MORFOLOGICO_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA MORFOLÓGICA.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada.

REGRAS:
1. trimestre: detecte "1t" (CCN, translucência nucal, osso nasal, ducto venoso,
   IG ≤ 14 semanas, sem biometria DBP/CC), "2t" (15–28 sem; biometria completa)
   ou "3t" (≥ 29 sem). Se o médico disser explicitamente, respeite.
2. BIOMETRIA — NÃO ASSUMA UNIDADE. Extraia o número EXATAMENTE como ditado:
   PRESERVE a casa decimal (vírgula → ponto: "2,4" → 2.4); NUNCA remova a vírgula
   (jamais 24 para "2,4"). Só converta cm→mm (×10) quando a unidade "cm" for
   EXPLICITAMENTE dita (ex.: "CCN 5,2 cm" → ccn_mm 52); sem unidade explícita, use
   o número como foi dito ("CCN 2,4" → ccn_mm 2.4). Assuma que o médico falou a
   unidade certa; não "corrija". Campos: CCN→ccn_mm, TN→tn_mm, DBP→dbp_mm,
   HC/CC→cc_mm, AC/CA→ca_mm, CF/FL/fêmur/comprimento femoral→femur_mm,
   tíbia→tibia_mm, fíbula→fibula_mm,
   úmero→umero_mm, rádio→radio_mm, ulna→ulna_mm, cerebelo→cerebelo_mm,
   cisterna magna→cisterna_magna_mm, distância binocular→binocular_mm. Valor não
   ditado → null (NUNCA inventar). ATENÇÃO: "CF" no bloco de biometria fetal é o
   comprimento femoral (femur_mm) — NUNCA o deixe null se "CF: X" foi ditado.
3. osso_nasal: "presente"/"ausente". regurgitacao_tricuspide:
   "ausente"/"presente" somente quando avaliada. ducto_venoso:
   "normal"/"alterado" (onda A reversa = alterado; onda A positiva/trifásica = normal).
4. uterina_ip_direita/esquerda: IP das artérias uterinas (1t).
5. apresentacao/dorso (2t/3t): só se ditados. Situação transversa/córmica não é
   apresentação: use apresentacao=null e registre a posição em polo_cefalico.
5b. vitalidade/movimentos_fetais/cordao_vasos: só preencha quando o médico
   informar ou quando o dado objetivo sustentar o estado (BCF numérico sustenta
   vitalidade normal). Cordão não citado = null; nunca invente três vasos.
5c. anatomia_avaliada=true somente quando o médico disser que realizou o survey
   anatômico/morfológico ou declarar a anatomia normal. Em anatomia_alterada,
   marque os sistemas que possuem alteração: snc (crânio/SNC/coluna), face,
   coracao ou visceras (tórax/abdome/rins/bexiga/aorta). A frase normal do mesmo
   sistema será substituída pelo achado adicional. Não marque um sistema normal.
6. peso_g/peso_variacao_g/percentil: só se ditados. genitalia: se ditada.
   placenta_localizacao e placenta_grau (Grannum: 0/1/2/3 — capture o número),
   ila_cm: se ditados. liquido_avaliacao só quando o médico qualificar como
   normal, oligoâmnio ou polidrâmnio; a medida de ILA também será classificada
   deterministicamente. Sem medida e sem qualificação, use null.
7. ig_semanas/ig_dias (IG ATUAL da biometria); dum como DD/MM/AAAA (extenso → numérico).
7b. ÉPICO IG — referência precoce (só quando DITADO; senão null): data_exame
   (data/"hoje"); primeira_us_data + primeira_us_ig_semanas/dias (1ª US: data + IG
   NAQUELA data); ig_referencia_hoje_semanas/dias (IG da referência já corrigida
   p/ hoje, se ditada); referencia_fonte ("usg_precoce"|"dum" — a fonte que o médico
   mandou USAR p/ corrigir; ESSENCIAL quando cita DUM e 1ª US juntas; senão null);
   corrigir_ig (true="corrija/correlacione", false="não
   corrigir/manter biometria", null se não mencionar). NUNCA inventar.
8. achados_adicionais: SOMENTE malformações ou ALTERAÇÕES patológicas reais, nas
   palavras do médico. NUNCA coloque aqui frases de NORMALIDADE redundantes
   ("sem descolamentos", "movimentos e tônus presentes", "líquido normal",
   "placenta grau 2") — dados estruturados vão nos campos próprios; frases de
   normalidade já estão no modelo. null se o exame for normal.
9. cervicometria: exame complementar OPCIONAL dentro deste mesmo laudo. Preencha
   o objeto SOMENTE quando o médico disser que realizou/quer acrescentar a
   cervicometria ou ditar a medida do colo; caso contrário, null. A medida OI→OE
   e a distância da placenta são em cm (converta mm→cm). OI fechado é true por
   padrão dentro do modelo e false quando aberto/dilatado/afunilado. Nunca
   invente a medida; quando ausente, o renderer mantém o placeholder.
10. ${DOPPLER_MODULE_EXTRACTION_RULES}
11. crescimento_fetal — use null por padrão. Só preencha quando o médico
    fornecer explicitamente o percentil do PFE e a curva/fonte. Confirmação de
    segunda medida só pode ser true quando tiver sido dita com o intervalo
    exigido. Fluxo umbilical ausente/reverso só fecha estágio quando também foi
    descrito em mais de 50% dos ciclos nas duas artérias. NUNCA deduza
    confirmação, PIG ou estágio de Gratacós de uma medida isolada. O servidor
    fará a classificação determinística.`;

// ---------------------------------------------------------------------------
function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}
function mm(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}
function formatIg(semanas: number | null, dias: number | null): string {
  if (semanas === null) return "____ semanas";
  if (dias === null || dias === 0) return `${ptBr(semanas)} ${semanas === 1 ? "semana" : "semanas"}`;
  return `${ptBr(semanas)} ${semanas === 1 ? "semana" : "semanas"} e ${ptBr(dias)} ${dias === 1 ? "dia" : "dias"}`;
}

/**
 * IG determinística (Domingos). Flag OFF (enabled=false) neutraliza a referência
 * → computeIg devolve só a biometria (byte-idêntico ao formatIg legado). Morfo
 * é sempre feto único → lead simples "Gestação em torno de ".
 */
function igResultMorfo(f: MorfologicoFindings, enabled: boolean): IgComputed {
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

/** Peso fetal com variação (+- g) e percentil — ambos OPCIONAIS. */
function pesoLinhaMorfo(f: MorfologicoFindings): string {
  const extras: string[] = [];
  if (f.peso_variacao_g !== null) extras.push(`+- ${ptBr(f.peso_variacao_g)} g`);
  if (f.percentil !== null) extras.push(`percentil ${ptBr(f.percentil)}`);
  const sufixo = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `Peso fetal estimado em ${f.peso_g !== null ? ptBr(f.peso_g) : "____"} g${sufixo}.`;
}

function acrescentarCervicometria(
  f: MorfologicoFindings,
  corpo: string[],
  conclusao: string[],
): void {
  if (!f.cervicometria) return;
  const cervico = renderCervicometriaBloco(f.cervicometria, f.ig_semanas);
  corpo.push("\nCERVICOMETRIA:", ...cervico.achados);
  conclusao.push(...cervico.conclusao);
}

function acrescentarDoppler(
  f: MorfologicoFindings,
  corpo: string[],
  conclusao: string[],
  options?: { umbilicalSafety?: boolean; rawInput?: string },
): void {
  if (!f.doppler) return;
  const doppler = renderDopplerModule(f.doppler, options);
  corpo.push("\nDOPPLERVELOCIMETRIA:", ...doppler.achados);
  conclusao.push(...doppler.conclusao);
}

function acrescentarCrescimentoFetal(
  f: MorfologicoFindings,
  corpo: string[],
  conclusao: string[],
): void {
  if (!f.crescimento_fetal) return;
  const growth = renderFetalGrowthModule(
    f.crescimento_fetal,
    f.ig_semanas,
    f.ig_dias,
  );
  corpo.push("\nCRESCIMENTO FETAL:", ...growth.achados);
  conclusao.push(...growth.conclusao);
}

/** Concordância: "apresentação" feminina → cefálica/pélvica. */
function apresentacaoFmt(s: string | null): string | null {
  if (!s) return null;
  const map: Record<string, string> = {
    cefálico: "cefálica", cefalico: "cefálica", pélvico: "pélvica",
    pelvico: "pélvica",
  };
  return map[s.trim().toLowerCase()] ?? s.trim();
}

/** Dorso: adiciona "à" quando o lado vem sem preposição. */
function dorsoFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  if (/^(direita|esquerda)$/i.test(t)) return `à ${t.toLowerCase()}`;
  return t;
}

/** Grau de placenta (Grannum) → romano. */
function grauPlacenta(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().replace(/^grau\s*/i, "");
  const romano: Record<string, string> = { "0": "0", "1": "I", "2": "II", "3": "III" };
  return `grau ${romano[t] ?? t}`;
}

type SistemaAnatomico = "snc" | "face" | "coracao" | "visceras";

const ANATOMIA_NORMAL_CLASSICA: Record<SistemaAnatomico, string> = {
  snc: "As estruturas cranianas e da coluna vertebral são normais.",
  face: "Nariz e narinas presentes.\nLábio superior sem solução de continuidade.",
  coracao: "Coração com quatro câmaras visíveis.",
  visceras:
    "O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea.\nA aorta abdominal fetal apresenta calibre normal.",
};

function sistemasAlterados(f: MorfologicoFindings): Set<SistemaAnatomico> {
  return new Set(f.anatomia_alterada ?? []);
}

function anatomiaClassica(f: MorfologicoFindings): string[] {
  if (f.anatomia_avaliada !== true) return [];
  const alterados = sistemasAlterados(f);
  const linhas = (Object.keys(ANATOMIA_NORMAL_CLASSICA) as SistemaAnatomico[])
    .filter((sistema) => !alterados.has(sistema))
    .flatMap((sistema) => ANATOMIA_NORMAL_CLASSICA[sistema].split("\n"));
  return linhas.length > 0
    ? ["", "As considerações sobre a anatomia fetal são as seguintes:", ...linhas]
    : [];
}

function anatomiaObjetiva(f: MorfologicoFindings): string[] {
  if (f.anatomia_avaliada !== true) return [];
  const alterados = sistemasAlterados(f);
  const preservados = [
    ["snc", "crânio, SNC e coluna"],
    ["face", "face"],
    ["coracao", "coração com quatro câmaras"],
    ["visceras", "tórax, abdome, rins, bexiga e aorta"],
  ] as const;
  const nomes = preservados
    .filter(([id]) => !alterados.has(id))
    .map(([, nome]) => nome);
  if (nomes.length === 0) return [];
  return [`Estruturas avaliadas sem alterações detectáveis pelo método: ${nomes.join(", ")}.`];
}

function linhaFeto(f: MorfologicoFindings): string {
  const dorso = dorsoFmt(f.dorso);
  if (f.polo_cefalico) {
    return `Feto único, em situação transversa, com polo cefálico ${f.polo_cefalico}${dorso ? `, e dorso ${dorso}` : ""}.`;
  }
  const apresentacao = apresentacaoFmt(f.apresentacao);
  if (apresentacao) {
    return `Feto único, em apresentação ${apresentacao}${dorso ? `, com dorso ${dorso}` : ""}.`;
  }
  return dorso ? `Feto único, com dorso ${dorso}.` : "Feto único.";
}

function vitalidadeClassicaMorfo(f: MorfologicoFindings): { corpo: string[]; conclusao: string[] } {
  const bpm = f.bcf_bpm !== null ? ptBr(f.bcf_bpm) : null;
  if (f.vitalidade === "ausente") {
    return { corpo: ["Batimentos cardíacos fetais não identificados."], conclusao: ["Ausência de vitalidade fetal."] };
  }
  if (f.vitalidade === "bradicardia") {
    return {
      corpo: [`Batimentos cardíacos fetais presentes, com bradicardia${bpm ? ` (BCF = ${bpm} bpm)` : ""}.`],
      conclusao: ["Bradicardia fetal."],
    };
  }
  if (f.vitalidade === "taquicardia") {
    return {
      corpo: [`Batimentos cardíacos fetais presentes, com taquicardia${bpm ? ` (BCF = ${bpm} bpm)` : ""}.`],
      conclusao: ["Taquicardia fetal."],
    };
  }
  if (f.vitalidade === "normal" || bpm) {
    return {
      corpo: [`Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler${bpm ? ` (BCF = ${bpm} bpm)` : ""}.`],
      conclusao: [],
    };
  }
  return { corpo: [], conclusao: [] };
}

function movimentosMorfo(f: MorfologicoFindings): string[] {
  if (f.vitalidade === "ausente") return [];
  if (f.movimentos_fetais === "normais") return ["Os movimentos fetais são ativos."];
  if (f.movimentos_fetais === "reduzidos") return ["Movimentos fetais reduzidos."];
  if (f.movimentos_fetais === "ausentes") return ["Não foram observados movimentos fetais durante o exame."];
  return [];
}

function cordaoMorfo(f: MorfologicoFindings): { corpo: string[]; conclusao: string[] } {
  if (f.cordao_vasos === "tres") {
    return { corpo: ["Cordão umbilical com duas artérias e uma veia."], conclusao: [] };
  }
  if (f.cordao_vasos === "dois") {
    return {
      corpo: ["Cordão umbilical com dois vasos, sendo uma artéria e uma veia."],
      conclusao: ["Artéria umbilical única."],
    };
  }
  return { corpo: [], conclusao: [] };
}

function liquidoMorfo(f: MorfologicoFindings): { corpo: string[]; conclusao: string[]; alterado: boolean } {
  if (f.ila_cm !== null) {
    const valor = ptBr(f.ila_cm);
    if (f.ila_cm < 5) {
      return { corpo: [`Índice do líquido amniótico de ${valor} cm.`], conclusao: [`Oligoâmnio (ILA de ${valor} cm).`], alterado: true };
    }
    if (f.ila_cm > 25) {
      return { corpo: [`Índice do líquido amniótico de ${valor} cm.`], conclusao: [`Polidrâmnio (ILA de ${valor} cm).`], alterado: true };
    }
    return { corpo: [`Índice do líquido amniótico de ${valor} cm.`], conclusao: ["Líquido amniótico de quantidade normal."], alterado: false };
  }
  if (f.liquido_avaliacao === "normal") {
    return { corpo: ["Líquido amniótico de quantidade normal pela análise subjetiva."], conclusao: ["Líquido amniótico de quantidade normal."], alterado: false };
  }
  if (f.liquido_avaliacao === "oligoamnio") {
    return { corpo: ["Líquido amniótico de quantidade reduzida pela análise subjetiva."], conclusao: ["Oligoâmnio."], alterado: true };
  }
  if (f.liquido_avaliacao === "polidramnio") {
    return { corpo: ["Líquido amniótico de quantidade aumentada pela análise subjetiva."], conclusao: ["Polidrâmnio."], alterado: true };
  }
  return { corpo: [], conclusao: [], alterado: false };
}

const COMENTARIOS_1T =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

function render1t(f: MorfologicoFindings, igCorrection = false, golfBall: GolfBall | null = null, dopplerOptions?: { umbilicalSafety?: boolean; rawInput?: string }): string {
  const ig = igResultMorfo(f, igCorrection);
  const vitalidade = vitalidadeClassicaMorfo(f);
  const liquido = liquidoMorfo(f);
  const aspectos: string[] = [
    "Feto único de situação variável.",
    ...vitalidade.corpo,
    ...movimentosMorfo(f),
    `Comprimento crânio-nádegas (CCN) de ${mm(f.ccn_mm)} mm.`,
    `Medida da translucência nucal (TN) de ${mm(f.tn_mm)} mm.`,
    ...(f.osso_nasal === null
      ? []
      : [f.osso_nasal === "ausente" ? "Ausência de osso nasal." : "Presença de osso nasal."]),
    ...(f.regurgitacao_tricuspide == null
      ? []
      : [f.regurgitacao_tricuspide === "presente"
          ? "Presença de regurgitação tricúspide."
          : "Ausência de regurgitação tricúspide."]),
    ...(f.ducto_venoso === null
      ? []
      : [f.ducto_venoso === "alterado"
          ? "Ducto venoso com onda reversa na sístole atrial."
          : "Ducto venoso com aspecto de onda trifásica (sístole ventricular, diástole ventricular e sístole atrial positivas)."]),
  ];
  if (f.placenta_localizacao) {
    aspectos.push(`Placenta de localização ${f.placenta_localizacao}.`);
  }
  aspectos.push(...liquido.corpo);
  if (f.uterina_ip_direita !== null || f.uterina_ip_esquerda !== null) {
    aspectos.push(`Artéria uterina direita: IP ${f.uterina_ip_direita !== null ? ptBr(f.uterina_ip_direita) : "____"}.`);
    aspectos.push(`Artéria uterina esquerda: IP ${f.uterina_ip_esquerda !== null ? ptBr(f.uterina_ip_esquerda) : "____"}.`);
    if (f.uterina_ip_direita !== null && f.uterina_ip_esquerda !== null) {
      const medio = (f.uterina_ip_direita + f.uterina_ip_esquerda) / 2;
      aspectos.push(`Índice de pulsatilidade médio das artérias uterinas: ${ptBr(Math.round(medio * 100) / 100)}.`);
    }
  }

  /**
   * As duas frases abaixo eram INCONDICIONAIS — ver a explicação longa na
   * ramificação do 2º/3º trimestre clássico. Mesmo defeito, mesma correção:
   * não asseverar normalidade que ninguém verificou, e não negar na conclusão
   * o achado que o corpo descreve.
   */
  const temAchado = (f.achados_adicionais ?? "").trim() !== "";
  const conclusao = [
    ig.conclusaoClassico,
    ...vitalidade.conclusao,
    ...liquido.conclusao,
    ...(f.ducto_venoso === null
      ? []
      : [f.ducto_venoso === "alterado"
          ? "Doppler do ducto venoso alterado (onda A reversa)."
          : "Doppler do ducto venoso normal."]),
    ...(f.osso_nasal === "ausente" ? ["Ausência de osso nasal."] : []),
    ...(f.regurgitacao_tricuspide === "presente" ? ["Presença de regurgitação tricúspide."] : []),
    ...(f.anatomia_avaliada !== true || temAchado || f.osso_nasal === "ausente" || f.regurgitacao_tricuspide === "presente" || f.ducto_venoso === "alterado"
      ? []
      : ["Morfologia fetal normal para esta fase da gestação."]),
    ...filterFreeConclusionItems(f.itens_conclusao_livres),
  ];
  if (f.uterina_ip_direita !== null && f.uterina_ip_esquerda !== null) {
    conclusao.push("Dopplervelocimetria normal das artérias uterinas.");
  }
  if (golfBall) applyGolfBallMorfologico(aspectos, conclusao, golfBall);

  return assemble("ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE", f, aspectos, conclusao, ig.fraseReferencia, dopplerOptions);
}

function render2t3t(f: MorfologicoFindings, terceiro: boolean, igCorrection = false, golfBall: GolfBall | null = null, dopplerOptions?: { umbilicalSafety?: boolean; rawInput?: string }): string {
  const ig = igResultMorfo(f, igCorrection);
  const titulo = terceiro
    ? "ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE"
    : "ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE";
  const vitalidade = vitalidadeClassicaMorfo(f);
  const cordao = cordaoMorfo(f);
  const liquido = liquidoMorfo(f);
  const anexos = [
    ...cordao.corpo,
    ...(f.placenta_localizacao || f.placenta_grau
      ? [`Placenta${f.placenta_localizacao ? ` de localização ${f.placenta_localizacao}` : ""}${grauPlacenta(f.placenta_grau) ? `, ${grauPlacenta(f.placenta_grau)}` : ""}.`]
      : []),
    ...liquido.corpo,
  ];

  const aspectos: string[] = [
    linhaFeto(f),
    ...vitalidade.corpo,
    ...movimentosMorfo(f),
    ...anatomiaClassica(f),
    ...(f.genitalia ? [`Genitália externa ${genitaliaFmt(f.genitalia)}.`] : []),
    "",
    "A biometria fetal é a seguinte:",
    `Diâmetro biparietal (DBP) de ${mm(f.dbp_mm)} mm.`,
    `Circunferência da cabeça (CC) de ${mm(f.cc_mm)} mm.`,
    `Cerebelo mede ${mm(f.cerebelo_mm)} mm.`,
    `Cisterna magna mede ${mm(f.cisterna_magna_mm)} mm.`,
    // Distância binocular: 2º trimestre apenas (removida no 3º, decisão Luiz).
    ...(terceiro ? [] : [`Distância binocular de ${mm(f.binocular_mm)} mm.`]),
    `Circunferência abdominal (CA) de ${mm(f.ca_mm)} mm.`,
    // Ossos longos bilaterais — mesmo valor p/ ambos os lados (regra curada).
    `Comprimento do fêmur direito de ${mm(f.femur_mm)} mm.`,
    `Comprimento do fêmur esquerdo de ${mm(f.femur_mm)} mm.`,
    `Comprimento da tíbia direita de ${mm(f.tibia_mm)} mm.`,
    `Comprimento da tíbia esquerda de ${mm(f.tibia_mm)} mm.`,
    `Comprimento da fíbula direita de ${mm(f.fibula_mm)} mm.`,
    `Comprimento da fíbula esquerda de ${mm(f.fibula_mm)} mm.`,
    `Comprimento do úmero direito de ${mm(f.umero_mm)} mm.`,
    `Comprimento do úmero esquerdo de ${mm(f.umero_mm)} mm.`,
    `Comprimento do rádio direito de ${mm(f.radio_mm)} mm.`,
    `Comprimento do rádio esquerdo de ${mm(f.radio_mm)} mm.`,
    `Comprimento da ulna direita de ${mm(f.ulna_mm)} mm.`,
    `Comprimento da ulna esquerda de ${mm(f.ulna_mm)} mm.`,
    pesoLinhaMorfo(f),
    ...(anexos.length > 0 ? ["", "Análise extra-fetal:", ...anexos] : []),
  ];

  /**
   * ⚠️ ATÉ 22/08 ESTAS DUAS FRASES ERAM INCONDICIONAIS.
   *
   * A conclusão afirmava líquido normal e morfologia sem alteração
   * independentemente do que estivesse nos achados. Com `ila_cm: 3` e
   * `achados_adicionais: "ventriculomegalia bilateral de 12 mm"`, o laudo saía
   * descrevendo a ventriculomegalia no corpo e concluindo, logo abaixo, que
   * não havia alteração detectável — e que o líquido estava normal.
   *
   * Um laudo que se contradiz é pior que um laudo incompleto: quem lê a
   * conclusão não tem como saber que o corpo diz outra coisa.
   *
   * `itens_conclusao_livres` é o canal determinístico para a síntese diagnóstica
   * ditada pelo médico; `anatomia_alterada` retira a normalidade incompatível
   * do mesmo sistema.
   */
  const temAchado = (f.achados_adicionais ?? "").trim() !== "";
  const temSistemaAlterado = sistemasAlterados(f).size > 0;

  const conclusao = [
    ig.conclusaoClassico,
    ...vitalidade.conclusao,
    ...cordao.conclusao,
    ...liquido.conclusao,
    ...(f.anatomia_avaliada !== true || temAchado || temSistemaAlterado
      ? []
      : ["Morfologia fetal sem evidência de alteração detectável pelo método."]),
    ...filterFreeConclusionItems(f.itens_conclusao_livres),
  ];
  if (golfBall) applyGolfBallMorfologico(aspectos, conclusao, golfBall);

  return assemble(titulo, f, aspectos, conclusao, ig.fraseReferencia, dopplerOptions);
}

function assemble(
  titulo: string,
  f: MorfologicoFindings,
  aspectos: string[],
  conclusao: string[],
  fraseReferencia: string | null = null,
  dopplerOptions?: { umbilicalSafety?: boolean; rawInput?: string },
): string {
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }
  acrescentarCervicometria(f, aspectos, conclusao);
  acrescentarDoppler(f, aspectos, conclusao, dopplerOptions);
  acrescentarCrescimentoFetal(f, aspectos, conclusao);
  const dumLinha = f.dum ? `\nDUM: ${f.dum}.\n` : "";
  const igProse = fraseReferencia ? `${fraseReferencia}\n` : "";
  const conclTxt =
    conclusao.length === 1
      ? conclusao[0] ?? ""
      : conclusao.map((it, i) => `${i + 1}) ${it}`).join("\n");
  return [
    f.doppler ? `${titulo} COM DOPPLER COLORIDO` : titulo,
    dumLinha,
    igProse,
    [
      COMENTARIOS_1T,
      f.cervicometria
        ? "Foi realizada avaliação complementar do colo uterino pela via transvaginal."
        : null,
      f.doppler ? DOPPLER_TECNICA_CLASSICO : null,
    ].filter(Boolean).join("\n"),
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    conclTxt,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Dispatcher fino: clássico (default) preserva 100% o comportamento anterior;
 * objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO (Sprint 2), reusando os MESMOS dados
 * extraídos e os MESMOS cálculos determinísticos (IP médio uterinas, etc.).
 */
export function renderMorfologico(
  f: MorfologicoFindings,
  _prefs?: unknown,
  opts?: { objetivo?: boolean; igCorrection?: boolean; golfBall?: GolfBall | null; umbilicalSafety?: boolean; rawInput?: string },
): string {
  const igc = opts?.igCorrection ?? false;
  const g = opts?.golfBall ?? null;
  // Golf ball (flag): o snippet canônico substitui o eco cru da extração — remove
  // do achados_adicionais as sentenças que mencionam o foco (dedup determinístico).
  if (g && f.achados_adicionais) {
    f = { ...f, achados_adicionais: stripGolfBallEcho(f.achados_adicionais) || null };
  }
  const dopplerOptions = { umbilicalSafety: opts?.umbilicalSafety, rawInput: opts?.rawInput };
  if (opts?.objetivo) return renderMorfologicoObjetivo(f, igc, g, dopplerOptions);
  if (f.trimestre === "1t") return render1t(f, igc, g, dopplerOptions);
  return render2t3t(f, f.trimestre === "3t", igc, g, dopplerOptions);
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO (Sprint 2)
// ===========================================================================
//
// Mais enxuto que o clássico. 1 casa decimal em TODAS as medidas. Reusa os
// mesmos dados/cálculos (IP médio das uterinas). Trimestres 1t / 2t / 3t.
// Percentil é só reproduzido (nunca cruzado com a IG).

const TECNICA_OBJ =
  "Exame realizado com transdutor convexo multifrequencial.";

/** 1 casa decimal SEMPRE (P3) — vírgula decimal. */
function ptBr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
/** Medida em mm com 1 casa decimal; placeholder se null. */
function mm1(v: number | null): string {
  return v === null ? "____" : ptBr1(v);
}
/** Peso fetal objetivo (gramas inteiras) com variação/percentil opcionais. */
function pesoLinhaObj(f: MorfologicoFindings): string {
  const extras: string[] = [];
  if (f.peso_variacao_g !== null)
    extras.push(`+- ${String(Math.round(f.peso_variacao_g))} g`);
  if (f.percentil !== null) extras.push(`percentil ${ptBr(f.percentil)}`);
  const sufixo = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `Peso fetal estimado: ${f.peso_g !== null ? String(Math.round(f.peso_g)) : "____"} g${sufixo}.`;
}

function assembleObj(
  titulo: string,
  f: MorfologicoFindings,
  achados: string[],
  impressao: string[],
  fraseReferencia: string | null = null,
  dopplerOptions?: { umbilicalSafety?: boolean; rawInput?: string },
): string {
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push(`\n${f.achados_adicionais.trim()}`);
  }
  acrescentarCervicometria(f, achados, impressao);
  acrescentarDoppler(f, achados, impressao, dopplerOptions);
  acrescentarCrescimentoFetal(f, achados, impressao);
  const dumLinha = f.dum ? `\nDUM: ${f.dum}.` : "";
  const igProse = fraseReferencia ? `\n${fraseReferencia}` : "";
  const impressaoTxt =
    impressao.length === 1
      ? impressao[0] ?? ""
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");
  return [
    f.doppler ? `${titulo} COM DOPPLER COLORIDO` : titulo,
    dumLinha,
    igProse,
    "",
    "TÉCNICA:",
    [
      TECNICA_OBJ,
      f.cervicometria
        ? "Avaliação complementar do colo uterino realizada pela via transvaginal."
        : null,
      f.doppler ? DOPPLER_TECNICA_OBJETIVO : null,
    ].filter(Boolean).join(" "),
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

/** Concordância de "genitália" (feminino): masculino→masculina, feminino→feminina. */
function genitaliaFmt(g: string | null): string {
  if (!g || !g.trim()) return "não avaliada";
  const t = g.trim().toLowerCase();
  if (/masculin/.test(t)) return "masculina";
  if (/feminin/.test(t)) return "feminina";
  return g.trim();
}

function render1tObj(f: MorfologicoFindings, igCorrection = false, golfBall: GolfBall | null = null, dopplerOptions?: { umbilicalSafety?: boolean; rawInput?: string }): string {
  const ig = igResultMorfo(f, igCorrection);
  const vitalidade = vitalidadeClassicaMorfo(f);
  const liquido = liquidoMorfo(f);
  // Doppler das uterinas = presença de IP. Só então o título leva "COM DOPPLER
  // COLORIDO" e entram as frases de IP + a conclusão de dopplervelocimetria.
  const comDoppler =
    f.uterina_ip_direita !== null || f.uterina_ip_esquerda !== null;

  const achados: string[] = [
    "Feto único de situação variável.",
    ...vitalidade.corpo,
    ...movimentosMorfo(f),
    `Comprimento cabeça-nádegas (CCN): ${mm1(f.ccn_mm)} mm.`,
    `Translucência nucal (TN): ${mm1(f.tn_mm)} mm.`,
    ...(f.osso_nasal === null
      ? []
      : [f.osso_nasal === "ausente" ? "Osso nasal ausente." : "Osso nasal presente."]),
    ...(f.regurgitacao_tricuspide == null
      ? []
      : [f.regurgitacao_tricuspide === "presente"
          ? "Regurgitação tricúspide presente."
          : "Regurgitação tricúspide ausente."]),
    ...(f.ducto_venoso === null
      ? []
      : [f.ducto_venoso === "alterado"
          ? "Ducto venoso com onda A reversa."
          : "Ducto venoso com onda trifásica (onda A positiva)."]),
  ];
  if (f.placenta_localizacao) {
    achados.push(
      `Placenta de localização ${f.placenta_localizacao}${grauPlacenta(f.placenta_grau) ? `, ${grauPlacenta(f.placenta_grau)} de Grannum et al.` : "."}`,
    );
  }
  achados.push(...liquido.corpo);
  if (comDoppler) {
    achados.push(`Artéria uterina direita: IP ${f.uterina_ip_direita !== null ? ptBr(f.uterina_ip_direita) : "____"}.`);
    achados.push(`Artéria uterina esquerda: IP ${f.uterina_ip_esquerda !== null ? ptBr(f.uterina_ip_esquerda) : "____"}.`);
    if (f.uterina_ip_direita !== null && f.uterina_ip_esquerda !== null) {
      const medio = (f.uterina_ip_direita + f.uterina_ip_esquerda) / 2;
      achados.push(
        `IP médio das artérias uterinas: ${ptBr(Math.round(medio * 100) / 100)}.`,
      );
    }
  }

  /**
   * As duas frases abaixo eram INCONDICIONAIS — ver a explicação longa na
   * ramificação do 2º/3º trimestre clássico. Mesmo defeito, mesma correção:
   * não asseverar normalidade que ninguém verificou, e não negar na conclusão
   * o achado que o corpo descreve.
   */
  const temAchado = (f.achados_adicionais ?? "").trim() !== "";
  const impressao = [
    ...ig.conclusaoObjetivo,
    ...vitalidade.conclusao,
    ...liquido.conclusao,
    ...(f.ducto_venoso === null
      ? []
      : [f.ducto_venoso === "alterado"
          ? "Doppler do ducto venoso alterado (onda A reversa)."
          : "Doppler do ducto venoso normal."]),
    ...(f.osso_nasal === "ausente" ? ["Ausência de osso nasal."] : []),
    ...(f.regurgitacao_tricuspide === "presente" ? ["Presença de regurgitação tricúspide."] : []),
    ...(f.anatomia_avaliada !== true || temAchado || f.osso_nasal === "ausente" || f.regurgitacao_tricuspide === "presente" || f.ducto_venoso === "alterado"
      ? []
      : ["Morfologia fetal normal para esta fase da gestação."]),
    ...filterFreeConclusionItems(f.itens_conclusao_livres),
  ];
  if (comDoppler) {
    impressao.push("Dopplervelocimetria normal das artérias uterinas.");
  }
  if (golfBall) applyGolfBallMorfologico(achados, impressao, golfBall);

  return assembleObj(
    comDoppler && !f.doppler
      ? "ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE COM DOPPLER COLORIDO"
      : "ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE",
    f,
    achados,
    impressao,
    ig.fraseReferencia,
    dopplerOptions,
  );
}

function render2t3tObj(f: MorfologicoFindings, terceiro: boolean, igCorrection = false, golfBall: GolfBall | null = null, dopplerOptions?: { umbilicalSafety?: boolean; rawInput?: string }): string {
  const ig = igResultMorfo(f, igCorrection);
  const titulo = terceiro
    ? "ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE"
    : "ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE";
  const vitalidade = vitalidadeClassicaMorfo(f);
  const cordao = cordaoMorfo(f);
  const liquido = liquidoMorfo(f);
  const anexos = [
    ...cordao.corpo,
    ...(f.placenta_localizacao || f.placenta_grau
      ? [`Placenta${f.placenta_localizacao ? ` de localização ${f.placenta_localizacao}` : ""}${grauPlacenta(f.placenta_grau) ? `, ${grauPlacenta(f.placenta_grau)} de Grannum et al.` : "."}`]
      : []),
    ...(f.ila_cm !== null
      ? [`Índice de líquido amniótico (ILA): ${ptBr1(f.ila_cm)} cm.`]
      : liquido.corpo),
  ];

  const achados: string[] = [
    linhaFeto(f),
    ...vitalidade.corpo,
    ...movimentosMorfo(f),
    ...anatomiaObjetiva(f),
    "",
    "Biometria fetal:",
    `Diâmetro biparietal (DBP): ${mm1(f.dbp_mm)} mm.`,
    `Circunferência cefálica (CC): ${mm1(f.cc_mm)} mm.`,
    `Cerebelo: ${mm1(f.cerebelo_mm)} mm.`,
    `Cisterna magna: ${mm1(f.cisterna_magna_mm)} mm.`,
    // Distância binocular: 2º trimestre apenas (decisão Luiz no clássico).
    ...(terceiro ? [] : [`Distância binocular: ${mm1(f.binocular_mm)} mm.`]),
    `Circunferência abdominal (CA): ${mm1(f.ca_mm)} mm.`,
    // Ossos longos repetidos por membro (decisão Luiz, 2º/3º trimestre).
    `Comprimento do fêmur direito: ${mm1(f.femur_mm)} mm.`,
    `Comprimento do fêmur esquerdo: ${mm1(f.femur_mm)} mm.`,
    `Comprimento da tíbia direita: ${mm1(f.tibia_mm)} mm.`,
    `Comprimento da tíbia esquerda: ${mm1(f.tibia_mm)} mm.`,
    `Comprimento da fíbula direita: ${mm1(f.fibula_mm)} mm.`,
    `Comprimento da fíbula esquerda: ${mm1(f.fibula_mm)} mm.`,
    `Comprimento do úmero direito: ${mm1(f.umero_mm)} mm.`,
    `Comprimento do úmero esquerdo: ${mm1(f.umero_mm)} mm.`,
    `Comprimento do rádio direito: ${mm1(f.radio_mm)} mm.`,
    `Comprimento do rádio esquerdo: ${mm1(f.radio_mm)} mm.`,
    `Comprimento da ulna direita: ${mm1(f.ulna_mm)} mm.`,
    `Comprimento da ulna esquerda: ${mm1(f.ulna_mm)} mm.`,
    pesoLinhaObj(f),
    ...(f.genitalia ? [`Genitália externa ${genitaliaFmt(f.genitalia)}.`] : []),
    ...(anexos.length > 0 ? ["", "Anexos:", ...anexos] : []),
  ];

  /** Mesma regra da ramificação clássica — ver a explicação longa lá. */
  const temAchadoObj = (f.achados_adicionais ?? "").trim() !== "";
  const temSistemaAlterado = sistemasAlterados(f).size > 0;

  const impressao = [
    ...ig.conclusaoObjetivo,
    ...vitalidade.conclusao,
    ...cordao.conclusao,
    ...liquido.conclusao,
    ...(f.anatomia_avaliada !== true || temAchadoObj || temSistemaAlterado
      ? []
      : ["Morfologia fetal sem evidência de alteração detectável pelo método."]),
    ...filterFreeConclusionItems(f.itens_conclusao_livres),
  ];
  if (golfBall) applyGolfBallMorfologico(achados, impressao, golfBall);

  return assembleObj(titulo, f, achados, impressao, ig.fraseReferencia, dopplerOptions);
}

export function renderMorfologicoObjetivo(
  f: MorfologicoFindings,
  igCorrection = false,
  golfBall: GolfBall | null = null,
  dopplerOptions?: { umbilicalSafety?: boolean; rawInput?: string },
): string {
  if (f.trimestre === "1t") return render1tObj(f, igCorrection, golfBall, dopplerOptions);
  return render2t3tObj(f, f.trimestre === "3t", igCorrection, golfBall, dopplerOptions);
}
