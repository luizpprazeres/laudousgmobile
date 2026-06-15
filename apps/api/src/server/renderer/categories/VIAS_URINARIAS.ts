import { z } from "zod";

/**
 * DET-5 — Renderer de ULTRASSONOGRAFIA DAS VIAS URINÁRIAS (rins e vias
 * urinárias), render PROGRAMÁTICO (sem template_body), estilo CLÁSSICO.
 *
 * O LLM extrai dados tipados (cada rim com suas medidas + achados focais em enum
 * fechado; bexiga; ureteres); o código:
 *  - monta o laudo por construção (estrutura/cabeçalhos garantidos);
 *  - descreve cada rim na seção morfológica INCORPORANDO os achados na própria
 *    frase principal do rim (substituindo o final "apresentando ... normais."
 *    por "apresentando {achado(s)}.") e interpreta os achados na CONCLUSÃO
 *    (mapeamento achado↔conclusão fixo por tipo);
 *  - usa placeholder ____ quando a medida está ausente;
 *  - silêncio → normalidade (NUNCA inventa achado).
 *
 * REGRA PRINCIPAL (Luiz): o achado é INCORPORADO na frase de descrição do rim,
 * NUNCA em uma frase separada. Forma:
 *   "Rim {lado} com diâmetros longitudinal e anteroposterior {dentro dos limites
 *    normais | discretamente abaixo dos valores usuais}, medidos pelo flanco,
 *    apresentando {achado(s) | topografia, ecotextura do seio renal e ecotextura
 *    corticomedular normais}."
 *
 * Sequência FIXA de cada achado:
 *   imagem → ecogenicidade → tamanho → localização → fenômenos acústicos.
 * Múltiplos achados no MESMO rim: separados por PONTO E VÍRGULA.
 *
 * Localização:
 *  - LITÍASE (sistema coletor) → cálices: "cálices superiores | médios | inferiores".
 *  - CISTO (cortical) → terço: "terço superior | médio | inferior".
 *
 * Cabeçalhos (Clássico):
 *   TÍTULO
 *   COMENTÁRIOS:
 *   OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
 *   CONCLUSÃO:
 *
 * Regras: descrição morfológica não diagnostica; medidas com 1 casa decimal;
 * concordância de lado (direito/esquerda); nunca afastar achado salvo se ditado.
 */

// ---------------------------------------------------------------------------
// Vocabulário dos achados focais renais (enums fechados)
// ---------------------------------------------------------------------------

// Tipos de achado focal renal suportados (fechados). Cada tipo define como é
// DESCRITO no corpo e COMO É CONCLUÍDO — o LLM apenas classifica; o código redige.
const ACHADO_TIPO = {
  litiase: "litíase",
  cisto_simples: "cisto simples",
  cisto_complexo: "cisto complexo",
  nodulo: "nódulo",
  ectasia: "ectasia pielocalicial",
} as const;
type AchadoTipoKey = keyof typeof ACHADO_TIPO;

// Graus de hidronefrose / dilatação pielocalicial.
const HIDRONEFROSE = {
  ausente: { txt: "", grau: null },
  leve: { txt: "leve", grau: "grau 1" },
  moderada: { txt: "moderada", grau: "grau 2" },
  acentuada: { txt: "acentuada", grau: "grau 3" },
} as const;
type HidronefroseKey = keyof typeof HIDRONEFROSE;

const achadoKeys = Object.keys(ACHADO_TIPO) as AchadoTipoKey[];
const hidronefroseKeys = Object.keys(HIDRONEFROSE) as HidronefroseKey[];

// Estado dimensional do rim (abre a frase principal).
const DIMENSAO = {
  normal: "dentro dos limites normais",
  reduzida_discreta: "discretamente abaixo dos valores usuais",
  reduzida: "reduzidos",
} as const;
type DimensaoKey = keyof typeof DIMENSAO;
const dimensaoKeys = Object.keys(DIMENSAO) as DimensaoKey[];

// ---------------------------------------------------------------------------
// Schema de achados (zod)
// ---------------------------------------------------------------------------

const AchadoRenalSchema = z.object({
  tipo: z.enum(achadoKeys as [AchadoTipoKey, ...AchadoTipoKey[]]),
  medidas_cm: z.array(z.number()).nullable(), // [c1,c2,c3] (cisto/nódulo) ou [c] (litíase: maior eixo)
  localizacao: z.string().nullable(), // litíase: "cálices inferiores"; cisto: "terço inferior"...
  caracteristica: z.string().nullable(), // cisto_complexo: "com calcificação periférica", "septado"...
  descricao_raw: z.string().nullable(), // verbatim (auditoria)
});

const RimSchema = z.object({
  medidas_cm: z.array(z.number()).nullable(), // [longitudinal, AP, transverso]
  espessura_parenquima_cm: z.number().nullable(),
  dimensao: z.enum(dimensaoKeys as [DimensaoKey, ...DimensaoKey[]]).nullable(), // estado dimensional (default normal)
  situacao_baixa: z.boolean(), // situação baixa (ectopia/situação alterada)
  rotacao: z.boolean(), // rotação alterada
  drc: z.boolean(), // doença renal crônica (dimensões reduzidas + dif. corticomedular reduzida)
  alteracao_difusa: z.string().nullable(), // verbatim de alteração difusa que não se encaixe nos flags acima
  hidronefrose: z.enum(hidronefroseKeys as [HidronefroseKey, ...HidronefroseKey[]]).nullable(),
  achados: z.array(AchadoRenalSchema),
});

const BexigaSchema = z.object({
  avaliada: z.boolean(), // false quando não distendida / não avaliável
  parede_alterada: z.string().nullable(), // "de paredes espessadas", "trabeculada"... verbatim
  conteudo_alterado: z.string().nullable(), // "com debris", "com cálculo", "com sonda"... verbatim
  espessura_parede_mm: z.number().nullable(),
  volume_pre_miccional_ml: z.number().nullable(),
  residuo_pos_miccional_ml: z.number().nullable(),
});

export const ViasUrinariasFindingsSchema = z.object({
  rim_direito: RimSchema,
  rim_esquerdo: RimSchema,
  bexiga: BexigaSchema,
  dilatacao_ureteral: z.boolean(), // true se houver dilatação ureteral
  dilatacao_ureteral_descricao: z.string().nullable(), // lado/grau verbatim quando alterada
  achados_adicionais: z.string().nullable(),
});

export type ViasUrinariasFindings = z.infer<typeof ViasUrinariasFindingsSchema>;
export type ViasUrinariasRim = z.infer<typeof RimSchema>;
export type ViasUrinariasAchado = z.infer<typeof AchadoRenalSchema>;
export type ViasUrinariasBexiga = z.infer<typeof BexigaSchema>;

// ---------------------------------------------------------------------------
// JSON Schema strict para OpenAI (todos required, nullable via union).
// ---------------------------------------------------------------------------

const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;
const numArr = { type: ["array", "null"], items: { type: "number" } } as const;
const enumNull = (vals: readonly string[]) =>
  ({ type: ["string", "null"], enum: [...vals, null] }) as const;

const ACHADO_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["tipo", "medidas_cm", "localizacao", "caracteristica", "descricao_raw"],
  properties: {
    tipo: { type: "string", enum: achadoKeys },
    medidas_cm: numArr,
    localizacao: str,
    caracteristica: str,
    descricao_raw: str,
  },
} as const;

const RIM_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "medidas_cm",
    "espessura_parenquima_cm",
    "dimensao",
    "situacao_baixa",
    "rotacao",
    "drc",
    "alteracao_difusa",
    "hidronefrose",
    "achados",
  ],
  properties: {
    medidas_cm: numArr,
    espessura_parenquima_cm: num,
    dimensao: enumNull(dimensaoKeys),
    situacao_baixa: { type: "boolean" },
    rotacao: { type: "boolean" },
    drc: { type: "boolean" },
    alteracao_difusa: str,
    hidronefrose: enumNull(hidronefroseKeys),
    achados: { type: "array", items: ACHADO_JSON },
  },
} as const;

const BEXIGA_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "avaliada",
    "parede_alterada",
    "conteudo_alterado",
    "espessura_parede_mm",
    "volume_pre_miccional_ml",
    "residuo_pos_miccional_ml",
  ],
  properties: {
    avaliada: { type: "boolean" },
    parede_alterada: str,
    conteudo_alterado: str,
    espessura_parede_mm: num,
    volume_pre_miccional_ml: num,
    residuo_pos_miccional_ml: num,
  },
} as const;

export const VIAS_URINARIAS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "rim_direito",
    "rim_esquerdo",
    "bexiga",
    "dilatacao_ureteral",
    "dilatacao_ureteral_descricao",
    "achados_adicionais",
  ],
  properties: {
    rim_direito: RIM_JSON,
    rim_esquerdo: RIM_JSON,
    bexiga: BEXIGA_JSON,
    dilatacao_ureteral: { type: "boolean" },
    dilatacao_ureteral_descricao: str,
    achados_adicionais: str,
  },
} as const;

// ---------------------------------------------------------------------------
// Prompt de extração
// ---------------------------------------------------------------------------

export const VIAS_URINARIAS_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DAS VIAS URINÁRIAS (rins e vias urinárias).
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada. Sua função
é CLASSIFICAR cada achado descrito pelo médico — quem escreve o laudo é o código.

REGRAS:
1. Cada rim (rim_direito, rim_esquerdo):
   - medidas_cm: as medidas do rim em cm [longitudinal, anteroposterior, transverso];
     null se não ditas.
   - espessura_parenquima_cm: espessura do parênquima em cm quando ditada; senão null.
   - dimensao: estado dimensional do rim — "normal" (default; dentro dos limites
     normais) | "reduzida_discreta" (discretamente abaixo dos valores usuais) |
     "reduzida" (dimensões francamente reduzidas, ex.: doença renal crônica). null = normal.
   - situacao_baixa: true SOMENTE se o médico descrever situação/topografia baixa
     (rim baixo, situação alterada, ectopia/situação baixa); senão false.
   - rotacao: true SOMENTE se o médico descrever rotação/malrotação do rim; senão false.
   - drc: true SOMENTE em DOENÇA RENAL CRÔNICA (rim de dimensões reduzidas com
     redução/perda da diferenciação corticomedular). Quando true, marque também
     dimensao = "reduzida". Senão false.
   - alteracao_difusa: SÓ para alteração difusa do parênquima que NÃO se encaixe
     nos flags acima — cláusula verbatim do médico; null se normal.
   - hidronefrose: grau de hidronefrose / dilatação pielocalicial — ausente | leve
     (grau 1) | moderada (grau 2) | acentuada (grau 3); null se não avaliada/não dita.
   - achados: lista de achados focais; [] se o rim é normal (sem cálculo, cisto,
     nódulo). Silêncio = normalidade — NUNCA crie achado.
2. Para cada achado focal renal, classifique o TIPO no enum (o mais próximo):
   - litiase: imagem hiperecoica com sombra acústica (cálculo/litíase renal).
   - cisto_simples: imagem anecóica homogênea, margem regular, sem complexidade.
   - cisto_complexo: imagem cística com complexidade (septação, calcificação
     periférica, componente sólido) — NÃO é cisto simples.
   - nodulo: nódulo/imagem sólida renal.
   - ectasia: ectasia pielocalicial isolada (sem hidronefrose franca).
3. Para cada achado:
   - medidas_cm: [c1,c2,c3] (cisto/nódulo) ou [maior_eixo] (litíase) em cm; null se não ditas.
   - localizacao: SIGA a regra anatômica de localização:
       * LITÍASE (sistema coletor) → CÁLICES: "cálices superiores" | "cálices
         médios" | "cálices inferiores".
       * CISTO (cortical) → TERÇO: "terço superior" | "terço médio" | "terço inferior".
       * nódulo/ectasia: use a frase ditada (ex.: "no polo inferior", "na pelve renal").
     null se não dita.
   - caracteristica: para cisto_complexo, a complexidade verbatim ("com
     calcificação periférica", "septado", "com componente sólido"); null caso contrário.
   - descricao_raw: descrição verbatim do médico para este achado (auditoria).
4. bexiga:
   - avaliada: true se a bexiga foi avaliada (repleção adequada); false se não
     distendida / não avaliável / esvaziada.
   - parede_alterada: SÓ se a parede for alterada ("de paredes espessadas",
     "trabeculada") — verbatim; null se normal.
   - conteudo_alterado: SÓ se o conteúdo for alterado ("com debris", "com
     cálculo", "com balão de sonda") — verbatim; null se anecóico/normal.
   - espessura_parede_mm: espessura da parede vesical em mm quando ditada; senão null.
   - volume_pre_miccional_ml: volume pré-miccional em mL quando ditado; senão null.
   - residuo_pos_miccional_ml: resíduo pós-miccional em mL/cm³ quando ditado; senão null.
5. dilatacao_ureteral: true se houver dilatação ureteral; false caso contrário
   (default = sem dilatação). dilatacao_ureteral_descricao: lado/grau verbatim quando alterada; senão null.
6. achados_adicionais: SOMENTE alterações reais fora do padrão acima; null se não houver.`;

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

/** Medida única (litíase: maior eixo). */
function medidaUnicaFmt(arr: number[] | null): string {
  if (!arr || arr.length === 0 || !Number.isFinite(arr[0])) return "____ cm";
  return `${ptBr1(arr[0] as number)} cm`;
}

function espFmt(v: number | null): string {
  return v === null ? "____" : ptBr1(v);
}

function limpa(s: string): string {
  return s.trim().replace(/\.+$/, "");
}

/** Localização do achado (com a frase ditada, ou genérico por tipo). */
function localFmt(ach: ViasUrinariasAchado): string {
  if (ach.localizacao && ach.localizacao.trim() !== "") {
    return limpa(ach.localizacao);
  }
  // Genérico por tipo (litíase → cálices; cisto → terço; demais → parênquima).
  if (ach.tipo === "litiase") return "em cálices";
  if (ach.tipo === "cisto_simples" || ach.tipo === "cisto_complexo")
    return "em um dos terços renais";
  return "no parênquima renal";
}

/**
 * "situada {prep} {loc}" para a localização do achado (concordância no feminino:
 * imagem). Aplica a preposição correta conforme o termo anatômico, caso a
 * localização ditada já não traga a sua própria preposição.
 *  - "cálices ..." → "em cálices ..." (litíase, sistema coletor)
 *  - "terço ..."   → "no terço ..."   (cisto, cortical)
 *  - "polo ..."    → "no polo ..."
 *  - "pelve ..."   → "na pelve ..."
 */
function situadoLoc(ach: ViasUrinariasAchado): string {
  const loc = localFmt(ach);
  // Já vem com preposição ("no ...", "em ...", "na ...", "nos ...", "nas ...").
  if (/^(no|na|nos|nas|em|à|ao)\b/i.test(loc)) {
    return `situada ${loc}`;
  }
  let prep = "em"; // default
  if (/^cálices?\b/i.test(loc)) prep = "em";
  else if (/^(terço|polo|seio|sistema|córtex|hilo)\b/i.test(loc)) prep = "no";
  else if (/^(pelve|cortical|medular|junção)\b/i.test(loc)) prep = "na";
  return `situada ${prep} ${loc}`;
}

// ---------------------------------------------------------------------------
// Frases fixas (Clássico)
// ---------------------------------------------------------------------------

const TITULO = "ULTRASSONOGRAFIA DAS VIAS URINÁRIAS";

const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes dos rins, em decúbito dorsal e ventral. Após repleção vesical foram realizados cortes da pelve com o paciente em decúbito dorsal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

const BEXIGA_NORMAL = "Bexiga de forma, contorno e ecotextura normais.";

// Final padrão (rim sem achado focal, sem hidronefrose).
const RIM_FINAL_NORMAL =
  "topografia, ecotextura do seio renal e ecotextura corticomedular normais";

// ---------------------------------------------------------------------------
// Descrição morfológica de cada rim (corpo) — SEM diagnóstico
// ---------------------------------------------------------------------------

/**
 * Abertura da frase do rim: estado dimensional + situação/rotação, até o
 * "apresentando". Inclui sempre "medidos pelo flanco" (exceto quando há
 * situação/rotação, em que o trecho de situação substitui).
 *
 * Forma normal:   "Rim {lado} com diâmetros longitudinal e anteroposterior {dim}, medidos pelo flanco, apresentando"
 * Forma situação: "Rim {lado} com diâmetros longitudinal e anteroposterior {dim}, de situação baixa e com rotação, apresentando"
 */
function rimAbertura(lado: string, rim: ViasUrinariasRim): string {
  const dimKey: DimensaoKey =
    rim.drc ? "reduzida" : (rim.dimensao ?? "normal");
  const dim = DIMENSAO[dimKey];

  const sitParts: string[] = [];
  if (rim.situacao_baixa) sitParts.push("de situação baixa");
  if (rim.rotacao) sitParts.push("com rotação");

  let meio: string;
  if (sitParts.length > 0) {
    // junta "de situação baixa e com rotação"
    meio = sitParts.join(" e ");
  } else {
    meio = "medidos pelo flanco";
  }

  return `Rim ${lado} com diâmetros longitudinal e anteroposterior ${dim}, ${meio}, apresentando`;
}

/** Descreve UM achado focal renal (texto que vem após "apresentando"). */
function descreveAchado(ach: ViasUrinariasAchado): string {
  switch (ach.tipo) {
    case "litiase":
      // imagem → ecogenicidade → tamanho → localização → fenômeno acústico
      return `imagem hiperecoica, medindo ${medidaUnicaFmt(
        ach.medidas_cm,
      )} no seu maior eixo, ${situadoLoc(ach)}, ocasionando sombra acústica`;
    case "cisto_simples":
      return `imagem anecóica, com margens regulares, medindo ${medidasFmt(
        ach.medidas_cm,
      )}, ${situadoLoc(ach)}, ocasionando reforço acústico`;
    case "cisto_complexo": {
      const carac = ach.caracteristica ? `, ${limpa(ach.caracteristica)}` : "";
      return `imagem cística${carac}, medindo ${medidasFmt(
        ach.medidas_cm,
      )}, ${situadoLoc(ach)}`;
    }
    case "nodulo":
      return `imagem nodular sólida, medindo ${medidasFmt(
        ach.medidas_cm,
      )}, ${situadoLoc(ach)}`;
    case "ectasia":
      return `ectasia pielocalicial ${localFmt(ach)}`;
    default:
      return "";
  }
}

/**
 * Frase completa do rim no corpo. O achado é INCORPORADO na frase principal:
 * a abertura termina em "apresentando" e o restante é:
 *  - hidronefrose: "imagens anecóicas no sistema pielocalicial." (incorporada);
 *  - achado(s) focal(is): "{ach1}; {ach2}; ..." (separados por ponto e vírgula);
 *  - normal: "{RIM_FINAL_NORMAL}.".
 *
 * Em DRC, a abertura já marca dimensões reduzidas; o final descreve a redução
 * da diferenciação corticomedular.
 */
function rimCorpo(lado: string, rim: ViasUrinariasRim): string {
  const partes: string[] = [];
  const abertura = rimAbertura(lado, rim);

  let final: string;
  if (rim.hidronefrose && rim.hidronefrose !== "ausente") {
    // Hidronefrose incorporada na frase do rim.
    final = "imagens anecóicas no sistema pielocalicial";
  } else if (rim.achados.length > 0) {
    // Achados focais incorporados, separados por ponto e vírgula.
    final = rim.achados.map((a) => descreveAchado(a)).filter(Boolean).join("; ");
  } else if (rim.drc) {
    // Doença renal crônica: redução da diferenciação corticomedular.
    final =
      "ecotextura do seio renal e diferenciação corticomedular reduzidas";
  } else if (rim.situacao_baixa || rim.rotacao) {
    // Situação/rotação sem outro achado: parênquima normal.
    final = "ecotextura do seio renal e ecotextura corticomedular normais";
  } else if (rim.alteracao_difusa && rim.alteracao_difusa.trim() !== "") {
    final = limpa(rim.alteracao_difusa);
  } else {
    final = RIM_FINAL_NORMAL;
  }

  partes.push(`${abertura} ${final}.`);

  // Medidas do rim + espessura do parênquima (sempre — placeholder se ausente).
  partes.push(`Medida do rim ${lado}: ${medidasFmt(rim.medidas_cm)}.`);
  partes.push(
    `Medida da espessura do parênquima do rim ${lado}: ${espFmt(
      rim.espessura_parenquima_cm,
    )} cm.`,
  );

  return partes.join("\n");
}

// ---------------------------------------------------------------------------
// Bexiga (corpo)
// ---------------------------------------------------------------------------

function bexigaCorpo(bex: ViasUrinariasBexiga): string {
  const partes: string[] = [];
  if (!bex.avaliada) {
    partes.push(
      "Bexiga com repleção insuficiente no momento do exame, prejudicando a sua adequada avaliação.",
    );
  } else if (bex.parede_alterada || bex.conteudo_alterado) {
    const sub: string[] = ["Bexiga"];
    if (bex.parede_alterada) sub.push(limpa(bex.parede_alterada));
    if (bex.conteudo_alterado) sub.push(limpa(bex.conteudo_alterado));
    partes.push(`${sub.join(", ")}.`);
  } else {
    partes.push(BEXIGA_NORMAL);
  }

  if (bex.volume_pre_miccional_ml !== null) {
    partes.push(`Volume pré-miccional de ${ptBr1(bex.volume_pre_miccional_ml)} mL.`);
  }
  if (bex.espessura_parede_mm !== null) {
    partes.push(
      `Espessura da parede vesical de aproximadamente ${ptBr1(
        bex.espessura_parede_mm,
      )} mm.`,
    );
  }
  return partes.join("\n");
}

// ---------------------------------------------------------------------------
// Interpretação diagnóstica de cada achado (CONCLUSÃO)
// ---------------------------------------------------------------------------

/** Localização com preposição correta para a CONCLUSÃO (", em cálices ..."). */
function locConcl(loc: string | null): string {
  if (!loc || loc.trim() === "") return "";
  const l = limpa(loc);
  if (/^(no|na|nos|nas|em|à|ao)\b/i.test(l)) return `, ${l}`;
  let prep = "em";
  if (/^cálices?\b/i.test(l)) prep = "em";
  else if (/^(terço|polo|seio|sistema|córtex|hilo)\b/i.test(l)) prep = "no";
  else if (/^(pelve|cortical|medular|junção)\b/i.test(l)) prep = "na";
  return `, ${prep} ${l}`;
}

function concluiAchado(ach: ViasUrinariasAchado, lado: string): string {
  const ladoConcl = lado === "direito" ? "direito" : "esquerdo";
  const loc = locConcl(ach.localizacao);
  switch (ach.tipo) {
    case "litiase":
      return `Litíase no rim ${ladoConcl}${loc}.`;
    case "cisto_simples":
      return `Cisto simples no rim ${ladoConcl}${loc}.`;
    case "cisto_complexo": {
      // Reescrita pedida pelo Luiz: aspecto inespecífico, sem "Correlacionar".
      // Remove "com " inicial para evitar "apresentando com calcificação...".
      const carac = ach.caracteristica
        ? `apresentando ${limpa(ach.caracteristica).replace(/^com\s+/i, "")}, `
        : "";
      return `Cisto no rim ${ladoConcl} ${carac}de aspecto inespecífico.`;
    }
    case "nodulo":
      return `Imagem nodular sólida no rim ${ladoConcl}${loc}, a esclarecer. Correlacionar com dados clínicos.`;
    case "ectasia":
      return `Ectasia pielocalicial no rim ${ladoConcl}${loc}.`;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Render (Clássico)
// ---------------------------------------------------------------------------

export function renderViasUrinarias(f: ViasUrinariasFindings): string {
  // ----- OS SEGUINTES ASPECTOS FORAM OBSERVADOS -----
  const aspectos: string[] = [];
  aspectos.push(rimCorpo("direito", f.rim_direito));
  aspectos.push("");
  aspectos.push(rimCorpo("esquerdo", f.rim_esquerdo));
  aspectos.push("");

  if (f.dilatacao_ureteral && f.dilatacao_ureteral_descricao) {
    aspectos.push(limpa(f.dilatacao_ureteral_descricao).concat("."));
  }

  aspectos.push(bexigaCorpo(f.bexiga));

  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push("");
    aspectos.push(f.achados_adicionais.trim());
  }

  // ----- CONCLUSÃO -----
  const conclusao: string[] = [];

  // 1) Rins.
  const ladosRim: { lado: string; rim: ViasUrinariasRim }[] = [
    { lado: "direito", rim: f.rim_direito },
    { lado: "esquerdo", rim: f.rim_esquerdo },
  ];
  const rimAlterado = (r: ViasUrinariasRim): boolean =>
    r.achados.length > 0 ||
    !!r.alteracao_difusa ||
    r.drc ||
    r.situacao_baixa ||
    r.rotacao ||
    !!(r.hidronefrose && r.hidronefrose !== "ausente");

  const rinsAlterados = ladosRim.some(({ rim }) => rimAlterado(rim));
  if (!rinsAlterados) {
    conclusao.push("Rins ecograficamente normais.");
  } else {
    // DRC nos DOIS rins → item único na conclusão (decisão Luiz).
    const drcBilateral = f.rim_direito.drc && f.rim_esquerdo.drc;
    if (drcBilateral) conclusao.push("Sinais de doença renal crônica.");
    for (const { lado, rim } of ladosRim) {
      const ladoConcl = lado === "direito" ? "direito" : "esquerdo";
      const ladoFem = ladoConcl === "direito" ? "direita" : "esquerda";

      // Doença renal crônica (item por rim só quando NÃO é bilateral).
      if (rim.drc && !drcBilateral) {
        conclusao.push(
          `Rim ${ladoConcl} de dimensões reduzidas, com redução da diferenciação corticomedular, podendo corresponder a doença renal crônica.`,
        );
      }

      // Situação / rotação.
      if (rim.situacao_baixa || rim.rotacao) {
        const sit: string[] = [];
        if (rim.situacao_baixa) sit.push("de situação baixa");
        if (rim.rotacao) sit.push("com rotação");
        conclusao.push(`Rim ${ladoConcl} ${sit.join(" e ")}.`);
      }

      // Alteração difusa genérica (que não DRC/situação).
      if (
        !rim.drc &&
        rim.alteracao_difusa &&
        rim.alteracao_difusa.trim() !== ""
      ) {
        conclusao.push(
          `Alteração difusa do rim ${ladoConcl} (${limpa(rim.alteracao_difusa)}).`,
        );
      }

      // Hidronefrose.
      if (rim.hidronefrose && rim.hidronefrose !== "ausente") {
        const h = HIDRONEFROSE[rim.hidronefrose];
        conclusao.push(`Hidronefrose ${h.txt} ${h.grau} à ${ladoFem}.`);
      }

      // Achados focais.
      for (const ach of rim.achados) {
        const item = concluiAchado(ach, lado);
        if (item) conclusao.push(item);
      }
    }
  }

  // 2) Ureteres.
  if (f.dilatacao_ureteral) {
    const desc = f.dilatacao_ureteral_descricao?.trim();
    conclusao.push(
      desc ? `Dilatação ureteral (${limpa(desc)}).` : "Dilatação ureteral.",
    );
  } else {
    conclusao.push("Não há sinais de dilatação ureteral.");
  }

  // 3) Bexiga.
  if (!f.bexiga.avaliada) {
    conclusao.push("Bexiga com repleção insuficiente para adequada avaliação.");
  } else if (f.bexiga.parede_alterada || f.bexiga.conteudo_alterado) {
    const sub: string[] = [];
    if (f.bexiga.parede_alterada) sub.push(limpa(f.bexiga.parede_alterada));
    if (f.bexiga.conteudo_alterado) sub.push(limpa(f.bexiga.conteudo_alterado));
    conclusao.push(`Bexiga ${sub.join(", ")}.`);
  } else {
    conclusao.push("Bexiga ecograficamente normal.");
  }

  // 4) Resíduo pós-miccional (quando informado).
  if (f.bexiga.residuo_pos_miccional_ml !== null) {
    conclusao.push(
      `Resíduo pós-miccional de ${ptBr1(f.bexiga.residuo_pos_miccional_ml)} cm³.`,
    );
  }

  const conclusaoTxt = conclusao.map((it, i) => `${i + 1}) ${it}`).join("\n");

  const corpo = [
    TITULO,
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
