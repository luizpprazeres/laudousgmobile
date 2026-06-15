import { z } from "zod";

/**
 * DET-5 — Renderer de ULTRASSONOGRAFIA DE PARTES MOLES (render PROGRAMÁTICO,
 * sem template_body), estilo CLÁSSICO.
 *
 * O LLM extrai dados tipados (cada lesão com TIPO em enum fechado + eixos
 * descritivos); o código:
 *  - monta o laudo por construção (estrutura/cabeçalhos garantidos);
 *  - descreve cada lesão na seção morfológica (SEM diagnóstico) e a interpreta
 *    na CONCLUSÃO (mapeamento achado↔conclusão fixo por tipo);
 *  - usa placeholder ____ quando a medida está ausente;
 *  - silêncio → normalidade (NUNCA inventa achado).
 *
 * Cabeçalhos (Clássico):
 *   TÍTULO
 *   COMENTÁRIOS:
 *   OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
 *   CONCLUSÃO:
 *
 * Fonte clínica:
 *  - modelo CLÁSSICO validado no DB (knowledge_blocks, writing_style_id
 *    11111111-1111-4111-8111-111111111111): estrutura + frases normais;
 *  - laudousg/lib/categoryDefaults.ts → PARTES_MOLES (achados/conclusões por tipo);
 *  - docs/catalogo-clinico-exames.md e captures/partes-moles.txt.
 *
 * Regras: descrição morfológica não diagnostica; concordância de gênero
 * (imagem = feminino; nódulo/cisto/lipoma/corpo estranho = masculino);
 * 1 casa decimal nas medidas; "a esclarecer" só quando a lesão sólida não é
 * caracterizável; nunca afastar achado (ex.: "sem cisto") salvo se ditado.
 */

// ---------------------------------------------------------------------------
// Vocabulário dos eixos descritivos (enums fechados)
// ---------------------------------------------------------------------------

const ECOGENICIDADE = {
  anecoica: { txt: "anecoica", txtM: "anecoico" },
  hipoecoica: { txt: "hipoecoica", txtM: "hipoecoico" },
  isoecoica: { txt: "isoecoica", txtM: "isoecoico" },
  hiperecoica: { txt: "hiperecoica", txtM: "hiperecoico" },
  heterogenea: { txt: "heterogênea", txtM: "heterogêneo" },
} as const;
type EcoKey = keyof typeof ECOGENICIDADE;

const CONTORNOS = {
  regulares: "de contornos regulares",
  irregulares: "de contornos irregulares",
} as const;
type ContornosKey = keyof typeof CONTORNOS;

const PLANO = {
  subcutaneo: "no tecido celular subcutâneo",
  muscular: "no plano muscular",
  interface: "na interface dermo-hipodérmica",
} as const;
type PlanoKey = keyof typeof PLANO;

const DOPPLER = {
  com_fluxo: "com fluxo ao Doppler colorido",
  sem_fluxo: "sem fluxo ao Doppler colorido",
} as const;
type DopplerKey = keyof typeof DOPPLER;

// Tipos de lesão suportados (fechados). Cada tipo define como é DESCRITO no
// corpo e COMO É CONCLUÍDO — o LLM apenas classifica; o código redige.
const LESAO_TIPO = {
  nodulo_solido: "nódulo sólido",
  lipoma: "lipoma",
  cisto: "cisto",
  colecao: "coleção",
  linfonodo: "linfonodo",
  corpo_estranho: "corpo estranho",
  hernia: "hérnia",
} as const;
type LesaoTipoKey = keyof typeof LESAO_TIPO;

const ecoKeys = Object.keys(ECOGENICIDADE) as EcoKey[];
const contornosKeys = Object.keys(CONTORNOS) as ContornosKey[];
const planoKeys = Object.keys(PLANO) as PlanoKey[];
const dopplerKeys = Object.keys(DOPPLER) as DopplerKey[];
const tipoKeys = Object.keys(LESAO_TIPO) as LesaoTipoKey[];

// ---------------------------------------------------------------------------
// Schema de achados (zod)
// ---------------------------------------------------------------------------

const LesaoSchema = z.object({
  tipo: z.enum(tipoKeys as [LesaoTipoKey, ...LesaoTipoKey[]]),
  ecogenicidade: z.enum(ecoKeys as [EcoKey, ...EcoKey[]]).nullable(),
  contornos: z.enum(contornosKeys as [ContornosKey, ...ContornosKey[]]).nullable(),
  plano: z.enum(planoKeys as [PlanoKey, ...PlanoKey[]]).nullable(),
  doppler: z.enum(dopplerKeys as [DopplerKey, ...DopplerKey[]]).nullable(),
  // Sub-feições por tipo (texto verbatim controlado):
  conteudo: z.string().nullable(), // coleção/cisto: "com ecos internos", "septada"...
  paredes: z.string().nullable(), // coleção/cisto: "de paredes finas/espessas"
  reducao: z.string().nullable(), // hérnia: "redutível"/"irredutível à compressão"
  conteudo_hernia: z.string().nullable(), // hérnia: "gordura"/"alça intestinal"
  parede_hernia: z.string().nullable(), // hérnia: "aponeurose"/"fáscia"
  tipo_hernia: z.string().nullable(), // hérnia: "incisional"/"epigástrica"/"umbilical"
  natureza_colecao: z.string().nullable(), // coleção: "abscesso"/"hematoma"/"higroma"...
  medidas_cm: z.array(z.number()).nullable(), // [c1,c2,c3] ou [c] (corpo estranho)
  localizacao: z.string().nullable(), // "na região do antebraço direito"...
  descricao_raw: z.string().nullable(), // verbatim (auditoria)
});

export const PartesMolesFindingsSchema = z.object({
  regiao: z.string().nullable(), // região solicitada (entra no COMENTÁRIOS quando ditada)
  lesoes: z.array(LesaoSchema),
  achados_adicionais: z.string().nullable(),
});

export type PartesMolesFindings = z.infer<typeof PartesMolesFindingsSchema>;
export type PartesMolesLesao = z.infer<typeof LesaoSchema>;

// ---------------------------------------------------------------------------
// JSON Schema strict para OpenAI (todos required, nullable via union).
// ---------------------------------------------------------------------------

const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const numArr = { type: ["array", "null"], items: { type: "number" } } as const;
const enumNull = (vals: readonly string[]) =>
  ({ type: ["string", "null"], enum: [...vals, null] }) as const;

const LESAO_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "tipo",
    "ecogenicidade",
    "contornos",
    "plano",
    "doppler",
    "conteudo",
    "paredes",
    "reducao",
    "conteudo_hernia",
    "parede_hernia",
    "tipo_hernia",
    "natureza_colecao",
    "medidas_cm",
    "localizacao",
    "descricao_raw",
  ],
  properties: {
    tipo: { type: "string", enum: tipoKeys },
    ecogenicidade: enumNull(ecoKeys),
    contornos: enumNull(contornosKeys),
    plano: enumNull(planoKeys),
    doppler: enumNull(dopplerKeys),
    conteudo: str,
    paredes: str,
    reducao: str,
    conteudo_hernia: str,
    parede_hernia: str,
    tipo_hernia: str,
    natureza_colecao: str,
    medidas_cm: numArr,
    localizacao: str,
    descricao_raw: str,
  },
} as const;

export const PARTES_MOLES_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["regiao", "lesoes", "achados_adicionais"],
  properties: {
    regiao: str,
    lesoes: { type: "array", items: LESAO_JSON },
    achados_adicionais: str,
  },
} as const;

// ---------------------------------------------------------------------------
// Prompt de extração
// ---------------------------------------------------------------------------

export const PARTES_MOLES_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DE PARTES MOLES.
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada. Sua função
é CLASSIFICAR cada lesão descrita pelo médico — quem escreve o laudo é o código.

REGRAS:
1. regiao: a região anatômica solicitada/avaliada, verbatim quando o médico
   disser ("antebraço direito", "região cervical", "parede abdominal"...);
   null se não dita.
2. lesoes: lista de lesões focais descritas; [] se o exame for normal (sem
   coleção, massa ou alteração focal). Silêncio = normalidade — NUNCA crie lesão.
3. Para cada lesão, classifique o TIPO no enum (escolha o mais próximo):
   - nodulo_solido: imagem/nódulo sólido a esclarecer (não-lipoma).
   - lipoma: nódulo hiperecoico/isoecoico homogêneo, compressível, fusiforme,
     compatível com lipoma.
   - cisto: imagem cística (cisto de inclusão epidérmica, cisto sebáceo...).
   - colecao: coleção líquida/complexa (abscesso, hematoma, seroma, higroma...).
   - linfonodo: linfonodo (normal ou alterado).
   - corpo_estranho: imagem linear hiperecoica com reverberação posterior.
   - hernia: solução de continuidade da parede com herniação de conteúdo.
4. Eixos descritivos (null quando o médico não disser):
   - ecogenicidade: anecoica | hipoecoica | isoecoica | hiperecoica | heterogenea.
   - contornos: regulares | irregulares. ("margens" = contornos.)
   - plano: subcutaneo | muscular | interface (onde a lesão está).
   - doppler: com_fluxo | sem_fluxo (somente se avaliado ao Doppler).
   - medidas_cm: as medidas em cm — [c1,c2,c3] no caso geral, ou [comprimento]
     para corpo estranho; null se não ditas.
   - localizacao: frase de localização verbatim do médico ("na região do
     antebraço direito", "no terço médio da coxa esquerda"...).
   - descricao_raw: a descrição verbatim do médico para esta lesão (auditoria).
5. Sub-feições por tipo (preencher só quando aplicável; senão null):
   - cisto/colecao → conteudo ("com ecos internos", "septada", "anecoica"),
     paredes ("de paredes finas", "de paredes espessas").
   - colecao → natureza_colecao: a natureza provável SOMENTE quando o médico
     disser ("abscesso", "hematoma", "seroma", "higroma", "cisto de inclusão
     epidérmica"); null se não disser (o código conclui como "coleção a esclarecer").
   - hernia → parede_hernia ("aponeurose"/"fáscia"), conteudo_hernia
     ("gordura"/"alça intestinal"), reducao ("redutível"/"irredutível à
     compressão"), tipo_hernia ("incisional"/"epigástrica"/"umbilical").
6. achados_adicionais: SOMENTE alterações reais fora do padrão acima; null se
   não houver.`;

// ---------------------------------------------------------------------------
// Helpers de formatação
// ---------------------------------------------------------------------------

/** 1 casa decimal SEMPRE, vírgula como separador (P3). */
function ptBr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

/** Medidas em 3 eixos com placeholder ____ por eixo ausente. */
function medidasFmt(arr: number[] | null): string {
  if (!arr || arr.length === 0) return "____ x ____ x ____ cm";
  const vals = [0, 1, 2].map((i) =>
    Number.isFinite(arr[i]) ? ptBr1(arr[i] as number) : "____",
  );
  return `${vals.join(" x ")} cm`;
}

/** Medida única (corpo estranho): comprimento aproximado. */
function medidaUnicaFmt(arr: number[] | null): string {
  if (!arr || arr.length === 0 || !Number.isFinite(arr[0])) return "____ cm";
  return `${ptBr1(arr[0] as number)} cm`;
}

/** Local da lesão (com a frase ditada, ou genérico "na região avaliada"). */
function localFmt(les: PartesMolesLesao): string {
  if (les.localizacao && les.localizacao.trim() !== "") {
    return les.localizacao.trim().replace(/\.+$/, "");
  }
  return "na região avaliada";
}

/** Plano + local, evitando duplicar quando só um existe. */
function planoLocal(les: PartesMolesLesao): string {
  const partes: string[] = [];
  if (les.plano) partes.push(PLANO[les.plano]);
  partes.push(localFmt(les));
  return partes.join(", ");
}

function limpa(s: string): string {
  return s.trim().replace(/\.+$/, "");
}

// ---------------------------------------------------------------------------
// Frases fixas (Clássico)
// ---------------------------------------------------------------------------

const TITULO = "ULTRASSONOGRAFIA DE PARTES MOLES";

function comentarios(regiao: string | null): string {
  const alvo =
    regiao && regiao.trim() !== "" ? `a região ${limpa(regiao)}` : "a região solicitada";
  return `COMENTÁRIOS:\nExame realizado com transdutor de 12 MHz, abrangendo ${alvo}. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.`;
}

const ASPECTOS_NORMAIS =
  "Planos musculares e tecidos subcutâneos com ecogenicidade e ecotextura normais.\nNão há evidência de coleção, massa ou alteração focal.";

const CONCLUSAO_NORMAL = "Ausência de alterações detectáveis pelo método.";

// ---------------------------------------------------------------------------
// Descrição morfológica de cada lesão (corpo) — SEM diagnóstico
// ---------------------------------------------------------------------------

function descreveLesao(les: PartesMolesLesao): string {
  switch (les.tipo) {
    case "nodulo_solido": {
      const eco = les.ecogenicidade ? ECOGENICIDADE[les.ecogenicidade].txt : "sólida";
      const partes = [`Imagem nodular sólida, ${eco}`];
      if (les.contornos) partes.push(CONTORNOS[les.contornos]);
      partes.push(`medindo ${medidasFmt(les.medidas_cm)}`);
      partes.push(`localizada ${planoLocal(les)}`);
      if (les.doppler) partes.push(DOPPLER[les.doppler]);
      return `${partes.join(", ")}.`;
    }
    case "lipoma": {
      const eco = les.ecogenicidade ? ECOGENICIDADE[les.ecogenicidade].txt : "hiperecoica";
      const partes = [`Imagem nodular ${eco}, homogênea`];
      if (les.contornos) partes.push(CONTORNOS[les.contornos]);
      partes.push(`medindo ${medidasFmt(les.medidas_cm)}`);
      partes.push(`localizada ${planoLocal(les)}`);
      if (les.doppler) partes.push(DOPPLER[les.doppler]);
      return `${partes.join(", ")}.`;
    }
    case "cisto": {
      const eco = les.ecogenicidade ? ECOGENICIDADE[les.ecogenicidade].txt : "anecoica";
      const partes = [`Imagem cística ${eco}`];
      if (les.conteudo) partes.push(limpa(les.conteudo));
      if (les.paredes) partes.push(limpa(les.paredes));
      if (les.contornos) partes.push(CONTORNOS[les.contornos]);
      partes.push(`medindo ${medidasFmt(les.medidas_cm)}`);
      partes.push(`localizada ${planoLocal(les)}`);
      return `${partes.join(", ")}.`;
    }
    case "colecao": {
      // Conteúdo cola direto em "Coleção" (sem vírgula): "Coleção com ecos internos".
      const head = les.conteudo ? `Coleção ${limpa(les.conteudo)}` : "Coleção";
      const partes = [head];
      if (les.paredes) partes.push(limpa(les.paredes));
      if (les.contornos) partes.push(CONTORNOS[les.contornos]);
      partes.push(`medindo ${medidasFmt(les.medidas_cm)}`);
      partes.push(`localizada ${planoLocal(les)}`);
      if (les.doppler) partes.push(DOPPLER[les.doppler]);
      return `${partes.join(", ")}.`;
    }
    case "linfonodo": {
      const eco = les.ecogenicidade ? ECOGENICIDADE[les.ecogenicidade].txt : null;
      const partes = ["Linfonodo"];
      if (eco) partes.push(eco);
      if (les.contornos) partes.push(CONTORNOS[les.contornos]);
      partes.push(`medindo ${medidasFmt(les.medidas_cm)}`);
      partes.push(`situado ${localFmt(les)}`);
      if (les.doppler) partes.push(DOPPLER[les.doppler]);
      return `${partes.join(", ")}.`;
    }
    case "corpo_estranho": {
      const partes = [
        "Imagem linear hiperecoica com reverberação posterior",
        `medindo aproximadamente ${medidaUnicaFmt(les.medidas_cm)}`,
        `localizada ${planoLocal(les)}`,
      ];
      return `${partes.join(", ")}.`;
    }
    case "hernia": {
      const parede = les.parede_hernia ? `da ${limpa(les.parede_hernia)}` : "da parede";
      const partes = [`Solução de continuidade ${parede} ${localFmt(les)}`];
      partes.push(`medindo ${medidaUnicaFmt(les.medidas_cm)}`);
      if (les.conteudo_hernia) partes.push(`com herniação de ${limpa(les.conteudo_hernia)}`);
      if (les.reducao) partes.push(limpa(les.reducao));
      return `${partes.join(", ")}.`;
    }
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Interpretação diagnóstica de cada lesão (CONCLUSÃO)
// ---------------------------------------------------------------------------

function concluiLesao(les: PartesMolesLesao): string {
  const loc = les.localizacao ? ` ${limpa(les.localizacao)}` : " na região avaliada";
  switch (les.tipo) {
    case "nodulo_solido":
      return `Imagem nodular sólida${loc}, a esclarecer. Correlacionar com dados clínicos.`;
    case "lipoma":
      return `Achados compatíveis com lipoma${loc}.`;
    case "cisto":
      return `Imagem cística${loc}, podendo corresponder a cisto de inclusão epidérmica. Correlacionar com dados clínicos.`;
    case "colecao": {
      if (les.natureza_colecao && les.natureza_colecao.trim() !== "") {
        return `Coleção${loc}, podendo corresponder a ${limpa(les.natureza_colecao)}. Correlacionar com dados clínicos.`;
      }
      return `Coleção${loc}, a esclarecer. Correlacionar com dados clínicos.`;
    }
    case "linfonodo":
      return `Linfonodo${loc}. Correlacionar com dados clínicos.`;
    case "corpo_estranho":
      return `Imagem compatível com corpo estranho${loc}.`;
    case "hernia": {
      const tipo = les.tipo_hernia ? `${limpa(les.tipo_hernia)} ` : "";
      return `Hérnia ${tipo}${loc.trim()}.`.replace(/\s+/g, " ").replace(" .", ".");
    }
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior; objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO reusando a
 * MESMA extração e a MESMA lógica/frases de achados (descreveLesao/concluiLesao).
 */
export function renderPartesMoles(
  f: PartesMolesFindings,
  opts?: { objetivo?: boolean },
): string {
  if (opts?.objetivo) return renderPartesMolesObjetivo(f);
  return renderPartesMolesClassico(f);
}

// ---------------------------------------------------------------------------
// Render (Clássico)
// ---------------------------------------------------------------------------

function renderPartesMolesClassico(f: PartesMolesFindings): string {
  const lesoes = Array.isArray(f.lesoes) ? f.lesoes : [];

  // ----- OS SEGUINTES ASPECTOS FORAM OBSERVADOS -----
  const aspectos: string[] = [];
  if (lesoes.length === 0) {
    aspectos.push(ASPECTOS_NORMAIS);
  } else {
    aspectos.push(
      "Planos musculares e tecidos subcutâneos avaliados na região solicitada.",
    );
    for (const les of lesoes) {
      const linha = descreveLesao(les);
      if (linha) aspectos.push(linha);
    }
  }
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(f.achados_adicionais.trim());
  }

  // ----- CONCLUSÃO -----
  const conclusaoItens: string[] = [];
  for (const les of lesoes) {
    const item = concluiLesao(les);
    if (item) conclusaoItens.push(item);
  }

  let conclusaoTxt: string;
  if (conclusaoItens.length === 0) {
    conclusaoTxt = CONCLUSAO_NORMAL;
  } else if (conclusaoItens.length === 1) {
    conclusaoTxt = conclusaoItens[0] as string;
  } else {
    conclusaoTxt = conclusaoItens.map((it, i) => `${i + 1}. ${it}`).join("\n");
  }

  const corpo = [
    TITULO,
    "",
    comentarios(f.regiao),
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    conclusaoTxt,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO
// ===========================================================================
//
// Reusa 100% a extração e a MESMA lógica/frases por tipo de lesão do clássico
// (descreveLesao no ACHADOS, concluiLesao na IMPRESSÃO). Estrutura enxuta
// inspirada no modelo "Partes moles" do nReport (TÉCNICA/ANÁLISE/OPINIÃO →
// aqui TÉCNICA/ACHADOS/IMPRESSÃO). Silêncio → normalidade (nunca inventa lesão);
// 1 casa decimal nas medidas; concordância de gênero — tudo herdado do clássico.

const TECNICA_OBJETIVO =
  "Exame realizado com transdutor linear de alta frequência.";

/** Linhas de normalidade do ACHADOS quando não há lesão focal (silêncio → normalidade). */
const ACHADOS_NORMAIS_OBJETIVO = [
  "Pele e tecido celular subcutâneo de espessura e ecogenicidade preservadas.",
  "Planos musculares sem alterações significativas.",
  "Não foram caracterizadas coleções organizadas.",
  "Ausência de formações expansivas ao estudo.",
];

const IMPRESSAO_NORMAL_OBJETIVO = "Exame sem alterações significativas.";

function renderPartesMolesObjetivo(f: PartesMolesFindings): string {
  const lesoes = Array.isArray(f.lesoes) ? f.lesoes : [];

  // ----- ACHADOS -----
  const achados: string[] = [];
  if (lesoes.length === 0) {
    achados.push(...ACHADOS_NORMAIS_OBJETIVO);
  } else {
    achados.push("Pele e tecido celular subcutâneo de espessura e ecogenicidade preservadas.");
    // Mesma descrição morfológica por tipo do clássico (sem diagnóstico).
    for (const les of lesoes) {
      const linha = descreveLesao(les);
      if (linha) achados.push(linha);
    }
  }
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push(f.achados_adicionais.trim());
  }

  // ----- IMPRESSÃO (mesma interpretação por tipo do clássico) -----
  const impressaoItens: string[] = [];
  for (const les of lesoes) {
    const item = concluiLesao(les);
    if (item) impressaoItens.push(item);
  }

  let impressaoTxt: string;
  if (impressaoItens.length === 0) {
    impressaoTxt = IMPRESSAO_NORMAL_OBJETIVO;
  } else if (impressaoItens.length === 1) {
    impressaoTxt = impressaoItens[0] as string;
  } else {
    impressaoTxt = impressaoItens.map((it, i) => `${i + 1}. ${it}`).join("\n");
  }

  const corpo = [
    TITULO,
    "",
    "TÉCNICA:",
    TECNICA_OBJETIVO,
    "",
    "ACHADOS:",
    achados.join("\n"),
    "",
    "IMPRESSÃO:",
    impressaoTxt,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}
