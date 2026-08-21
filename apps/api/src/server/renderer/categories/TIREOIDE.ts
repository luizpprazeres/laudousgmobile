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
});

const LoboSchema = z.object({
  medidas_cm: z.array(z.number()).nullable(),
  volume_ml: z.number().nullable(),
  ecotextura_alterada: z.string().nullable(), // alteração DIFUSA verbatim (tireoidite/Graves)
  nodulos: z.array(NoduloSchema),
});

export const TireoideFindingsSchema = z.object({
  com_doppler: z.boolean(),
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
  ],
  properties: {
    com_doppler: { type: "boolean" },
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

/** TI-RADS → conduta (tabela Domingos + ACR 5). null fora de 1-5 (omite). */
function condutaDoTirads(tirads: number): string | null {
  return (
    {
      1: "controle anual",
      2: "controle ou punção aspirativa por agulha fina (citopunção)",
      3: "punção aspirativa por agulha fina (citopunção)",
      4: "punção aspirativa por agulha fina (citopunção)",
      5: "punção aspirativa por agulha fina (citopunção)",
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

// ---------------------------------------------------------------------------
// Render do corpo
// ---------------------------------------------------------------------------

/** Descritor de uma imagem nodular no corpo (sem "nódulo", sem Chammas). */
function noduloDescritor(nod: TireoideNodulo): string {
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

/** Frase do lobo/istmo no corpo (normal, difusa ou com imagens nodulares). */
function loboCorpo(
  rotulo: string,
  lobo: TireoideLobo,
  comDoppler: boolean,
  isIstmo: boolean,
): string {
  const medVol = `${rotulo} medindo ${medidasFmt(lobo.medidas_cm)} (volume de ${volFmt(
    lobo.volume_ml,
  )} ml)`;
  if (lobo.nodulos.length === 0) {
    const sufixo = lobo.ecotextura_alterada
      ? lobo.ecotextura_alterada.trim().replace(/\.+$/, "")
      : comDoppler && !isIstmo
        ? "de ecogenicidade, ecotextura e vascularização normais"
        : "de ecogenicidade e ecotextura normais";
    return `${medVol}, ${sufixo}.`;
  }
  // Volume MANTIDO em parênteses; imagens separadas por ";".
  const imagens = lobo.nodulos.map(noduloDescritor).join("; ");
  return `${medVol}, apresentando ${imagens}.`;
}

// ---------------------------------------------------------------------------
// Render da conclusão (por lobo, imagens separadas por ";")
// ---------------------------------------------------------------------------

/** Trecho de uma imagem na conclusão (Domingos ON: nota+características+TI-RADS). */
function noduloConclusao(nod: TireoideNodulo, showDomingos: boolean): string {
  const eco = nod.ecogenicidade ? ECOGENICIDADE[nod.ecogenicidade].txt : "nodular";
  const loc = nod.localizacao ? ` ${nod.localizacao}` : "";
  const base = `imagem ${eco}${loc}`;
  const { notaTxt, tirads, tiradsTxt } = classificarNodulo(nod);
  if (showDomingos && notaTxt !== null) {
    const caracTxt = tirads !== null ? caracteristicasDoTirads(tirads) : null;
    const carac = caracTxt ? ` (características ${caracTxt})` : "";
    const tr = tiradsTxt !== null ? `, equivalente ao TI-RADS ${tiradsTxt} ACR` : "";
    return `${base} com NOTA FINAL ${notaTxt}${carac}${tr}`;
  }
  // Domingos OFF (ou sem nota): só o TI-RADS quando disponível.
  if (tiradsTxt !== null) return `${base} - TI-RADS ${tiradsTxt}`;
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
    loboCorpo("Lobo direito", f.lobo_direito, f.com_doppler, false),
    loboCorpo("Lobo esquerdo", f.lobo_esquerdo, f.com_doppler, false),
    loboCorpo("Istmo", f.istmo, f.com_doppler, true),
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
  const temDifusa = lobos.some((l) => !!l.lobo.ecotextura_alterada);

  const conclusao: string[] = [];
  if (lobosComAchado.length === 0 && !temDifusa) {
    conclusao.push(
      `Tireoide de volume ${volStatus} (${vtFmt} ml), sem evidência de alteração ecotextural ou de imagem nodular.`,
    );
  } else {
    conclusao.push(`Tireoide de volume ${volStatus} (${vtFmt} ml).`);

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
    if (temDifusa) {
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

  // Conduta (toggle) — append do maior TI-RADS calculado/ditado entre as imagens.
  if (prefs.show_conduct_recommendation) {
    const tiradsList = lobosComAchado
      .flatMap((l) => l.lobo.nodulos)
      .map((nod) => classificarNodulo(nod).tirads)
      .filter((t): t is number => t !== null);
    if (tiradsList.length > 0) {
      const maxTirads = Math.max(...tiradsList);
      const conduta = condutaDoTirads(maxTirads);
      if (conduta) {
        conclusao.push(`Conduta sugerida (TI-RADS ${maxTirads}): ${conduta}.`);
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

/** Pontos ACR — COMPOSIÇÃO (derivada da ecogenicidade): cístico 0, misto 1, sólido 2. */
function acrComposicaoPts(eco: EcoKey): number {
  switch (eco) {
    case "anecoica_homogenea":
    case "anecoica_finos_ecos":
      return 0; // cístico/espongiforme
    case "anecoica_septos":
    case "anecoica_componentes_solidos":
    case "solida_areas_anecoicas":
      return 1; // misto cístico-sólido
    default:
      return 2; // sólido (hipo/iso/hiper/calcificação parietal)
  }
}

/** Pontos ACR — ECOGENICIDADE. */
function acrEcogenicidadePts(eco: EcoKey): number {
  if (eco.startsWith("anecoica")) return 0; // anecoico
  if (eco === "hiperecoica" || eco === "isoecoica") return 1;
  if (eco === "hipoecoica") return 2;
  return 1; // solida_* → default iso
}

/** Pontos ACR — FORMA. */
function acrFormaPts(forma: FormaKey | null): number {
  return forma === "mais_alta_que_larga" ? 3 : 0;
}

/** Pontos ACR — MARGEM. */
function acrMargemPts(margem: MargemKey | null): number {
  if (margem === "irregular" || margem === "espiculada") return 2;
  return 0; // regular | null → lisa/regular
}

/** Pontos ACR — FOCOS ECOGÊNICOS (a partir das calcificações). */
function acrFocosPts(calc: CalcKey | null): number {
  switch (calc) {
    case "grosseiras":
      return 1; // macrocalcificações
    case "casca_ovo":
      return 2; // calcificações periféricas (em casca de ovo)
    case "micro":
      return 3; // focos ecogênicos puntiformes (microcalcificações)
    default:
      return 0; // sem | null
  }
}

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
  2: "provavelmente benigno",
  3: "características intermediárias",
  4: "características suspeitas",
  5: "altamente suspeitas",
};

/**
 * Calcula o ACR TI-RADS de um nódulo a partir dos enums do escore.
 * Retorna null se a ecogenicidade for null (sem ecogenicidade não pontua).
 * Override: ti_rads_ditado (1-5) vence o cálculo (categoria ditada do médico).
 */
export function calcAcrTirads(
  nod: TireoideNodulo,
): { pontos: number; categoria: number } | null {
  const ditado = nod.ti_rads_ditado?.trim();
  if (ditado && /^[1-5]$/.test(ditado)) {
    return { pontos: NaN, categoria: Number(ditado) };
  }
  if (!nod.ecogenicidade) return null;
  const pontos =
    acrComposicaoPts(nod.ecogenicidade) +
    acrEcogenicidadePts(nod.ecogenicidade) +
    acrFormaPts(nod.forma) +
    acrMargemPts(nod.margem) +
    acrFocosPts(nod.calcificacoes);
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
    if (diametroCm >= 1.5) return "acompanhamento (controle ultrassonográfico)";
    return null;
  }
  if (categoria === 4) {
    if (diametroCm >= 1.5) return "punção aspirativa por agulha fina (PAAF)";
    if (diametroCm >= 1.0) return "acompanhamento (controle ultrassonográfico)";
    return null;
  }
  // categoria 5
  if (diametroCm >= 1.0) return "punção aspirativa por agulha fina (PAAF)";
  if (diametroCm >= 0.5) return "acompanhamento (controle ultrassonográfico)";
  return null;
}

/** É cisto (ecogenicidade anecoica)? Cisto simples → ACR TI-RADS 1. */
function isCisto(nod: TireoideNodulo): boolean {
  return nod.ecogenicidade !== null && nod.ecogenicidade.startsWith("anecoica");
}

/** Frase enxuta (objetivo) de um nódulo no ACHADOS. */
function noduloAchadoObjetivo(nod: TireoideNodulo): string {
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
  const temDifusa = lobos.some((l) => !!l.lobo.ecotextura_alterada);
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
    const difusa = lobos
      .map((l) => l.lobo.ecotextura_alterada?.trim())
      .find((t) => !!t);
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
   * Linfonodos — os mesmos TRÊS estados do clássico.
   *
   * O `&&` de antes jogava "alterado sem descrição" no `else` e escrevia
   * "Não há evidência de linfonodomegalias" nos ACHADOS, enquanto a IMPRESSÃO
   * logo abaixo dizia "de aspecto alterado". Mesma contradição que D4 corrigiu
   * no clássico, viva no outro estilo. (Codex, 20/08.)
   *
   * ⚠️ O que este trecho NÃO resolve: quando `linfonodos_descritos` é falso —
   * o médico não avaliou as cadeias — o objetivo continua afirmando
   * "Não há evidência de linfonodomegalias", isto é, um achado negativo que
   * ninguém fez. O clássico omite a linha nesse caso, então os dois estilos
   * divergem. Alinhar muda o texto de TODO laudo objetivo em que os linfonodos
   * não foram mencionados, e por isso é decisão do Luiz, não deste ajuste.
   */
  if (f.linfonodos_descritos && f.linfonodos_alterados) {
    const desc = f.linfonodos_descricao?.trim();
    achados.push(desc ? desc : LINFONODOS_ATIPICOS_SEM_DESCRICAO);
  } else {
    achados.push("Não há evidência de linfonodomegalias.");
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
    impressao.push(
      volStatus === "aumentado" ? TIREOIDOPATIA_BOCIO : TIREOIDOPATIA,
    );
  }

  // Item por nódulo com a categoria ACR calculada/ditada.
  for (const { lobo } of lobosComNodulo) {
    for (const nod of lobo.nodulos) {
      const eco = nod.ecogenicidade ? ECOGENICIDADE[nod.ecogenicidade].txtM : "sólido";
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
