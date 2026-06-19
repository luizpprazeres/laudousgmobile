import { z } from "zod";
import { buildIgInput, computeIg, type IgRawFields, type IgComputed } from "../ig";

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
  bcf_bpm: z.number().nullable(),
  // 1º trimestre
  ccn_mm: z.number().nullable(),
  tn_mm: z.number().nullable(),
  osso_nasal: z.enum(["presente", "ausente"]).nullable(),
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
});

export type MorfologicoFindings = z.infer<typeof MorfologicoFindingsSchema>;

export const MORFOLOGICO_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "trimestre", "apresentacao", "dorso", "bcf_bpm",
    "ccn_mm", "tn_mm", "osso_nasal", "ducto_venoso",
    "uterina_ip_direita", "uterina_ip_esquerda",
    "dbp_mm", "cc_mm", "cerebelo_mm", "cisterna_magna_mm", "binocular_mm", "ca_mm",
    "femur_mm", "tibia_mm", "fibula_mm", "umero_mm", "radio_mm", "ulna_mm",
    "peso_g", "peso_variacao_g", "percentil", "genitalia",
    "placenta_localizacao", "placenta_grau", "ila_cm",
    "ig_semanas", "ig_dias", "dum",
    "data_exame", "primeira_us_data", "primeira_us_ig_semanas", "primeira_us_ig_dias",
    "ig_referencia_hoje_semanas", "ig_referencia_hoje_dias", "referencia_fonte", "corrigir_ig",
    "achados_adicionais",
  ],
  properties: {
    trimestre: { type: "string", enum: ["1t", "2t", "3t"] },
    apresentacao: str, dorso: str, bcf_bpm: num,
    ccn_mm: num, tn_mm: num,
    osso_nasal: { type: ["string", "null"], enum: ["presente", "ausente", null] },
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
3. osso_nasal: "presente"/"ausente". ducto_venoso: "normal"/"alterado" (onda A
   reversa = alterado; onda A positiva/trifásica = normal).
4. uterina_ip_direita/esquerda: IP das artérias uterinas (1t).
5. apresentacao/dorso (2t/3t): só se ditados.
6. peso_g/peso_variacao_g/percentil: só se ditados. genitalia: se ditada.
   placenta_localizacao e placenta_grau (Grannum: 0/1/2/3 — capture o número),
   ila_cm: se ditados.
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
   normalidade já estão no modelo. null se o exame for normal.`;

// ---------------------------------------------------------------------------
function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}
function mm(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}
function formatIg(semanas: number | null, dias: number | null): string {
  if (semanas === null) return "____ semanas";
  if (dias === null || dias === 0) return `${ptBr(semanas)} semanas`;
  return `${ptBr(semanas)} semanas e ${ptBr(dias)} dias`;
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

/** Concordância: "apresentação" feminina → cefálica/pélvica/córmica. */
function apresentacaoFmt(s: string | null): string {
  if (!s) return "cefálica";
  const map: Record<string, string> = {
    cefálico: "cefálica", cefalico: "cefálica", pélvico: "pélvica",
    pelvico: "pélvica", córmico: "córmica", cormico: "córmica", transverso: "transversa",
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

const COMENTARIOS_1T =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

function render1t(f: MorfologicoFindings, igCorrection = false): string {
  const ig = igResultMorfo(f, igCorrection);
  const aspectos: string[] = [
    "Feto único de situação variável.",
    `Batimentos cardíacos presentes, bem caracterizados pelo modo Doppler (FC = ${f.bcf_bpm !== null ? ptBr(f.bcf_bpm) : "____"} bpm).`,
    "Movimentos fetais são ativos.",
    `Comprimento crânio-nádegas (CCN) de ${mm(f.ccn_mm)} mm.`,
    `Medida da translucência nucal (TN) de ${mm(f.tn_mm)} mm.`,
    f.osso_nasal === "ausente" ? "Ausência de osso nasal." : "Presença de osso nasal.",
    f.ducto_venoso === "alterado"
      ? "Ducto venoso com onda reversa na sístole atrial."
      : "Ducto venoso com aspecto de onda trifásica (sístole ventricular, diástole ventricular e sístole atrial positivas).",
  ];
  if (f.placenta_localizacao) {
    aspectos.push(`Placenta de localização ${f.placenta_localizacao}, com ecotextura homogênea.`);
  }
  aspectos.push("Líquido amniótico de quantidade normal pela análise subjetiva.");
  if (f.uterina_ip_direita !== null || f.uterina_ip_esquerda !== null) {
    aspectos.push(`Artéria uterina direita: IP ${f.uterina_ip_direita !== null ? ptBr(f.uterina_ip_direita) : "____"}.`);
    aspectos.push(`Artéria uterina esquerda: IP ${f.uterina_ip_esquerda !== null ? ptBr(f.uterina_ip_esquerda) : "____"}.`);
    if (f.uterina_ip_direita !== null && f.uterina_ip_esquerda !== null) {
      const medio = (f.uterina_ip_direita + f.uterina_ip_esquerda) / 2;
      aspectos.push(`Índice de pulsatilidade médio das artérias uterinas: ${ptBr(Math.round(medio * 100) / 100)}.`);
    }
  }

  const conclusao = [
    ig.conclusaoClassico,
    "Líquido amniótico de quantidade normal.",
    f.ducto_venoso === "alterado"
      ? "Doppler do ducto venoso alterado (onda A reversa)."
      : "Doppler do ducto venoso normal.",
    "Morfologia fetal normal para esta fase da gestação.",
  ];
  if (f.uterina_ip_direita !== null && f.uterina_ip_esquerda !== null) {
    conclusao.push("Dopplervelocimetria normal das artérias uterinas.");
  }

  return assemble("ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE", f, aspectos, conclusao, ig.fraseReferencia);
}

function render2t3t(f: MorfologicoFindings, terceiro: boolean, igCorrection = false): string {
  const ig = igResultMorfo(f, igCorrection);
  const titulo = terceiro
    ? "ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE"
    : "ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE";
  const apres = apresentacaoFmt(f.apresentacao);
  const dorso = dorsoFmt(f.dorso);
  const linhaFeto = dorso
    ? `Feto único, em apresentação ${apres}, com dorso ${dorso}.`
    : `Feto único, em apresentação ${apres}.`;

  const aspectos: string[] = [
    linhaFeto,
    `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${f.bcf_bpm !== null ? ptBr(f.bcf_bpm) : "____"} bpm).`,
    "Os movimentos fetais são ativos.",
    "",
    "As considerações sobre a anatomia fetal são as seguintes:",
    "As estruturas cranianas e da coluna vertebral são normais.",
    "Nariz e narinas presentes.",
    "Lábio superior sem solução de continuidade.",
    "Coração com quatro câmaras visíveis.",
    "O estômago, a bexiga e os rins foram bem identificados e com ecotextura homogênea.",
    "A aorta abdominal fetal apresenta calibre normal.",
    `Genitália externa ${genitaliaFmt(f.genitalia)}.`,
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
    "",
    "Análise extra-fetal:",
    "Cordão umbilical com duas artérias e uma veia.",
    `Placenta de localização ${f.placenta_localizacao ?? "____"}${grauPlacenta(f.placenta_grau) ? `, ${grauPlacenta(f.placenta_grau)}` : ""}, com ecotextura ${terceiro ? "heterogênea, de acordo com a fase da gestação" : "homogênea"}.`,
    `Índice do líquido amniótico de ${f.ila_cm !== null ? ptBr(f.ila_cm) : "____"} cm.`,
    // Orifício interno do colo: 2º trimestre apenas (removido no 3º, decisão Luiz).
    ...(terceiro ? [] : ["Orifício interno do colo uterino encontra-se fechado."]),
  ];

  const conclusao = [
    ig.conclusaoClassico,
    "Líquido amniótico de quantidade normal.",
    "Morfologia fetal sem evidência de alteração detectável pelo método.",
  ];

  return assemble(titulo, f, aspectos, conclusao, ig.fraseReferencia);
}

function assemble(
  titulo: string,
  f: MorfologicoFindings,
  aspectos: string[],
  conclusao: string[],
  fraseReferencia: string | null = null,
): string {
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }
  const dumLinha = f.dum ? `\nDUM: ${f.dum}.\n` : "";
  const igProse = fraseReferencia ? `${fraseReferencia}\n` : "";
  const conclTxt =
    conclusao.length === 1
      ? conclusao[0] ?? ""
      : conclusao.map((it, i) => `${i + 1}) ${it}`).join("\n");
  return [
    titulo,
    dumLinha,
    igProse,
    COMENTARIOS_1T,
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
  opts?: { objetivo?: boolean; igCorrection?: boolean },
): string {
  const igc = opts?.igCorrection ?? false;
  if (opts?.objetivo) return renderMorfologicoObjetivo(f, igc);
  if (f.trimestre === "1t") return render1t(f, igc);
  return render2t3t(f, f.trimestre === "3t", igc);
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
): string {
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push(`\n${f.achados_adicionais.trim()}`);
  }
  const dumLinha = f.dum ? `\nDUM: ${f.dum}.` : "";
  const igProse = fraseReferencia ? `\n${fraseReferencia}` : "";
  const impressaoTxt =
    impressao.length === 1
      ? impressao[0] ?? ""
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");
  return [
    titulo,
    dumLinha,
    igProse,
    "",
    "TÉCNICA:",
    TECNICA_OBJ,
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

function render1tObj(f: MorfologicoFindings, igCorrection = false): string {
  const ig = igResultMorfo(f, igCorrection);
  // Doppler das uterinas = presença de IP. Só então o título leva "COM DOPPLER
  // COLORIDO" e entram as frases de IP + a conclusão de dopplervelocimetria.
  const comDoppler =
    f.uterina_ip_direita !== null || f.uterina_ip_esquerda !== null;

  const achados: string[] = [
    "Feto único de situação variável.",
    `Batimentos cardíacos fetais (BCF): ${f.bcf_bpm !== null ? ptBr(f.bcf_bpm) : "____"} bpm. Movimentos fetais ativos.`,
    `Comprimento cabeça-nádegas (CCN): ${mm1(f.ccn_mm)} mm.`,
    `Translucência nucal (TN): ${mm1(f.tn_mm)} mm.`,
    f.osso_nasal === "ausente" ? "Osso nasal ausente." : "Osso nasal presente.",
    f.ducto_venoso === "alterado"
      ? "Ducto venoso com onda A reversa."
      : "Ducto venoso com onda trifásica (onda A positiva).",
  ];
  if (f.placenta_localizacao) {
    achados.push(
      `Placenta de localização ${f.placenta_localizacao}${grauPlacenta(f.placenta_grau) ? `, ${grauPlacenta(f.placenta_grau)} de Grannum et al.` : ""}.`,
    );
  }
  achados.push("Líquido amniótico de quantidade normal pela análise subjetiva.");
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

  const impressao = [
    ...ig.conclusaoObjetivo,
    "Líquido amniótico de quantidade normal.",
    f.ducto_venoso === "alterado"
      ? "Doppler do ducto venoso alterado (onda A reversa)."
      : "Doppler do ducto venoso normal.",
    "Morfologia fetal normal para esta fase da gestação.",
  ];
  if (comDoppler) {
    impressao.push("Dopplervelocimetria normal das artérias uterinas.");
  }

  return assembleObj(
    comDoppler
      ? "ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE COM DOPPLER COLORIDO"
      : "ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE",
    f,
    achados,
    impressao,
    ig.fraseReferencia,
  );
}

function render2t3tObj(f: MorfologicoFindings, terceiro: boolean, igCorrection = false): string {
  const ig = igResultMorfo(f, igCorrection);
  const titulo = terceiro
    ? "ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE"
    : "ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE";
  const apres = apresentacaoFmt(f.apresentacao);
  const dorso = dorsoFmt(f.dorso);
  const linhaFeto = dorso
    ? `Feto único, em apresentação ${apres}, com dorso ${dorso}.`
    : `Feto único, em apresentação ${apres}.`;

  const achados: string[] = [
    linhaFeto,
    `Batimentos cardíacos fetais (BCF): ${f.bcf_bpm !== null ? ptBr(f.bcf_bpm) : "____"} bpm. Movimentos fetais ativos.`,
    "Anatomia fetal sem alterações detectáveis pelo método (crânio, SNC, face, tórax, coração com quatro câmaras, abdome, rins, bexiga e extremidades).",
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
    `Genitália externa ${genitaliaFmt(f.genitalia)}.`,
    "",
    "Anexos:",
    "Cordão umbilical com duas artérias e uma veia.",
    `Placenta de localização ${f.placenta_localizacao ?? "____"}${grauPlacenta(f.placenta_grau) ? `, ${grauPlacenta(f.placenta_grau)} de Grannum et al.` : ""}.`,
    `Índice de líquido amniótico (ILA): ${f.ila_cm !== null ? ptBr1(f.ila_cm) : "____"} cm.`,
    // Orifício interno do colo: 2º trimestre apenas (decisão Luiz no clássico).
    ...(terceiro ? [] : ["Orifício interno do colo uterino fechado."]),
  ];

  const impressao = [
    ...ig.conclusaoObjetivo,
    "Líquido amniótico de quantidade normal.",
    "Morfologia fetal sem evidência de alteração detectável pelo método.",
  ];

  return assembleObj(titulo, f, achados, impressao, ig.fraseReferencia);
}

export function renderMorfologicoObjetivo(
  f: MorfologicoFindings,
  igCorrection = false,
): string {
  if (f.trimestre === "1t") return render1tObj(f, igCorrection);
  return render2t3tObj(f, f.trimestre === "3t", igCorrection);
}
