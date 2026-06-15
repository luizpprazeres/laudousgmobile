import { z } from "zod";

/**
 * DET-5 — Renderer de ULTRASSONOGRAFIA DAS VIAS URINÁRIAS (rins e vias
 * urinárias), render PROGRAMÁTICO (sem template_body), estilo CLÁSSICO.
 *
 * O LLM extrai dados tipados (cada rim com suas medidas + lesões focais em enum
 * fechado; bexiga; ureteres); o código:
 *  - monta o laudo por construção (estrutura/cabeçalhos garantidos);
 *  - descreve cada rim na seção morfológica e interpreta os achados na CONCLUSÃO
 *    (mapeamento achado↔conclusão fixo por tipo);
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
 *  - modelo CLÁSSICO validado no DB (knowledge_blocks, category_code
 *    VIAS_URINARIAS, writing_style_id 11111111-1111-4111-8111-111111111111):
 *    estrutura + frases normais (transdutor 4.0 MHz, rim normal, bexiga normal,
 *    conclusão 1-4);
 *  - laudousg/lib/categoryDefaults.ts (lógica de rim do ABDOMEN_TOTAL: cisto
 *    simples, imagem cística complexa, litíase renal);
 *  - docs/catalogo-clinico-exames.md (seção Rim direito/esquerdo + Bexiga);
 *  - captures/rins-vias-urinarias.txt (estruturas e achados do nReport:
 *    hidronefrose, cálculos, cisto, dilatação pielocalicial, resíduo pós-miccional).
 *
 * Regras: descrição morfológica não diagnostica; medidas com 1 casa decimal;
 * concordância de lado (direito/esquerda); nunca afastar achado salvo se ditado.
 */

// ---------------------------------------------------------------------------
// Vocabulário dos achados focais renais (enums fechados)
// ---------------------------------------------------------------------------

// Tipos de lesão/achado focal renal suportados (fechados). Cada tipo define como
// é DESCRITO no corpo e COMO É CONCLUÍDO — o LLM apenas classifica; o código redige.
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
  leve: { txt: "leve", grau: "grau I" },
  moderada: { txt: "moderada", grau: "grau II" },
  acentuada: { txt: "acentuada", grau: "grau III" },
} as const;
type HidronefroseKey = keyof typeof HIDRONEFROSE;

const achadoKeys = Object.keys(ACHADO_TIPO) as AchadoTipoKey[];
const hidronefroseKeys = Object.keys(HIDRONEFROSE) as HidronefroseKey[];

// ---------------------------------------------------------------------------
// Schema de achados (zod)
// ---------------------------------------------------------------------------

const AchadoRenalSchema = z.object({
  tipo: z.enum(achadoKeys as [AchadoTipoKey, ...AchadoTipoKey[]]),
  medidas_cm: z.array(z.number()).nullable(), // [c1,c2,c3] (cisto/nódulo) ou [c] (litíase: maior eixo)
  localizacao: z.string().nullable(), // "no polo superior", "em cálices inferiores"...
  caracteristica: z.string().nullable(), // cisto_complexo: "com calcificação periférica", "septado"...
  descricao_raw: z.string().nullable(), // verbatim (auditoria)
});

const RimSchema = z.object({
  medidas_cm: z.array(z.number()).nullable(), // [longitudinal, AP, transverso]
  espessura_parenquima_cm: z.number().nullable(),
  alteracao_difusa: z.string().nullable(), // verbatim de alteração difusa (nefropatia, perda da relação córtico-medular...)
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
    "alteracao_difusa",
    "hidronefrose",
    "achados",
  ],
  properties: {
    medidas_cm: numArr,
    espessura_parenquima_cm: num,
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
   - alteracao_difusa: SÓ se o parênquima for DIFUSAMENTE alterado (nefropatia,
     perda da diferenciação córtico-medular, redução de espessura cortical, rim
     atrófico) — cláusula verbatim do médico; null se normal.
   - hidronefrose: grau de hidronefrose / dilatação pielocalicial — ausente | leve
     (grau I) | moderada (grau II) | acentuada (grau III); null se não avaliada/não dita.
   - achados: lista de lesões/achados focais; [] se o rim é normal (sem cálculo,
     cisto, nódulo). Silêncio = normalidade — NUNCA crie achado.
2. Para cada achado focal renal, classifique o TIPO no enum (o mais próximo):
   - litiase: imagem hiperecoica com sombra acústica (cálculo/litíase renal).
   - cisto_simples: imagem anecoica homogênea, margem regular, sem complexidade.
   - cisto_complexo: imagem cística com complexidade (septação, calcificação
     periférica, componente sólido) — NÃO é cisto simples.
   - nodulo: nódulo/imagem sólida renal.
   - ectasia: ectasia pielocalicial isolada (sem hidronefrose franca).
3. Para cada achado:
   - medidas_cm: [c1,c2,c3] (cisto/nódulo) ou [maior_eixo] (litíase) em cm; null se não ditas.
   - localizacao: frase verbatim ("no polo superior", "no terço médio", "em
     cálices inferiores", "na pelve renal"...); null se não dita.
   - caracteristica: para cisto_complexo, a complexidade verbatim ("com
     calcificação periférica", "septado", "com componente sólido"); null caso contrário.
   - descricao_raw: descrição verbatim do médico para este achado (auditoria).
4. bexiga:
   - avaliada: true se a bexiga foi avaliada (repleção adequada); false se não
     distendida / não avaliável / esvaziada.
   - parede_alterada: SÓ se a parede for alterada ("de paredes espessadas",
     "trabeculada") — verbatim; null se normal.
   - conteudo_alterado: SÓ se o conteúdo for alterado ("com debris", "com
     cálculo", "com balão de sonda") — verbatim; null se anecoico/normal.
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

/** Localização do achado (com a frase ditada, ou genérico). */
function localFmt(ach: ViasUrinariasAchado): string {
  if (ach.localizacao && ach.localizacao.trim() !== "") {
    return limpa(ach.localizacao);
  }
  return "no parênquima renal";
}

// ---------------------------------------------------------------------------
// Frases fixas (Clássico)
// ---------------------------------------------------------------------------

const TITULO = "ULTRASSONOGRAFIA DAS VIAS URINÁRIAS";

const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes dos rins, em decúbito dorsal e ventral. Após repleção vesical foram realizados cortes da pelve com o paciente em decúbito dorsal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.";

const BEXIGA_NORMAL = "Bexiga de forma, contorno e ecotextura normais.";

// ---------------------------------------------------------------------------
// Descrição morfológica de cada rim (corpo) — SEM diagnóstico
// ---------------------------------------------------------------------------

/** Frase-base do rim normal (sem achados focais nem difusos). */
function rimNormalBase(lado: string): string {
  return `Rim ${lado} com diâmetros longitudinais e anteroposterior dentro dos limites normais, medidos pelo flanco, apresentando topografia, ecotextura do seio renal e ecotextura córtico-medular normais.`;
}

/** Descreve um achado focal renal no corpo (sem diagnóstico). */
function descreveAchado(ach: ViasUrinariasAchado): string {
  switch (ach.tipo) {
    case "litiase":
      return `apresentando imagem hiperecoica com sombra acústica posterior, medindo ${medidaUnicaFmt(
        ach.medidas_cm,
      )} no seu maior eixo, situada ${localFmt(ach)}`;
    case "cisto_simples":
      return `apresentando imagem anecoica homogênea, com margem regular, medindo ${medidasFmt(
        ach.medidas_cm,
      )}, situada ${localFmt(ach)}`;
    case "cisto_complexo": {
      const carac = ach.caracteristica ? `, ${limpa(ach.caracteristica)}` : "";
      return `apresentando imagem cística${carac}, medindo ${medidasFmt(
        ach.medidas_cm,
      )}, situada ${localFmt(ach)}`;
    }
    case "nodulo":
      return `apresentando imagem nodular sólida, medindo ${medidasFmt(
        ach.medidas_cm,
      )}, situada ${localFmt(ach)}`;
    case "ectasia":
      return `apresentando ectasia pielocalicial ${localFmt(ach)}`;
    default:
      return "";
  }
}

/** Frase completa do rim no corpo (normal, difuso, hidronefrose e/ou focais). */
function rimCorpo(lado: string, rim: ViasUrinariasRim): string {
  const partes: string[] = [];

  // Sentença morfológica base (normal vs difusamente alterada).
  if (rim.alteracao_difusa && rim.alteracao_difusa.trim() !== "") {
    partes.push(`Rim ${lado} ${limpa(rim.alteracao_difusa)}.`);
  } else {
    partes.push(rimNormalBase(lado));
  }

  // Medidas do rim + espessura do parênquima (sempre — placeholder se ausente).
  partes.push(`Medida do rim ${lado}: ${medidasFmt(rim.medidas_cm)}.`);
  partes.push(
    `Medida da espessura do parênquima do rim ${lado}: ${espFmt(
      rim.espessura_parenquima_cm,
    )} cm.`,
  );

  // Hidronefrose / dilatação pielocalicial.
  if (rim.hidronefrose && rim.hidronefrose !== "ausente") {
    const h = HIDRONEFROSE[rim.hidronefrose];
    partes.push(
      `Dilatação do sistema pielocalicial do rim ${lado}, de grau ${h.txt} (${h.grau}).`,
    );
  }

  // Achados focais.
  for (const ach of rim.achados) {
    const d = descreveAchado(ach);
    if (d) partes.push(`Rim ${lado} ${d}.`);
  }

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

function concluiAchado(ach: ViasUrinariasAchado, lado: string): string {
  const ladoConcl = lado === "direito" ? "direito" : "esquerdo";
  const loc = ach.localizacao ? ` ${limpa(ach.localizacao)}` : "";
  switch (ach.tipo) {
    case "litiase":
      return `Litíase no rim ${ladoConcl}${loc}.`;
    case "cisto_simples":
      return `Cisto simples no rim ${ladoConcl}${loc}.`;
    case "cisto_complexo": {
      const carac = ach.caracteristica ? ` ${limpa(ach.caracteristica)}` : "";
      return `Imagem cística no rim ${ladoConcl}${carac}. Correlacionar com dados clínicos.`;
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
  const rinsAlterados = ladosRim.some(
    (r) =>
      r.rim.achados.length > 0 ||
      !!r.rim.alteracao_difusa ||
      (r.rim.hidronefrose && r.rim.hidronefrose !== "ausente"),
  );
  if (!rinsAlterados) {
    conclusao.push("Rins ecograficamente normais.");
  } else {
    for (const { lado, rim } of ladosRim) {
      const ladoConcl = lado === "direito" ? "direito" : "esquerdo";
      if (rim.alteracao_difusa && rim.alteracao_difusa.trim() !== "") {
        conclusao.push(`Alteração difusa do rim ${ladoConcl} (${limpa(rim.alteracao_difusa)}).`);
      }
      if (rim.hidronefrose && rim.hidronefrose !== "ausente") {
        const h = HIDRONEFROSE[rim.hidronefrose];
        conclusao.push(`Hidronefrose ${h.txt} (${h.grau}) à ${ladoConcl === "direito" ? "direita" : "esquerda"}.`);
      }
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
