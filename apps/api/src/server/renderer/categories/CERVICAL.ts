import { z } from "zod";

/**
 * DET-5 — Renderer de ULTRASSONOGRAFIA CERVICAL (cadeias linfonodais cervicais),
 * estilo CLÁSSICO (render PROGRAMÁTICO, sem template_body).
 *
 * O LLM extrai dados tipados (níveis de Robbins, linfonodos normais/alterados com
 * medidas/forma/hilo/vascularização, glândulas salivares e tireoide quando ditadas);
 * o código monta o laudo POR CONSTRUÇÃO (estrutura/cabeçalhos/numeração garantidos;
 * placeholder ____; silêncio → normalidade).
 *
 * Estrutura fixa e imutável (Clássico):
 *   ULTRASSONOGRAFIA CERVICAL
 *   COMENTÁRIOS:
 *   OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
 *   CONCLUSÃO:
 *
 * Fonte clínica: knowledge_blocks CERVICAL kind=modelo status=validated (estilo
 * clássico '11111111-1111-4111-8111-111111111111') + lib/categoryDefaults.ts
 * (fonte viva, read-only) + /tmp/nreport/captures/cervical.txt.
 *
 * Lógica de NÍVEIS de Robbins (modelo do DB): a seção de aspectos SEMPRE menciona
 * todos os níveis cervicais (IA, IB, IIA, IIB, III, IV, VA, VB e VI). Linfonodos
 * normais ditados em níveis específicos saem com a frase canônica; linfonodos
 * alterados/suspeitos saem com medidas/forma/hilo/vascularização e item factual na
 * conclusão. Glândulas salivares (submandibulares/parótidas) e tireoide são
 * OPCIONAIS — só aparecem quando o médico as descrever (silêncio → omitir).
 */

// ---------------------------------------------------------------------------
// Níveis de Robbins (ordem canônica do modelo clássico do DB)
// ---------------------------------------------------------------------------

export const NIVEIS_ROBBINS = [
  "IA",
  "IB",
  "IIA",
  "IIB",
  "III",
  "IV",
  "VA",
  "VB",
  "VI",
] as const;
type NivelKey = (typeof NIVEIS_ROBBINS)[number];

const FORMA_LINFONODO = {
  oval: { txt: "de forma oval" },
  arredondada: { txt: "de forma arredondada" },
} as const;
type FormaLinfonodoKey = keyof typeof FORMA_LINFONODO;
const formaLinfonodoKeys = Object.keys(FORMA_LINFONODO) as FormaLinfonodoKey[];

const HILO = {
  presente: { txt: "com periferia hipoecoica e centro hiperecoico" },
  ausente: { txt: "sem hilo ecogênico identificável" },
} as const;
type HiloKey = keyof typeof HILO;
const hiloKeys = Object.keys(HILO) as HiloKey[];

const VASCULARIZACAO = {
  ausente: { txt: "sem vascularização significativa" },
  hilar: { txt: "com vascularização hilar" },
  periferica: { txt: "com vascularização periférica" },
  mista: { txt: "com vascularização mista (hilar e periférica)" },
  aumentada: { txt: "com aumento da vascularização" },
} as const;
type VascKey = keyof typeof VASCULARIZACAO;
const vascKeys = Object.keys(VASCULARIZACAO) as VascKey[];

const GLANDULA_LADO = ["direita", "esquerda"] as const;

// ---------------------------------------------------------------------------
// Schema de achados
// ---------------------------------------------------------------------------

const LinfonodoAlteradoSchema = z.object({
  nivel: z.enum(NIVEIS_ROBBINS as unknown as [NivelKey, ...NivelKey[]]),
  medidas_cm: z.array(z.number()).nullable(), // [c1,c2,c3] do linfonodo
  forma: z.enum(formaLinfonodoKeys as [FormaLinfonodoKey, ...FormaLinfonodoKey[]]).nullable(),
  hilo: z.enum(hiloKeys as [HiloKey, ...HiloKey[]]).nullable(),
  vascularizacao: z.enum(vascKeys as [VascKey, ...VascKey[]]).nullable(),
  suspeito: z.boolean(), // true → item de suspeição na conclusão
  descricao_raw: z.string().nullable(), // verbatim do médico (auditoria/override)
});

const GlandulaSchema = z.object({
  lado: z.enum(GLANDULA_LADO),
  alterada: z.boolean(),
  descricao: z.string().nullable(), // verbatim da alteração; null se normal
});

export const CervicalFindingsSchema = z.object({
  com_doppler: z.boolean(),
  // Níveis com linfonodos NORMAIS explicitamente ditados (frase canônica por nível).
  niveis_normais: z.array(z.enum(NIVEIS_ROBBINS as unknown as [NivelKey, ...NivelKey[]])),
  // Linfonodos ALTERADOS/aumentados/suspeitos (com medidas/forma/hilo/vascularização).
  linfonodos_alterados: z.array(LinfonodoAlteradoSchema),
  // Glândulas salivares (opcionais — só aparecem se descritas).
  submandibulares: z.array(GlandulaSchema),
  parotidas: z.array(GlandulaSchema),
  // Tireoide (opcional — só aparece se o médico a descrever).
  tireoide_descrita: z.boolean(),
  tireoide_alterada: z.boolean(),
  tireoide_descricao: z.string().nullable(),
  achados_adicionais: z.string().nullable(),
});

export type CervicalFindings = z.infer<typeof CervicalFindingsSchema>;
export type CervicalLinfonodoAlterado = z.infer<typeof LinfonodoAlteradoSchema>;
export type CervicalGlandula = z.infer<typeof GlandulaSchema>;

// ---------------------------------------------------------------------------
// JSON Schema strict para OpenAI (todos required, nullable via union)
// ---------------------------------------------------------------------------

const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const numArr = { type: ["array", "null"], items: { type: "number" } } as const;
const enumNull = (vals: readonly string[]) =>
  ({ type: ["string", "null"], enum: [...vals, null] }) as const;
const enumReq = (vals: readonly string[]) =>
  ({ type: "string", enum: [...vals] }) as const;

const LINFONODO_ALTERADO_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["nivel", "medidas_cm", "forma", "hilo", "vascularizacao", "suspeito", "descricao_raw"],
  properties: {
    nivel: enumReq(NIVEIS_ROBBINS),
    medidas_cm: numArr,
    forma: enumNull(formaLinfonodoKeys),
    hilo: enumNull(hiloKeys),
    vascularizacao: enumNull(vascKeys),
    suspeito: { type: "boolean" },
    descricao_raw: str,
  },
} as const;

const GLANDULA_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["lado", "alterada", "descricao"],
  properties: {
    lado: enumReq(GLANDULA_LADO),
    alterada: { type: "boolean" },
    descricao: str,
  },
} as const;

export const CERVICAL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "com_doppler",
    "niveis_normais",
    "linfonodos_alterados",
    "submandibulares",
    "parotidas",
    "tireoide_descrita",
    "tireoide_alterada",
    "tireoide_descricao",
    "achados_adicionais",
  ],
  properties: {
    com_doppler: { type: "boolean" },
    niveis_normais: { type: "array", items: enumReq(NIVEIS_ROBBINS) },
    linfonodos_alterados: { type: "array", items: LINFONODO_ALTERADO_JSON },
    submandibulares: { type: "array", items: GLANDULA_JSON },
    parotidas: { type: "array", items: GLANDULA_JSON },
    tireoide_descrita: { type: "boolean" },
    tireoide_alterada: { type: "boolean" },
    tireoide_descricao: str,
    achados_adicionais: str,
  },
} as const;

// ---------------------------------------------------------------------------
// Prompt de extração
// ---------------------------------------------------------------------------

export const CERVICAL_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA CERVICAL
(cadeias ganglionares/linfonodais cervicais, com avaliação por NÍVEIS de Robbins).
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada. Quem escreve
o laudo é o código.

CONTEXTO CLÍNICO: os níveis cervicais de Robbins são IA, IB, IIA, IIB, III, IV, VA,
VB e VI. O laudo SEMPRE menciona todos os níveis; o código cuida disso. Sua função é
classificar o que o médico DITOU.

REGRAS:
1. com_doppler: true SOMENTE com avaliação Doppler ativa / fluxo / vascularização
   ao Doppler colorido. Negações vencem ("sem Doppler", "Doppler não realizado").
2. niveis_normais: lista dos níveis (entre IA, IB, IIA, IIB, III, IV, VA, VB, VI) em
   que o médico DESCREVEU linfonodos de aspecto NORMAL/preservado explicitamente.
   [] se o exame for globalmente normal sem citar níveis (o código usa o modelo base
   normal) ou se não houver menção a níveis normais.
3. linfonodos_alterados: lista de linfonodos AUMENTADOS / suspeitos / anormais. Para
   cada um:
   - nivel: o nível de Robbins (IA | IB | IIA | IIB | III | IV | VA | VB | VI).
   - medidas_cm: as 3 medidas do linfonodo em cm; null se não ditas.
   - forma: oval | arredondada (arredondado = mais suspeito); null se não dita.
   - hilo: presente (periferia hipoecoica e centro hiperecoico / hilo ecogênico
     preservado) | ausente (sem hilo ecogênico identificável); null se não dito.
   - vascularizacao (só com Doppler): ausente | hilar | periferica | mista | aumentada;
     null se não dita. "vascularização periférica/central anômala" → periferica.
   - suspeito: true se o médico considerar o linfonodo SUSPEITO (forma arredondada,
     ausência de hilo, vascularização periférica/anômala, ou dito "suspeito"); false
     se apenas reacional/proeminente sem critérios de suspeição.
   - descricao_raw: a descrição verbatim do médico para este linfonodo (auditoria).
4. submandibulares / parotidas: SÓ inclua entradas se o médico AVALIAR/DESCREVER essas
   glândulas. Para cada glândula avaliada: lado (direita | esquerda), alterada (true se
   sialoadenite/nódulo/aumento/heterogeneidade), descricao (verbatim da alteração;
   null se normal). [] quando o médico não avaliar as glândulas salivares.
5. tireoide_descrita: true SOMENTE se o médico avaliar/descrever a tireoide neste exame
   cervical. tireoide_alterada: true se houver alteração (nódulo/tireoidopatia/aumento).
   tireoide_descricao: verbatim do médico quando descrita; null caso contrário.
6. achados_adicionais: SOMENTE alterações reais fora do padrão (ex.: cisto cervical,
   massa, paratireoide); null se não houver.`;

// ---------------------------------------------------------------------------
// Helpers de formatação (1 casa decimal P3; placeholder ____)
// ---------------------------------------------------------------------------

function ptBr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function medidasFmt(arr: number[] | null): string {
  if (!arr || arr.length === 0) return "____ x ____ x ____ cm";
  const vals = [0, 1, 2].map((i) =>
    Number.isFinite(arr[i]) ? ptBr1(arr[i] as number) : "____",
  );
  return `${vals.join(" x ")} cm`;
}

/** Concordância de gênero (lado feminino: "direita"/"esquerda"). */
function ladoFmt(lado: (typeof GLANDULA_LADO)[number]): string {
  return lado; // já em pt-BR feminino concordando com "glândula"
}

/** Lista de níveis na ordem canônica, juntando "e" antes do último. */
function listaNiveis(niveis: NivelKey[]): string {
  const ordenados = NIVEIS_ROBBINS.filter((n) => niveis.includes(n));
  if (ordenados.length === 0) return "";
  if (ordenados.length === 1) return ordenados[0] as string;
  return `${ordenados.slice(0, -1).join(", ")} e ${ordenados[ordenados.length - 1]}`;
}

/** Níveis não citados como normais nem como alterados → "demais níveis". */
function niveisRestantes(f: CervicalFindings): NivelKey[] {
  const citados = new Set<NivelKey>([
    ...f.niveis_normais,
    ...f.linfonodos_alterados.map((l) => l.nivel),
  ]);
  return NIVEIS_ROBBINS.filter((n) => !citados.has(n));
}

// ---------------------------------------------------------------------------
// Frases fixas
// ---------------------------------------------------------------------------

const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 12 MHz, abrangendo a avaliação das cadeias ganglionares cervicais. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

const ASPECTOS_NORMAL =
  "Cadeias ganglionares cervicais sem evidência de alterações ecográficas nos níveis IA, IB, IIA, IIB, III, IV, VA, VB e VI.";

const CONCLUSAO_NORMAL = "Ausência de alterações detectáveis pelo método.";

const FRASE_DEMAIS_NIVEIS =
  "Ausência de alterações ecográficas nos demais níveis da cadeia ganglionar cervical avaliada.";

// ---------------------------------------------------------------------------
// Render do corpo
// ---------------------------------------------------------------------------

/** Frase de linfonodo NORMAL em nível específico (frase canônica do DB). */
function nivelNormalCorpo(niveis: NivelKey[]): string {
  const lista = listaNiveis(niveis);
  const plural = niveis.length > 1;
  return `Linfonodos de aspecto ecográfico normal ${
    plural ? "nos níveis" : "no nível"
  } ${lista}, de imagens ovais, com periferia hipoecoica e centro hiperecoico.`;
}

/** Descritor de um linfonodo ALTERADO no corpo. */
function linfonodoAlteradoCorpo(l: CervicalLinfonodoAlterado, comDoppler: boolean): string {
  // Override verbatim: se o médico ditou a descrição completa, reproduz fielmente.
  if (l.descricao_raw && l.descricao_raw.trim() !== "") {
    return l.descricao_raw.trim().replace(/\.*$/, ".");
  }
  const partes: string[] = [
    `Linfonodo de dimensões aumentadas no nível ${l.nivel}`,
    `medindo ${medidasFmt(l.medidas_cm)}`,
  ];
  if (l.forma) partes.push(FORMA_LINFONODO[l.forma].txt);
  if (l.hilo) partes.push(HILO[l.hilo].txt);
  if (comDoppler && l.vascularizacao) {
    partes.push(`${VASCULARIZACAO[l.vascularizacao].txt} ao Doppler colorido`);
  }
  return `${partes.join(", ")}.`;
}

/** Frase de glândula salivar (parótida/submandibular) no corpo. */
function glandulaCorpo(
  tipo: "parótida" | "submandibular",
  g: CervicalGlandula,
): string {
  if (g.alterada && g.descricao && g.descricao.trim() !== "") {
    return g.descricao.trim().replace(/\.*$/, ".");
  }
  return `Glândula ${tipo} ${ladoFmt(g.lado)} tópica, de dimensões normais, contornos regulares e ecotextura preservada.`;
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior; objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO (estilo nReport).
 */
export function renderCervical(
  f: CervicalFindings,
  opts?: { objetivo?: boolean },
): string {
  if (opts?.objetivo) return renderCervicalObjetivo(f);
  return renderCervicalClassico(f);
}

// ---------------------------------------------------------------------------
// Render (estilo CLÁSSICO)
// ---------------------------------------------------------------------------

function renderCervicalClassico(f: CervicalFindings): string {
  const titulo = f.com_doppler
    ? "ULTRASSONOGRAFIA CERVICAL COM DOPPLER COLORIDO"
    : "ULTRASSONOGRAFIA CERVICAL";

  // ----- OS SEGUINTES ASPECTOS FORAM OBSERVADOS -----
  const aspectos: string[] = [];

  const temNiveisNormais = f.niveis_normais.length > 0;
  const temAlterados = f.linfonodos_alterados.length > 0;
  const temGlandulas = f.submandibulares.length > 0 || f.parotidas.length > 0;
  const temTireoide = f.tireoide_descrita;
  const temAchadosAd = !!(f.achados_adicionais && f.achados_adicionais.trim() !== "");

  const exameLinfonodalNormal = !temNiveisNormais && !temAlterados;

  // Bloco linfonodal.
  if (exameLinfonodalNormal) {
    aspectos.push(ASPECTOS_NORMAL);
  } else {
    // Níveis normais ditados (frase canônica por nível).
    if (temNiveisNormais) {
      aspectos.push(nivelNormalCorpo([...f.niveis_normais]));
    }
    // Linfonodos alterados (um por linha).
    for (const l of f.linfonodos_alterados) {
      aspectos.push(linfonodoAlteradoCorpo(l, f.com_doppler));
    }
    // Demais níveis sem alterações (fecha o bloco linfonodal) — só quando ainda
    // restam níveis não citados (sempre verdadeiro aqui, pois há pelo menos um
    // nível citado e os 9 níveis nunca são todos citados manualmente).
    if (niveisRestantes(f).length > 0) {
      aspectos.push(FRASE_DEMAIS_NIVEIS);
    }
  }

  // Glândulas salivares (opcionais).
  if (temGlandulas) {
    for (const g of f.submandibulares) {
      aspectos.push(`\n${glandulaCorpo("submandibular", g)}`);
    }
    for (const g of f.parotidas) {
      aspectos.push(glandulaCorpo("parótida", g));
    }
  }

  // Tireoide (opcional).
  if (temTireoide) {
    const desc =
      f.tireoide_descricao && f.tireoide_descricao.trim() !== ""
        ? f.tireoide_descricao.trim().replace(/\.*$/, ".")
        : f.tireoide_alterada
          ? "Glândula tireoide com alterações ao método (vide descrição)."
          : "Glândula tireoide tópica, de dimensões normais e ecotextura preservada.";
    aspectos.push(`\n${desc}`);
  }

  if (temAchadosAd) {
    aspectos.push(`\n${(f.achados_adicionais as string).trim()}`);
  }

  // ----- CONCLUSÃO -----
  const conclusao: string[] = [];
  const suspeitos = f.linfonodos_alterados.filter((l) => l.suspeito);
  const alteradosNaoSuspeitos = f.linfonodos_alterados.filter((l) => !l.suspeito);

  // Suspeitos → item factual por nível.
  for (const l of suspeitos) {
    conclusao.push(
      `Linfonodo de aspecto suspeito no nível ${l.nivel}. Correlacionar com achados clínicos.`,
    );
  }
  // Alterados/proeminentes não suspeitos → item de linfonodomegalia reacional.
  if (alteradosNaoSuspeitos.length > 0) {
    const niveis = listaNiveis(alteradosNaoSuspeitos.map((l) => l.nivel));
    const plural = alteradosNaoSuspeitos.length > 1;
    conclusao.push(
      `Linfonodo${plural ? "s" : ""} proeminente${plural ? "s" : ""} de aspecto reacional ${
        plural ? "nos níveis" : "no nível"
      } ${niveis}.`,
    );
  }

  // Glândulas alteradas → itens.
  for (const g of f.submandibulares.filter((x) => x.alterada)) {
    const d = g.descricao?.trim();
    conclusao.push(
      d ? `Alteração da glândula submandibular ${ladoFmt(g.lado)} (${d.replace(/\.+$/, "")}).` : `Alteração da glândula submandibular ${ladoFmt(g.lado)}.`,
    );
  }
  for (const g of f.parotidas.filter((x) => x.alterada)) {
    const d = g.descricao?.trim();
    conclusao.push(
      d ? `Alteração da glândula parótida ${ladoFmt(g.lado)} (${d.replace(/\.+$/, "")}).` : `Alteração da glândula parótida ${ladoFmt(g.lado)}.`,
    );
  }

  // Tireoide alterada → item.
  if (temTireoide && f.tireoide_alterada) {
    const d = f.tireoide_descricao?.trim();
    conclusao.push(
      d ? `Alteração tireoidiana (${d.replace(/\.+$/, "")}).` : "Alteração tireoidiana ao método.",
    );
  }

  if (temAchadosAd) {
    conclusao.push((f.achados_adicionais as string).trim().replace(/\.+$/, "") + ".");
  }

  if (conclusao.length === 0) {
    conclusao.push(CONCLUSAO_NORMAL);
  }

  const conclusaoTxt =
    conclusao.length === 1
      ? (conclusao[0] as string)
      : conclusao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  const corpo = [
    titulo,
    "",
    COMENTARIOS,
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
// Reusa a MESMA extração (CervicalFindings) e a MESMA lógica clínica do clássico
// (níveis de Robbins normais/alterados, suspeição, glândulas salivares, tireoide,
// Doppler). Texto mais enxuto, inspirado no nReport (/tmp/nreport/captures/
// cervical.txt): TÉCNICA / ACHADOS / IMPRESSÃO, frases diretas, 1 casa decimal,
// concordância de gênero. Mantém a fidelidade clínica (suspeição, reacional,
// alterações glandulares/tireoidianas e achados adicionais nunca são omitidos).

/** Frase de um linfonodo ALTERADO no ACHADOS (objetivo, mais enxuto). */
function linfonodoAlteradoObjetivo(
  l: CervicalLinfonodoAlterado,
  comDoppler: boolean,
): string {
  if (l.descricao_raw && l.descricao_raw.trim() !== "") {
    return l.descricao_raw.trim().replace(/\.*$/, ".");
  }
  const partes: string[] = [
    `Linfonodo de dimensões aumentadas no nível ${l.nivel}`,
    `medindo ${medidasFmt(l.medidas_cm)}`,
  ];
  if (l.forma) partes.push(FORMA_LINFONODO[l.forma].txt);
  if (l.hilo) partes.push(HILO[l.hilo].txt);
  if (comDoppler && l.vascularizacao) {
    partes.push(`${VASCULARIZACAO[l.vascularizacao].txt} ao Doppler colorido`);
  }
  return `${partes.join(", ")}.`;
}

/** Render do estilo OBJETIVO: TÉCNICA / ACHADOS / IMPRESSÃO. */
function renderCervicalObjetivo(f: CervicalFindings): string {
  const titulo = "ULTRASSONOGRAFIA DA REGIÃO CERVICAL";
  const tecnica = f.com_doppler
    ? "Exame realizado com transdutor linear de alta frequência, com avaliação ao Doppler colorido."
    : "Exame realizado com transdutor linear de alta frequência.";

  const temNiveisNormais = f.niveis_normais.length > 0;
  const temAlterados = f.linfonodos_alterados.length > 0;
  const exameLinfonodalNormal = !temNiveisNormais && !temAlterados;

  // ----- ACHADOS -----
  const achados: string[] = [];

  // Bloco linfonodal (níveis de Robbins).
  if (exameLinfonodalNormal) {
    achados.push(
      "Cadeias ganglionares cervicais (níveis IA a VI) sem evidência de linfonodomegalias ou de linfonodos de aspecto suspeito.",
    );
  } else {
    if (temNiveisNormais) {
      achados.push(nivelNormalObjetivo([...f.niveis_normais]));
    }
    for (const l of f.linfonodos_alterados) {
      achados.push(linfonodoAlteradoObjetivo(l, f.com_doppler));
    }
    if (niveisRestantes(f).length > 0) {
      achados.push(
        "Demais níveis da cadeia ganglionar cervical sem alterações ecográficas.",
      );
    }
  }

  // Glândulas salivares (opcionais — só quando descritas; mais enxuto: omite
  // listagem de normais somente se nenhuma foi avaliada).
  const temGlandulas = f.submandibulares.length > 0 || f.parotidas.length > 0;
  if (temGlandulas) {
    for (const g of f.submandibulares) {
      achados.push(glandulaCorpo("submandibular", g));
    }
    for (const g of f.parotidas) {
      achados.push(glandulaCorpo("parótida", g));
    }
  }

  // Tireoide (opcional).
  if (f.tireoide_descrita) {
    const desc =
      f.tireoide_descricao && f.tireoide_descricao.trim() !== ""
        ? f.tireoide_descricao.trim().replace(/\.*$/, ".")
        : f.tireoide_alterada
          ? "Glândula tireoide com alterações ao método (vide descrição)."
          : "Glândula tireoide tópica, de dimensões normais e ecotextura preservada.";
    achados.push(desc);
  }

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    achados.push((f.achados_adicionais as string).trim().replace(/\.*$/, "."));
  }

  // ----- IMPRESSÃO -----
  const impressao: string[] = [];
  const suspeitos = f.linfonodos_alterados.filter((l) => l.suspeito);
  const alteradosNaoSuspeitos = f.linfonodos_alterados.filter((l) => !l.suspeito);

  for (const l of suspeitos) {
    impressao.push(
      `Linfonodo de aspecto suspeito no nível ${l.nivel}. Correlacionar com achados clínicos.`,
    );
  }
  if (alteradosNaoSuspeitos.length > 0) {
    const niveis = listaNiveis(alteradosNaoSuspeitos.map((l) => l.nivel));
    const plural = alteradosNaoSuspeitos.length > 1;
    impressao.push(
      `Linfonodo${plural ? "s" : ""} proeminente${plural ? "s" : ""} de aspecto reacional ${
        plural ? "nos níveis" : "no nível"
      } ${niveis}.`,
    );
  }

  for (const g of f.submandibulares.filter((x) => x.alterada)) {
    const d = g.descricao?.trim();
    impressao.push(
      d
        ? `Alteração da glândula submandibular ${ladoFmt(g.lado)} (${d.replace(/\.+$/, "")}).`
        : `Alteração da glândula submandibular ${ladoFmt(g.lado)}.`,
    );
  }
  for (const g of f.parotidas.filter((x) => x.alterada)) {
    const d = g.descricao?.trim();
    impressao.push(
      d
        ? `Alteração da glândula parótida ${ladoFmt(g.lado)} (${d.replace(/\.+$/, "")}).`
        : `Alteração da glândula parótida ${ladoFmt(g.lado)}.`,
    );
  }

  if (f.tireoide_descrita && f.tireoide_alterada) {
    const d = f.tireoide_descricao?.trim();
    impressao.push(
      d ? `Alteração tireoidiana (${d.replace(/\.+$/, "")}).` : "Alteração tireoidiana ao método.",
    );
  }

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    impressao.push((f.achados_adicionais as string).trim().replace(/\.+$/, "") + ".");
  }

  if (impressao.length === 0) {
    impressao.push("Estudo ultrassonográfico dentro dos padrões da normalidade.");
  }

  const impressaoTxt =
    impressao.length === 1
      ? (impressao[0] as string)
      : impressao.map((it, i) => `${i + 1}. ${it}`).join("\n");

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
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

/** Frase de linfonodo NORMAL em nível específico (objetivo, mais enxuto). */
function nivelNormalObjetivo(niveis: NivelKey[]): string {
  const lista = listaNiveis(niveis);
  const plural = niveis.length > 1;
  return `Linfonodos de aspecto ecográfico normal ${
    plural ? "nos níveis" : "no nível"
  } ${lista} (imagens ovais, com periferia hipoecoica e centro hiperecoico).`;
}
