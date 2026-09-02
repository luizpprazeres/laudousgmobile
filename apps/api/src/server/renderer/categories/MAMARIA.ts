import { z } from "zod";
import { sugerirBiradsMamaria } from "@laudousg/shared";

/**
 * DET-5 — Renderer de MAMARIA (render PROGRAMÁTICO, estilo CLÁSSICO).
 *
 * Spec: docs/det-5-mamaria.md (workflow do Luiz + léxico ultrassonográfico
 * BI-RADS) e docs/det-5-mamaria-birads-pesquisa.md.
 *
 * Diferenças-chave: o BI-RADS final é CONFIRMADO pelo médico; a antiga
 * heurística permanece somente como apoio visual da interface e não entra no
 * laudo automaticamente. **Maior BI-RADS confirmado vence** (a categoria do estudo = a mais alta, e
 * só o item de maior categoria leva o rótulo "(Categoria BI-RADS® N)"). Margem
 * NUNCA "regular" (sempre circunscrita/indistinta/angular/microlobulada/
 * espiculada). Título dinâmico (axilas). Elastografia só descreve, não calcula.
 *
 * A sugestão 4A/4B/4C vem do núcleo compartilhado. Na web manual ela só entra
 * no laudo depois da confirmação médica explícita.
 */

// ---------------------------------------------------------------------------
// Léxico US (Atlas p.195-196) → enums
// ---------------------------------------------------------------------------

const TIPOS = [
  "cisto_simples",
  "multiplos_cistos",
  "microcistos_agrupados",
  "cisto_complicado",
  "nodulo_solido",
  "linfonodo_intramamario",
  "calcificacoes",
  "ginecomastia",
  "proteses",
  "achado_nao_nodular", // NML
] as const;
type Tipo = (typeof TIPOS)[number];

const ECOGENICIDADE = [
  "anecoico",
  "hipoecoico",
  "isoecoico",
  "hiperecoico",
  "complexo_solido_cistico",
  "heterogeneo",
] as const;
const ecoTxt: Record<string, string> = {
  anecoico: "anecoica",
  hipoecoico: "hipoecoica",
  isoecoico: "isoecoica",
  hiperecoico: "hiperecoica",
  complexo_solido_cistico: "complexa sólido-cística",
  heterogeneo: "heterogênea",
};

const FORMA = ["oval", "redonda", "irregular"] as const;
const ORIENTACAO = ["paralela", "nao_paralela"] as const;
const MARGEM = ["circunscrita", "indistinta", "angular", "microlobulada", "espiculada"] as const;
const margemTxt: Record<string, string> = {
  circunscrita: "circunscrita",
  indistinta: "indistinta",
  angular: "angular",
  microlobulada: "microlobulada",
  espiculada: "espiculada",
};
const POSTERIOR = ["nenhuma", "reforco", "sombra", "combinado"] as const;
const posteriorTxt: Record<string, string> = {
  nenhuma: "",
  reforco: "com reforço acústico posterior",
  sombra: "com sombra acústica posterior",
  combinado: "com padrão acústico posterior combinado",
};
const CALCIF = ["sem", "grosseiras_benignas", "em_nodulo", "fora_nodulo", "intraductais", "microcalcificacoes"] as const;
const ELASTICIDADE = ["macia", "intermediaria", "dura"] as const;
const VASCULARIZACAO = ["ausente", "periferica", "interna", "mista"] as const;

const LADO = ["direita", "esquerda", "bilateral"] as const;
type Lado = (typeof LADO)[number];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const AchadoSchema = z.object({
  tipo: z.enum(TIPOS),
  lado: z.enum(LADO).nullable(),
  ecogenicidade: z.enum(ECOGENICIDADE).nullable(),
  forma: z.enum(FORMA).nullable(),
  orientacao: z.enum(ORIENTACAO).nullable(), // "maior eixo paralelo à pele"
  margem: z.enum(MARGEM).nullable(),
  posterior: z.enum(POSTERIOR).nullable(),
  calcificacoes: z.enum(CALCIF).nullable(),
  elasticidade: z.enum(ELASTICIDADE).nullable(), // só descreve (v1)
  vascularizacao: z.enum(VASCULARIZACAO).nullable().optional(),
  vascularizacao_descricao: z.string().nullable().optional(),
  descritores: z.string().nullable(), // verbatim extras ("coalescentes", "agrupadas")
  medidas_cm: z.array(z.number()).nullable(),
  medida_invalida: z.string().nullable(), // medida ilegível → preservar + [?]
  localizacao: z.string().nullable(), // quadrante (vocab forçado)
  horario: z.string().nullable(), // "08 horas"
  dist_pele_cm: z.number().nullable(),
  dist_mamilo_cm: z.number().nullable(),
  descricao_nao_nodular: z.string().nullable(), // NML: "área heterogênea, sem configuração nodular"
  birads_ditado: z.string().nullable(), // override verbatim (vence o cálculo)
  permitir_birads_calculado: z.boolean().default(false),
});
export type MamariaAchado = z.infer<typeof AchadoSchema>;

const CorrelacaoSchema = z.object({
  tipo_exame: z.string().nullable(), // mamografia/RM/US
  data: z.string().nullable(), // dd/mm/aaaa
  efeito: z
    .enum(["mantem", "reclassifica", "biopsia_benigna", "discordante", "necessaria_indisponivel"])
    .nullable(),
  birads_final: z.string().nullable(),
});

export const MamariaFindingsSchema = z.object({
  escopo_exame: z.enum(["mamas", "axilas", "mamas_axilas"]).optional(),
  titulo_com_axilas: z.boolean(), // título "...E REGIÕES AXILARES"
  mama_masculina: z.boolean(),
  com_protese: z.boolean(),
  doppler_realizado: z.boolean().default(false),
  texto_fundo: z.string().nullable(), // default heterogêneo; ou o ditado
  achados: z.array(AchadoSchema),
  axilas_alteradas: z.boolean(),
  axilas_descricao: z.string().nullable(),
  correlacao: CorrelacaoSchema.nullable(),
  achados_adicionais: z.string().nullable(),
});
export type MamariaFindings = z.infer<typeof MamariaFindingsSchema>;

export type MamariaPreferences = { show_conduct_recommendation: boolean };
export const MAMARIA_DEFAULT_PREFERENCES: MamariaPreferences = {
  show_conduct_recommendation: false,
};

// JSON Schema strict
const str = { type: ["string", "null"] } as const;
const numArr = { type: ["array", "null"], items: { type: "number" } } as const;
const num = { type: ["number", "null"] } as const;
const enumN = (v: readonly string[]) => ({ type: ["string", "null"], enum: [...v, null] }) as const;

const ACHADO_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "tipo", "lado", "ecogenicidade", "forma", "orientacao", "margem", "posterior",
    "calcificacoes", "elasticidade", "vascularizacao", "vascularizacao_descricao", "descritores", "medidas_cm", "medida_invalida",
    "localizacao", "horario", "dist_pele_cm", "dist_mamilo_cm", "descricao_nao_nodular",
    "birads_ditado", "permitir_birads_calculado",
  ],
  properties: {
    tipo: { type: "string", enum: [...TIPOS] },
    lado: enumN(LADO),
    ecogenicidade: enumN(ECOGENICIDADE),
    forma: enumN(FORMA),
    orientacao: enumN(ORIENTACAO),
    margem: enumN(MARGEM),
    posterior: enumN(POSTERIOR),
    calcificacoes: enumN(CALCIF),
    elasticidade: enumN(ELASTICIDADE),
    vascularizacao: enumN(VASCULARIZACAO),
    vascularizacao_descricao: str,
    descritores: str,
    medidas_cm: numArr,
    medida_invalida: str,
    localizacao: str,
    horario: str,
    dist_pele_cm: num,
    dist_mamilo_cm: num,
    descricao_nao_nodular: str,
    birads_ditado: str,
    permitir_birads_calculado: { type: "boolean" },
  },
} as const;

export const MAMARIA_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "escopo_exame", "titulo_com_axilas", "mama_masculina", "com_protese", "doppler_realizado", "texto_fundo", "achados",
    "axilas_alteradas", "axilas_descricao", "correlacao", "achados_adicionais",
  ],
  properties: {
    escopo_exame: { type: "string", enum: ["mamas", "axilas", "mamas_axilas"] },
    titulo_com_axilas: { type: "boolean" },
    mama_masculina: { type: "boolean" },
    com_protese: { type: "boolean" },
    doppler_realizado: { type: "boolean" },
    texto_fundo: str,
    achados: { type: "array", items: ACHADO_JSON },
    axilas_alteradas: { type: "boolean" },
    axilas_descricao: str,
    correlacao: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["tipo_exame", "data", "efeito", "birads_final"],
      properties: {
        tipo_exame: str,
        data: str,
        efeito: enumN(["mantem", "reclassifica", "biopsia_benigna", "discordante", "necessaria_indisponivel"]),
        birads_final: str,
      },
    },
    achados_adicionais: str,
  },
} as const;

export const MAMARIA_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DAS MAMAS.
Classifique o ditado no JSON tipado (léxico BI-RADS US). NÃO redija laudo. NÃO invente.

REGRAS:
1. escopo_exame: mamas | axilas | mamas_axilas conforme as regiões efetivamente
   avaliadas. titulo_com_axilas: true nos escopos axilas e mamas_axilas; false
   em mamas. Em cada achado, permitir_birads_calculado deve ser false. O BI-RADS
   só entra no laudo quando o médico o ditar ou confirmar explicitamente; nesse
   caso, preencha birads_ditado.
2. mama_masculina: true se exame de mama masculina. com_protese: true se paciente
   com próteses mamárias.
3. texto_fundo: só se o médico ditar um padrão de fundo diferente; senão null
   (o renderer usa "ecotextura de fundo com aspecto heterogêneo").
4. achados[]: um objeto por imagem/achado. tipo:
   cisto_simples | multiplos_cistos | microcistos_agrupados | cisto_complicado |
   nodulo_solido | linfonodo_intramamario | calcificacoes | ginecomastia |
   proteses | achado_nao_nodular (lesão NÃO nodular / "área sem configuração nodular").
5. lado: direita | esquerda | bilateral.
6. Léxico do nódulo/imagem (classifique nos enums; null se não dito):
   - ecogenicidade: anecoico | hipoecoico | isoecoico | hiperecoico |
     complexo_solido_cistico | heterogeneo.
   - forma: oval | redonda | irregular. orientacao: paralela ("maior eixo paralelo
     à pele") | nao_paralela.
   - margem: circunscrita | indistinta | angular | microlobulada | espiculada.
     NUNCA "regular".
   - posterior: nenhuma | reforco | sombra | combinado.
   - calcificacoes: sem | grosseiras_benignas | em_nodulo | fora_nodulo |
     intraductais | microcalcificacoes.
   - elasticidade (elastografia): macia | intermediaria | dura (só se ditada).
   - vascularizacao: ausente | periferica | interna | mista, somente quando o
     Doppler tiver sido realizado. Preserve detalhes em vascularizacao_descricao.
7. descritores: termos extras verbatim do médico ("coalescentes", "agrupadas")
   — preservar. medidas_cm: as 3 medidas em cm; null se não ditas.
   medida_invalida: se a medida for ilegível, o texto cru (o renderer marca [?]).
8. localizacao: o quadrante VERBATIM (quadrante superolateral/superomedial/
   inferolateral/inferomedial; união dos quadrantes laterais/mediais/superiores/
   inferiores). horario: "HH horas" (ex.: "08 horas"). dist_pele_cm / dist_mamilo_cm
   só se ditadas.
9. descricao_nao_nodular (só tipo achado_nao_nodular): a descrição verbatim do
   médico (ex.: "área heterogênea, sem configuração nodular").
10. birads_ditado: a categoria BI-RADS que o médico DITAR explicitamente (ex.:
    "2", "3", "4A", "5", "6") — verbatim. null se não ditada. A aplicação
    jamais publica uma categoria inferida sem confirmação médica.
11. axilas_alteradas / axilas_descricao: só se o médico descrever linfonodos
    axilares ANORMAIS. correlacao: se houver menção a mamografia/RM/US prévia ou
    biópsia (tipo_exame, data dd/mm/aaaa, efeito, birads_final).
12. doppler_realizado: true somente se o Doppler mamário/axilar tiver sido
    realizado; false no exame ultrassonográfico convencional.
13. achados_adicionais: alterações reais fora dos tipos acima — incl. casos
    especiais do Atlas ainda NÃO modelados no v1 (necrose gordurosa, corpo
    estranho/implante, malformação arteriovenosa, pseudoaneurisma, doença de
    Mondor, coleção líquida pós-cirúrgica, distorção arquitetural, alterações
    ductais, espessamento/retração de pele, edema) — descrever verbatim aqui.
    null se não houver.`;

// ---------------------------------------------------------------------------
// BI-RADS — cálculo (heurística local; ditado vence; maior vence)
// ---------------------------------------------------------------------------

/** Rank para "maior BI-RADS vence": 5 > 4C > 4B > 4A > 3 > 0 > 2 > 1. */
function biradsRank(b: string | null): number {
  if (!b) return -1;
  const t = b.trim().toUpperCase();
  if (t.startsWith("5")) return 8;
  if (t === "4C") return 7;
  if (t === "4B") return 6;
  if (t === "4A" || t.startsWith("4")) return 5;
  if (t.startsWith("3")) return 4;
  if (t.startsWith("0")) return 3;
  if (t.startsWith("2")) return 2;
  if (t.startsWith("1")) return 1;
  if (t.startsWith("6")) return 9; // 6 = maligno comprovado, vence tudo
  return 0;
}

/** BI-RADS calculado por tipo+feições. Ditado vence (tratado fora). */
function calcBirads(a: MamariaAchado): string | null {
  return sugerirBiradsMamaria(a);
}

/** Resolve o BI-RADS do achado: ditado vence o cálculo. */
function biradsDoAchado(a: MamariaAchado): string | null {
  return a.birads_ditado?.trim() || (a.permitir_birads_calculado === false ? null : calcBirads(a));
}

/**
 * Guard BI-RADS "SÓ SINALIZA" (auditoria gap #3, flag MAMARIA_BIRADS_GUARD).
 *
 * Rebaixar categoria BI-RADS por heurística é risco clínico inaceitável (mascarar
 * malignidade) — a decisão é do médico. Este guard NUNCA muda a categoria; apenas
 * ANEXA "[REVISAR: …]" quando detecta uma incoerência objetiva, para o médico
 * conferir. Duas condições conservadoras:
 *
 * (A) Achado categorizável (nódulo sólido / não-nodular) SEM categoria BI-RADS
 *     resolvida no estudo — pega a OMISSÃO (caso real 3553d87e).
 * (B) BI-RADS >= 4 atribuído a um nódulo sólido com morfologia TOTALMENTE benigna
 *     (margem circunscrita + forma oval/redonda + orientação paralela + sem sombra
 *     acústica + sem calcificação suspeita) — pega a SUPERESTIMAÇÃO inequívoca
 *     (caso real 88543eea: 4A ditado sobre nódulo que a morfologia diz ser 3).
 *
 * NÃO tenta replicar o julgamento clínico do médico (ex.: rebaixar microlobulado/
 * angular por reconhecer fibroadenoma) — só a contradição objetiva. Conservador
 * para não gerar ruído de [REVISAR] em categorização legítima.
 */
function noduloTotalmenteBenigno(a: MamariaAchado): boolean {
  // Hallmarks benignos FORTES exigidos: margem circunscrita + orientação paralela.
  // Forma: aceita oval/redonda OU não-ditada (o médico raramente dita a forma —
  // caso real 88543eea só tinha margem+orientação); só EXCLUI forma "irregular"
  // (suspeita). Sem sombra acústica e sem calcificação suspeita.
  return (
    a.margem === "circunscrita" &&
    a.orientacao === "paralela" &&
    a.forma !== "irregular" &&
    a.posterior !== "sombra" &&
    a.calcificacoes !== "em_nodulo" &&
    a.calcificacoes !== "microcalcificacoes" &&
    a.calcificacoes !== "intraductais"
  );
}

/** Tipos que DEVEM carregar uma categoria BI-RADS na conclusão. */
const CATEGORIZAVEIS = new Set<Tipo>(["nodulo_solido", "achado_nao_nodular", "calcificacoes"]);

export function biradsRevisarNotes(f: MamariaFindings): string[] {
  const achados = Array.isArray(f.achados) ? f.achados : [];
  const notas: string[] = [];

  // (A) achado categorizável sem categoria BI-RADS resolvida.
  const semCategoria = achados.some(
    (a) => CATEGORIZAVEIS.has(a.tipo) && !biradsDoAchado(a),
  );
  if (semCategoria) {
    notas.push(
      "[REVISAR: achado categorizável sem categoria BI-RADS na conclusão — atribuir a categoria]",
    );
  }

  // (B) BI-RADS >= 4 sobre nódulo morfologicamente benigno (superestimação).
  for (const a of achados) {
    if (a.tipo !== "nodulo_solido") continue;
    const b = biradsDoAchado(a);
    if (b && biradsRank(b) >= 5 && noduloTotalmenteBenigno(a)) {
      const formaTxt = a.forma === "oval" ? "oval, " : a.forma === "redonda" ? "redondo, " : "";
      notas.push(
        `[REVISAR: BI-RADS ${b} atribuído a nódulo de morfologia benigna (margem circunscrita, ${formaTxt}paralelo à pele, sem sombra acústica) — confirmar categoria]`,
      );
    }
  }

  return notas;
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

function ptBr(n: number): string {
  return String(n).replace(".", ",");
}
/** Medida em cm — SEMPRE 1 casa decimal (P3): 1 → "1,0", 2,4 → "2,4". */
function med(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
function medidasFmt(a: MamariaAchado): string {
  if (a.medida_invalida && a.medida_invalida.trim() !== "") {
    return `${a.medida_invalida.trim()} [?] cm`;
  }
  const arr = a.medidas_cm;
  if (!arr || arr.length === 0) return "____ x ____ x ____ cm";
  const vals = [0, 1, 2].map((i) => (Number.isFinite(arr[i]) ? med(arr[i] as number) : "____"));
  return `${vals.join(" x ")} cm`;
}
/** 2 medidas com "por" — usado em achado não-nodular (NML), que só tem 2 dimensões. */
function medidasFmt2(a: MamariaAchado): string {
  if (a.medida_invalida && a.medida_invalida.trim() !== "") {
    return `${a.medida_invalida.trim()} [?] cm`;
  }
  const arr = a.medidas_cm;
  if (!arr || arr.length === 0) return "____ por ____ cm";
  const vals = [0, 1].map((i) => (Number.isFinite(arr[i]) ? med(arr[i] as number) : "____"));
  return `${vals.join(" por ")} cm`;
}
/** Maior eixo < 1 cm? (para "subcentimétricos" na conclusão de cistos). */
function isSubcentimetrico(a: MamariaAchado): boolean {
  const m = (a.medidas_cm ?? []).filter((n) => Number.isFinite(n)) as number[];
  return m.length > 0 && Math.max(...m) < 1.0;
}
/** "mama direita/esquerda" | "ambas as mamas" | "mama ____" (lado null → revisar,
 *  NUNCA inventa direita — review dex2). */
function mamaTxt(l: Lado | null): string {
  if (l === "esquerda") return "mama esquerda";
  if (l === "direita") return "mama direita";
  if (l === "bilateral") return "ambas as mamas";
  return "mama ____";
}
/** "à esquerda" / "à direita" / "bilateralmente" / "____" (para ginecomastia). */
function ladoSimples(l: Lado | null): string {
  if (l === "esquerda") return "à esquerda";
  if (l === "direita") return "à direita";
  if (l === "bilateral") return "bilateralmente";
  return "____";
}

const COMENTARIOS_PADRAO =
  "Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";
const COMENTARIOS_MAMAS_AXILAS =
  "Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas e as regiões axilares.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";
const COMENTARIOS_AXILAS =
  "Exame realizado com transdutor linear de alta frequência, abrangendo as regiões axilares.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";
const COMENTARIOS_MASCULINA =
  "Exame realizado com transdutor de 12 MHz, abrangendo a região retroareolar e todos os quadrantes de ambas as mamas, bem como as regiões axilares.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";
const COMENTARIOS_PROTESE =
  "Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas, bem como as regiões axilares. Paciente com próteses mamárias.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";

const TEXTO_FUNDO_PADRAO = "Mamas com ecotextura de fundo heterogênea.";
const AUSENCIA_LESAO = "Não há sinais evidentes de imagem nodular sólida, cística ou complexa.";
const AXILAR_NORMAL_CORPO =
  "Imagens ovais, com a periferia hipoecoica e o centro hiperecoico, nas axilas.";
const AXILAR_NORMAL_CONCLUSAO = "Linfonodos axilares normais.";

type EscopoMamaria = "mamas" | "axilas" | "mamas_axilas";

function escopoDe(f: MamariaFindings): EscopoMamaria {
  if (f.escopo_exame) return f.escopo_exame;
  return f.titulo_com_axilas ? "mamas_axilas" : "mamas";
}

function incluiMamas(escopo: EscopoMamaria): boolean {
  return escopo !== "axilas";
}

function incluiAxilas(escopo: EscopoMamaria): boolean {
  return escopo !== "mamas";
}

function tituloDoEscopo(escopo: EscopoMamaria): string {
  if (escopo === "axilas") return "ULTRASSONOGRAFIA DAS REGIÕES AXILARES";
  if (escopo === "mamas_axilas") return "ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES";
  return "ULTRASSONOGRAFIA DAS MAMAS";
}

function comentariosDoEscopo(f: MamariaFindings, escopo: EscopoMamaria): string {
  const comDoppler = f.doppler_realizado
    ? " Foi realizado estudo complementar com Doppler colorido."
    : "";
  if (escopo === "axilas") return `${COMENTARIOS_AXILAS}${comDoppler}`;
  if (f.mama_masculina) {
    const base = escopo === "mamas_axilas"
      ? COMENTARIOS_MASCULINA
      : COMENTARIOS_MASCULINA.replace(", bem como as regiões axilares", "");
    return `${base}${comDoppler}`;
  }
  if (f.com_protese) {
    const base = escopo === "mamas_axilas"
      ? COMENTARIOS_PROTESE
      : COMENTARIOS_PROTESE.replace(", bem como as regiões axilares", "");
    return `${base}${comDoppler}`;
  }
  const base = escopo === "mamas_axilas" ? COMENTARIOS_MAMAS_AXILAS : COMENTARIOS_PADRAO;
  return `${base}${comDoppler}`;
}

/**
 * O que se escreve quando o médico marca as axilas como ALTERADAS e não
 * descreve como.
 *
 * A palavra é **ATÍPICO**, e ela é dele: em 266 laudos de mama o único
 * linfonodo axilar fora do padrão conclui *"Linfonodo axilar atípico à
 * esquerda."* Não há nenhuma ocorrência de "de aspecto alterado".
 *
 * Sem estas duas frases, `axilas_alteradas = true` com descrição vazia caía no
 * ternário para a frase NORMAL — o corpo dizia que as axilas estavam normais e
 * a conclusão, logo abaixo, que estavam alteradas. O mesmo defeito que a
 * TIREOIDE tinha e que foi corrigido em 20/08; aqui ficou solto mais um dia.
 *
 * Sem lado e sem características, de propósito: o médico não as informou. O
 * cenário do catálogo chegou a cravar "à direita, de aspecto arredondado e com
 * espessamento cortical" para contornar isto — inventava a topografia e a
 * morfologia de um linfonodo que ninguém caracterizou.
 *
 * ⚠️ No corpus ele NUNCA publica linfonodo alterado sem descrever: quando
 * descreve, vem lado, achado e medida. Estas frases são rede de segurança do
 * ditado, não o caminho normal — a tela deve pedir a descrição.
 */
const AXILAR_ATIPICO_CORPO =
  "Linfonodos axilares de aspecto atípico.";
const AXILAR_ATIPICO_CONCLUSAO = "Linfonodos axilares de aspecto atípico.";
const RODAPE = "Breast Imaging Reporting and Data System do Colégio Americano de Radiologia (BI-RADS®).";

/** Sufixo de localização + horário + distâncias (comum a vários tipos). */
function localizacaoSufixo(a: MamariaAchado, plural = false): string {
  const partes: string[] = [];
  const situada = plural ? "situadas" : "situada";
  if (a.localizacao) partes.push(`${situada} no ${a.localizacao.replace(/^no\s+/i, "")}`);
  if (a.horario) partes.push(`às "${a.horario.replace(/"/g, "").replace(/\s*horas?$/i, "")} horas"`);
  // Distâncias: pele e mamilo numa única cláusula (sem vírgula antes do "e").
  if (a.dist_pele_cm !== null) {
    let d = `distando ${med(a.dist_pele_cm)} cm do seu centro até a pele`;
    if (a.dist_mamilo_cm !== null) d += ` e ${med(a.dist_mamilo_cm)} cm até o mamilo`;
    partes.push(d);
  } else if (a.dist_mamilo_cm !== null) {
    partes.push(`distando ${med(a.dist_mamilo_cm)} cm até o mamilo`);
  }
  return partes.length ? `, ${partes.join(", ")}` : "";
}

/** Maior eixo (para calcificações) — "X cm" ou "____ cm"; preserva [?]. */
function maiorEixoCm(a: MamariaAchado): string {
  if (a.medida_invalida && a.medida_invalida.trim() !== "") return `${a.medida_invalida.trim()} [?] cm`;
  const m = (a.medidas_cm ?? []).filter((n) => Number.isFinite(n)) as number[];
  return m.length ? `${med(Math.max(...m))} cm` : "____ cm";
}

/** Frase de calcificações no corpo, POR SUBTIPO (review dex2 #1). */
function calcificacoesCorpo(a: MamariaAchado): string {
  const mama = mamaTxt(a.lado);
  const loc = a.localizacao ? ` no ${a.localizacao.replace(/^no\s+/i, "")}` : "";
  const emMama = a.lado === "bilateral" ? "em ambas as mamas" : `na ${mama}`;
  // Horário (mesma formatação do localizacaoSufixo).
  const hora = a.horario
    ? `, às "${a.horario.replace(/"/g, "").replace(/\s*horas?$/i, "")} horas"`
    : "";
  switch (a.calcificacoes) {
    case "em_nodulo":
      return `Calcificações no interior de imagem nodular${loc} de ${mama}, medindo até ${maiorEixoCm(a)}.`;
    case "fora_nodulo":
      return `Calcificações fora de imagem nodular${loc} de ${mama}.`;
    case "intraductais":
      return `Calcificações de distribuição intraductal${loc} de ${mama}.`;
    case "microcalcificacoes":
      // Corpo descritivo, sem repetir a conclusão (P4).
      return `Imagens hiperecoicas puntiformes, que não ocasionam sombras acústicas, agrupadas em ${mama}${loc}${hora}.`;
    default: // grosseiras_benignas / sem
      // Corpo descritivo (P4): "Imagens hiperecoicas, medindo até X cm…".
      return `Imagens hiperecoicas, medindo até ${maiorEixoCm(a)} no seu maior eixo, ocasionando sombra acústica, mais evidentes ${emMama}.`;
  }
}

/** Frase do achado no CORPO (sequência do Luiz: eco→de mama→margem→paralelo→medida→calc→loc→dist). */
function achadoCorpo(a: MamariaAchado): string {
  const mama = mamaTxt(a.lado);
  switch (a.tipo) {
    case "ginecomastia":
      // Sem "compatível com ginecomastia" no corpo — o diagnóstico fica na conclusão (P4).
      return `${mama.charAt(0).toUpperCase()}${mama.slice(1)} com aumento do tecido fibroglandular retroareolar.`;
    case "proteses": {
      // Plano cirúrgico OPCIONAL (via descritores: "predominantemente retromusculares" etc).
      const plano = a.descritores?.trim() ? `, ${a.descritores.trim()}` : "";
      return `Próteses mamárias em topografia habitual${plano}, de contornos regulares, sem sinais ecográficos evidentes de rotura intracapsular ou extracapsular.`;
    }
    case "linfonodo_intramamario":
      return `Imagem oval, com a periferia hipoecoica e o centro hiperecoico, de maior eixo paralelo à pele, medindo ${medidasFmt(a)}, de ${mama}${localizacaoSufixo(a)}.`;
    case "calcificacoes":
      return calcificacoesCorpo(a);
    case "achado_nao_nodular": {
      // Formato Luiz #16: "Área heterogênea de mama X, sem configuração nodular,
      // medindo aproximadamente A por B cm…" (2 dimensões). Se o médico ditar uma
      // descrição custom (que não seja a de "configuração nodular"), respeita.
      const desc = a.descricao_nao_nodular?.trim();
      const prefixo =
        desc && !/configura[çc][ãa]o nodular/i.test(desc)
          ? `${desc.charAt(0).toUpperCase()}${desc.slice(1)} de ${mama}`
          : `Área heterogênea de ${mama}, sem configuração nodular`;
      return `${prefixo}, medindo aproximadamente ${medidasFmt2(a)}${localizacaoSufixo(a)}.`;
    }
    case "cisto_simples": {
      const eco = a.ecogenicidade ? ecoTxt[a.ecogenicidade] : "anecoica";
      return `Imagem ${eco} de ${mama}, com margem circunscrita, medindo ${medidasFmt(a)}${localizacaoSufixo(a)}.`;
    }
    case "cisto_complicado": {
      // Preserva a complicação (ecos internos/debris) — review dex2 #6.
      const desc = a.descritores?.trim() || "com finos ecos internos";
      return `Imagem anecoica, ${desc}, de ${mama}, com margem circunscrita, medindo ${medidasFmt(a)}${localizacaoSufixo(a)}.`;
    }
    case "multiplos_cistos": {
      const desc = a.descritores ? `, ${a.descritores.trim()}` : "";
      return `Imagens anecoicas${desc} de ${mama}, com margens circunscritas, a maior medindo ${medidasFmt(a)}${localizacaoSufixo(a)}.`;
    }
    case "microcistos_agrupados": {
      // Coalescentes, medindo EM CONJUNTO (decisão Luiz #4).
      const desc = a.descritores?.trim() || "coalescentes";
      return `Imagens anecoicas de ${mama}, ${desc}, com margens circunscritas, medindo em conjunto ${medidasFmt(a)}${localizacaoSufixo(a, true)}.`;
    }
    case "nodulo_solido": {
      const eco = a.ecogenicidade ? ecoTxt[a.ecogenicidade] : "hipoecoica";
      const partes = [`Imagem ${eco} de ${mama}`];
      if (a.margem) partes.push(`com margem ${margemTxt[a.margem]}`);
      if (a.orientacao === "paralela") partes.push("maior eixo paralelo à pele");
      partes.push(`medindo ${medidasFmt(a)}`);
      if (a.calcificacoes && a.calcificacoes !== "sem") partes.push("com calcificações de permeio");
      if (a.posterior && a.posterior !== "nenhuma") partes.push(posteriorTxt[a.posterior] as string);
      return `${partes.join(", ")}${localizacaoSufixo(a)}.`;
    }
    default:
      return `Imagem de ${mama}, medindo ${medidasFmt(a)}${localizacaoSufixo(a)}.`;
  }
}

function vascularizacaoCorpo(a: MamariaAchado): string | null {
  const livre = a.vascularizacao_descricao?.trim();
  if (livre) return `Ao Doppler colorido, ${livre.replace(/\.+$/, "")}.`;
  switch (a.vascularizacao) {
    case "ausente":
      return "Ao Doppler colorido, não se observa vascularização na imagem.";
    case "periferica":
      return "Ao Doppler colorido, observa-se vascularização predominantemente periférica na imagem.";
    case "interna":
      return "Ao Doppler colorido, observa-se vascularização interna na imagem.";
    case "mista":
      return "Ao Doppler colorido, observa-se vascularização periférica e interna na imagem.";
    default:
      return null;
  }
}

/** Conclusão de calcificações por subtipo (review dex2 #1). */
function calcificacoesConclusao(mama: string, loc: string, sub: MamariaAchado["calcificacoes"]): string {
  switch (sub) {
    case "em_nodulo":
      return `Calcificações no interior de imagem nodular em ${mama}${loc}`;
    case "fora_nodulo":
      return `Calcificações extranodulares em ${mama}${loc}`;
    case "intraductais":
      return `Calcificações de distribuição intraductal em ${mama}${loc}`;
    case "microcalcificacoes":
      return `Microcalcificações agrupadas em ${mama}${loc}`;
    default:
      return `Calcificações grosseiras de aspecto benigno em ${mama}${loc}`;
  }
}

/** Item de conclusão do achado (sem o BI-RADS — o rótulo é colocado só no maior). */
function achadoConclusaoBase(a: MamariaAchado): string {
  const mama = mamaTxt(a.lado);
  const loc = a.localizacao ? ` no ${a.localizacao.replace(/^no\s+/i, "")}` : "";
  switch (a.tipo) {
    case "cisto_simples":
      return `Cisto simples em ${mama}${loc}`;
    case "multiplos_cistos":
      return `Cistos mamários simples em ${mama}${loc}`;
    case "microcistos_agrupados":
      return `Microcistos agrupados em ${mama}${loc}`;
    case "cisto_complicado":
      return `Cisto de conteúdo espesso em ${mama}${loc}`;
    case "nodulo_solido":
      return `Imagem sólida em ${mama}${loc}`;
    case "linfonodo_intramamario":
      return `Linfonodo intramamário em ${mama}${loc}`;
    case "calcificacoes":
      return calcificacoesConclusao(mama, loc, a.calcificacoes);
    case "ginecomastia":
      return `Ginecomastia ${ladoSimples(a.lado)}`;
    case "proteses":
      return "Próteses mamárias sem sinais de rotura";
    case "achado_nao_nodular":
      return `Massa heterogênea não nodular em ${mama}${loc}`;
    default:
      return `Achado em ${mama}${loc}`;
  }
}

/** Conclusão de malignidade comprovada (BI-RADS 6, ditado) — frase própria (dex2 #3). */
function conclusao6(a: MamariaAchado): string {
  const mama = mamaTxt(a.lado);
  const loc = a.localizacao ? ` no ${a.localizacao.replace(/^no\s+/i, "")}` : "";
  return `Lesão com malignidade comprovada por biópsia em ${mama}${loc}`;
}

/** Conduta por categoria BI-RADS (toggle). Vai na seção "Conduta sugerida:",
 *  então SEM "Recomenda-se" (o rótulo já dá o sentido — sem redundância, #20). */
function condutaDoBirads(b: string): string | null {
  const t = b.trim().toUpperCase();
  if (t.startsWith("6")) return "Manejo conforme protocolo oncológico vigente";
  if (t.startsWith("5")) return "Biópsia e encaminhamento à mastologia/oncologia";
  if (t.startsWith("4")) return "Biópsia para avaliação histopatológica";
  if (t.startsWith("3")) return "Controle por imagem em 6 meses";
  if (t.startsWith("0"))
    return "Avaliação complementar (mamografia/ressonância/US adicional)";
  if (t.startsWith("1") || t.startsWith("2"))
    return "Seguimento de rotina conforme idade da paciente";
  return null;
}

/** Frase de correlação com exame prévio (Dex; det-5-mamaria-birads-pesquisa.md §5). */
function correlacaoFrase(c: NonNullable<MamariaFindings["correlacao"]>): string | null {
  const ex = c.tipo_exame?.trim() || "exame prévio";
  const data = c.data?.trim() || "dd/mm/aaaa";
  const bx = c.birads_final?.trim() || "X";
  switch (c.efeito) {
    case "mantem":
      return `Comparado com ${ex} de ${data}, o achado permanece estável. Mantida Categoria BI-RADS® ${bx}.`;
    case "reclassifica":
      return `Correlação com ${ex} de ${data}: achado correspondente, sem sinais suspeitos adicionais. Reclassificado para Categoria BI-RADS® ${bx}.`;
    case "biopsia_benigna":
      return `Correlação com biópsia de ${data}: achado compatível com resultado histopatológico benigno. Categoria BI-RADS® ${bx}.`;
    case "discordante":
      return `Correlação com ${ex} de ${data} demonstra discordância entre os métodos. Recomenda-se correlação diagnóstica dirigida.`;
    case "necessaria_indisponivel":
      return `Exames anteriores não disponíveis para comparação. Categoria BI-RADS® 0 até correlação com ${ex} prévia ou complementar.`;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/** Mescla prefs cruas/parciais (JSONB da conta) com os defaults seguros. */
function mergeMamariaPrefs(
  prefsInput?: Partial<MamariaPreferences> | null,
): MamariaPreferences {
  return {
    ...MAMARIA_DEFAULT_PREFERENCES,
    ...(prefsInput && typeof prefsInput.show_conduct_recommendation === "boolean"
      ? { show_conduct_recommendation: prefsInput.show_conduct_recommendation }
      : {}),
  };
}

/**
 * Dispatcher fino: escolhe o estilo de redação. Clássico (default) preserva 100%
 * o comportamento anterior (LIVE em prod); objetivo usa TÉCNICA/ACHADOS/IMPRESSÃO
 * reusando a MESMA extração, o BI-RADS calculável e o toggle de conduta.
 */
export function renderMamaria(
  f: MamariaFindings,
  prefsInput?: Partial<MamariaPreferences> | null,
  opts?: { objetivo?: boolean; biradsGuard?: boolean },
): string {
  const biradsGuard = opts?.biradsGuard ?? false;
  if (opts?.objetivo) return renderMamariaObjetivo(f, prefsInput, biradsGuard);
  return renderMamariaClassico(f, prefsInput, biradsGuard);
}

/** Anexa as notas [REVISAR] do guard BI-RADS ao fim do texto (só-sinaliza). */
function appendBiradsNotes(texto: string, f: MamariaFindings, biradsGuard: boolean): string {
  if (!biradsGuard || !incluiMamas(escopoDe(f))) return texto;
  const notas = biradsRevisarNotes(f);
  return notas.length > 0 ? `${texto}\n\n${notas.join("\n")}` : texto;
}

function renderMamariaClassico(
  f: MamariaFindings,
  prefsInput?: Partial<MamariaPreferences> | null,
  biradsGuard = false,
): string {
  const prefs = mergeMamariaPrefs(prefsInput);
  const escopo = escopoDe(f);
  const comMamas = incluiMamas(escopo);
  const comAxilas = incluiAxilas(escopo);
  const titulo = tituloDoEscopo(escopo);
  const comentarios = comentariosDoEscopo(f, escopo);

  // ----- Corpo -----
  const aspectos: string[] = [];
  const achados = comMamas ? f.achados ?? [] : [];
  // P1 — "Não há sinais evidentes de imagem nodular sólida, cística ou complexa."
  // é OBRIGATÓRIA quando não há lesão nodular/cística descrita (exame normal E
  // também próteses/ginecomastia/calcificações isoladas — nunca remover).
  const TIPOS_LESAO = new Set<Tipo>([
    "cisto_simples", "multiplos_cistos", "microcistos_agrupados",
    "cisto_complicado", "nodulo_solido", "achado_nao_nodular",
  ]);
  const temLesao = achados.some((a) => TIPOS_LESAO.has(a.tipo));
  if (comMamas) {
    aspectos.push(f.texto_fundo?.trim() || TEXTO_FUNDO_PADRAO);
    if (!temLesao) aspectos.push(AUSENCIA_LESAO);
    for (const a of achados) {
      aspectos.push(achadoCorpo(a));
      if (f.doppler_realizado) {
        const vascular = vascularizacaoCorpo(a);
        if (vascular) aspectos.push(vascular);
      }
    }
  }
  // Elastografia (frase adicional, sem cálculo).
  for (const a of achados) {
    if (a.elasticidade)
      aspectos.push(`À elastografia, a imagem apresenta elasticidade ${a.elasticidade === "intermediaria" ? "intermediária" : a.elasticidade}.`);
  }
  // Axilas: se o título inclui axilas, a frase aparece SEMPRE (decisão Luiz).
  if (comAxilas) {
    /**
     * TRÊS estados, não dois. O `&&` juntava "alterada sem descrição" com
     * "normal" e escrevia a frase de normalidade sob uma conclusão que dizia o
     * contrário.
     */
    const desc = f.axilas_descricao?.trim();
    aspectos.push(
      !f.axilas_alteradas ? AXILAR_NORMAL_CORPO : desc ? desc : AXILAR_ATIPICO_CORPO,
    );
  }
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "")
    aspectos.push(f.achados_adicionais.trim());

  // ----- Conclusão -----
  // BI-RADS: maior vence (categoria do estudo = a mais alta). TODOS os achados
  // empatados no maior rank levam o rótulo "(Categoria BI-RADS® N)" (review
  // dex2 #4); os demais não. BI-RADS 6 (malignidade comprovada) → frase própria.
  const maiorRank = achados.reduce((m, a) => Math.max(m, biradsRank(biradsDoAchado(a))), -1);
  const maiorB =
    achados.map(biradsDoAchado).find((b) => b !== null && biradsRank(b) === maiorRank) ?? null;

  const conclusao: string[] = [];
  if (comMamas && achados.length === 0) {
    conclusao.push("Mamas ecograficamente normais (Categoria BI-RADS® 1).");
  } else if (comMamas) {
    // #3 — cistos simples em ambos os lados (ou um achado bilateral) agregam num
    // único item "Cistos mamários simples bilateralmente[, subcentimétricos]".
    const CISTO = new Set<Tipo>(["cisto_simples", "multiplos_cistos"]);
    const cistos = achados.filter((a) => CISTO.has(a.tipo));
    const ladosCisto = new Set(cistos.map((a) => a.lado));
    const cistoBilateral =
      cistos.length >= 1 &&
      (ladosCisto.has("bilateral") ||
        (ladosCisto.has("direita") && ladosCisto.has("esquerda")));
    const sub = cistoBilateral && cistos.every(isSubcentimetrico) ? ", subcentimétricos" : "";
    let cistoEmitido = false;
    for (const a of achados) {
      const b = biradsDoAchado(a);
      const isMaior = b !== null && biradsRank(b) === maiorRank;
      if (cistoBilateral && CISTO.has(a.tipo)) {
        if (cistoEmitido) continue;
        cistoEmitido = true;
        const base = `Cistos mamários simples bilateralmente${sub}`;
        conclusao.push(isMaior ? `${base} (Categoria BI-RADS® ${b}).` : `${base}.`);
        continue;
      }
      const base = b && biradsRank(b) === 9 ? conclusao6(a) : achadoConclusaoBase(a);
      conclusao.push(isMaior ? `${base} (Categoria BI-RADS® ${b}).` : `${base}.`);
    }
  }
  // Axilas na conclusão (só quando o título inclui axilas).
  if (comAxilas) {
    const descAx = f.axilas_descricao?.trim();
    conclusao.push(
      !f.axilas_alteradas
        ? AXILAR_NORMAL_CONCLUSAO
        : descAx
          ? `Linfonodos axilares de aspecto atípico (${descAx.replace(/\.+$/, "")}).`
          : AXILAR_ATIPICO_CONCLUSAO,
    );
  }
  // Correlação com exame prévio.
  if (comMamas && f.correlacao) {
    const cf = correlacaoFrase(f.correlacao);
    if (cf) conclusao.push(cf);
  }
  // Conduta (toggle) — seção PRÓPRIA após a conclusão, fora da numeração (#20).
  // Sem redundância "Conduta sugerida" + "recomenda-se" (condutaDoBirads já vem
  // sem "Recomenda-se").
  let condutaSecao = "";
  if (prefs.show_conduct_recommendation && maiorB) {
    const cond = condutaDoBirads(maiorB);
    if (cond) condutaSecao = `Conduta sugerida:\nBI-RADS ${maiorB}. ${cond}.`;
  }

  const conclusaoTxt =
    conclusao.length === 1
      ? (conclusao[0] as string)
      : conclusao.map((it, i) => `${i + 1}. ${it}`).join("\n");

  const corpo = [
    titulo,
    "",
    "COMENTÁRIOS:",
    comentarios,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    conclusaoTxt,
    ...(condutaSecao ? ["", condutaSecao] : []),
    ...(comMamas ? ["", RODAPE] : []),
  ].join("\n");

  return appendBiradsNotes(corpo.replace(/\n{3,}/g, "\n\n").trim(), f, biradsGuard);
}

// ===========================================================================
// ESTILO OBJETIVO — TÉCNICA / ACHADOS / IMPRESSÃO + BI-RADS calculável
// ===========================================================================
//
// Reusa 100% da extração + o cálculo de BI-RADS (maior-vence, ditado-vence) + o
// toggle de conduta. Estrutura enxuta inspirada no modelo "Mama" do nReport
// (TÉCNICA/DESCRIÇÃO/OPINIÃO → aqui TÉCNICA/ACHADOS/IMPRESSÃO). Mantém: margens
// NUNCA "regulares", "de mama direita/esquerda", BI-RADS só no item de maior
// categoria, conduta em seção própria quando o toggle estiver ativo.

const TECNICA_OBJETIVO =
  "Exame realizado com transdutor linear de alta frequência, abrangendo todos os quadrantes das mamas.";
const TECNICA_OBJETIVO_AXILAS =
  "Exame realizado com transdutor linear de alta frequência, abrangendo todos os quadrantes das mamas e as regiões axilares.";
const TECNICA_OBJETIVO_SOMENTE_AXILAS =
  "Exame realizado com transdutor linear de alta frequência, abrangendo as regiões axilares.";

/** Frase do achado no ACHADOS (estilo objetivo, enxuto). */
function achadoAchadoObjetivo(a: MamariaAchado): string {
  // Calcificações e os tipos especiais reusam exatamente as frases do clássico
  // (já enxutas e clinicamente validadas) — não há ganho em reescrevê-las.
  return achadoCorpo(a);
}

/** Render do estilo OBJETIVO: TÉCNICA / ACHADOS / IMPRESSÃO. */
function renderMamariaObjetivo(
  f: MamariaFindings,
  prefsInput?: Partial<MamariaPreferences> | null,
  biradsGuard = false,
): string {
  const prefs = mergeMamariaPrefs(prefsInput);
  const escopo = escopoDe(f);
  const comMamas = incluiMamas(escopo);
  const comAxilas = incluiAxilas(escopo);
  const titulo = tituloDoEscopo(escopo);
  const tecnicaBase = escopo === "axilas"
    ? TECNICA_OBJETIVO_SOMENTE_AXILAS
    : escopo === "mamas_axilas"
      ? TECNICA_OBJETIVO_AXILAS
      : TECNICA_OBJETIVO;
  const tecnica = f.doppler_realizado
    ? `${tecnicaBase} Estudo complementar realizado com Doppler colorido.`
    : tecnicaBase;

  const achados = comMamas ? f.achados ?? [] : [];

  // ----- ACHADOS -----
  const linhas: string[] = [];
  if (comMamas) {
    linhas.push("Pele e tecido celular subcutâneo de aspecto preservado.");
    linhas.push(f.texto_fundo?.trim() || TEXTO_FUNDO_PADRAO);
  }

  const TIPOS_LESAO = new Set<Tipo>([
    "cisto_simples", "multiplos_cistos", "microcistos_agrupados",
    "cisto_complicado", "nodulo_solido", "achado_nao_nodular",
  ]);
  const temLesao = achados.some((a) => TIPOS_LESAO.has(a.tipo));
  if (comMamas && !temLesao) linhas.push(AUSENCIA_LESAO);
  for (const a of achados) {
    linhas.push(achadoAchadoObjetivo(a));
    if (f.doppler_realizado) {
      const vascular = vascularizacaoCorpo(a);
      if (vascular) linhas.push(vascular);
    }
  }
  for (const a of achados) {
    if (a.elasticidade)
      linhas.push(
        `À elastografia, a imagem apresenta elasticidade ${a.elasticidade === "intermediaria" ? "intermediária" : a.elasticidade}.`,
      );
  }
  if (comAxilas) {
    // Idem: três estados. Era o quarto lugar com o mesmo `&&`.
    const descAx = f.axilas_descricao?.trim();
    linhas.push(
      !f.axilas_alteradas ? AXILAR_NORMAL_CORPO : descAx ? descAx : AXILAR_ATIPICO_CORPO,
    );
  }
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "")
    linhas.push(f.achados_adicionais.trim());

  // ----- IMPRESSÃO (mesma lógica BI-RADS do clássico: maior vence; só o de
  // maior categoria leva o rótulo) -----
  const maiorRank = achados.reduce(
    (m, a) => Math.max(m, biradsRank(biradsDoAchado(a))),
    -1,
  );
  const maiorB =
    achados.map(biradsDoAchado).find((b) => b !== null && biradsRank(b) === maiorRank) ??
    null;

  const impressao: string[] = [];
  if (comMamas && achados.length === 0) {
    impressao.push("Mamas ecograficamente normais (Categoria BI-RADS® 1).");
  } else if (comMamas) {
    const CISTO = new Set<Tipo>(["cisto_simples", "multiplos_cistos"]);
    const cistos = achados.filter((a) => CISTO.has(a.tipo));
    const ladosCisto = new Set(cistos.map((a) => a.lado));
    const cistoBilateral =
      cistos.length >= 1 &&
      (ladosCisto.has("bilateral") ||
        (ladosCisto.has("direita") && ladosCisto.has("esquerda")));
    const sub =
      cistoBilateral && cistos.every(isSubcentimetrico) ? ", subcentimétricos" : "";
    let cistoEmitido = false;
    for (const a of achados) {
      const b = biradsDoAchado(a);
      const isMaior = b !== null && biradsRank(b) === maiorRank;
      if (cistoBilateral && CISTO.has(a.tipo)) {
        if (cistoEmitido) continue;
        cistoEmitido = true;
        const base = `Cistos mamários simples bilateralmente${sub}`;
        impressao.push(isMaior ? `${base} (Categoria BI-RADS® ${b}).` : `${base}.`);
        continue;
      }
      const base = b && biradsRank(b) === 9 ? conclusao6(a) : achadoConclusaoBase(a);
      impressao.push(isMaior ? `${base} (Categoria BI-RADS® ${b}).` : `${base}.`);
    }
  }
  if (comAxilas) {
    // Mesmos três estados do clássico — o `&&` mandava "alterada sem descrição"
    // para a frase de normalidade.
    const descAx = f.axilas_descricao?.trim();
    impressao.push(
      !f.axilas_alteradas
        ? AXILAR_NORMAL_CONCLUSAO
        : descAx
          ? `Linfonodos axilares de aspecto atípico (${descAx.replace(/\.+$/, "")}).`
          : AXILAR_ATIPICO_CONCLUSAO,
    );
  }
  if (comMamas && f.correlacao) {
    const cf = correlacaoFrase(f.correlacao);
    if (cf) impressao.push(cf);
  }

  // ----- Conduta (toggle) — seção própria -----
  let condutaSecao = "";
  if (prefs.show_conduct_recommendation && maiorB) {
    const cond = condutaDoBirads(maiorB);
    if (cond) condutaSecao = `Conduta sugerida:\nBI-RADS ${maiorB}. ${cond}.`;
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
    linhas.join("\n"),
    "",
    "IMPRESSÃO:",
    impressaoTxt,
    ...(condutaSecao ? ["", condutaSecao] : []),
    ...(comMamas ? ["", RODAPE] : []),
  ].join("\n");

  return appendBiradsNotes(corpo.replace(/\n{3,}/g, "\n\n").trim(), f, biradsGuard);
}
