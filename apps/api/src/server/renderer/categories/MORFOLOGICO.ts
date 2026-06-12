import { z } from "zod";

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
  percentil: z.number().nullable(),
  genitalia: z.string().nullable(),
  placenta_localizacao: z.string().nullable(),
  ila_cm: z.number().nullable(),
  // comum
  ig_semanas: z.number().nullable(),
  ig_dias: z.number().nullable(),
  dum: z.string().nullable(),
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
    "peso_g", "percentil", "genitalia", "placenta_localizacao", "ila_cm",
    "ig_semanas", "ig_dias", "dum", "achados_adicionais",
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
    peso_g: num, percentil: num, genitalia: str, placenta_localizacao: str, ila_cm: num,
    ig_semanas: num, ig_dias: num, dum: str, achados_adicionais: str,
  },
} as const;

export const MORFOLOGICO_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA MORFOLÓGICA.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada.

REGRAS:
1. trimestre: detecte "1t" (CCN, translucência nucal, osso nasal, ducto venoso,
   IG ≤ 14 semanas, sem biometria DBP/CC), "2t" (15–28 sem; biometria completa)
   ou "3t" (≥ 29 sem). Se o médico disser explicitamente, respeite.
2. BIOMETRIA em MILÍMETROS: converta cm→mm. CCN→ccn_mm, TN→tn_mm (em mm),
   DBP→dbp_mm, HC/CC→cc_mm, AC/CA→ca_mm, fêmur→femur_mm, tíbia→tibia_mm,
   fíbula→fibula_mm, úmero→umero_mm, rádio→radio_mm, ulna→ulna_mm,
   cerebelo→cerebelo_mm, cisterna magna→cisterna_magna_mm, distância
   binocular→binocular_mm. Valor não ditado → null (NUNCA inventar).
3. osso_nasal: "presente"/"ausente". ducto_venoso: "normal"/"alterado" (onda A
   reversa = alterado; onda A positiva/trifásica = normal).
4. uterina_ip_direita/esquerda: IP das artérias uterinas (1t).
5. apresentacao/dorso (2t/3t): só se ditados.
6. peso_g/percentil: só se ditados. genitalia: se ditada. placenta_localizacao,
   ila_cm: se ditados.
7. ig_semanas/ig_dias; dum como DD/MM/AAAA (converta extenso).
8. achados_adicionais: malformações/observações fora do padrão, nas palavras do
   médico; null se normal.`;

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

const COMENTARIOS_1T =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

function render1t(f: MorfologicoFindings): string {
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
    `Gestação em torno de ${formatIg(f.ig_semanas, f.ig_dias)}.`,
    "Líquido amniótico de quantidade normal.",
    f.ducto_venoso === "alterado"
      ? "Doppler do ducto venoso alterado (onda A reversa)."
      : "Doppler do ducto venoso normal.",
    "Morfologia fetal normal para esta fase da gestação.",
  ];
  if (f.uterina_ip_direita !== null && f.uterina_ip_esquerda !== null) {
    conclusao.push("Dopplervelocimetria normal das artérias uterinas.");
  }

  return assemble("ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE", f, aspectos, conclusao);
}

function render2t3t(f: MorfologicoFindings, terceiro: boolean): string {
  const titulo = terceiro
    ? "ULTRASSONOGRAFIA MORFOLÓGICA DO TERCEIRO TRIMESTRE"
    : "ULTRASSONOGRAFIA MORFOLÓGICA DO SEGUNDO TRIMESTRE";
  const apres = f.apresentacao ?? "cefálica";
  const linhaFeto = f.dorso
    ? `Feto único, em apresentação ${apres}, com dorso ${f.dorso}.`
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
    `Genitália externa ${f.genitalia ?? "não avaliada"}.`,
    "",
    "A biometria fetal é a seguinte:",
    `Diâmetro biparietal (DBP) de ${mm(f.dbp_mm)} mm.`,
    `Circunferência da cabeça (CC) de ${mm(f.cc_mm)} mm.`,
    `Cerebelo mede ${mm(f.cerebelo_mm)} mm.`,
    `Cisterna magna mede ${mm(f.cisterna_magna_mm)} mm.`,
    `Distância binocular de ${mm(f.binocular_mm)} mm.`,
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
    `Peso fetal estimado em ${f.peso_g !== null ? ptBr(f.peso_g) : "____"} g${f.percentil !== null ? ` (percentil ${ptBr(f.percentil)})` : ""}.`,
    "",
    "Análise extra-fetal:",
    "Cordão umbilical com duas artérias e uma veia.",
    `Placenta de localização ${f.placenta_localizacao ?? "____"}, com ecotextura ${terceiro ? "heterogênea, de acordo com a fase da gestação" : "homogênea"}.`,
    `Índice do líquido amniótico de ${f.ila_cm !== null ? ptBr(f.ila_cm) : "____"} cm.`,
    "Orifício interno do colo uterino encontra-se fechado.",
  ];

  const conclusao = [
    `Gestação em torno de ${formatIg(f.ig_semanas, f.ig_dias)}.`,
    "Líquido amniótico de quantidade normal.",
    "Morfologia fetal sem evidência de alteração detectável pelo método.",
  ];

  return assemble(titulo, f, aspectos, conclusao);
}

function assemble(
  titulo: string,
  f: MorfologicoFindings,
  aspectos: string[],
  conclusao: string[],
): string {
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }
  const dumLinha = f.dum ? `\nDUM: ${f.dum}.\n` : "";
  const conclTxt =
    conclusao.length === 1
      ? conclusao[0] ?? ""
      : conclusao.map((it, i) => `${i + 1}) ${it}`).join("\n");
  return [
    titulo,
    dumLinha,
    f.trimestre === "1t" ? COMENTARIOS_1T : COMENTARIOS_1T,
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

export function renderMorfologico(f: MorfologicoFindings): string {
  if (f.trimestre === "1t") return render1t(f);
  return render2t3t(f, f.trimestre === "3t");
}
