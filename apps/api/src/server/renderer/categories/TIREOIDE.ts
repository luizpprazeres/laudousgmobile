import { z } from "zod";

/**
 * DET-5 — Renderer de TIREOIDE (render PROGRAMÁTICO, sem template_body).
 *
 * O LLM extrai dados tipados (incl. ENUMS por eixo do nódulo); o código:
 *  - CALCULA a NOTA FINAL Domingos somando os pontos de cada eixo;
 *  - deriva o TI-RADS (categoria), as características e a conduta da NOTA;
 *  - monta o laudo por construção (estrutura/cabeçalhos/numeração garantidos);
 *  - soma o volume total (VT).
 * Override: nota/TI-RADS ditados pelo médico VENCEM o cálculo (reproduz verbatim).
 *
 * Fonte clínica: docs/det-5-tireoide-domingos.md (tabela Domingos + mapeamentos),
 * revisões do Luiz (2026-06-13) e contrato `prompts/contracts/TIREOIDE.ts`.
 * Regras: "istmo" sem acento; corpo usa "imagem" (nunca "nódulo"); Chammas
 * NUNCA escrito (só pontua); linfonodos normais só no corpo; rodapé fixo.
 */

// ---------------------------------------------------------------------------
// Tabela Domingos — pontos por eixo (docs/det-5-tireoide-domingos.md §1)
// ---------------------------------------------------------------------------

// txt = feminino (concorda com "imagem", estilo Clássico);
// txtM = masculino (concorda com "Nódulo"/"Cisto", estilo Objetivo).
const ECOGENICIDADE = {
  anecoica_homogenea: { pts: 0, txt: "anecoica homogênea", txtM: "anecoico homogêneo" },
  anecoica_finos_ecos: { pts: 0, txt: "anecoica com finos ecos", txtM: "anecoico com finos ecos" },
  anecoica_septos: { pts: 1, txt: "anecoica com septos", txtM: "anecoico com septos" },
  anecoica_componentes_solidos: { pts: 1, txt: "anecoica com componentes sólidos", txtM: "anecoico com componentes sólidos" },
  hipoecoica: { pts: 3, txt: "hipoecoica", txtM: "hipoecoico" },
  isoecoica: { pts: 2, txt: "isoecoica", txtM: "isoecoico" },
  hiperecoica: { pts: 1, txt: "hiperecoica", txtM: "hiperecoico" },
  solida_areas_anecoicas: { pts: 1, txt: "sólida com áreas anecoicas", txtM: "sólido com áreas anecoicas" },
  solida_calcificacao_parede: { pts: 0, txt: "sólida com calcificação parietal (casca de ovo)", txtM: "sólido com calcificação parietal (casca de ovo)" },
} as const;
type EcoKey = keyof typeof ECOGENICIDADE;

const MARGEM = {
  regular: { pts: 0, txt: "com margem regular" },
  irregular: { pts: 1, txt: "com margem irregular" },
  espiculada: { pts: 2, txt: "com margem espiculada" },
} as const;
type MargemKey = keyof typeof MARGEM;

const HALO = {
  fino_regular: { pts: 0, txt: "com halo fino e regular" },
  espesso_irregular: { pts: 2, txt: "com halo espesso e irregular" },
  sem_halo: { pts: 1, txt: "sem halo" },
} as const;
type HaloKey = keyof typeof HALO;

const FORMA = {
  mais_alta_que_larga: { pts: 3, txt: "mais alta do que larga", txtM: "mais alto do que largo" },
  mais_larga_que_alta: { pts: 0, txt: "mais larga do que alta", txtM: "mais largo do que alto" },
} as const;
type FormaKey = keyof typeof FORMA;

const CALCIFICACOES = {
  sem: { pts: 0, txt: "sem calcificações" },
  casca_ovo: { pts: 0, txt: "com calcificação em casca de ovo" },
  grosseiras: { pts: 1, txt: "com calcificações grosseiras com sombra acústica" },
  micro: { pts: 3, txt: "com microcalcificações" },
} as const;
type CalcKey = keyof typeof CALCIFICACOES;

// Vascularização (Chammas) — SÓ pontua; nunca escrita no laudo.
const VASCULARIZACAO = {
  sem: 0,
  periferica: 1,
  periferica_maior_central: 2,
  central_maior_periferica: 3,
  exclusiva_central: 4,
} as const;
type VascKey = keyof typeof VASCULARIZACAO;

const ecoKeys = Object.keys(ECOGENICIDADE) as EcoKey[];
const margemKeys = Object.keys(MARGEM) as MargemKey[];
const haloKeys = Object.keys(HALO) as HaloKey[];
const formaKeys = Object.keys(FORMA) as FormaKey[];
const calcKeys = Object.keys(CALCIFICACOES) as CalcKey[];
const vascKeys = Object.keys(VASCULARIZACAO) as VascKey[];

const ACR_COMPOSICAO = ["cistico", "espongiforme", "misto", "solido"] as const;
const ACR_ECOGENICIDADE = ["anecoico", "hiper_ou_isoecoico", "hipoecoico", "muito_hipoecoico"] as const;
const ACR_FORMA = ["mais_larga_que_alta", "mais_alta_que_larga"] as const;
const ACR_MARGEM = ["lisa", "mal_definida", "lobulada_ou_irregular", "extensao_extratireoidiana"] as const;
const ACR_FOCOS = ["nenhum_ou_cauda_cometa", "macrocalcificacoes", "calcificacoes_perifericas", "focos_puntiformes"] as const;

const AcrTiradsSchema = z.object({
  composicao: z.enum(ACR_COMPOSICAO).nullable(),
  ecogenicidade: z.enum(ACR_ECOGENICIDADE).nullable(),
  forma: z.enum(ACR_FORMA).nullable(),
  margem: z.enum(ACR_MARGEM).nullable(),
  focos_ecogenicos: z.array(z.enum(ACR_FOCOS)),
});

// ---------------------------------------------------------------------------
// Schema de achados
// ---------------------------------------------------------------------------

const NoduloSchema = z.object({
  // Eixos do escore Domingos (enums fechados) — alguns também viram texto no corpo.
  ecogenicidade: z.enum(ecoKeys as [EcoKey, ...EcoKey[]]).nullable(),
  margem: z.enum(margemKeys as [MargemKey, ...MargemKey[]]).nullable(),
  halo: z.enum(haloKeys as [HaloKey, ...HaloKey[]]).nullable(),
  forma: z.enum(formaKeys as [FormaKey, ...FormaKey[]]).nullable(),
  calcificacoes: z.enum(calcKeys as [CalcKey, ...CalcKey[]]).nullable(),
  vascularizacao: z.enum(vascKeys as [VascKey, ...VascKey[]]).nullable(), // Chammas: só pontua
  medidas_cm: z.array(z.number()).nullable(), // [c1,c2,c3] do achado
  diametro_transverso_cm: z.number().nullable(), // só se o médico nomear; senão max(medidas)
  localizacao: z.string().nullable(), // "no terço médio"...
  descricao_raw: z.string().nullable(), // verbatim do médico (auditoria)
  nota_domingos_ditada: z.string().nullable(), // override verbatim — vence o cálculo
  ti_rads_ditado: z.string().nullable(), // override verbatim — vence o cálculo
  /** ACR oficial: independente dos seis eixos da Nota de Domingos. */
  acr_tirads: AcrTiradsSchema.nullable().optional(),
});

const LoboSchema = z.object({
  medidas_cm: z.array(z.number()).nullable(),
  volume_ml: z.number().nullable(),
  ecotextura_alterada: z.string().nullable(), // alteração DIFUSA verbatim (tireoidite/Graves)
  nodulos: z.array(NoduloSchema),
});

/**
 * Os tipos de tireoidite que o médico pode NOMEAR.
 *
 * Pedido do Luiz em 21/08. Note que isto é FEATURE, não correção: nos 251
 * laudos reais dele não há uma única menção a etiologia — ele escreve "Sinais
 * ecográficos de tireoidopatia" e para por aí. O campo existe porque ele quer
 * poder nomear quando tiver convicção, não porque o corpus peça.
 *
 * Nulo é o caso normal e continua sendo: alteração difusa sem tipo declarado
 * conclui a frase genérica dele.
 */
const TIREOIDITE_TIPOS = ["hashimoto", "linfocitica", "granulomatosa", "riedel"] as const;
export type TireoiditeTipo = (typeof TIREOIDITE_TIPOS)[number];

export const TireoideFindingsSchema = z.object({
  com_doppler: z.boolean(),
  /**
   * O tipo NOMEADO, quando o médico o disser. Nunca inferido dos achados: a
   * distinção entre as tireoidites depende de clínica e evolução, não de
   * ecotextura. Ver `TIREOIDITE_CONCLUSAO`.
   */
  tireoidite_tipo: z.enum(TIREOIDITE_TIPOS).nullable(),
  volume_glandular: z.enum(["normal", "aumentado", "reduzido"]).nullable(),
  lobo_direito: LoboSchema,
  lobo_esquerdo: LoboSchema,
  istmo: LoboSchema,
  pico_arteria_direita: z.enum(["inferior", "superior"]).nullable(), // default inferior
  pico_sistolico_direito_cms: z.number().nullable(),
  pico_arteria_esquerda: z.enum(["inferior", "superior"]).nullable(),
  pico_sistolico_esquerdo_cms: z.number().nullable(),
  linfonodos_descritos: z.boolean(),
  linfonodos_alterados: z.boolean(),
  linfonodos_descricao: z.string().nullable(),
  achados_adicionais: z.string().nullable(),
});

export type TireoideFindings = z.infer<typeof TireoideFindingsSchema>;
export type TireoideNodulo = z.infer<typeof NoduloSchema>;
export type TireoideLobo = z.infer<typeof LoboSchema>;

/** Preferências do renderer (toggles). Default: Domingos visível, conduta oculta. */
export type TireoidePreferences = {
  show_domingos_score: boolean;
  show_conduct_recommendation: boolean;
};
export const TIREOIDE_DEFAULT_PREFERENCES: TireoidePreferences = {
  show_domingos_score: true,
  show_conduct_recommendation: false,
};

// JSON Schema strict para OpenAI (todos required, nullable via union).
const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const numArr = { type: ["array", "null"], items: { type: "number" } } as const;
const enumNull = (vals: readonly string[]) =>
  ({ type: ["string", "null"], enum: [...vals, null] }) as const;

const NODULO_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "ecogenicidade",
    "margem",
    "halo",
    "forma",
    "calcificacoes",
    "vascularizacao",
    "medidas_cm",
    "diametro_transverso_cm",
    "localizacao",
    "descricao_raw",
    "nota_domingos_ditada",
    "ti_rads_ditado",
    "acr_tirads",
  ],
  properties: {
    ecogenicidade: enumNull(ecoKeys),
    margem: enumNull(margemKeys),
    halo: enumNull(haloKeys),
    forma: enumNull(formaKeys),
    calcificacoes: enumNull(calcKeys),
    vascularizacao: enumNull(vascKeys),
    medidas_cm: numArr,
    diametro_transverso_cm: num,
    localizacao: str,
    descricao_raw: str,
    nota_domingos_ditada: str,
    ti_rads_ditado: str,
    acr_tirads: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["composicao", "ecogenicidade", "forma", "margem", "focos_ecogenicos"],
      properties: {
        composicao: enumNull(ACR_COMPOSICAO),
        ecogenicidade: enumNull(ACR_ECOGENICIDADE),
        forma: enumNull(ACR_FORMA),
        margem: enumNull(ACR_MARGEM),
        focos_ecogenicos: { type: "array", items: { type: "string", enum: [...ACR_FOCOS] } },
      },
    },
  },
} as const;

const LOBO_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["medidas_cm", "volume_ml", "ecotextura_alterada", "nodulos"],
  properties: {
    medidas_cm: numArr,
    volume_ml: num,
    ecotextura_alterada: str,
    nodulos: { type: "array", items: NODULO_JSON },
  },
} as const;

export const TIREOIDE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "com_doppler",
    "volume_glandular",
    "lobo_direito",
    "lobo_esquerdo",
    "istmo",
    "pico_arteria_direita",
    "pico_sistolico_direito_cms",
    "pico_arteria_esquerda",
    "pico_sistolico_esquerdo_cms",
    "linfonodos_descritos",
    "linfonodos_alterados",
    "linfonodos_descricao",
    "achados_adicionais",
    "tireoidite_tipo",
  ],
  properties: {
    com_doppler: { type: "boolean" },
    tireoidite_tipo: enumNull(["hashimoto", "linfocitica", "granulomatosa", "riedel"]),
    volume_glandular: enumNull(["normal", "aumentado", "reduzido"]),
    lobo_direito: LOBO_JSON,
    lobo_esquerdo: LOBO_JSON,
    istmo: LOBO_JSON,
    pico_arteria_direita: enumNull(["inferior", "superior"]),
    pico_sistolico_direito_cms: num,
    pico_arteria_esquerda: enumNull(["inferior", "superior"]),
    pico_sistolico_esquerdo_cms: num,
    linfonodos_descritos: { type: "boolean" },
    linfonodos_alterados: { type: "boolean" },
    linfonodos_descricao: str,
    achados_adicionais: str,
  },
} as const;

export const TIREOIDE_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DA TIREOIDE.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada. Sua função
é CLASSIFICAR cada característica de cada imagem nodular nos enums do escore
Domingos — quem calcula a nota e escreve o laudo é o código.

REGRAS:
1. com_doppler: true SOMENTE com avaliação Doppler ativa / pico sistólico / fluxo
   ao Doppler nas artérias tireoidianas. Negações SEMPRE vencem ("sem Doppler",
   "Doppler não realizado", "sem avaliação Doppler hoje") MESMO que apareça a
   palavra "vascularização".
2. volume_glandular: "aumentado" se bócio/glândula aumentada/volume aumentado;
   "reduzido" se atrófica/reduzida; senão null (= normal). NUNCA classifique pelas
   medidas.
3. Cada estrutura (lobo_direito, lobo_esquerdo, istmo):
   - medidas_cm: as 3 medidas do lobo/istmo em cm; null se não ditas.
   - volume_ml: volume do lobo/istmo em ml quando ditado; senão null. NUNCA calcule.
   - tireoidite_tipo: SÓ quando o médico NOMEAR a tireoidite. Mapeie:
     "Hashimoto" / "crônica autoimune" / "autoimune" -> "hashimoto";
     "linfocítica" -> "linfocitica";
     "granulomatosa" / "De Quervain" / "subaguda" -> "granulomatosa";
     "Riedel" / "fibrosante" -> "riedel".
     NUNCA infira o tipo a partir da ecotextura, do volume ou do Doppler — a
     distinção depende de clínica e evolução, que não estão no ditado. Se ele
     descrever o padrão sem nomear a doença, deixe null: o código escreve
     "Sinais ecográficos de tireoidopatia", que é a redação da casa.
   - ecotextura_alterada: SÓ se a ecotextura for DIFUSAMENTE alterada (tireoidite/
     Graves) — cláusula verbatim do médico ("de ecotextura difusamente
     heterogênea..."); null se normal. NÃO use para nódulos.
   - nodulos: lista de imagens nodulares; [] se a estrutura é normal.
4. Para cada imagem nodular, CLASSIFIQUE nos enums (escolha o mais próximo do
   descrito; null quando o médico não disser o eixo):
   - ecogenicidade: anecoica_homogenea | anecoica_finos_ecos | anecoica_septos |
     anecoica_componentes_solidos | hipoecoica | isoecoica | hiperecoica |
     solida_areas_anecoicas | solida_calcificacao_parede.
   - margem: regular | irregular | espiculada. ("contornos" = margem.)
   - halo: fino_regular | espesso_irregular | sem_halo (só imagem sólida).
   - forma: mais_alta_que_larga | mais_larga_que_alta.
   - calcificacoes: sem | casca_ovo | grosseiras (grosseiras com sombra) |
     micro (microcalcificações).
   - vascularizacao (padrão de Chammas, usado SÓ para pontuar): sem | periferica |
     periferica_maior_central | central_maior_periferica | exclusiva_central.
     "periférica maior que a central" → periferica_maior_central. Se o médico só
     citar "Chammas II/III...", traduza para o enum correspondente.
   - medidas_cm: as 3 medidas do achado em cm; null se não ditas.
   - diametro_transverso_cm: SÓ quando o médico nomear o diâmetro transverso;
     senão null (o código usa a maior das medidas).
   - localizacao: "no terço médio/superior/inferior"...
   - descricao_raw: a descrição verbatim do médico para esta imagem (auditoria).
   - nota_domingos_ditada / ti_rads_ditado: SOMENTE se o médico DITAR a nota e/ou
     o TI-RADS prontos (reproduzir); senão null (o código calcula).
   - acr_tirads: classifique separadamente pelos cinco grupos oficiais do ACR:
     composicao = cistico | espongiforme | misto | solido;
     ecogenicidade = anecoico | hiper_ou_isoecoico | hipoecoico | muito_hipoecoico;
     forma = mais_larga_que_alta | mais_alta_que_larga;
     margem = lisa | mal_definida | lobulada_ou_irregular | extensao_extratireoidiana;
     focos_ecogenicos pode conter mais de um entre macrocalcificacoes,
     calcificacoes_perifericas e focos_puntiformes. Use
     nenhum_ou_cauda_cometa somente quando nenhum dos outros estiver presente.
     Deixe o grupo como null se a descrição não permitir classificá-lo. NUNCA
     converta a Nota de Domingos em ACR TI-RADS.
5. picos sistólicos (só Doppler): pico_sistolico_direito_cms /
   pico_sistolico_esquerdo_cms em cm/s; pico_arteria_direita/esquerda = "inferior"
   ou "superior" conforme ditado (default inferior se não especificado).
6. linfonodos_descritos: true se houver descrição de linfonodos cervicais.
   linfonodos_alterados: true se suspeitos/anormais. linfonodos_descricao: texto
   do médico quando alterados; null quando normais ou não descritos.
7. achados_adicionais: SOMENTE alterações reais fora do padrão; null se não houver.`;

// ---------------------------------------------------------------------------
// Cálculo determinístico (Domingos → TI-RADS → características → conduta)
// ---------------------------------------------------------------------------

function ptBr(n: number): string {
  return String(n).replace(".", ",");
}

function medidasFmt(arr: number[] | null): string {
  if (!arr || arr.length === 0) return "____ x ____ x ____ cm";
  const vals = [0, 1, 2].map((i) =>
    Number.isFinite(arr[i]) ? ptBr(arr[i] as number) : "____",
  );
  return `${vals.join(" x ")} cm`;
}

function volFmt(v: number | null): string {
  return v === null ? "____" : ptBr(v);
}

// Versões com 1 casa decimal SEMPRE (P3) — usadas só no estilo OBJETIVO.
function ptBr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
function medidasFmt1(arr: number[] | null): string {
  if (!arr || arr.length === 0) return "____ x ____ x ____ cm";
  const vals = [0, 1, 2].map((i) =>
    Number.isFinite(arr[i]) ? ptBr1(arr[i] as number) : "____",
  );
  return `${vals.join(" x ")} cm`;
}
function volFmt1(v: number | null): string {
  return v === null ? "____" : ptBr1(v);
}

/** Pontos da dimensão pelo diâmetro transverso (maior medida como fallback). */
function dimensaoPts(nod: TireoideNodulo): number {
  const transv =
    nod.diametro_transverso_cm ??
    (nod.medidas_cm && nod.medidas_cm.length > 0
      ? Math.max(...nod.medidas_cm.filter((n) => Number.isFinite(n)))
      : null);
  if (transv === null || !Number.isFinite(transv)) return 0; // sem medida → não soma
  if (transv < 1.0) return 0;
  if (transv < 3.0) return 1;
  return 2;
}

/**
 * NOTA FINAL Domingos = soma dos eixos. Eixo não classificado → 0 (default
 * benigno, "omitido → normalidade"). Ancorada na ecogenicidade: sem ela o nódulo
 * não é pontuável (retorna null → renderer não inventa nota).
 */
function calcNotaDomingos(nod: TireoideNodulo): number | null {
  if (!nod.ecogenicidade) return null;
  let pts = ECOGENICIDADE[nod.ecogenicidade].pts;
  if (nod.margem) pts += MARGEM[nod.margem].pts;
  // Halo só pontua em imagem SÓLIDA (regra da tabela) — protege contra extração
  // que preencha halo numa imagem anecoica (cisto), evitando superpontuar.
  if (nod.halo && isSolida(nod.ecogenicidade)) pts += HALO[nod.halo].pts;
  if (nod.forma) pts += FORMA[nod.forma].pts;
  if (nod.calcificacoes) pts += CALCIFICACOES[nod.calcificacoes].pts;
  if (nod.vascularizacao) pts += VASCULARIZACAO[nod.vascularizacao];
  pts += dimensaoPts(nod);
  return pts;
}

/** NOTA → TI-RADS (categoria Domingos 1-4). */
function tiradsDaNota(nota: number): number {
  if (nota <= 3) return 1;
  if (nota <= 5) return 2;
  if (nota <= 9) return 3;
  return 4;
}

/**
 * TI-RADS → características (plural). Aceita ACR 5 (quando o médico dita a escala
 * ACR 1-5); fora de 1-5 → null (omite o parêntese, NUNCA "indeterminadas").
 */
function caracteristicasDoTirads(tirads: number): string | null {
  return (
    {
      1: "benignas",
      2: "provavelmente benignas",
      3: "intermediárias",
      4: "suspeitas",
      5: "altamente suspeitas",
    }[tirads] ?? null
  );
}

/** Imagem sólida (≠ anecoica)? Define se o halo conta/é descrito. */
function isSolida(eco: EcoKey | null): boolean {
  return eco !== null && !eco.startsWith("anecoica");
}

/** Resolve nota e TI-RADS do nódulo: ditados vencem o cálculo. */
function classificarNodulo(nod: TireoideNodulo): {
  nota: number | null;
  notaTxt: string | null; // exibida (ditada verbatim ou calculada)
  tirads: number | null;
  tiradsTxt: string | null;
} {
  const notaCalc = calcNotaDomingos(nod);
  const notaDitada = nod.nota_domingos_ditada?.trim() || null;
  // Nota exibida: a ditada (verbatim) tem prioridade; senão a calculada.
  const notaTxt = notaDitada ?? (notaCalc !== null ? String(notaCalc) : null);
  // Valor numérico p/ derivar TI-RADS: MESMA precedência da exibida (a ditada
  // vence) — senão "NOTA FINAL 10" poderia sair com TI-RADS da nota calculada
  // (review dex1). ti_rads_ditado ainda vence tudo abaixo.
  const notaNum =
    notaDitada && /^\d+$/.test(notaDitada) ? Number(notaDitada) : notaCalc;
  const tiradsDitado = nod.ti_rads_ditado?.trim() || null;
  const tirads =
    tiradsDitado && /^\d+$/.test(tiradsDitado)
      ? Number(tiradsDitado)
      : notaNum !== null
        ? tiradsDaNota(notaNum)
        : null;
  const tiradsTxt = tiradsDitado ?? (tirads !== null ? String(tirads) : null);
  return { nota: notaNum, notaTxt, tirads, tiradsTxt };
}

// ---------------------------------------------------------------------------
// Frases fixas
// ---------------------------------------------------------------------------

/**
 * A técnica do estilo clássico.
 *
 * Ela é CONDICIONAL à avaliação linfonodal, e isso não é detalhe de redação: o
 * texto afirma que o exame abrangeu "a cadeia ganglionar cervical de I a V".
 * Quando o médico não avaliou as cadeias, essa frase afirma um exame que não
 * houve — e um laudo que declara ter examinado o que não examinou é pior que um
 * laudo omisso, porque o leitor confia nele.
 */
function comentarios(linfonodosAvaliados: boolean): string {
  const alcance = linfonodosAvaliados
    ? "abrangendo todos os segmentos da glândula tireoide, como também a cadeia ganglionar cervical de I a V"
    : "abrangendo todos os segmentos da glândula tireoide";
  return `COMENTÁRIOS:\nExame realizado com transdutor de 12 MHz, ${alcance}. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.`;
}

const RODAPE =
  "*ESCORE DE NÓDULO TIREOIDEANO - Domingos Correia da Rocha - Material baseado em 2588 nódulos puncionados - 2003 | Atualizada em 2013 - Total de 5134 nódulos puncionados\nACR - American College of Radiology*";

/**
 * A conclusão de ALTERAÇÃO DIFUSA — e ela é do médico, não nossa.
 *
 * Em 30 dias de laudos reais dele (`_extraction/.../tireoide_30d.md`, 251
 * laudos) esta é a frase, 48 vezes de 62. As outras 14 são pontuação e
 * variantes dela. **Zero** mencionam Hashimoto, De Quervain, Riedel,
 * "linfocítica", "autoimune" ou anti-TPO: ele descreve o padrão e nomeia
 * "tireoidopatia", sem cravar etiologia nem prescrever exame.
 *
 * Isso importa porque a alternativa considerada era escrever quatro conclusões
 * etiológicas — as que existem hoje no compositor da web e que o próprio
 * arquivo de lá chama de "ponto de partida p/ curadoria". Elas foram
 * inventadas. Trocar a omissão por uma frase que ele nunca escreveu seria
 * substituir um defeito por outro.
 *
 * O que NÃO se infere daqui, porque o corpus não autoriza:
 *
 * - **"crônica"** aparece 4×, e nenhum achado estruturado a prediz: dois casos
 *   "crônicos" não têm esboços, um caso com esboços não recebe o rótulo. Deve
 *   depender de história ou evolução, que não estão nos achados.
 * - **"com esboços nodulares"** NÃO quer dizer que há nódulo. Nesses laudos o
 *   corpo diz justamente que não se delimitam lesões focais; quando há nódulo
 *   de verdade, ele ganha item próprio depois. Ler `nodulos.length > 0` para
 *   escrever "esboços" inverteria o significado.
 *
 * (Adjudicação Codex + Claude, 20/08, contra o corpus.)
 */
const TIREOIDOPATIA = "Sinais ecográficos de tireoidopatia.";

/**
 * A variante com bócio, composta — não escrita à parte.
 *
 * Aparece 2× no corpus, e nas duas a glândula está aumentada. É a única
 * variante que o dado estruturado prediz com segurança, e só quando
 * `volume_glandular` vem explicitamente "aumentado" — nunca inferida das
 * medidas, como o próprio prompt de extração já determina.
 */
const TIREOIDOPATIA_BOCIO = "Sinais ecográficos de tireoidopatia (bócio tireoideano).";

/**
 * ⚠️ REDAÇÃO PROPOSTA — AGUARDANDO APROVAÇÃO DO LUIZ (pedido dele, 21/08).
 *
 * Diferente de tudo o mais neste arquivo, estas quatro frases **não têm âncora
 * no corpus**: em 251 laudos reais ele nunca nomeia etiologia de tireoidite.
 * Elas existem porque ele pediu o recurso, e foram escritas na VOZ dele —
 * abrindo com "Sinais ecográficos de", que é o padrão das 62 conclusões de
 * alteração difusa — em vez de copiadas do compositor da web, que o próprio
 * arquivo de lá chama de "ponto de partida p/ curadoria".
 *
 * Enquanto não houver o aval, o comportamento default não muda: `tireoidite_tipo`
 * nulo — que é o caso de 100% dos laudos até hoje — continua concluindo
 * `TIREOIDOPATIA`.
 */
/**
 * ⚠️ REDAÇÃO PROPOSTA — AGUARDANDO APROVAÇÃO DO LUIZ (especificada por ele, 21/08).
 *
 * As quatro tireoidites nomeadas. Diferente de tudo o mais neste arquivo, o
 * DIAGNÓSTICO não tem âncora no corpus: em 251 laudos reais ele nunca nomeia
 * etiologia. O que TEM âncora é a forma de dizê-lo, e ela veio dos laudos dele:
 *
 *  - "O diagnóstico mais provável é X."  → 27 ocorrências nos corpora
 *  - "a critério clínico"                → 105 ocorrências
 *  - "hipoecoicas", "hiperecoicas", "traves" → o vocabulário dele
 *    (hipoeco* 134× na tireoide; hiperecoico 8× contra hiperecogênico 1×)
 *
 * A unidade fica em **ml**: o corpus do laudousg.com escrevia "cm³" (855× contra
 * 2×), mas o Luiz confirmou em 21/08 que "cm³" foi equívoco dele e que ml é o
 * correto. Corpus antigo não vence médico presente.
 *
 * A estrutura foi ditada por ele: a alteração difusa deixa de ser um item
 * separado da conclusão e passa a completar a PRIMEIRA frase, a que já fala de
 * volume. No corpo, entra depois de "apresentando".
 */
type FraseTireoidite = {
  /** No CORPO, depois de "apresentando". Só quando ele não descreveu o parênquima. */
  corpo: string;
  /** Na CONCLUSÃO, completando a frase do volume: "…, apresentando <isto>." */
  ecotextura: string;
  /** O nome da doença, como ele o escreveu. */
  diagnostico: string;
  /**
   * A recomendação laboratorial, último item da conclusão.
   *
   * A de Quervain é VERBATIM dele. As outras três eu propus, no mesmo molde e
   * com os exames que a hipótese pede — ele autorizou expressamente ("se quiser
   * sugerir anti-TPO ou outros exames de forma específica fique à vontade").
   */
  recomendacao: string;
};

const TIREOIDITE: Record<TireoiditeTipo, FraseTireoidite> = {
  hashimoto: {
    // Verbatim do Luiz, 21/08.
    corpo: "modificação difusa do padrão ecotextural, notadamente por áreas hipoecoicas e traves hiperecoicas",
    ecotextura: "ecotextura heterogênea",
    diagnostico: "Tireoidite de Hashimoto",
    recomendacao:
      "Convém, a critério clínico, correlacionar com as dosagens laboratoriais de TSH, T4 livre e dos anticorpos antitireoperoxidase (anti-TPO) e antitireoglobulina.",
  },
  linfocitica: {
    corpo: "modificação difusa do padrão ecotextural, de grau leve a moderado",
    ecotextura: "ecotextura heterogênea",
    diagnostico: "Tireoidite linfocítica",
    recomendacao:
      "Convém, a critério clínico, correlacionar com as dosagens laboratoriais de TSH, T4 livre e do anticorpo antitireoperoxidase (anti-TPO).",
  },
  granulomatosa: {
    corpo:
      "modificação difusa do padrão ecotextural, notadamente por áreas hipoecoicas mal definidas e confluentes",
    ecotextura: "ecotextura heterogênea",
    diagnostico: "Tireoidite subaguda granulomatosa (de Quervain)",
    // Verbatim do Luiz, 21/08.
    recomendacao:
      "Convém, a critério clínico, correlacionar com as dosagens laboratoriais de TSH, T4L, hemograma e PCR, com objetivo de acompanhar a evolução.",
  },
  riedel: {
    corpo:
      "modificação difusa do padrão ecotextural, notadamente por acentuada hipoecogenicidade e limites mal definidos com os planos adjacentes",
    // "heterogênea" descreveria mal: aqui o padrão é hipoecoico difuso, não misto.
    ecotextura: "ecotextura difusamente hipoecoica",
    diagnostico: "Tireoidite de Riedel",
    recomendacao:
      "Convém, a critério clínico, correlacionar com as dosagens laboratoriais de TSH e T4 livre.",
  },
};

/**
 * O FIM da primeira frase da conclusão — a que fala do volume.
 *
 * Estrutura ditada pelo Luiz: em vez de um item separado "Sinais ecográficos
 * de…", a alteração difusa completa a frase do volume e o diagnóstico vem em
 * seguida. Sem tipo nomeado, nada disto acontece: continua valendo a frase dele,
 * ancorada em 62 conclusões reais.
 */
function fecharFraseDoVolume(tipo: TireoiditeTipo | null): string {
  if (!tipo) return ".";
  const f = TIREOIDITE[tipo];
  return `, apresentando ${f.ecotextura}. O diagnóstico mais provável é ${f.diagnostico}.`;
}


const LINFONODOS_NORMAIS =
  "Adicionalmente, evidenciam-se imagens ovais com a periferia hipoecoica e o centro hiperecoico, de margens regulares, situadas em região cervical, compatíveis com linfonodos de morfologia preservada.";

/**
 * O que se escreve quando o médico diz que os linfonodos estão alterados e não
 * descreve como.
 *
 * Antes não havia esta frase, e a ausência produzia um laudo que se contradiz:
 * `linfonodos_alterados = true` com descrição vazia caía na frase NORMAL no
 * corpo — "morfologia preservada" — enquanto a conclusão dizia "alterado".
 * Duas afirmações opostas sobre o mesmo achado, no mesmo documento.
 *
 * A palavra é **ATÍPICO**, e ela é do médico, não nossa. Nos corpora reais —
 * 266 laudos de mama e 251 de tireoide — é assim que ele nomeia o linfonodo que
 * saiu do padrão: *"Linfonodo axilar atípico à esquerda."* Nenhuma ocorrência de
 * "de aspecto alterado". A primeira versão desta constante dizia "alterado, sem
 * caracterização detalhada ao método" — redação minha, sem âncora, aprovada pelo
 * Luiz para troca em 21/08.
 *
 * O que continua valendo do raciocínio original: não se inventa característica
 * (arredondado, perda do hilo). O médico não as informou, e o catálogo chegou a
 * cravá-las no cenário justamente para contornar este defeito.
 *
 * ⚠️ Nos dois corpora ele **nunca** publica linfonodo alterado sem descrever —
 * quando descreve, vem lado, achado e medida. Esta frase é a rede de segurança
 * do ditado, não o caminho normal: a tela deve pedir a descrição.
 */
const LINFONODOS_ATIPICOS_SEM_DESCRICAO =
  "Adicionalmente, evidenciam-se linfonodos cervicais de aspecto atípico.";

const ACR_COMPOSICAO_TEXTO: Record<(typeof ACR_COMPOSICAO)[number], string> = {
  cistico: "cística ou quase totalmente cística",
  espongiforme: "espongiforme",
  misto: "mista, com componentes sólido e cístico",
  solido: "sólida ou quase totalmente sólida",
};
const ACR_ECO_TEXTO: Record<(typeof ACR_ECOGENICIDADE)[number], string> = {
  anecoico: "anecoica",
  hiper_ou_isoecoico: "hiperecoica ou isoecoica",
  hipoecoico: "hipoecoica",
  muito_hipoecoico: "acentuadamente hipoecoica",
};
const ACR_MARGEM_TEXTO: Record<(typeof ACR_MARGEM)[number], string> = {
  lisa: "de margens lisas",
  mal_definida: "de margens mal definidas",
  lobulada_ou_irregular: "de margens lobuladas ou irregulares",
  extensao_extratireoidiana: "com extensão extratireoidiana",
};
const ACR_FOCOS_TEXTO: Record<(typeof ACR_FOCOS)[number], string> = {
  nenhum_ou_cauda_cometa: "sem focos ecogênicos suspeitos ou com artefatos em cauda de cometa",
  macrocalcificacoes: "com macrocalcificações",
  calcificacoes_perifericas: "com calcificações periféricas",
  focos_puntiformes: "com focos ecogênicos puntiformes",
};

function descritorAcr(nod: TireoideNodulo): string | null {
  const acr = nod.acr_tirads;
  if (!acr?.composicao) return null;
  const partes = [`imagem ${ACR_COMPOSICAO_TEXTO[acr.composicao]}`];
  if (acr.ecogenicidade && acr.composicao !== "espongiforme") partes.push(ACR_ECO_TEXTO[acr.ecogenicidade]);
  if (acr.margem) partes.push(ACR_MARGEM_TEXTO[acr.margem]);
  if (acr.forma === "mais_alta_que_larga") partes.push("mais alta do que larga");
  else if (acr.forma === "mais_larga_que_alta") partes.push("mais larga do que alta");
  const focos = Array.from(new Set(acr.focos_ecogenicos));
  const ativos = focos.filter((f) => f !== "nenhum_ou_cauda_cometa");
  for (const foco of ativos.length ? ativos : focos) partes.push(ACR_FOCOS_TEXTO[foco]);
  partes.push(`medindo ${medidasFmt(nod.medidas_cm)}`);
  if (nod.localizacao) partes.push(`situada ${nod.localizacao}`);
  return partes.join(", ");
}

// ---------------------------------------------------------------------------
// Render do corpo
// ---------------------------------------------------------------------------

/** Descritor de uma imagem nodular no corpo (sem "nódulo", sem Chammas). */
function noduloDescritor(nod: TireoideNodulo): string {
  if (!nod.ecogenicidade) {
    const acr = descritorAcr(nod);
    if (acr) return acr;
  }
  const partes: string[] = [
    `imagem ${nod.ecogenicidade ? ECOGENICIDADE[nod.ecogenicidade].txt : "nodular"}`,
  ];
  if (nod.margem) partes.push(MARGEM[nod.margem].txt);
  if (nod.halo && isSolida(nod.ecogenicidade)) partes.push(HALO[nod.halo].txt);
  partes.push(`medindo ${medidasFmt(nod.medidas_cm)}`);
  if (nod.calcificacoes) partes.push(CALCIFICACOES[nod.calcificacoes].txt);
  if (nod.forma) partes.push(FORMA[nod.forma].txt);
  if (nod.localizacao) partes.push(`situada ${nod.localizacao}`);
  return partes.join(", ");
}

/**
 * Frase do lobo/istmo no corpo (normal, difusa ou com imagens nodulares).
 *
 * `tipoDifuso` entra porque nomear a tireoidite JÁ afirma que a ecotextura está
 * alterada. Sem ele, dizer "Hashimoto" sem descrever o parênquima produzia um
 * laudo que se contradiz: o corpo escrevia "de ecogenicidade e ecotextura
 * normais" e a conclusão, logo abaixo, "Sinais ecográficos de tireoidite
 * crônica autoimune". É a mesma família de defeito dos linfonodos.
 *
 * O verbatim do médico continua vencendo — a descrição do tipo só preenche o
 * silêncio.
 */
function loboCorpo(
  rotulo: string,
  lobo: TireoideLobo,
  comDoppler: boolean,
  isIstmo: boolean,
  tipoDifuso: TireoiditeTipo | null = null,
): string {
  const medVol = `${rotulo} medindo ${medidasFmt(lobo.medidas_cm)} (volume de ${volFmt(
    lobo.volume_ml,
  )} ml)`;
  /**
   * A alteração difusa entra depois de "apresentando" — estrutura ditada pelo
   * Luiz em 21/08. O verbatim dele, quando existe, vence a descrição do tipo.
   *
   * Note que o verbatim NÃO recebe "apresentando": ele é escrito como cláusula
   * adjetiva ("difusamente heterogênea, com micronodulações") e "apresentando
   * difusamente heterogênea" não é português. Só a descrição por tipo, que
   * nasce como sintagma nominal ("modificação difusa do padrão ecotextural"),
   * casa com o verbo.
   */
  const verbatim = lobo.ecotextura_alterada?.trim();
  const porTipo = tipoDifuso ? TIREOIDITE[tipoDifuso].corpo : null;
  const difusa = verbatim
    ? { texto: verbatim.replace(/\.+$/, ""), comVerbo: false }
    : porTipo
      ? { texto: porTipo, comVerbo: true }
      : null;

  if (lobo.nodulos.length === 0) {
    const sufixo = difusa
      ? `${difusa.comVerbo ? "apresentando " : ""}${difusa.texto}`
      : comDoppler && !isIstmo
        ? "de ecogenicidade, ecotextura e vascularização normais"
        : "de ecogenicidade e ecotextura normais";
    return `${medVol}, ${sufixo}.`;
  }

  /**
   * COM alteração difusa E imagem, o nódulo vira FRASE À PARTE — pedido do
   * Luiz: "... traves hiperecoicas. Imagem anecoica, com margem regular...".
   * Encavalar os dois no mesmo "apresentando" faria a difusa e o nódulo
   * parecerem o mesmo achado.
   */
  if (difusa) {
    const abertura = `${medVol}, ${difusa.comVerbo ? "apresentando " : ""}${difusa.texto}.`;
    const frases = lobo.nodulos.map((n) => {
      const d = noduloDescritor(n);
      return `${d.charAt(0).toUpperCase()}${d.slice(1)}.`;
    });
    return [abertura, ...frases].join(" ");
  }

  // Sem difusa: comportamento de sempre — imagens separadas por ";".
  const imagens = lobo.nodulos.map(noduloDescritor).join("; ");
  return `${medVol}, apresentando ${imagens}.`;
}

// ---------------------------------------------------------------------------
// Render da conclusão (por lobo, imagens separadas por ";")
// ---------------------------------------------------------------------------

/** Trecho de uma imagem na conclusão, mantendo Domingos e ACR independentes. */
function noduloConclusao(nod: TireoideNodulo, showDomingos: boolean): string {
  const eco = nod.ecogenicidade
    ? ECOGENICIDADE[nod.ecogenicidade].txt
    : nod.acr_tirads?.composicao === "cistico"
      ? "cística"
      : nod.acr_tirads?.composicao === "espongiforme"
        ? "espongiforme"
        : nod.acr_tirads?.composicao === "misto"
          ? "mista"
          : nod.acr_tirads?.composicao === "solido"
            ? "sólida"
            : "nodular";
  const loc = nod.localizacao ? ` ${nod.localizacao}` : "";
  const base = `imagem ${eco}${loc}`;
  const { notaTxt, tirads } = classificarNodulo(nod);
  const acr = calcAcrTirads(nod);
  const acrTxt = acr ? `; ACR TI-RADS ${acr.categoria}` : "";
  if (showDomingos && notaTxt !== null) {
    const caracTxt = tirads !== null ? caracteristicasDoTirads(tirads) : null;
    const carac = caracTxt ? ` (características ${caracTxt} pela escala de Domingos)` : "";
    return `${base} com NOTA FINAL ${notaTxt}${carac}${acrTxt}`;
  }
  if (acr) return `${base} - ACR TI-RADS ${acr.categoria}`;
  return base;
}

// ---------------------------------------------------------------------------
// O VOCABULÁRIO DOS EIXOS — o contrato de que a tela precisa
// ---------------------------------------------------------------------------

/**
 * Os eixos do nódulo, com os valores que o renderer aceita e o rótulo que o
 * médico lê.
 *
 * Existe para que a tela da web possa oferecer os SEIS eixos e deixar o
 * `/render` calcular. Sem este contrato, a tela ou adivinha os enums ou
 * classifica por conta própria — e classificar por conta própria foi o defeito
 * mais grave achado no piloto de 20/08: a web usava uma escala de GRAU 1–6 e o
 * canônico uma SOMA DE PONTOS, de modo que o nódulo marcado como provavelmente
 * maligno saía impresso "provavelmente benignas".
 *
 * **Os PONTOS ficam de fora de propósito.** A tela mostra os eixos; quem soma é
 * o renderer. Publicar a pontuação convidaria o navegador a antecipar o escore,
 * que é exatamente a segunda autoridade que este desenho existe para evitar.
 *
 * O rótulo é o `txt` do próprio renderer — a mesma fonte que escreve a frase.
 * Uma segunda lista de rótulos divergiria no primeiro ajuste de redação.
 */
export type EixoDoNodulo = {
  campo: "ecogenicidade" | "margem" | "halo" | "forma" | "calcificacoes" | "vascularizacao";
  rotulo: string;
  /** Este eixo precisa estar preenchido para o renderer classificar? */
  obrigatorio: boolean;
  opcoes: { valor: string; rotulo: string }[];
};

/** "com margem regular" → "margem regular"; o rótulo do campo já diz o resto. */
function semPreposicao(txt: string): string {
  return txt.replace(/^(com|sem) /, (m) => (m === "sem " ? "sem " : ""));
}

export function eixosDoNodulo(): EixoDoNodulo[] {
  return [
    {
      campo: "ecogenicidade",
      rotulo: "Ecogenicidade e conteúdo",
      /**
       * O único obrigatório: `calcNotaDomingos` ancora nele e devolve `null`
       * sem ele — o renderer não inventa nota para um nódulo que não sabe
       * descrever.
       */
      obrigatorio: true,
      opcoes: Object.entries(ECOGENICIDADE).map(([valor, v]) => ({ valor, rotulo: v.txt })),
    },
    {
      campo: "margem",
      rotulo: "Margem",
      obrigatorio: false,
      opcoes: Object.entries(MARGEM).map(([valor, v]) => ({ valor, rotulo: semPreposicao(v.txt) })),
    },
    {
      campo: "halo",
      rotulo: "Halo",
      obrigatorio: false,
      opcoes: Object.entries(HALO).map(([valor, v]) => ({ valor, rotulo: semPreposicao(v.txt) })),
    },
    {
      campo: "forma",
      rotulo: "Forma",
      obrigatorio: false,
      opcoes: Object.entries(FORMA).map(([valor, v]) => ({ valor, rotulo: v.txt })),
    },
    {
      campo: "calcificacoes",
      rotulo: "Calcificações",
      obrigatorio: false,
      opcoes: Object.entries(CALCIFICACOES).map(([valor, v]) => ({ valor, rotulo: semPreposicao(v.txt) })),
    },
    {
      campo: "vascularizacao",
      rotulo: "Vascularização (Chammas)",
      obrigatorio: false,
      /**
       * Chammas PONTUA e NUNCA é escrito no laudo — regra da casa, no topo
       * deste arquivo. O rótulo aqui é da TELA; ele não aparece no documento.
       */
      opcoes: [
        { valor: "sem", rotulo: "ausente" },
        { valor: "periferica", rotulo: "periférica" },
        { valor: "periferica_maior_central", rotulo: "periférica > central" },
        { valor: "central_maior_periferica", rotulo: "central > periférica" },
        { valor: "exclusiva_central", rotulo: "exclusivamente central" },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior; objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO + ACR TI-RADS.
 */
export function renderTireoide(
  f: TireoideFindings,
  prefsInput?: Partial<TireoidePreferences> | null,
  opts?: { objetivo?: boolean; omitPicoNull?: boolean },
): string {
  const omitPicoNull = opts?.omitPicoNull ?? false;
  if (opts?.objetivo) return renderTireoideObjetivo(f, prefsInput, omitPicoNull);
  return renderTireoideClassico(f, prefsInput, omitPicoNull);
}

/**
 * Linhas de pico sistólico (Doppler) da tireoide. Auditoria gap #4: quando o pico
 * não foi ditado (null) e `omitPicoNull` (flag TIREOIDE_PICO_OMIT), OMITE a linha
 * em vez de imprimir "____ cm/s". OFF = comportamento atual (placeholder). O
 * formatador de número difere entre clássico (ptBr) e objetivo (ptBr1).
 */
function picoLinhas(
  f: TireoideFindings,
  fmt: (n: number) => string,
  omitPicoNull: boolean,
): string[] {
  const ad = f.pico_arteria_direita ?? "inferior";
  const ae = f.pico_arteria_esquerda ?? "inferior";
  const out: string[] = [];
  if (f.pico_sistolico_direito_cms !== null) {
    out.push(`Pico sistólico da artéria tireoidiana ${ad} direita de ${fmt(f.pico_sistolico_direito_cms)} cm/s.`);
  } else if (!omitPicoNull) {
    out.push(`Pico sistólico da artéria tireoidiana ${ad} direita de ____ cm/s.`);
  }
  if (f.pico_sistolico_esquerdo_cms !== null) {
    out.push(`Pico sistólico da artéria tireoidiana ${ae} esquerda de ${fmt(f.pico_sistolico_esquerdo_cms)} cm/s.`);
  } else if (!omitPicoNull) {
    out.push(`Pico sistólico da artéria tireoidiana ${ae} esquerda de ____ cm/s.`);
  }
  return out;
}

/** Mescla prefs cruas/parciais (JSONB da conta) com os defaults seguros. */
function mergeTireoidePrefs(
  prefsInput?: Partial<TireoidePreferences> | null,
): TireoidePreferences {
  return {
    ...TIREOIDE_DEFAULT_PREFERENCES,
    ...(prefsInput && typeof prefsInput === "object"
      ? {
          ...(typeof prefsInput.show_domingos_score === "boolean"
            ? { show_domingos_score: prefsInput.show_domingos_score }
            : {}),
          ...(typeof prefsInput.show_conduct_recommendation === "boolean"
            ? { show_conduct_recommendation: prefsInput.show_conduct_recommendation }
            : {}),
        }
      : {}),
  };
}

function renderTireoideClassico(
  f: TireoideFindings,
  prefsInput?: Partial<TireoidePreferences> | null,
  omitPicoNull = false,
): string {
  // Mescla com os defaults — aceita o JSONB cru/parcial da preferência da conta
  // (chaves faltando ou null caem no default seguro: Domingos ON, conduta OFF).
  const prefs = mergeTireoidePrefs(prefsInput);
  const titulo = f.com_doppler
    ? "ULTRASSONOGRAFIA DA TIREOIDE COM DOPPLER COLORIDO"
    : "ULTRASSONOGRAFIA DA TIREOIDE";

  const aspectos: string[] = [
    loboCorpo("Lobo direito", f.lobo_direito, f.com_doppler, false, f.tireoidite_tipo),
    loboCorpo("Lobo esquerdo", f.lobo_esquerdo, f.com_doppler, false, f.tireoidite_tipo),
    /**
     * O istmo também. A tireoidite é DIFUSA por definição — descrever os lobos
     * como alterados e o istmo como normal descreveria uma doença que não é
     * essa.
     */
    loboCorpo("Istmo", f.istmo, f.com_doppler, true, f.tireoidite_tipo),
  ];

  if (f.com_doppler) {
    const linhas = picoLinhas(f, ptBr, omitPicoNull);
    // Preserva a quebra de seção antes do bloco de pico (só quando há linha).
    if (linhas.length > 0) {
      aspectos.push(`\n${linhas[0]}`, ...linhas.slice(1));
    }
  }

  if (f.linfonodos_descritos) {
    /**
     * TRÊS estados, não dois. O `&&` de antes juntava "alterado sem descrição"
     * com "normal" e escrevia a frase de normalidade embaixo de uma conclusão
     * que dizia o contrário.
     */
    const desc = f.linfonodos_descricao?.trim();
    const linha = !f.linfonodos_alterados
      ? LINFONODOS_NORMAIS
      : desc
        ? desc
        : LINFONODOS_ATIPICOS_SEM_DESCRICAO;
    aspectos.push(`\n${linha}`);
  }

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(`\n${f.achados_adicionais.trim()}`);
  }

  // ----- Conclusão -----
  const vt = volumeTotal(f);
  const vtFmt = vt === null ? "____" : ptBr(vt);
  const volStatus =
    f.volume_glandular === "aumentado"
      ? "aumentado"
      : f.volume_glandular === "reduzido"
        ? "reduzido"
        : "normal";

  const lobos: { rotulo: string; lobo: TireoideLobo }[] = [
    { rotulo: "Lobo direito", lobo: f.lobo_direito },
    { rotulo: "Lobo esquerdo", lobo: f.lobo_esquerdo },
    { rotulo: "Istmo", lobo: f.istmo },
  ];
  const lobosComAchado = lobos.filter((l) => l.lobo.nodulos.length > 0);
  /**
   * Nomear a tireoidite JÁ é declarar alteração difusa. Sem isto, dizer
   * "Hashimoto" sem descrever a ecotextura deixava o laudo concluir "sem
   * evidência de alteração ecotextural" — o contrário do que foi dito.
   */
  const temDifusa = lobos.some((l) => !!l.lobo.ecotextura_alterada) || !!f.tireoidite_tipo;

  const conclusao: string[] = [];
  if (lobosComAchado.length === 0 && !temDifusa) {
    conclusao.push(
      `Tireoide de volume ${volStatus} (${vtFmt} ml), sem evidência de alteração ecotextural ou de imagem nodular.`,
    );
  } else {
    /**
     * A alteração difusa deixou de ser item separado: ela fecha a frase do
     * volume, e o diagnóstico vem em seguida. Estrutura ditada pelo Luiz.
     * Sem tipo nomeado, `fecharFraseDoVolume` devolve só o ponto e o item
     * separado "Sinais ecográficos de tireoidopatia" continua valendo — é a
     * redação dele, ancorada em 62 conclusões reais.
     */
    conclusao.push(`Tireoide de volume ${volStatus} (${vtFmt} ml)${fecharFraseDoVolume(f.tireoidite_tipo)}`);

    /**
     * A ALTERAÇÃO DIFUSA, que antes sumia daqui.
     *
     * Este era um defeito de produção: o corpo descrevia a ecotextura alterada
     * e a conclusão dizia só "Tireoide de volume normal (…)". Quem lê apenas a
     * conclusão — que é como se lê laudo com pressa — não ficava sabendo.
     *
     * Entra DEPOIS do volume e ANTES dos itens nodulares. A ordem não é
     * estética: nos 12 laudos do corpus que têm tireoidopatia e conclusão
     * nodular, a tireoidopatia vem antes em 12/12.
     */
    /** Só o genérico vira item próprio; o nomeado já foi para a frase acima. */
    if (temDifusa && !f.tireoidite_tipo) {
      conclusao.push(f.volume_glandular === "aumentado" ? TIREOIDOPATIA_BOCIO : TIREOIDOPATIA);
    }

    // Um item por lobo; imagens do mesmo lobo no mesmo item, separadas por ";".
    for (const l of lobosComAchado) {
      const trechos = l.lobo.nodulos.map((nod) =>
        noduloConclusao(nod, prefs.show_domingos_score),
      );
      conclusao.push(`${l.rotulo} apresentando ${trechos.join("; ")}.`);
    }
  }

  // Linfonodos alterados → item factual (NUNCA "morfologia preservada").
  // "atípico" é a palavra dele; ver LINFONODOS_ATIPICOS_SEM_DESCRICAO.
  if (f.linfonodos_descritos && f.linfonodos_alterados) {
    const desc = f.linfonodos_descricao?.trim();
    conclusao.push(
      desc
        ? `Linfonodos cervicais de aspecto atípico (${desc.replace(/\.+$/, "")}).`
        : "Linfonodos cervicais de aspecto atípico.",
    );
  }

  /**
   * A RECOMENDAÇÃO LABORATORIAL — último item da conclusão.
   *
   * "no final da conclusão", como o Luiz pediu. Vem depois dos linfonodos
   * porque é sobre a glândula, não sobre um achado focal, e fecha o raciocínio.
   *
   * Só existe quando a tireoidite foi NOMEADA: sem hipótese, não há exame a
   * pedir. É o que separa esta frase de uma recomendação genérica colada em
   * todo laudo.
   */
  if (f.tireoidite_tipo) conclusao.push(TIREOIDITE[f.tireoidite_tipo].recomendacao);

  // Conduta (toggle) — exclusivamente ACR oficial + maior diâmetro.
  if (prefs.show_conduct_recommendation) {
    const candidatos = lobosComAchado
      .flatMap((l) => l.lobo.nodulos)
      .map((nod) => ({ acr: calcAcrTirads(nod), diametro: maiorDiametroCm(nod) }))
      .filter((item): item is { acr: { pontos: number; categoria: number }; diametro: number | null } => item.acr !== null);
    if (candidatos.length > 0) {
      const maxTirads = Math.max(...candidatos.map((item) => item.acr.categoria));
      const maiorDiametro = candidatos
        .filter((item) => item.acr.categoria === maxTirads)
        .map((item) => item.diametro)
        .filter((valor): valor is number => valor !== null)
        .reduce<number | null>((acc, valor) => acc === null ? valor : Math.max(acc, valor), null);
      const conduta = condutaAcr(maxTirads, maiorDiametro);
      if (conduta) {
        conclusao.push(`Conduta sugerida (ACR TI-RADS ${maxTirads}): ${conduta}.`);
      }
    }
  }

  const conclusaoTxt =
    conclusao.length === 1
      ? (conclusao[0] as string)
      : conclusao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  const corpo = [
    titulo,
    "",
    comentarios(f.linfonodos_descritos),
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    conclusaoTxt,
    "",
    RODAPE,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

/** VT = soma dos volumes (lobos + istmo) — determinístico. null se faltar. */
function volumeTotal(f: TireoideFindings): number | null {
  const vols = [f.lobo_direito.volume_ml, f.lobo_esquerdo.volume_ml, f.istmo.volume_ml];
  if (vols.some((v) => v === null)) return null;
  const total = (vols as number[]).reduce((a, b) => a + b, 0);
  return Math.round(total * 100) / 100;
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO + ACR TI-RADS
// ===========================================================================
//
// O objetivo NÃO usa o escore de Domingos. Usa ACR TI-RADS (American College of
// Radiology), pontuando 5 eixos a partir dos MESMOS enums extraídos do ditado e
// derivando a categoria (TR1-TR5) e a conduta por diâmetro. Override: ti_rads_ditado
// vence o cálculo (reproduz verbatim a categoria ditada do médico).

const ACR_COMPOSICAO_PTS: Record<(typeof ACR_COMPOSICAO)[number], number> = {
  cistico: 0,
  espongiforme: 0,
  misto: 1,
  solido: 2,
};
const ACR_ECOGENICIDADE_PTS: Record<(typeof ACR_ECOGENICIDADE)[number], number> = {
  anecoico: 0,
  hiper_ou_isoecoico: 1,
  hipoecoico: 2,
  muito_hipoecoico: 3,
};
const ACR_FORMA_PTS: Record<(typeof ACR_FORMA)[number], number> = {
  mais_larga_que_alta: 0,
  mais_alta_que_larga: 3,
};
const ACR_MARGEM_PTS: Record<(typeof ACR_MARGEM)[number], number> = {
  lisa: 0,
  mal_definida: 0,
  lobulada_ou_irregular: 2,
  extensao_extratireoidiana: 3,
};
const ACR_FOCOS_PTS: Record<(typeof ACR_FOCOS)[number], number> = {
  nenhum_ou_cauda_cometa: 0,
  macrocalcificacoes: 1,
  calcificacoes_perifericas: 2,
  focos_puntiformes: 3,
};

/** Categoria ACR (1-5) a partir da soma de pontos. */
function acrCategoriaDosPontos(pts: number): number {
  if (pts < 2) return 1;
  if (pts === 2) return 2;
  if (pts === 3) return 3;
  if (pts <= 6) return 4; // 4..6
  return 5; // >=7
}

const ACR_TEXTO: Record<number, string> = {
  1: "benigno",
  2: "não suspeito",
  3: "características intermediárias",
  4: "características suspeitas",
  5: "altamente suspeitas",
};

/**
 * Calcula ACR TI-RADS apenas a partir dos cinco grupos oficiais. A Nota de
 * Domingos não é atalho para ACR e nunca entra nesta soma.
 * Override: ti_rads_ditado (1-5) vence o cálculo (categoria ditada do médico).
 */
export function calcAcrTirads(
  nod: TireoideNodulo,
): { pontos: number; categoria: number } | null {
  const ditado = nod.ti_rads_ditado?.trim();
  if (ditado && /^[1-5]$/.test(ditado)) {
    return { pontos: NaN, categoria: Number(ditado) };
  }
  const acr = nod.acr_tirads;
  if (!acr?.composicao || !acr.ecogenicidade || !acr.forma || !acr.margem) return null;
  const focos = Array.from(new Set(acr.focos_ecogenicos));
  const focosValidos = focos.filter((f) => f !== "nenhum_ou_cauda_cometa");
  const pontos =
    ACR_COMPOSICAO_PTS[acr.composicao] +
    ACR_ECOGENICIDADE_PTS[acr.ecogenicidade] +
    ACR_FORMA_PTS[acr.forma] +
    ACR_MARGEM_PTS[acr.margem] +
    focosValidos.reduce((sum, foco) => sum + ACR_FOCOS_PTS[foco], 0);
  return { pontos, categoria: acrCategoriaDosPontos(pontos) };
}

/** Maior diâmetro do nódulo em cm: diametro_transverso_cm ou max(medidas_cm). */
function maiorDiametroCm(nod: TireoideNodulo): number | null {
  if (nod.diametro_transverso_cm !== null && Number.isFinite(nod.diametro_transverso_cm)) {
    return nod.diametro_transverso_cm;
  }
  if (nod.medidas_cm && nod.medidas_cm.length > 0) {
    const finitas = nod.medidas_cm.filter((n) => Number.isFinite(n));
    if (finitas.length > 0) return Math.max(...finitas);
  }
  return null;
}

/**
 * Conduta ACR por categoria + maior diâmetro. null = sem conduta a sugerir.
 * TR1/TR2: sem indicação. Limiares de PAAF/controle por categoria.
 */
function condutaAcr(categoria: number, diametroCm: number | null): string | null {
  if (categoria <= 2) return null;
  if (diametroCm === null) return null;
  if (categoria === 3) {
    if (diametroCm >= 2.5) return "punção aspirativa por agulha fina (PAAF)";
    if (diametroCm >= 1.5) return "acompanhamento ultrassonográfico em 1, 3 e 5 anos";
    return null;
  }
  if (categoria === 4) {
    if (diametroCm >= 1.5) return "punção aspirativa por agulha fina (PAAF)";
    if (diametroCm >= 1.0) return "acompanhamento ultrassonográfico em 1, 2, 3 e 5 anos";
    return null;
  }
  // categoria 5
  if (diametroCm >= 1.0) return "punção aspirativa por agulha fina (PAAF)";
  if (diametroCm >= 0.5) return "acompanhamento ultrassonográfico anual por até 5 anos";
  return null;
}

/** É cisto (ecogenicidade anecoica)? Cisto simples → ACR TI-RADS 1. */
function isCisto(nod: TireoideNodulo): boolean {
  if (nod.acr_tirads?.composicao === "cistico") return true;
  return nod.ecogenicidade !== null && nod.ecogenicidade.startsWith("anecoica");
}

/** Frase enxuta (objetivo) de um nódulo no ACHADOS. */
function noduloAchadoObjetivo(nod: TireoideNodulo): string {
  const acrDesc = descritorAcr(nod);
  if (acrDesc) {
    const texto = acrDesc.charAt(0).toUpperCase() + acrDesc.slice(1);
    return `${texto}.`;
  }
  if (isCisto(nod)) {
    const partes = [
      `Cisto ${nod.ecogenicidade ? ECOGENICIDADE[nod.ecogenicidade].txtM : "simples"}`,
    ];
    partes.push(`medindo ${medidasFmt1(nod.medidas_cm)}`);
    if (nod.localizacao) partes.push(`situado ${nod.localizacao}`);
    return `${partes.join(", ")}.`;
  }
  const partes = [
    `Nódulo ${nod.ecogenicidade ? ECOGENICIDADE[nod.ecogenicidade].txtM : "sólido"}`,
  ];
  if (nod.margem) partes.push(MARGEM[nod.margem].txt);
  if (nod.forma) partes.push(FORMA[nod.forma].txtM);
  if (nod.calcificacoes && nod.calcificacoes !== "sem")
    partes.push(CALCIFICACOES[nod.calcificacoes].txt);
  partes.push(`medindo ${medidasFmt1(nod.medidas_cm)}`);
  if (nod.localizacao) partes.push(`situado ${nod.localizacao}`);
  return `${partes.join(", ")}.`;
}

/** Render do estilo OBJETIVO: TÉCNICA / ACHADOS / IMPRESSÃO + ACR TI-RADS. */
function renderTireoideObjetivo(
  f: TireoideFindings,
  prefsInput?: Partial<TireoidePreferences> | null,
  omitPicoNull = false,
): string {
  const prefs = mergeTireoidePrefs(prefsInput);

  const titulo = "ULTRASSONOGRAFIA DA TIREOIDE";
  const tecnica = "Exame realizado com transdutor linear de alta frequência.";

  // ----- estado da glândula -----
  const lobos: { rotulo: string; lobo: TireoideLobo }[] = [
    { rotulo: "Lobo direito da tireoide", lobo: f.lobo_direito },
    { rotulo: "Lobo esquerdo da tireoide", lobo: f.lobo_esquerdo },
    { rotulo: "Istmo", lobo: f.istmo },
  ];
  const lobosComNodulo = lobos.filter((l) => l.lobo.nodulos.length > 0);
  /**
   * Nomear a tireoidite JÁ é declarar alteração difusa. Sem isto, dizer
   * "Hashimoto" sem descrever a ecotextura deixava o laudo concluir "sem
   * evidência de alteração ecotextural" — o contrário do que foi dito.
   */
  const temDifusa = lobos.some((l) => !!l.lobo.ecotextura_alterada) || !!f.tireoidite_tipo;
  const volStatus = f.volume_glandular; // "aumentado" | "reduzido" | "normal" | null

  // ----- ACHADOS -----
  const achados: string[] = [];

  // Linha de dimensões/contornos (reflete bócio/atrofia).
  if (volStatus === "aumentado") {
    achados.push("Glândula tireoide tópica, de dimensões aumentadas e contornos preservados.");
  } else if (volStatus === "reduzido") {
    achados.push("Glândula tireoide tópica, de dimensões reduzidas e contornos preservados.");
  } else {
    achados.push("Glândula tireoide tópica, de dimensões normais e contornos preservados.");
  }

  // Linha de ecotextura / lesões.
  if (temDifusa) {
    /**
     * O VERBATIM DELE VENCE. A descrição por tipo é o que se escreve quando ele
     * nomeia a tireoidite e não descreve o parênquima — nunca substitui o que
     * ele descreveu.
     */
    const difusa =
      lobos.map((l) => l.lobo.ecotextura_alterada?.trim()).find((t) => !!t) ??
      (f.tireoidite_tipo ? TIREOIDITE[f.tireoidite_tipo].corpo : null);
    achados.push(
      `Parênquima tireoidiano ${(difusa ?? "com ecotextura difusamente heterogênea").replace(/\.+$/, "")}.`,
    );
  } else if (lobosComNodulo.length === 0) {
    achados.push(
      "Parênquima tireoidiano com ecotextura homogênea. Não foram caracterizadas lesões sólidas ou císticas.",
    );
  } else {
    achados.push("Parênquima tireoidiano com ecotextura homogênea.");
  }

  // Linhas de lobos/istmo + VT (medidas quando ditadas; ____ quando não).
  for (const { rotulo, lobo } of lobos) {
    achados.push(
      `${rotulo}: ${medidasFmt1(lobo.medidas_cm)} (volume de ${volFmt1(lobo.volume_ml)} ml).`,
    );
  }
  const vt = volumeTotal(f);
  achados.push(`Volume total: ${vt === null ? "____" : ptBr1(vt)} ml.`);

  // Nódulos/cistos descritos no ACHADOS.
  for (const { lobo } of lobosComNodulo) {
    for (const nod of lobo.nodulos) {
      achados.push(noduloAchadoObjetivo(nod));
    }
  }

  // Doppler (picos sistólicos) quando aplicável.
  if (f.com_doppler) {
    achados.push(...picoLinhas(f, ptBr1, omitPicoNull));
  }

  /**
   * Linfonodos — TRÊS estados, e o primeiro deles é o silêncio.
   *
   * **Não avaliou, não escreve.** Decisão do Luiz em 21/08, e ela alinha o
   * objetivo ao clássico: antes, com `linfonodos_descritos = false`, este
   * estilo afirmava "Não há evidência de linfonodomegalias" — um achado
   * negativo que ninguém fez. A frase é dele (222× nos 251 laudos reais), mas
   * ela pertence a quem avaliou; em 26 laudos (10%) ele não fala de linfonodo
   * nenhum, e nesses o laudo não diz nada a respeito.
   *
   * Os outros dois estados vêm de D4: com descrição, vale a dele; alterado sem
   * descrição, "atípico" — nunca a frase de normalidade, que fazia o laudo se
   * contradizer.
   */
  if (f.linfonodos_descritos) {
    const desc = f.linfonodos_descricao?.trim();
    achados.push(
      !f.linfonodos_alterados
        ? "Não há evidência de linfonodomegalias."
        : desc
          ? desc
          : LINFONODOS_ATIPICOS_SEM_DESCRICAO,
    );
  }

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push(f.achados_adicionais.trim());
  }

  // ----- IMPRESSÃO -----
  const impressao: string[] = [];

  /**
   * Com difusa E bócio, a variante combinada do corpus cobre os dois — repetir
   * "Bócio (aumento difuso…)" logo acima dela seria dizer a mesma coisa duas
   * vezes, com duas redações diferentes.
   */
  if (volStatus === "aumentado") {
    if (!temDifusa) impressao.push("Bócio (aumento difuso do volume glandular).");
  } else if (volStatus === "reduzido") {
    impressao.push("Glândula tireoide de dimensões reduzidas.");
  }

  if (temDifusa) {
    /**
     * A MESMA frase do clássico, e pelo mesmo motivo.
     *
     * Antes o objetivo escrevia "Tireoidopatia difusa (descrição)" — texto que
     * não existe em nenhum dos 251 laudos reais —, e ainda repetia entre
     * parênteses a descrição que o bloco ACHADOS acabara de dar. Os dois
     * estilos podem diferir na ESTRUTURA do documento; não em ter duas
     * hipóteses diagnósticas diferentes para o mesmo achado.
     */
    /**
     * O objetivo não tem a frase de abertura com o volume — ele imprime
     * "Volume total: X ml." nos ACHADOS. Então a mesma informação vira um item
     * autocontido, com a ecotextura e o diagnóstico na ordem que o Luiz pediu.
     */
    impressao.push(
      f.tireoidite_tipo
        ? `Tireoide de ${TIREOIDITE[f.tireoidite_tipo].ecotextura}. O diagnóstico mais provável é ${TIREOIDITE[f.tireoidite_tipo].diagnostico}.`
        : volStatus === "aumentado"
          ? TIREOIDOPATIA_BOCIO
          : TIREOIDOPATIA,
    );
  }

  // Item por nódulo com a categoria ACR calculada/ditada.
  for (const { lobo } of lobosComNodulo) {
    for (const nod of lobo.nodulos) {
      const eco = nod.ecogenicidade
        ? ECOGENICIDADE[nod.ecogenicidade].txtM
        : nod.acr_tirads?.composicao === "espongiforme"
          ? "espongiforme"
          : nod.acr_tirads?.composicao === "misto"
            ? "misto"
            : nod.acr_tirads?.composicao === "solido"
              ? "sólido"
              : "nodular";
      const loc = nod.localizacao ? ` ${nod.localizacao}` : "";
      if (isCisto(nod)) {
        impressao.push(`Cisto simples${loc} (ACR TI-RADS 1).`);
        continue;
      }
      const acr = calcAcrTirads(nod);
      if (acr !== null) {
        const txt = ACR_TEXTO[acr.categoria];
        const sufixo = txt ? `, ${txt}` : "";
        impressao.push(
          `Nódulo ${eco}${loc} (ACR TI-RADS ${acr.categoria}${sufixo}).`,
        );
      } else {
        impressao.push(`Nódulo ${eco}${loc}.`);
      }
    }
  }

  if (f.linfonodos_descritos && f.linfonodos_alterados) {
    const desc = f.linfonodos_descricao?.trim();
    impressao.push(
      desc
        ? `Linfonodos cervicais de aspecto atípico (${desc.replace(/\.+$/, "")}).`
        : "Linfonodos cervicais de aspecto atípico.",
    );
  }

  /** A recomendação laboratorial fecha a impressão, como no clássico. */
  if (f.tireoidite_tipo) impressao.push(TIREOIDITE[f.tireoidite_tipo].recomendacao);

  if (impressao.length === 0) {
    impressao.push("Estudo ultrassonográfico dentro dos padrões da normalidade.");
  }

  const impressaoTxt =
    impressao.length === 1
      ? (impressao[0] as string)
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  // ----- Conduta (toggle) — maior categoria entre os nódulos (não-cistos) -----
  let condutaSecao = "";
  if (prefs.show_conduct_recommendation) {
    const candidatos = lobosComNodulo
      .flatMap((l) => l.lobo.nodulos)
      .filter((nod) => !isCisto(nod))
      .map((nod) => ({ acr: calcAcrTirads(nod), diam: maiorDiametroCm(nod) }))
      .filter((x): x is { acr: { pontos: number; categoria: number }; diam: number | null } =>
        x.acr !== null,
      );
    if (candidatos.length > 0) {
      const maxCat = Math.max(...candidatos.map((c) => c.acr.categoria));
      // Maior diâmetro entre os nódulos da maior categoria.
      const diamMax = candidatos
        .filter((c) => c.acr.categoria === maxCat)
        .map((c) => c.diam)
        .filter((d): d is number => d !== null)
        .reduce<number | null>((acc, d) => (acc === null ? d : Math.max(acc, d)), null);
      const conduta = condutaAcr(maxCat, diamMax);
      if (conduta) {
        condutaSecao = `\nConduta sugerida:\nACR TI-RADS ${maxCat}. ${conduta}.`;
      }
    }
  }

  const corpo = [
    titulo,
    "",
    "TÉCNICA:",
    tecnica,
    "",
    "ACHADOS:",
    achados.join("\n"),
    "",
    "IMPRESSÃO:",
    impressaoTxt,
    condutaSecao,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}
