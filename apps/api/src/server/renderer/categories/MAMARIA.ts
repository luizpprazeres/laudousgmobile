import { z } from "zod";

/**
 * DET-5 — Renderer de MAMARIA (render PROGRAMÁTICO, estilo CLÁSSICO).
 *
 * Spec: docs/det-5-mamaria.md (workflow do Luiz + léxico US do Atlas BI-RADS 5ª
 * ed + 10 decisões) e docs/det-5-mamaria-birads-pesquisa.md (léxico com páginas).
 *
 * Diferenças-chave: BI-RADS é CALCULÁVEL (heurística local) mas o ditado do
 * médico VENCE; **maior BI-RADS vence** (a categoria do estudo = a mais alta, e
 * só o item de maior categoria leva o rótulo "(Categoria BI-RADS® N)"). Margem
 * NUNCA "regular" (sempre circunscrita/indistinta/angular/microlobulada/
 * espiculada). Título dinâmico (axilas). Elastografia só descreve, não calcula.
 *
 * ⚠️ ONDA 2 (não neste arquivo): formato OBJETIVO (TÉCNICA/ANÁLISE/OPINIÃO) —
 * exige passar o writing style ao renderer. A heurística 4A/4B/4C é local e
 * precisa de validação clínica (review dex/Luiz).
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
  descritores: z.string().nullable(), // verbatim extras ("coalescentes", "agrupadas")
  medidas_cm: z.array(z.number()).nullable(),
  medida_invalida: z.string().nullable(), // medida ilegível → preservar + [?]
  localizacao: z.string().nullable(), // quadrante (vocab forçado)
  horario: z.string().nullable(), // "08 horas"
  dist_pele_cm: z.number().nullable(),
  dist_mamilo_cm: z.number().nullable(),
  descricao_nao_nodular: z.string().nullable(), // NML: "área heterogênea, sem configuração nodular"
  birads_ditado: z.string().nullable(), // override verbatim (vence o cálculo)
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
  titulo_com_axilas: z.boolean(), // título "...E REGIÕES AXILARES"
  mama_masculina: z.boolean(),
  com_protese: z.boolean(),
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
    "calcificacoes", "elasticidade", "descritores", "medidas_cm", "medida_invalida",
    "localizacao", "horario", "dist_pele_cm", "dist_mamilo_cm", "descricao_nao_nodular",
    "birads_ditado",
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
    descritores: str,
    medidas_cm: numArr,
    medida_invalida: str,
    localizacao: str,
    horario: str,
    dist_pele_cm: num,
    dist_mamilo_cm: num,
    descricao_nao_nodular: str,
    birads_ditado: str,
  },
} as const;

export const MAMARIA_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "titulo_com_axilas", "mama_masculina", "com_protese", "texto_fundo", "achados",
    "axilas_alteradas", "axilas_descricao", "correlacao", "achados_adicionais",
  ],
  properties: {
    titulo_com_axilas: { type: "boolean" },
    mama_masculina: { type: "boolean" },
    com_protese: { type: "boolean" },
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
1. titulo_com_axilas: true se as axilas foram avaliadas / o título inclui regiões
   axilares; false se o médico disser "sem axilas"/"só mamas".
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
    "2", "3", "4A", "5", "6") — verbatim. null se não ditada (o código calcula).
11. axilas_alteradas / axilas_descricao: só se o médico descrever linfonodos
    axilares ANORMAIS. correlacao: se houver menção a mamografia/RM/US prévia ou
    biópsia (tipo_exame, data dd/mm/aaaa, efeito, birads_final).
12. achados_adicionais: alterações reais fora dos tipos acima — incl. casos
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
  switch (a.tipo) {
    case "ginecomastia":
    case "proteses":
      return null; // sem categoria própria
    case "cisto_simples":
    case "multiplos_cistos":
    case "linfonodo_intramamario":
      return "2";
    case "microcistos_agrupados":
    case "cisto_complicado":
      return "3";
    case "calcificacoes":
      // grosseiras benignas → 2; em nódulo/micro/intraductais suspeitas → 4
      return a.calcificacoes === "em_nodulo" ||
        a.calcificacoes === "microcalcificacoes" ||
        a.calcificacoes === "intraductais"
        ? "4"
        : "2";
    case "achado_nao_nodular": {
      // NML não tem fórmula; default 4 (suspeito) salvo ditado. Conservador.
      return "4";
    }
    case "nodulo_solido": {
      const benigno =
        a.forma === "oval" &&
        a.margem === "circunscrita" &&
        a.orientacao === "paralela" &&
        a.posterior !== "sombra" &&
        a.calcificacoes !== "em_nodulo" &&
        a.calcificacoes !== "microcalcificacoes";
      if (benigno) return "3";
      // Heurística PONDERADA por peso clínico (review dex2 #7) — não só contagem.
      // FORTES: espiculada, irregular, microcalcificações em nódulo, sombra+não-paralela.
      // MODERADAS: microlobulada/angular/indistinta, não-paralela, sombra.
      // Validação clínica final é do Luiz.
      const fortes =
        (a.margem === "espiculada" ? 1 : 0) +
        (a.forma === "irregular" ? 1 : 0) +
        (a.calcificacoes === "microcalcificacoes" || a.calcificacoes === "em_nodulo" ? 1 : 0) +
        (a.posterior === "sombra" && a.orientacao === "nao_paralela" ? 1 : 0);
      const moderadas =
        (a.margem === "microlobulada" || a.margem === "angular" || a.margem === "indistinta" ? 1 : 0) +
        (a.orientacao === "nao_paralela" ? 1 : 0) +
        (a.posterior === "sombra" ? 1 : 0);
      if (fortes >= 2) return "5";
      if (fortes === 1) return "4C";
      if (moderadas >= 2) return "4B";
      return "4A";
    }
    default:
      return null;
  }
}

/** Resolve o BI-RADS do achado: ditado vence o cálculo. */
function biradsDoAchado(a: MamariaAchado): string | null {
  return a.birads_ditado?.trim() || calcBirads(a);
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
const COMENTARIOS_MASCULINA =
  "Exame realizado com transdutor de 12 MHz, abrangendo a região retroareolar e todos os quadrantes de ambas as mamas, bem como as regiões axilares.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";
const COMENTARIOS_PROTESE =
  "Exame realizado com transdutor de 12 MHz, abrangendo todos os quadrantes das mamas, bem como as regiões axilares. Paciente com próteses mamárias.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";

const TEXTO_FUNDO_PADRAO = "Mamas com ecotextura de fundo com aspecto heterogêneo.";
const AUSENCIA_LESAO = "Não há sinais evidentes de imagem nodular sólida, cística ou complexa.";
const AXILAR_NORMAL_CORPO =
  "Imagens ovais, com a periferia hipoecoica e o centro hiperecoico, nas axilas.";
const AXILAR_NORMAL_CONCLUSAO = "Linfonodos axilares normais.";
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
  opts?: { objetivo?: boolean },
): string {
  if (opts?.objetivo) return renderMamariaObjetivo(f, prefsInput);
  return renderMamariaClassico(f, prefsInput);
}

function renderMamariaClassico(
  f: MamariaFindings,
  prefsInput?: Partial<MamariaPreferences> | null,
): string {
  const prefs = mergeMamariaPrefs(prefsInput);

  const titulo = f.titulo_com_axilas
    ? "ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES"
    : "ULTRASSONOGRAFIA DAS MAMAS";

  const comentarios = f.mama_masculina
    ? COMENTARIOS_MASCULINA
    : f.com_protese
      ? COMENTARIOS_PROTESE
      : COMENTARIOS_PADRAO;

  // ----- Corpo -----
  const aspectos: string[] = [f.texto_fundo?.trim() || TEXTO_FUNDO_PADRAO];
  const achados = f.achados ?? [];
  // P1 — "Não há sinais evidentes de imagem nodular sólida, cística ou complexa."
  // é OBRIGATÓRIA quando não há lesão nodular/cística descrita (exame normal E
  // também próteses/ginecomastia/calcificações isoladas — nunca remover).
  const TIPOS_LESAO = new Set<Tipo>([
    "cisto_simples", "multiplos_cistos", "microcistos_agrupados",
    "cisto_complicado", "nodulo_solido", "achado_nao_nodular",
  ]);
  const temLesao = achados.some((a) => TIPOS_LESAO.has(a.tipo));
  if (!temLesao) aspectos.push(AUSENCIA_LESAO);
  for (const a of achados) aspectos.push(achadoCorpo(a));
  // Elastografia (frase adicional, sem cálculo).
  for (const a of achados) {
    if (a.elasticidade)
      aspectos.push(`À elastografia, a imagem apresenta elasticidade ${a.elasticidade === "intermediaria" ? "intermediária" : a.elasticidade}.`);
  }
  // Axilas: se o título inclui axilas, a frase aparece SEMPRE (decisão Luiz).
  if (f.titulo_com_axilas) {
    aspectos.push(
      f.axilas_alteradas && f.axilas_descricao ? f.axilas_descricao.trim() : AXILAR_NORMAL_CORPO,
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
  if (achados.length === 0) {
    conclusao.push("Mamas ecograficamente normais (Categoria BI-RADS® 1).");
  } else {
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
  if (f.titulo_com_axilas) {
    conclusao.push(
      f.axilas_alteradas && f.axilas_descricao
        ? `Linfonodos axilares de aspecto alterado (${f.axilas_descricao.trim().replace(/\.+$/, "")}).`
        : AXILAR_NORMAL_CONCLUSAO,
    );
  }
  // Correlação com exame prévio.
  if (f.correlacao) {
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
    "",
    RODAPE,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
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
): string {
  const prefs = mergeMamariaPrefs(prefsInput);

  const titulo = f.titulo_com_axilas
    ? "ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES"
    : "ULTRASSONOGRAFIA DAS MAMAS";
  const tecnica = f.titulo_com_axilas ? TECNICA_OBJETIVO_AXILAS : TECNICA_OBJETIVO;

  const achados = f.achados ?? [];

  // ----- ACHADOS -----
  const linhas: string[] = [];
  linhas.push("Pele e tecido celular subcutâneo de aspecto preservado.");
  linhas.push(f.texto_fundo?.trim() || TEXTO_FUNDO_PADRAO);

  const TIPOS_LESAO = new Set<Tipo>([
    "cisto_simples", "multiplos_cistos", "microcistos_agrupados",
    "cisto_complicado", "nodulo_solido", "achado_nao_nodular",
  ]);
  const temLesao = achados.some((a) => TIPOS_LESAO.has(a.tipo));
  if (!temLesao) linhas.push(AUSENCIA_LESAO);
  for (const a of achados) linhas.push(achadoAchadoObjetivo(a));
  for (const a of achados) {
    if (a.elasticidade)
      linhas.push(
        `À elastografia, a imagem apresenta elasticidade ${a.elasticidade === "intermediaria" ? "intermediária" : a.elasticidade}.`,
      );
  }
  if (f.titulo_com_axilas) {
    linhas.push(
      f.axilas_alteradas && f.axilas_descricao
        ? f.axilas_descricao.trim()
        : AXILAR_NORMAL_CORPO,
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
  if (achados.length === 0) {
    impressao.push("Mamas ecograficamente normais (Categoria BI-RADS® 1).");
  } else {
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
  if (f.titulo_com_axilas) {
    impressao.push(
      f.axilas_alteradas && f.axilas_descricao
        ? `Linfonodos axilares de aspecto alterado (${f.axilas_descricao.trim().replace(/\.+$/, "")}).`
        : AXILAR_NORMAL_CONCLUSAO,
    );
  }
  if (f.correlacao) {
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
    "",
    RODAPE,
  ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}
