import { z } from "zod";
import { applyGolfBall, stripGolfBallEcho, type GolfBall } from "./golfBall";
import { buildIgInput, computeIg, computeRHoje, type IgRawFields } from "../ig";

/**
 * DET-5 — Renderer de OBSTETRICA (feto único + gemelar).
 *
 * O LLM extrai dados tipados; o laudo é montado por construção (estrutura,
 * cabeçalhos, ordem e numeração garantidos). Cálculos aritméticos
 * determinísticos (peso médio, divergência ponderal gemelar) são feitos em
 * código — o que o writer LLM não fazia.
 *
 * Variante "inicial" (≤13s6d) usa o modelo de saco gestacional/CCN; "padrão"
 * (>14s) usa biometria DBP/CC/CA/CF. Gemelar (≥2 fetos) individualiza por feto.
 */

// ---------------------------------------------------------------------------
// Schema de achados
// ---------------------------------------------------------------------------

const FetoSchema = z.object({
  rotulo: z.string().nullable(), // "A", "B"... null se único
  posicao_relativa: z.string().nullable(), // "à direita", "à esquerda" (gemelar)
  apresentacao: z.string().nullable(), // cefálica, pélvica, córmica/transversa
  dorso: z.string().nullable(), // "à direita", "à esquerda", "anterior"...
  polo_cefalico: z.string().nullable(), // só em situação transversa
  bcf_bpm: z.number().nullable(),
  // Biometria em mm (a extração converte cm→mm).
  dbp_mm: z.number().nullable(),
  cc_mm: z.number().nullable(),
  ca_mm: z.number().nullable(),
  cf_mm: z.number().nullable(),
  ccn_mm: z.number().nullable(), // gestação inicial
  peso_g: z.number().nullable(),
  peso_variacao_g: z.number().nullable(),
  percentil: z.number().nullable(),
  /**
   * ACHADOS POR FETO — não do exame.
   *
   * BUG (revisão Codex 16/08): estavam no nível do exame, então no gemelar
   * `bcf_alteracao` era global e simplesmente ignorado — ditar ausência de BCF
   * saía com dois batimentos positivos. E o Luiz confirmou: "acontece de um
   * feto ter óbito e o outro não".
   *
   * `.default(null)` para que payload antigo (sem os campos) faça parse.
   */
  bcf_alteracao: z.enum(["ausente", "bradicardia", "taquicardia"]).nullable().default(null),
  movimentos_fetais: z.enum(["ausentes", "reduzidos"]).nullable().default(null),
  cranio_achado: z
    .enum(["ventriculomegalia", "cisto_plexo_coroide", "megacisterna_magna",
           "cisto_bolsa_blake", "dandy_walker", "cavum_nao_visualizado"])
    .nullable().default(null),
  cranio_medida_mm: z.number().nullable().default(null),
  cranio_lateralidade: z.string().nullable().default(null),
  /** Cada feto tem o seu cordão. */
  cordao_vasos: z.enum(["tres", "dois"]).nullable().default(null),
  /**
   * ACHADOS DE VÍSCERAS — spec clínica §4, aprovada pelo Luiz.
   *
   * Um campo por achado, e NÃO um enum único. Ascite, derrame pleural e
   * intestino hiperecogênico coexistem no mesmo feto; um enum singular
   * repetiria o defeito que o `placenta_achado` já teve, em que ditar dois
   * achados fazia um sumir.
   */
  /**
   * PIELECTASIA — dois eixos, não um (crítica do Codex, 19/08).
   *
   * A MEDIDA da pelve renal e o fato de ela ser ANORMAL são coisas diferentes:
   * a spec manda medir os dois lados, e os dois podem vir preenchidos com
   * apenas um alterado. Derivar a lateralidade de "qual medida veio" faria um
   * rim normal medido virar pielectasia — o mesmo erro que já cometemos cinco
   * vezes neste catálogo.
   */
  pielectasia_direita: z.boolean().nullish(),
  pielectasia_esquerda: z.boolean().nullish(),
  pielectasia_direita_mm: z.number().nullish(),
  pielectasia_esquerda_mm: z.number().nullish(),
  intestino_hiperecogenico: z.boolean().nullish(),
  ascite: z.boolean().nullish(),
  derrame_pleural: z.enum(["direito", "esquerdo", "bilateral"]).nullish(),
  derrame_pleural_mm: z.number().nullish(),
  /**
   * HIDROPSIA — nunca derivada dos componentes.
   *
   * Clinicamente ela inclui ascite, derrame e edema, mas o diagnóstico é do
   * médico: deduzi-la de "ascite + derrame" seria inventar um diagnóstico que
   * ele não deu. Quando presente, a APRESENTAÇÃO suprime as frases isoladas —
   * os dados de ascite e derrame continuam gravados.
   */
  hidropsia: z.boolean().nullish(),
  /**
   * Estômago não visualizado — CONDIÇÃO COMPOSTA (spec §4, R4): a conclusão só
   * vale COM polidrâmnio associado. Sem ele a spec deixa a pergunta em aberto,
   * e o campo fica sem consumidor até o Luiz decidir.
   */
  estomago_nao_visualizado: z.boolean().nullish(),
});

export const ObstetricaFindingsSchema = z.object({
  numero_fetos: z.number().int().min(1),
  corionicidade: z.string().nullable(), // "dicoriônica e diamniótica" etc (gemelar)
  gestacao_inicial: z.boolean(), // true = ≤13s6d (saco gestacional/CCN)
  fetos: z.array(FetoSchema).min(1),
  ig_semanas: z.number().nullable(),
  ig_dias: z.number().nullable(),
  dum: z.string().nullable(), // DD/MM/AAAA
  // Épico IG determinística (Domingos): referência precoce + data do exame.
  data_exame: z.string().nullable(), // DD/MM/AAAA — "hoje"/data do exame, se ditada
  primeira_us_data: z.string().nullable(), // DD/MM/AAAA da 1ª US
  primeira_us_ig_semanas: z.number().nullable(), // IG na data da 1ª US
  primeira_us_ig_dias: z.number().nullable(),
  ig_referencia_hoje_semanas: z.number().nullable(), // "hoje está com X" (já corrigido)
  ig_referencia_hoje_dias: z.number().nullable(),
  referencia_fonte: z.enum(["usg_precoce", "dum"]).nullable(), // fonte atribuída pelo médico
  corrigir_ig: z.boolean().nullable(), // comando de voz explícito (true/false) ou null
  saco_gestacional_mm: z.number().nullable(), // DSM ditado direto ("DSM de 15,3")
  // As 3 medidas do saco gestacional, quando ditadas ("saco medindo A x B x C"
  // ou "calcule o DSM pelas medidas A x B x C") — o código calcula a média.
  saco_gestacional_medidas_mm: z.array(z.number()).nullable(),
  placenta_quantidade: z.number().nullable(),
  placenta_localizacao: z.string().nullable(),
  placenta_ecotextura: z.string().nullable(),
  placenta_grau: z.string().nullable(),
  /**
   * Relação da placenta com o orifício interno do colo — eixo INDEPENDENTE da
   * topografia (`placenta_localizacao`). Sem separar os dois, "placenta
   * posterior de inserção baixa" é inexprimível: `posterior` é topografia,
   * `inserção baixa` é relação. Ver docs/plano-biblioteca-implementacao-2026-08-12.md §A.5.3.
   *
   * Só é consumido pelo CATÁLOGO (dormente atrás de flag). O renderer clássico
   * ignora — nada muda em produção enquanto a flag não subir.
   */
  placenta_relacao_orificio: z
    .enum(["insercao_baixa", "marginal", "previa"])
    .nullable(),
  /**
   * Distância da borda inferior ao orifício interno, em mm.
   *
   * OPCIONAL por decisão clínica (Luiz 14/08): só é ditada quando está muito
   * clara, ou quando houve transvaginal complementar. Ausente → a 2ª frase da
   * inserção baixa simplesmente não sai.
   */
  placenta_distancia_orificio_mm: z.number().nullable(),
  /**
   * ACHADOS PATOLÓGICOS — catálogo aprovado pelo Dr. Luiz em 2026-08-16.
   * Ver docs/catalogo-patologias-obstetrica-spec-2026-08-16.md.
   *
   * Todos OPCIONAIS e consumidos SÓ pelo catálogo (dormente atrás de flag).
   * O renderer clássico os ignora — nada muda em produção até a flag subir.
   *
   * NÃO incluem biometria (PIG/CIR/GIG) nem classes de líquido: essas já
   * existem, mais completas, nas specs do Writer V2. Duplicar criaria uma
   * terceira redação do mesmo achado.
   */
  /** Achado agudo da placenta — eixo independente de localização e de relação. */
  placenta_achado: z
    .enum(["descolamento", "acretismo", "lagos_venosos"])
    .nullable()
    .default(null),
  placenta_achado_medidas: z.string().nullable().default(null),
  /**
   * ACHADOS DE ANEXOS E DE 1º TRIMESTRE — spec clínica §9.
   *
   * Ficam no exame, e não no feto, porque descrevem a MÃE (ovários) ou o
   * continente (saco gestacional), não o concepto.
   */
  ovario_achado: z.enum(["cisto_simples", "endometrioma"]).nullish(),
  ovario_lado: z.enum(["direito", "esquerdo"]).nullish(),
  ovario_medidas_cm: z.array(z.number()).nullish(),
  ovario_achado_medida_cm: z.number().nullish(),
  vesicula_vitelina_mm: z.number().nullish(),
  hematoma_perigestacional_medidas: z.string().nullish(),
  hematoma_perigestacional_lado: z.enum(["direita", "esquerda"]).nullish(),
  /** Saco gestacional sem embrião — critérios de inviabilidade (spec §9). */
  gestacao_inviavel: z.boolean().nullish(),
  liquido_tipo: z.enum(["normal", "ila", "mbv", "alterado"]).nullable(),
  liquido_ila_cm: z.number().nullable(),
  liquido_mbv_por_feto_cm: z.array(z.number()).nullable(),
  liquido_classe: z.string().nullable(), // "oligoâmnio", "polidrâmnio"...
  achados_adicionais: z.string().nullable(),
  // Camada flexível: conteúdo clínico LIVRE que o médico quer na conclusão e que
  // NÃO cabe em campo estruturado (ex.: comparação com exame anterior). Passa por
  // guard de dedup determinístico antes de entrar (nunca duplica IG/líquido/peso).
  itens_conclusao_livres: z.array(z.string()),
  // Camada flexível (CORPO): observação clínica LIVRE que o médico quer no CORPO
  // do laudo e que não cabe em campo estruturado — o caso matador "adicione uma
  // frase sobre as adrenais fetais". Mesmo dedup determinístico do corpo.
  observacoes_corpo_livres: z.array(z.string()),
});

export type ObstetricaFindings = z.infer<typeof ObstetricaFindingsSchema>;

// JSON Schema strict para OpenAI (todos required, nullable via union).
const num = { type: ["number", "null"] } as const;
const bool = { type: ["boolean", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const FETO_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "rotulo",
    "posicao_relativa",
    "apresentacao",
    "dorso",
    "polo_cefalico",
    "bcf_bpm",
    "dbp_mm",
    "cc_mm",
    "ca_mm",
    "cf_mm",
    "ccn_mm",
    "peso_g",
    "peso_variacao_g",
    "percentil",
    // Achados patológicos POR FETO (catálogo de 16/08). Em `required` porque o
    // modo strict da OpenAI exige TODA propriedade em `required` — o "opcional"
    // se exprime pelo `null`, não pela ausência.
    "bcf_alteracao",
    "movimentos_fetais",
    "cranio_achado",
    "cranio_medida_mm",
    "cranio_lateralidade",
    "cordao_vasos",
    // Achados de vísceras (spec §4). Um campo por achado: eles coexistem.
    "pielectasia_direita",
    "pielectasia_esquerda",
    "pielectasia_direita_mm",
    "pielectasia_esquerda_mm",
    "intestino_hiperecogenico",
    "ascite",
    "derrame_pleural",
    "derrame_pleural_mm",
    "hidropsia",
    "estomago_nao_visualizado",
  ],
  properties: {
    rotulo: str,
    posicao_relativa: str,
    apresentacao: str,
    dorso: str,
    polo_cefalico: str,
    bcf_bpm: num,
    dbp_mm: num,
    cc_mm: num,
    ca_mm: num,
    cf_mm: num,
    ccn_mm: num,
    peso_g: num,
    peso_variacao_g: num,
    percentil: num,
    /**
     * ACHADOS PATOLÓGICOS POR FETO.
     *
     * Estavam só no schema Zod: o extractor não os conhecia, então nunca os
     * preenchia, e todo o catálogo de patologias de 16/08 era decorativo — com
     * a flag ligada os laudos sairiam exatamente iguais aos de antes.
     *
     * ⚠️ Este objeto é o CONTRATO VIVO da extração em modo strict, e o
     * `DOPPLER_OBSTETRICO` HERDA. Nunca mexer aqui sem mexer no prompt e no
     * consumidor na mesma leva — e sem rodar `equivalencia-real.manual.ts`
     * antes e depois.
     */
    bcf_alteracao: {
      type: ["string", "null"],
      enum: ["ausente", "bradicardia", "taquicardia", null],
    },
    movimentos_fetais: { type: ["string", "null"], enum: ["ausentes", "reduzidos", null] },
    cranio_achado: {
      type: ["string", "null"],
      enum: [
        "ventriculomegalia",
        "cisto_plexo_coroide",
        "megacisterna_magna",
        "cisto_bolsa_blake",
        "dandy_walker",
        "cavum_nao_visualizado",
        null,
      ],
    },
    cranio_medida_mm: num,
    cranio_lateralidade: str,
    cordao_vasos: { type: ["string", "null"], enum: ["tres", "dois", null] },
    /**
     * ACHADOS DE VÍSCERAS — um campo por achado, e não um enum único.
     * Ascite, derrame pleural e intestino hiperecogênico coexistem no mesmo
     * feto; um enum singular faria um sumir, que é o defeito que o
     * `placenta_achado` já teve.
     */
    /** Estado por lado e medida por lado — eixos separados. */
    pielectasia_direita: bool,
    pielectasia_esquerda: bool,
    pielectasia_direita_mm: num,
    pielectasia_esquerda_mm: num,
    intestino_hiperecogenico: bool,
    ascite: bool,
    derrame_pleural: { type: ["string", "null"], enum: ["direito", "esquerdo", "bilateral", null] },
    derrame_pleural_mm: num,
    hidropsia: bool,
    estomago_nao_visualizado: bool,
  },
} as const;

export const OBSTETRICA_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "numero_fetos",
    "corionicidade",
    "gestacao_inicial",
    "fetos",
    "ig_semanas",
    "ig_dias",
    "dum",
    "data_exame",
    "primeira_us_data",
    "primeira_us_ig_semanas",
    "primeira_us_ig_dias",
    "ig_referencia_hoje_semanas",
    "ig_referencia_hoje_dias",
    "referencia_fonte",
    "corrigir_ig",
    "saco_gestacional_mm",
    "saco_gestacional_medidas_mm",
    "placenta_quantidade",
    "placenta_localizacao",
    "placenta_ecotextura",
    "placenta_grau",
    "placenta_relacao_orificio",
    "placenta_distancia_orificio_mm",
    "placenta_achado",
    "placenta_achado_medidas",
    // Anexos e 1º trimestre (spec §9).
    "ovario_achado",
    "ovario_lado",
    "ovario_medidas_cm",
    "ovario_achado_medida_cm",
    "vesicula_vitelina_mm",
    "hematoma_perigestacional_medidas",
    "hematoma_perigestacional_lado",
    "gestacao_inviavel",
    "liquido_tipo",
    "liquido_ila_cm",
    "liquido_mbv_por_feto_cm",
    "liquido_classe",
    "achados_adicionais",
    "itens_conclusao_livres",
    "observacoes_corpo_livres",
  ],
  properties: {
    numero_fetos: { type: "integer" },
    corionicidade: str,
    gestacao_inicial: { type: "boolean" },
    fetos: { type: "array", items: FETO_JSON },
    ig_semanas: num,
    ig_dias: num,
    dum: str,
    data_exame: str,
    primeira_us_data: str,
    primeira_us_ig_semanas: num,
    primeira_us_ig_dias: num,
    ig_referencia_hoje_semanas: num,
    ig_referencia_hoje_dias: num,
    referencia_fonte: { type: ["string", "null"], enum: ["usg_precoce", "dum", null] },
    corrigir_ig: { type: ["boolean", "null"] },
    saco_gestacional_mm: num,
    saco_gestacional_medidas_mm: { type: ["array", "null"], items: { type: "number" } },
    placenta_quantidade: num,
    placenta_localizacao: str,
    placenta_ecotextura: str,
    placenta_grau: str,
    placenta_relacao_orificio: {
      type: ["string", "null"],
      enum: ["insercao_baixa", "marginal", "previa", null],
    },
    placenta_distancia_orificio_mm: num,
    /**
     * Achado AGUDO da placenta — eixo independente da topografia e da relação
     * com o orifício. As três coisas podem coexistir no mesmo exame.
     */
    placenta_achado: {
      type: ["string", "null"],
      enum: ["descolamento", "acretismo", "lagos_venosos", null],
    },
    /** Medidas do descolamento, como ditadas ("3,2 x 1,8 cm"). */
    placenta_achado_medidas: str,
    /** Anexos e 1º trimestre — descrevem a MÃE ou o saco, não o concepto. */
    ovario_achado: { type: ["string", "null"], enum: ["cisto_simples", "endometrioma", null] },
    ovario_lado: { type: ["string", "null"], enum: ["direito", "esquerdo", null] },
    ovario_medidas_cm: { type: ["array", "null"], items: { type: "number" } },
    ovario_achado_medida_cm: num,
    vesicula_vitelina_mm: num,
    hematoma_perigestacional_medidas: str,
    hematoma_perigestacional_lado: { type: ["string", "null"], enum: ["direita", "esquerda", null] },
    gestacao_inviavel: bool,
    liquido_tipo: { type: ["string", "null"], enum: ["normal", "ila", "mbv", "alterado", null] },
    liquido_ila_cm: num,
    liquido_mbv_por_feto_cm: { type: ["array", "null"], items: { type: "number" } },
    liquido_classe: str,
    achados_adicionais: str,
    itens_conclusao_livres: { type: "array", items: { type: "string" } },
    observacoes_corpo_livres: { type: "array", items: { type: "string" } },
  },
} as const;

export const OBSTETRICA_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA OBSTÉTRICA.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada.

REGRAS:
1. numero_fetos: 1 = único; 2+ = gemelar/múltipla.
2. gestacao_inicial: true SOMENTE se for gestação inicial (≤ 13 semanas e 6 dias,
   ou houver saco gestacional/CCN/vesícula vitelina sem biometria DBP/CC/CA/CF).
3. fetos[]: um objeto por feto. Para gemelar, rotulo "A","B"... e posicao_relativa
   ("à direita"/"à esquerda") conforme ditado.
4. BIOMETRIA — NÃO ASSUMA UNIDADE. Extraia o número EXATAMENTE como ditado:
   - PRESERVE a casa decimal (vírgula → ponto): "2,4" → 2.4; "4,1" → 4.1.
     NUNCA remova a vírgula decimal (jamais 24 para "2,4", nem 41 para "4,1").
   - Só converta cm→mm (×10) quando a unidade "cm" for EXPLICITAMENTE dita no
     ditado (ex.: "BPD 5,2 cm" → dbp_mm 52). SEM unidade explícita, use o número
     como foi dito (ex.: "CCN 2,4" → ccn_mm 2.4; "DBP 85" → dbp_mm 85). Assuma
     que o médico falou a unidade certa; não "corrija".
   - DBP→dbp_mm, HC/CC→cc_mm, AC/CA→ca_mm, FL/CF→cf_mm, CCN→ccn_mm. Valor não
     ditado → null (NUNCA inventar).
4b. SACO GESTACIONAL / DSM (gestação inicial) — o CÓDIGO calcula a média, você só
    extrai:
    - "saco gestacional medindo A x B x C" OU "calcule o DSM pelas medidas A x B x C"
      → saco_gestacional_medidas_mm = [A, B, C] (as 3 medidas); saco_gestacional_mm = null.
    - "DSM de X" / "diâmetro médio do saco gestacional de X" → saco_gestacional_mm = X;
      saco_gestacional_medidas_mm = null.
    - Mesma regra de unidade/decimal da BIOMETRIA (não assuma unidade; preserve a
      casa decimal). Nada ditado → ambos null.
5. peso_g em gramas; percentil e peso_variacao_g só se ditados.
6. ig_semanas/ig_dias: idade gestacional ATUAL (da biometria deste exame). PREFIRA
   o valor FALADO COM DIAS quando houver (ex.: "em torno de 26 semanas e 5 dias pela
   biometria atual" → ig_semanas 26, ig_dias 5), em vez do valor arredondado de um
   campo estruturado tipo "IG pela biometria: 26s" (que perde os dias).
7. dum: data da última menstruação como DD/MM/AAAA (converta extenso → numérico).
7b. ÉPICO IG — referência precoce (só quando DITADO; senão null):
   - data_exame: data do exame / "hoje" (DD/MM/AAAA), se o médico disser.
   - primeira_us_data + primeira_us_ig_semanas/dias: "primeira ultrassonografia/US
     realizada em DD/MM com X semanas e Y dias" (a IG NAQUELA data, não a de hoje).
   - ig_referencia_hoje_semanas/dias: quando o médico já dá a IG da referência
     CORRIGIDA para hoje ("pela primeira US hoje está com 20 e 3").
   - referencia_fonte: "usg_precoce" se a referência citada for a 1ª ultrassonografia;
     "dum" se for a data da última menstruação. ESSENCIAL quando o médico cita as
     DUAS (ex.: "DUM 01/01, mas pela primeira US hoje está com 20") — preencha com a
     que ele mandou USAR para corrigir. null se não houver referência ou for óbvia.
   - corrigir_ig: true se o médico mandar corrigir/correlacionar ("corrija pela
     primeira US", "correlacione com a DUM"); false se disser para NÃO corrigir
     ("manter a biometria", "não corrigir"); null se não mencionar.
   - NUNCA invente datas/IG de referência. Tudo null no exame obstétrico comum.
8. corionicidade (gemelar): texto ditado ("dicoriônica e diamniótica",
   "monocoriônica e diamniótica"...). null se único.
9. placenta: quantidade (gemelar pode ter 2+), localização, ecotextura, grau.
10. líquido: liquido_tipo "normal" (subjetivo normal), "ila" (com ILA em cm),
    "mbv" (maior bolsão; FETO ÚNICO usa liquido_mbv_por_feto_cm com 1 valor;
    gemelar usa um valor por feto na ordem dos fetos), "alterado" (com
    liquido_classe = oligoâmnio/polidrâmnio). PRESERVE a casa decimal do ILA/MBV
    em cm ("4,1 cm" → 4.1; NUNCA 41).
11. apresentacao/dorso/polo_cefalico só quando ditados (senão null — o renderer
    usa defaults clínicos).
12. achados_adicionais: SOMENTE malformações ou ALTERAÇÕES patológicas reais,
    nas palavras do médico. NUNCA coloque aqui frases de NORMALIDADE redundantes
    ("sem descolamentos", "vesícula vitelínica presente", "saco gestacional
    tópico/regular", "líquido normal") — essas já estão no modelo padrão. null
    se o exame for normal.
13. itens_conclusao_livres (CAMADA FLEXÍVEL): APENAS conteúdo clínico que o médico
    quer NA CONCLUSÃO e que NÃO cabe em NENHUM outro campo deste schema — ex.:
    comparação com exame anterior ("comparado ao anterior de DD/MM, evolução
    normal"), observação clínica solta. Regras ESTRITAS:
    - Coloque a SUBSTÂNCIA LIMPA, nas palavras do médico, SEM palavras de comando
      ("adicione um item", "no final coloque", "acrescente", "item 1 da conclusão")
      e SEM ruído ("é", "deixa eu ver").
    - NUNCA repita aqui o que já tem campo próprio: IG, correção pela referência
      ("X pela biometria atual, devendo ser corrigida..."), 1ª US/DUM, líquido,
      peso — MESMO que o médico tenha ditado a frase inteira. Isso já é montado
      pelo sistema.
    - NUNCA invente. Array VAZIO [] se não houver conteúdo extra.
14. observacoes_corpo_livres (CAMADA FLEXÍVEL — CORPO): observação clínica que o
    médico manda pôr no CORPO do laudo (descrição do que se vê) e que NÃO cabe em
    NENHUM outro campo — ex.: "adicione uma frase sobre as adrenais fetais".
    (O cordão umbilical passou a ter campo próprio — ver item 18 — e por isso
    NÃO entra mais aqui.) Mesmas regras ESTRITAS do item 13:
    - SUBSTÂNCIA LIMPA nas palavras do médico, SEM as palavras de comando
      ("adicione uma frase", "comente", "descreva no corpo") e SEM ruído.
    - NUNCA repita o que já tem campo próprio (biometria, placenta, líquido,
      apresentação, BCF, movimentos) — isso já é montado pelo sistema.
    - Diferença do 13: aqui é DESCRIÇÃO do corpo; lá é item de CONCLUSÃO. Uma
      observação de corpo NÃO vira item de conclusão (e vice-versa).
    - NUNCA invente. Array VAZIO [] se não houver.

ACHADOS ALTERADOS — campos tipados. Regra geral para os itens 15 a 18: são
SEMPRE null quando o médico não ditou o achado. Silêncio NUNCA vira achado, e
achado NUNCA vira normalidade. Se o médico descreveu algo que não cabe nos
valores abaixo, use achados_adicionais / observacoes_corpo_livres — NÃO force
para o valor mais parecido.

15. fetos[].bcf_alteracao — alteração da vitalidade DAQUELE feto:
    - "ausente": batimentos não visualizados, óbito fetal, feto sem vitalidade,
      sem atividade cardíaca, feto morto. Nesse caso bcf_bpm é null.
    - "bradicardia" / "taquicardia": o médico NOMEOU a alteração. Um BCF baixo
      ou alto SEM o médico nomear NÃO vira alteração — deixe null e registre só
      bcf_bpm. Classificar é ato clínico, não seu.
    - No gemelar isto é POR FETO: acontece de um feto ter óbito e o outro não.

16. fetos[].movimentos_fetais — "ausentes" ou "reduzidos", só quando ditado.
    Movimentos normais NÃO se registram aqui (o modelo já os afirma): null.

17. fetos[].cranio_achado — achado do crânio/SNC, um valor:
    - "ventriculomegalia" (com cranio_medida_mm = átrio ventricular em mm)
    - "cisto_plexo_coroide" (cranio_medida_mm + cranio_lateralidade
      "à direita"/"à esquerda", como ditado)
    - "megacisterna_magna" (cranio_medida_mm = cisterna magna)
    - "cisto_bolsa_blake"
    - "dandy_walker"
    - "cavum_nao_visualizado" (cavum do septo pelúcido não visualizado)
    Medida não ditada → cranio_medida_mm null (NUNCA inventar). Lateralidade
    não dita → cranio_lateralidade null.

18. fetos[].cordao_vasos — o NÚMERO DE VASOS do cordão, só quando avaliado:
    - "tres" = cordão normal: duas artérias e uma veia.
    - "dois" = artéria umbilical ÚNICA: uma artéria e uma veia.
    - null = o médico não falou do cordão. Afirmar "três vasos" sem ele ter
      avaliado é inventar exame.
    Quando preencher este campo, NÃO repita o cordão em
    observacoes_corpo_livres — o sistema já escreve a frase a partir daqui.

19. placenta_achado — achado AGUDO da placenta, INDEPENDENTE da localização e da
    relação com o orifício (as três coisas coexistem):
    - "descolamento": coleção/hematoma retroplacentário. Se o médico deu as
      medidas, copie-as literalmente em placenta_achado_medidas ("3,2 x 1,8 cm");
      senão null.
    - "acretismo": suspeita de acretismo/PAS, perda da zona hipoecoica
      retroplacentária, invasão miometrial.
    - "lagos_venosos": lagos/lacunas venosas placentárias.
    null quando não ditado. NUNCA deduza acretismo de placenta prévia — são
    coisas diferentes, e prévia já é placenta_relacao_orificio.

21. ACHADOS DE VÍSCERAS — um campo por achado, porque eles COEXISTEM. Preencha
    cada um só quando ditado:
    - pielectasia_direita / pielectasia_esquerda: true SÓ quando o médico disser
      que aquele lado está ALTERADO (pielectasia, dilatação, distensão da pelve
      renal). Medir não é alterar: as duas pelves são medidas de rotina.
    - pielectasia_direita_mm / pielectasia_esquerda_mm: a medida em mm de cada
      lado, quando ditada — inclusive do lado NORMAL.
    - intestino_hiperecogenico: true quando "alças intestinais hiperecogênicas",
      "intestino hiperecogênico".
    - ascite: true quando "ascite fetal", "líquido livre na cavidade abdominal
      do feto".
    - derrame_pleural: "direito"/"esquerdo"/"bilateral" + derrame_pleural_mm com
      a espessura, se ditada.
    - hidropsia: true quando o médico DIZ "hidropsia"/"hidropisia fetal". NÃO
      deduza hidropsia de ascite + derrame — o diagnóstico é dele.
    - estomago_nao_visualizado: true quando "estômago não visualizado" apesar de
      procura dirigida.

22. ANEXOS E 1º TRIMESTRE (do EXAME, não do feto):
    - ovario_achado: "cisto_simples" (imagem anecoica, paredes finas, sem
      septação) ou "endometrioma" (conteúdo em vidro fosco). Com ovario_lado,
      ovario_medidas_cm (as 3 medidas do ovário) e ovario_achado_medida_cm (o
      maior eixo da imagem).
    - vesicula_vitelina_mm: só quando o médico disser que está AUMENTADA, com a
      medida.
    - hematoma_perigestacional_medidas (verbatim, "1,2 x 0,8 x 0,5 cm") +
      hematoma_perigestacional_lado ("direita"/"esquerda").
    - gestacao_inviavel: true quando "gestação anembrionada", "saco gestacional
      sem embrião", "gestação inviável". NÃO deduza de um DSM grande — o
      critério é do médico.

20. placenta_relacao_orificio — relação com o orifício interno do colo, eixo
    SEPARADO da topografia (anterior/posterior vai em placenta_localizacao):
    - "insercao_baixa": placenta baixa / no segmento inferior, sem alcançar o
      orifício. Se o médico deu a distância da borda ao orifício, copie em
      placenta_distancia_orificio_mm (em mm).
    - "marginal": a borda ALCANÇA/margeia o orifício, sem recobrir.
    - "previa": RECOBRE o orifício interno.
    null quando o médico não falou da relação com o orifício.`;

// ---------------------------------------------------------------------------
// Formatação e cálculos determinísticos
// ---------------------------------------------------------------------------

function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace(".", ",");
}

/** Concordância: "apresentação" é feminino → cefálica/pélvica/córmica/transversa. */
function apresentacaoFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  const map: Record<string, string> = {
    cefálico: "cefálica",
    cefalico: "cefálica",
    // ASR: "encefálica/encefálico" → "cefálica" (boletim 23/jun + mineração).
    encefálico: "cefálica",
    encefalico: "cefálica",
    encefálica: "cefálica",
    encefalica: "cefálica",
    pélvico: "pélvica",
    pelvico: "pélvica",
    córmico: "córmica",
    cormico: "córmica",
    transverso: "transversa",
  };
  return map[t] ?? s.trim();
}

/** Grau de placenta (Grannum) → romano: 0→0, 1→I, 2→II, 3→III. */
function grauFmt(s: string | null): string | null {
  if (!s) return null;
  const t = s.trim().replace(/^grau\s*/i, "");
  const romano: Record<string, string> = { "0": "0", "1": "I", "2": "II", "3": "III" };
  return `grau ${romano[t] ?? t}`;
}
/** Parentético do Grannum no fim da frase: " (grau II de Grannum et al.)". "" se OFF/sem grau. */
function grannumParen(grau: string | null, grannum: boolean): string {
  if (!grannum) return "";
  const g = grauFmt(grau);
  return g ? ` (${g} de Grannum et al.)` : "";
}
/**
 * Ecotextura da placenta: usa a ditada; se ausente e houver grau (flag ON),
 * INFERE — grau 0 = homogênea; graus I/II/III = heterogênea, de acordo com a fase
 * da gestação. Retorna null se nada disponível.
 */
function placentaEco(f: ObstetricaFindings, grannum: boolean): string | null {
  if (f.placenta_ecotextura) return f.placenta_ecotextura;
  if (!grannum || !f.placenta_grau) return null;
  const g = f.placenta_grau.trim().replace(/^grau\s*/i, "");
  return g === "0" ? "homogênea" : "heterogênea, de acordo com a fase da gestação";
}
function mm(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}
function gramas(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}

/** IG: "X semanas e Y dias" (omite "e Y dias" quando dias é 0 ou null). */
function formatIg(semanas: number | null, dias: number | null): string {
  if (semanas === null) return "____ semanas";
  if (dias === null || dias === 0) return `${ptBr(semanas)} ${semanas === 1 ? "semana" : "semanas"}`;
  return `${ptBr(semanas)} ${semanas === 1 ? "semana" : "semanas"} e ${ptBr(dias)} ${dias === 1 ? "dia" : "dias"}`;
}

export type PonderalCalc = {
  pesoMedio: number | null;
  divergenciaG: number | null;
  divergenciaPct: number | null;
};

/** Peso médio e divergência ponderal entre fetos — determinístico. */
export function calcPonderal(fetos: ObstetricaFindings["fetos"]): PonderalCalc {
  const pesos = fetos.map((f) => f.peso_g).filter((p): p is number => p !== null);
  if (pesos.length < 2) return { pesoMedio: null, divergenciaG: null, divergenciaPct: null };
  const maior = Math.max(...pesos);
  const menor = Math.min(...pesos);
  const pesoMedio = Math.round(pesos.reduce((a, b) => a + b, 0) / pesos.length);
  const divergenciaG = maior - menor;
  const divergenciaPct = Math.round((divergenciaG / maior) * 1000) / 10; // 1 casa
  return { pesoMedio, divergenciaG, divergenciaPct };
}

/**
 * DSM (diâmetro médio do saco gestacional) = (a+b+c)/3, 1 casa decimal.
 * O DSM ditado direto ("DSM de 15,3") vence; senão calcula da média das medidas
 * ditadas ("saco medindo 20,3 x 10,4 x 15,4"). null = nenhum dado (placeholder).
 */
export function calcDsm(f: ObstetricaFindings): number | null {
  if (f.saco_gestacional_mm !== null) return f.saco_gestacional_mm;
  const m = (f.saco_gestacional_medidas_mm ?? []).filter((n) => Number.isFinite(n));
  if (m.length === 0) return null;
  return Math.round((m.reduce((a, b) => a + b, 0) / m.length) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

/**
 * "Embrião" ou "Feto"? — corte em 10 SEMANAS, não em 13s6d.
 *
 * BUG (relatado pelo Luiz 2026-08-16): o médico ditava "Feto com 11 semanas e
 * 2 dias" e o laudo saía "Embrião único". Causa: UM flag decidia DUAS coisas.
 *
 *   gestacao_inicial (≤13s6d) → escolhe o MODELO do laudo   ✅ correto
 *   gestacao_inicial          → escolhia a PALAVRA           ❌ errado
 *
 * São eixos independentes: "feto é acima de 10 semanas, e embrião abaixo
 * disso" (Luiz). A janela do defeito era 10s0d–13s6d — quase quatro semanas
 * de gestações saindo com o substantivo errado.
 *
 * Sem IG conhecida cai no comportamento antigo: nesse caso não há como
 * decidir, e as gestações sem IG são tipicamente as bem iniciais.
 *
 * QUAL IG (revisão do Codex, 16/08) — a de DATAÇÃO, não a da biometria.
 *
 * A versão anterior usava `ig_semanas` (biometria atual). O argumento contra,
 * e é decisivo: *um embrião pequeno não volta a ser embrião por estar medindo
 * menos*. Se a datação diz 11 semanas e a biometria mede 9s5d, isso é um feto
 * com crescimento abaixo do esperado — não um embrião. A idade da gestação é a
 * da datação; a biometria é uma estimativa dela, e uma que erra justamente nos
 * casos em que errar importa.
 *
 * A objeção que existia aqui era que isso tornaria a palavra dependente da flag
 * `IG_REFERENCE_CORRECTION`. Não torna: a flag decide se a CONCLUSÃO é
 * corrigida — uma escolha de redação —, e o substantivo é fato clínico. Por
 * isso a datação vale sempre que existir, com ou sem flag.
 *
 * Precedência: datação (R_hoje ditado > USG precoce > DUM) → biometria →
 * `gestacao_inicial`.
 */
export function igDeDatacao(f: ObstetricaFindings): { semanas: number; dias: number } | null {
  // `enabled: true` de propósito — ver acima: a flag governa a redação da
  // conclusão, não o fato de a gestação ter uma datação.
  const input = buildIgInput(igRawFromFindings(f, true), { leadAncora: "", leadBase: "" });
  return input.referencia ? computeRHoje(input.referencia, f.data_exame) : null;
}

export function ehEmbriao(f: ObstetricaFindings): boolean {
  const datacao = igDeDatacao(f);
  if (datacao) return datacao.semanas * 7 + datacao.dias < 10 * 7;
  if (f.ig_semanas === null) return f.gestacao_inicial;
  return f.ig_semanas < 10;
}

export function fetoApresentacaoFrase(
  f: ObstetricaFindings["fetos"][number],
  inicial: boolean,
  embriao: boolean = inicial,
): string {
  // `inicial` continua governando a FORMA da frase (situação × apresentação),
  // que é escolha de modelo. Só o substantivo passou a depender da IG.
  const subst = embriao ? "Embrião" : "Feto";
  const apres = apresentacaoFmt(f.apresentacao) ?? (inicial ? "transversa" : "cefálica");
  const conector = inicial ? "em situação" : "em apresentação";
  let frase = `${subst} único, ${conector} ${apres}`;
  if (f.dorso) frase += `, com dorso ${f.dorso}`;
  if (f.polo_cefalico) frase += `, com polo cefálico ${f.polo_cefalico}`;
  return `${frase}.`;
}

export function biometriaLinhas(f: ObstetricaFindings["fetos"][number]): string[] {
  const linhas = [
    `Diâmetro biparietal (DBP) de ${mm(f.dbp_mm)} mm.`,
    `Circunferência da cabeça (CC) de ${mm(f.cc_mm)} mm.`,
    `Circunferência abdominal (CA) de ${mm(f.ca_mm)} mm.`,
    `Comprimento do fêmur (CF) de ${mm(f.cf_mm)} mm.`,
  ];
  return linhas;
}

export function pesoLinha(f: ObstetricaFindings["fetos"][number]): string {
  const extras: string[] = [];
  if (f.peso_variacao_g !== null) extras.push(`+- ${gramas(f.peso_variacao_g)} gramas`);
  if (f.percentil !== null) extras.push(`percentil ${ptBr(f.percentil)}`);
  const sufixo = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `Peso aproximado de ${gramas(f.peso_g)} gramas${sufixo}.`;
}

export function placentaFrase(f: ObstetricaFindings, grannum = false): string | null {
  const qtd = f.placenta_quantidade ?? f.numero_fetos;
  const grauTxt = grauFmt(f.placenta_grau);
  const paren = grannumParen(f.placenta_grau, grannum); // "" se OFF/sem grau
  const eco = placentaEco(f, grannum); // ditada ou inferida (flag) ou null
  if (f.numero_fetos >= 2) {
    const base =
      qtd >= 2 ? `${qtd === 2 ? "Duas" : qtd === 3 ? "Três" : qtd} placentas` : "Placenta única";
    const loc = f.placenta_localizacao ? `, ${f.placenta_localizacao}` : "";
    // Flag ON: grau vira parentético no fim; OFF: inline (byte-idêntico).
    const grau = !grannum && grauTxt ? `, ${grauTxt}` : "";
    const ecoTxt = eco ? `, com ecotextura ${eco}` : "";
    return `${base}${loc}${grau}${ecoTxt}${paren}.`;
  }
  if (!f.placenta_localizacao && !eco && !grauTxt)
    return "Placenta de aspecto normal.";
  let frase = "Placenta";
  if (f.placenta_localizacao) frase += ` de localização ${f.placenta_localizacao}`;
  if (!grannum && grauTxt) frase += `, ${grauTxt}`;
  if (eco) frase += `, com ecotextura ${eco}`;
  frase += paren;
  return `${frase}.`;
}

/**
 * A CLASSE do líquido a partir da MEDIDA — limiares clássicos.
 *
 * ILA: < 5 cm oligoâmnio, > 25 cm polidrâmnio.
 * MBV: < 2 cm oligoâmnio, > 8 cm polidrâmnio.
 *
 * `null` quer dizer dentro da faixa. Os mesmos números que a web já usava
 * desde sempre; trazê-los para cá não muda julgamento clínico, muda de quem é
 * a autoridade sobre ele.
 */
function classeDaMedida(valor: number, escala: "ila" | "mbv"): string | null {
  const [baixo, alto] = escala === "ila" ? [5, 25] : [2, 8];
  if (valor < baixo) return "oligoâmnio";
  if (valor > alto) return "polidrâmnio";
  return null;
}

/**
 * Linha de líquido amniótico no corpo + item de conclusão.
 *
 * ⚠️ ATÉ 22/08 ESTA FUNÇÃO AFIRMAVA NORMALIDADE PARA QUALQUER MEDIDA.
 *
 * Com `liquido_tipo: "ila"` e `liquido_ila_cm: 4`, ela escrevia "Líquido
 * amniótico em quantidade normal (ILA de 4 cm)" — um oligoâmnio franco
 * relatado como normal, com o número que o desmente na mesma frase. O mesmo
 * pelo MBV.
 *
 * Não era acidente de código: a classificação era delegada à IA, que devia
 * mandar `liquido_tipo: "alterado"` + `liquido_classe`. Delegar comparação de
 * limiar a um modelo de linguagem é frágil por natureza, e não havia nada aqui
 * para pegar o erro dela.
 *
 * Nunca mordeu em produção porque nenhum laudo real chegou com medida — 1344
 * laudos obstétricos, todos com `liquido_tipo` nulo (conferido em 22/08). Quem
 * ia acordar o defeito era a web, que passa a mandar a medida que o médico
 * digita.
 *
 * A classe DITADA continua vencendo: se o médico disse "oligoâmnio", é isso que
 * sai, mesmo que o número diga outra coisa — ele viu o exame.
 */
export function liquido(f: ObstetricaFindings): { corpo: string; conclusao: string } {
  const tipo = f.liquido_tipo ?? "normal";
  if (tipo === "mbv" && f.liquido_mbv_por_feto_cm && f.liquido_mbv_por_feto_cm.length > 0) {
    // Feto único: NUNCA rotular "(feto A)" nem "ambos os fetos" (P5 — sem
    // alucinação gemelar). Só o gemelar (≥2 fetos) individualiza por feto.
    if (f.numero_fetos < 2) {
      const v = f.liquido_mbv_por_feto_cm[0];
      const mbvTxt = v !== undefined ? `${ptBr(v)} cm` : "____ cm";
      const classe = f.liquido_classe ?? (v !== undefined ? classeDaMedida(v, "mbv") : null);
      return {
        corpo: `Maior bolsão vertical de ${mbvTxt}.`,
        conclusao: classe
          ? `${classe.charAt(0).toUpperCase()}${classe.slice(1)} (maior bolsão vertical de ${mbvTxt}).`
          : `Líquido amniótico em quantidade normal (maior bolsão vertical de ${mbvTxt}).`,
      };
    }
    const labels = f.liquido_mbv_por_feto_cm
      .map((v, i) => `${ptBr(v)} cm (feto ${rotuloFeto(f, i)})`)
      .join(" e ");
    return {
      corpo: `Maior bolsão vertical de ${labels}.`,
      conclusao: `Líquido amniótico em quantidade normal para ambos os fetos (maior bolsão vertical de ${labels}).`,
    };
  }
  if (tipo === "ila" && f.liquido_ila_cm !== null) {
    const classe = f.liquido_classe ?? classeDaMedida(f.liquido_ila_cm, "ila");
    return {
      corpo: `Índice de líquido amniótico (ILA) de ${ptBr(f.liquido_ila_cm)} cm.`,
      conclusao: classe
        ? `${classe.charAt(0).toUpperCase()}${classe.slice(1)} (ILA de ${ptBr(f.liquido_ila_cm)} cm).`
        : `Líquido amniótico em quantidade normal (ILA de ${ptBr(f.liquido_ila_cm)} cm).`,
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
    conclusao: "Líquido amniótico em quantidade normal.",
  };
}

function rotuloFeto(f: ObstetricaFindings, i: number): string {
  return f.fetos[i]?.rotulo ?? String.fromCharCode(65 + i);
}

export const EMPTY_FETO: ObstetricaFindings["fetos"][number] = {
  bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null, cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
  rotulo: null,
  posicao_relativa: null,
  apresentacao: null,
  dorso: null,
  polo_cefalico: null,
  bcf_bpm: null,
  dbp_mm: null,
  cc_mm: null,
  ca_mm: null,
  cf_mm: null,
  ccn_mm: null,
  peso_g: null,
  peso_variacao_g: null,
  percentil: null,
};

function numberConclusao(itens: string[]): string {
  if (itens.length === 1) return itens[0] ?? "";
  return itens.map((it, i) => `${i + 1}) ${it}`).join("\n");
}

/**
 * Guard de dedup determinístico (camada flexível): remove itens livres que
 * DUPLICAM conteúdo já montado pelo renderer (IG/correção/1ªUS/líquido/peso) — o
 * médico às vezes dita a frase inteira e a extração a captura como "extra". O
 * código não deixa sair duas vezes. Mantém o extra GENUÍNO (ex.: comparação com
 * exame anterior). Cinto-de-segurança do PoC (docs/camada-flexivel-design.md).
 */
const DETERMINISTIC_CONCL_PATTERNS: RegExp[] = [
  /gesta[çc][ãa]o\s+em\s+torno\s+de/i,
  /pela\s+biometria\s+atual/i,
  /devendo\s+ser\s+corrigida|corrigid[oa]\s+pela/i,
  /l[íi]quido\s+amni[óo]tico/i,
  /peso\s+(?:aproximado|fetal)/i,
  /maior\s+bols[ãa]o|\bila\b|índice\s+de\s+l[íi]quido/i,
  /(?:primeira|1[ªº])\s*ultrassonograf|[úu]ltima\s+menstrua|\bdum\b/i,
  /diverg[êe]ncia\s+ponderal/i,
  // Imperativo META de correção/posição (boletim 2026-06-19): "correlacione com a
  // ultrassonografia precoce", "corrija pela DUM", "no item 1 da conclusão...". É
  // redundante com a correção Domingos já montada — NÃO vira item. Mantém o item
  // clínico genuíno ("correlacionar com exame anterior/clínica" não casa).
  /^(?:correlacion|corrij|corrig)\w*\b[^.]*\b(?:ultrassonograf|precoce|\bdum\b|biometria|idade\s+gestacional|item\s+\d)/i,
  /\bno\s+item\s+\d/i,
];
/** Capitaliza a 1ª letra + garante ponto final (o item livre vem em prosa crua). */
function normalizaItemLivre(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

export function filterFreeConclusionItems(items: string[] | null | undefined): string[] {
  return (items ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !DETERMINISTIC_CONCL_PATTERNS.some((re) => re.test(s)))
    .map(normalizaItemLivre);
}

/**
 * Guard de dedup do CORPO (camada flexível): remove observações livres que
 * duplicam linhas já montadas deterministicamente no corpo (biometria, placenta,
 * líquido, apresentação/BCF/movimentos). O médico às vezes redita o que já é campo
 * próprio; o código não deixa sair duas vezes. Mantém o inusitado genuíno (adrenais
 * fetais, cordão com 3 vasos). Mesmo princípio de filterFreeConclusionItems.
 */
const DETERMINISTIC_BODY_PATTERNS: RegExp[] = [
  /di[âa]metro\s+biparietal|\bdbp\b/i,
  /circunfer[êe]ncia\s+(?:da\s+cabe[çc]a|abdominal|cef[áa]lica)|\bcc\b|\bca\b/i,
  /comprimento\s+do\s+f[êe]mur|\bcf\b/i,
  /peso\s+(?:aproximado|fetal)/i,
  /placenta\b/i,
  /l[íi]quido\s+amni[óo]tico|maior\s+bols[ãa]o|\bila\b/i,
  /apresenta[çc][ãa]o\s+(?:cef[áa]lica|p[ée]lvica|c[óo]rmica|transversa)|feto\s+[úu]nico/i,
  /batimentos\s+card[íi]acos|\bbcf\b|movimentos\s+fetais\s+(?:s[ãa]o\s+)?ativos/i,
  /saco\s+gestacional|comprimento\s+cr[âa]nio|\bccn\b|ves[íi]cula\s+vitel/i,
];
export function filterFreeBodyItems(items: string[] | null | undefined): string[] {
  return (items ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !DETERMINISTIC_BODY_PATTERNS.some((re) => re.test(s)))
    .map(normalizaItemLivre);
}

/**
 * Campos brutos de IG (épico Domingos). Quando `enabled` é false (flag OFF), a
 * referência precoce é NEUTRALIZADA → computeIg devolve só a biometria, frase
 * byte-idêntica ao formatIg legado. Único caminho de código (sem branch duplo).
 */
function igRawFromFindings(f: ObstetricaFindings, enabled: boolean): IgRawFields {
  return {
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
}

/** computeIg com o lead da conclusão (gemelar passa o lead com corionicidade). */
function igResultFor(f: ObstetricaFindings, enabled: boolean, leadAncora: string, sanityCheck = false) {
  return computeIg(
    buildIgInput(igRawFromFindings(f, enabled), {
      leadAncora,
      leadBase: "Gestação em torno de ",
      sanityCheck,
    }),
  );
}

/**
 * A sanidade de IG MUDA ALGUMA COISA neste laudo?
 *
 * `OBST_IG_SANITY` é uma flag, e estava sendo usada para decidir se o CATÁLOGO
 * cobria o caso — bloqueando-o em 100% dos laudos enquanto a flag estivesse
 * ligada. É o mesmo defeito que a biometria determinística causou em 12/08, e
 * pelo mesmo motivo: um campo decidindo duas coisas independentes.
 *
 * A pergunta certa não é "a flag está ligada", é "a sanidade altera ESTE
 * laudo". Ela só atua quando a divergência entre a IG de referência e a
 * biometria é implausível — raro. Nos demais, os dois caminhos produzem o mesmo
 * texto e o catálogo cobre o caso.
 */
export function igSanityAltera(f: ObstetricaFindings, igCorrection: boolean): boolean {
  const lead = "Gestação em torno de ";
  return (
    JSON.stringify(igResultFor(f, igCorrection, lead, false)) !==
    JSON.stringify(igResultFor(f, igCorrection, lead, true))
  );
}

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior; objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO (Sprint 2),
 * reusando a MESMA extração e os MESMOS cálculos determinísticos.
 */
export function renderObstetrica(
  f: ObstetricaFindings,
  _prefs?: unknown,
  opts?: { objetivo?: boolean; igCorrection?: boolean; flexivel?: boolean; golfBall?: GolfBall | null; igSanity?: boolean; grannum?: boolean },
): string {
  const igc = opts?.igCorrection ?? false;
  const flx = opts?.flexivel ?? false;
  const g = opts?.golfBall ?? null;
  const igSan = opts?.igSanity ?? false;
  const grn = opts?.grannum ?? false;
  // Golf ball (flag): o snippet canônico substitui o eco cru da extração — remove
  // dos achados adicionais/itens livres as sentenças que mencionam o foco (dedup).
  if (g) {
    f = {
      ...f,
      achados_adicionais: f.achados_adicionais
        ? stripGolfBallEcho(f.achados_adicionais) || null
        : f.achados_adicionais,
      itens_conclusao_livres: (f.itens_conclusao_livres ?? []).filter(
        (it) => stripGolfBallEcho(it) === it.trim(),
      ),
    };
  }
  if (opts?.objetivo) return renderObstetricaObjetivo(f, igc, flx, g, igSan, grn);
  return renderObstetricaClassico(f, igc, flx, g, igSan, grn);
}

/** Monta o laudo obstétrico (estrutura por construção). */
export function renderObstetricaClassico(
  f: ObstetricaFindings,
  igCorrection = false,
  flexivel = false,
  golfBall: GolfBall | null = null,
  igSanity = false,
  grannum = false,
): string {
  const gemelar = f.numero_fetos >= 2;
  const titulo = gemelar ? "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR" : "ULTRASSONOGRAFIA OBSTÉTRICA";

  // IG determinística (Domingos). Lead leva a corionicidade no gemelar.
  const corionLead = f.corionicidade ? `${f.corionicidade} ` : "";
  const leadAncora = gemelar
    ? `Gestação gemelar ${corionLead}em torno de `
    : "Gestação em torno de ";
  const ig = igResultFor(f, igCorrection, leadAncora, igSanity);

  const aspectos: string[] = [];
  const conclusao: string[] = [];

  if (gemelar) {
    // Primeira frase personalizada com quantidade + individualização.
    const qtdLabel = f.numero_fetos === 2 ? "Dois fetos" : f.numero_fetos === 3 ? "Três fetos" : `${f.numero_fetos} fetos`;
    const descricoes = f.fetos.map((ft, i) => {
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      const pos = ft.posicao_relativa ? `o feto ${ft.posicao_relativa} (feto ${rot})` : `o feto ${rot}`;
      const apresFmt = apresentacaoFmt(ft.apresentacao);
      const apres = apresFmt ? `, em apresentação ${apresFmt}` : "";
      const dorso = ft.dorso ? ` com dorso ${ft.dorso}` : "";
      const polo = ft.polo_cefalico ? ` com polo cefálico ${ft.polo_cefalico}` : "";
      return `${pos}${apres}${dorso}${polo}`;
    });
    aspectos.push(`${qtdLabel}: ${descricoes.join(", e ")}.`);
    // Por feto: BCF + biometria + peso.
    for (let i = 0; i < f.fetos.length; i++) {
      const ft = f.fetos[i];
      if (!ft) continue;
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      aspectos.push(`\nFeto ${rot}:`);
      aspectos.push(`Batimentos cardíacos presentes (BCF = ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm).`);
      if (!f.gestacao_inicial) aspectos.push(...biometriaLinhas(ft));
      else aspectos.push(`Comprimento crânio-nádegas (CCN) de ${mm(ft.ccn_mm)} mm.`);
      aspectos.push(pesoLinha(ft));
    }
    // Peso médio + divergência (cálculo determinístico).
    const pond = calcPonderal(f.fetos);
    if (pond.pesoMedio !== null) {
      aspectos.push(
        `\nPeso fetal médio de ${gramas(pond.pesoMedio)} gramas. Divergência ponderal de ${gramas(pond.divergenciaG)} gramas (${ptBr(pond.divergenciaPct ?? 0)}%).`,
      );
    }
    const plc = placentaFrase(f, grannum);
    if (plc) aspectos.push(`\n${plc}`);
    const liq = liquido(f);
    aspectos.push(liq.corpo);

    // Conclusão gemelar — IG determinística (Domingos).
    conclusao.push(ig.conclusaoClassico);
    conclusao.push(liq.conclusao);
    if (pond.divergenciaG !== null) {
      const significativa = (pond.divergenciaPct ?? 0) >= 20;
      conclusao.push(
        significativa
          ? `Divergência ponderal significativa entre os fetos (${ptBr(pond.divergenciaPct ?? 0)}%).`
          : `Fetos com pesos concordantes, sem divergência ponderal significativa.`,
      );
    }
  } else {
    // Feto único.
    const ft = f.fetos[0] ?? EMPTY_FETO;
    aspectos.push(fetoApresentacaoFrase(ft, f.gestacao_inicial, ehEmbriao(f)));
    if (f.gestacao_inicial) {
      // P1 — no obstétrico inicial a linha do saco gestacional é OBRIGATÓRIA;
      // nunca some. DSM calculado das 3 medidas (ou ditado direto); sem dado →
      // placeholder "____".
      aspectos.unshift(`Saco gestacional de forma normal, com diâmetro médio de ${mm(calcDsm(f))} mm.`);
    }
    aspectos.push(
      f.gestacao_inicial
        ? `Batimentos cardíacos ritmados (BCF = ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm).`
        : `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm).`,
    );
    if (!f.gestacao_inicial) {
      aspectos.push("Os movimentos fetais são ativos.");
      aspectos.push("\nAs considerações sobre a anatomia fetal são as seguintes:");
      aspectos.push("As estruturas cranianas e da coluna vertebral são normais.");
      aspectos.push("O estômago e a bexiga foram bem identificados e com ecotextura homogênea.");
      aspectos.push("\nA biometria fetal é a seguinte:");
      aspectos.push(...biometriaLinhas(ft));
      aspectos.push(pesoLinha(ft));
      const plc = placentaFrase(f, grannum);
      if (plc) aspectos.push(`\n${plc}`);
    } else {
      aspectos.push(`Comprimento crânio-nádegas (CCN) de ${mm(ft.ccn_mm)} mm.`);
      aspectos.push("Vesícula vitelina de forma e dimensões normais.");
    }
    const liq = liquido(f);
    aspectos.push(liq.corpo);
    if (f.gestacao_inicial) aspectos.push("Ovários de aspecto normal.");

    conclusao.push(ig.conclusaoClassico);
    if (!f.gestacao_inicial) conclusao.push(liq.conclusao);
  }

  // Golf ball (flag): corpo na posição canônica (bloco de anatomia) + item de
  // conclusão com a recomendação de eco fetal (~28s). Determinístico.
  if (golfBall) applyGolfBall(aspectos, conclusao, golfBall);

  // Achados adicionais (texto do médico) — inserido literal antes da conclusão,
  // sem LLM e sem invenção. Vai para o corpo; o médico revisa a conclusão.
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }

  // Camada flexível (flag): observações livres de corpo (após dedup) ao fim dos
  // aspectos, e itens livres (após dedup) ao fim da conclusão.
  if (flexivel) {
    aspectos.push(...filterFreeBodyItems(f.observacoes_corpo_livres));
    conclusao.push(...filterFreeConclusionItems(f.itens_conclusao_livres));
  }

  // Linha opcional de DUM (logo após o título).
  const dumLinha = f.dum ? `\nDUM: ${f.dum}.\n` : "";
  // Frase-prosa da referência precoce (1ª US/DUM corrigida p/ hoje), se houver.
  const igProse = ig.fraseReferencia ? `${ig.fraseReferencia}\n` : "";

  const corpo = [
    titulo,
    dumLinha,
    igProse,
    COMENTARIOS,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    numberConclusao(conclusao),
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO (Sprint 2)
// ===========================================================================
//
// Mais enxuto que o clássico (sem COMENTÁRIOS/OS SEGUINTES ASPECTOS). 1 casa
// decimal em TODAS as medidas. Reusa 100% a extração e os cálculos
// determinísticos (calcPonderal, calcDsm, liquido). Feto único NUNCA recebe
// "(feto A)"/"ambos os fetos" (P5). Percentil é só reproduzido (nunca cruzado
// com a IG).

export const TECNICA_OBJ =
  "Exame realizado com transdutor convexo multifrequencial.";

/** 1 casa decimal SEMPRE (P3) — vírgula decimal. */
function ptBr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
/** Medida em mm com 1 casa decimal; placeholder se null. */
function mm1(v: number | null): string {
  return v === null ? "____" : ptBr1(v);
}
/** Peso em gramas: inteiro (gramas não levam casa decimal). */
function g0(v: number | null): string {
  return v === null ? "____" : String(Math.round(v));
}

/** Biometria objetiva (1 casa decimal) — só as 4 medidas padrão. */
export function biometriaLinhasObj(f: ObstetricaFindings["fetos"][number]): string[] {
  return [
    `Diâmetro biparietal (DBP): ${mm1(f.dbp_mm)} mm.`,
    `Circunferência cefálica (CC): ${mm1(f.cc_mm)} mm.`,
    `Circunferência abdominal (CA): ${mm1(f.ca_mm)} mm.`,
    `Comprimento femoral (CF): ${mm1(f.cf_mm)} mm.`,
  ];
}

/** Linha de peso objetiva: peso + (variação, percentil) só se ditados. */
export function pesoLinhaObj(f: ObstetricaFindings["fetos"][number]): string {
  const extras: string[] = [];
  if (f.peso_variacao_g !== null) extras.push(`+- ${g0(f.peso_variacao_g)} g`);
  if (f.percentil !== null) extras.push(`percentil ${ptBr(f.percentil)}`);
  const sufixo = extras.length > 0 ? ` (${extras.join(", ")})` : "";
  return `Peso fetal estimado: ${g0(f.peso_g)} g${sufixo}.`;
}

/** Placenta objetiva (frase enxuta). null = não descrita. */
export function placentaFraseObj(f: ObstetricaFindings, grannum = false): string | null {
  const g = grauFmt(f.placenta_grau);
  const grauTxt = g ? `${g} de Grannum et al.` : null;
  const paren = grannumParen(f.placenta_grau, grannum);
  const eco = placentaEco(f, grannum);
  if (f.numero_fetos >= 2) {
    const qtd = f.placenta_quantidade ?? f.numero_fetos;
    const base =
      qtd >= 2
        ? `${qtd === 2 ? "Duas" : qtd === 3 ? "Três" : qtd} placentas`
        : "Placenta única";
    const loc = f.placenta_localizacao ? `, ${f.placenta_localizacao}` : "";
    if (grannum) {
      const ecoTxt = eco ? `, com ecotextura ${eco}` : "";
      return `${base}${loc}${ecoTxt}${paren}.`;
    }
    const grau = grauTxt ? `, ${grauTxt}` : "";
    return `${base}${loc}${grau}.`;
  }
  if (grannum) {
    if (!f.placenta_localizacao && !eco && paren === "")
      return "Placenta de aspecto normal.";
    let frase = "Placenta";
    if (f.placenta_localizacao) frase += ` de localização ${f.placenta_localizacao}`;
    if (eco) frase += `, com ecotextura ${eco}`;
    frase += paren;
    return `${frase}.`;
  }
  if (!f.placenta_localizacao && !grauTxt) return "Placenta de aspecto normal.";
  let frase = "Placenta";
  if (f.placenta_localizacao) frase += ` de localização ${f.placenta_localizacao}`;
  if (grauTxt) frase += `, ${grauTxt}`;
  return `${frase}.`;
}

/** Render objetivo do laudo obstétrico. */
export function renderObstetricaObjetivo(
  f: ObstetricaFindings,
  igCorrection = false,
  flexivel = false,
  golfBall: GolfBall | null = null,
  igSanity = false,
  grannum = false,
): string {
  const gemelar = f.numero_fetos >= 2;
  const titulo = gemelar
    ? "ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR"
    : "ULTRASSONOGRAFIA OBSTÉTRICA";

  // IG determinística (Domingos). Lead leva a corionicidade no gemelar.
  const corionLead = f.corionicidade ? `${f.corionicidade} ` : "";
  const leadAncora = gemelar
    ? `Gestação gemelar ${corionLead}em torno de `
    : "Gestação em torno de ";
  const ig = igResultFor(f, igCorrection, leadAncora, igSanity);

  const achados: string[] = [];
  const impressao: string[] = [];

  if (gemelar) {
    const qtdLabel =
      f.numero_fetos === 2
        ? "Dois fetos"
        : f.numero_fetos === 3
          ? "Três fetos"
          : `${f.numero_fetos} fetos`;
    const descricoes = f.fetos.map((ft, i) => {
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      const pos = ft.posicao_relativa
        ? `feto ${ft.posicao_relativa} (feto ${rot})`
        : `feto ${rot}`;
      const apresFmt = apresentacaoFmt(ft.apresentacao);
      const apres = apresFmt ? `, em apresentação ${apresFmt}` : "";
      const dorso = ft.dorso ? `, com dorso ${ft.dorso}` : "";
      return `${pos}${apres}${dorso}`;
    });
    achados.push(`${qtdLabel}: ${descricoes.join("; ")}.`);
    for (let i = 0; i < f.fetos.length; i++) {
      const ft = f.fetos[i];
      if (!ft) continue;
      const rot = ft.rotulo ?? String.fromCharCode(65 + i);
      achados.push(`\nFeto ${rot}:`);
      achados.push(
        `Batimentos cardíacos fetais (BCF): ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm.`,
      );
      if (f.gestacao_inicial) {
        achados.push(`Comprimento crânio-nádegas (CCN): ${mm1(ft.ccn_mm)} mm.`);
      } else {
        achados.push(...biometriaLinhasObj(ft));
      }
      achados.push(pesoLinhaObj(ft));
    }
    const pond = calcPonderal(f.fetos);
    if (pond.pesoMedio !== null) {
      achados.push(
        `\nPeso fetal médio: ${g0(pond.pesoMedio)} g. Divergência ponderal: ${g0(pond.divergenciaG)} g (${ptBr1(pond.divergenciaPct ?? 0)}%).`,
      );
    }
    const plc = placentaFraseObj(f);
    if (plc) achados.push(plc);
    const liq = liquido(f);
    achados.push(liq.corpo);

    impressao.push(...ig.conclusaoObjetivo);
    impressao.push(liq.conclusao);
    if (pond.divergenciaG !== null) {
      const significativa = (pond.divergenciaPct ?? 0) >= 20;
      impressao.push(
        significativa
          ? `Divergência ponderal significativa entre os fetos (${ptBr1(pond.divergenciaPct ?? 0)}%).`
          : "Fetos com pesos concordantes, sem divergência ponderal significativa.",
      );
    }
  } else {
    const ft = f.fetos[0] ?? EMPTY_FETO;
    if (f.gestacao_inicial) {
      // Saco gestacional obrigatório no inicial (P1) — DSM determinístico.
      achados.push(
        `Saco gestacional de forma normal, diâmetro médio (DSM): ${mm1(calcDsm(f))} mm.`,
      );
      const apres = apresentacaoFmt(ft.apresentacao) ?? "transversa";
      let fetoFrase = `${ehEmbriao(f) ? "Embrião" : "Feto"} único, em situação ${apres}`;
      if (ft.dorso) fetoFrase += `, com dorso ${ft.dorso}`;
      achados.push(`${fetoFrase}.`);
      achados.push(
        `Batimentos cardíacos fetais (BCF): ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm.`,
      );
      achados.push(`Comprimento crânio-nádegas (CCN): ${mm1(ft.ccn_mm)} mm.`);
      achados.push("Vesícula vitelina de forma e dimensões normais.");
      const liq = liquido(f);
      achados.push(liq.corpo);
      achados.push("Ovários de aspecto normal.");

      impressao.push(...ig.conclusaoObjetivo);
    } else {
      const apres = apresentacaoFmt(ft.apresentacao) ?? "cefálica";
      let fetoFrase = `Feto único, em apresentação ${apres}`;
      if (ft.dorso) fetoFrase += `, com dorso ${ft.dorso}`;
      achados.push(`${fetoFrase}.`);
      achados.push(
        `Batimentos cardíacos fetais (BCF): ${ft.bcf_bpm !== null ? ptBr(ft.bcf_bpm) : "____"} bpm. Movimentos fetais ativos.`,
      );
      achados.push("\nBiometria fetal:");
      achados.push(...biometriaLinhasObj(ft));
      achados.push(pesoLinhaObj(ft));
      const plc = placentaFraseObj(f, grannum);
      if (plc) achados.push(plc);
      const liq = liquido(f);
      achados.push(liq.corpo);

      impressao.push(...ig.conclusaoObjetivo);
      impressao.push(liq.conclusao);
    }
  }

  // Golf ball (flag): linha nos achados + item na impressão (recomendação eco fetal).
  if (golfBall) applyGolfBall(achados, impressao, golfBall);

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push(`\n${f.achados_adicionais.trim()}`);
  }

  // Camada flexível (flag): observações livres de corpo (após dedup) nos achados,
  // e itens livres (após dedup) ao fim da impressão.
  if (flexivel) {
    achados.push(...filterFreeBodyItems(f.observacoes_corpo_livres));
    impressao.push(...filterFreeConclusionItems(f.itens_conclusao_livres));
  }

  const dumLinha = f.dum ? `\nDUM: ${f.dum}.` : "";
  const igProse = ig.fraseReferencia ? `\n${ig.fraseReferencia}` : "";

  const impressaoTxt =
    impressao.length === 1
      ? impressao[0] ?? ""
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  const corpo = [
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
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}
