import { z } from "zod";

/**
 * CERVICOMETRIA — ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL para a medida do colo
 * uterino (renderer PROGRAMÁTICO, sem template_body). Categoria NOVA (gap #2 da
 * auditoria 2026-07-01) — o exame é MUITO simples: o médico dita só duas medidas.
 *
 * Ground truth do formato: laudo assinado do Dr. Luiz (report aa95bb81):
 *   ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL
 *   COMENTÁRIOS: (transdutor 6.5 MHz, técnica transvaginal, 06 fotos)
 *   OS SEGUINTES ASPECTOS FORAM OBSERVADOS:
 *     Distância do orifício interno ao orifício externo do colo uterino de {L} cm.
 *     Orifício interno do colo uterino fechado.
 *     Extremidade inferior da placenta distando cerca de {Y} cm do orifício interno do colo.
 *   CONCLUSÃO: Colo uterino ecograficamente normal.
 *
 * Regras clínicas (ditadas pelo Dr. Luiz, 2026-07-02 — thresholds a CONFIRMAR):
 *  - Comprimento do colo (distância OI→OE):
 *      L >= 2,5 cm            → "Colo uterino ecograficamente normal."
 *      2,0 <= L < 2,5 cm      → "Colo uterino um pouco curto (…)."
 *      L < 2,0 cm             → "Colo uterino curto (…), com alto risco para
 *                                trabalho de parto prematuro."
 *    (Dr. Luiz usa < 2,0 como corte de alto risco — mais conservador que a tabela
 *    clássica ~1,5 cm — para intervir e ajudar mais gestantes.)
 *  - Placenta (distância OI→borda inferior): medida ditada → "distando cerca de
 *    {Y} cm"; muito distante → "distante do orifício interno do colo" (sem número).
 *  - Placenta prévia: só entra na conclusão a partir de 32 semanas (< 32 o Dr. Luiz
 *    não menciona) → "Não há sinais de placenta prévia."
 *  - Cerclagem: pontos descritos no corpo como imagens hiperecoicas puntiformes na
 *    topografia do canal endocervical + item de conclusão.
 *
 * Formato numérico: vírgula decimal, 1 casa (estilo dominante da casa nos laudos
 * assinados de MSK/partes moles — o único exemplo de cervicometria no banco usava
 * ponto por ser laudo COLADO; a confirmar com o Luiz).
 */

// ─────────────────────────── Schema ───────────────────────────

export const CervicometriaFindingsSchema = z.object({
  /** Comprimento do colo = distância orifício interno → orifício externo (cm). */
  colo_oi_oe_cm: z.number().nullable(),
  /** Orifício interno fechado (default clínico). false = aberto/dilatado (ditado). */
  orificio_interno_fechado: z.boolean(),
  /** Distância orifício interno → borda inferior da placenta (cm). null = não medida. */
  placenta_distancia_cm: z.number().nullable(),
  /** Placenta muito distante → frase sem número (quando o médico não mede). */
  placenta_distante: z.boolean(),
  /** Idade gestacional em semanas (decide o item de placenta prévia, >= 32). */
  ig_semanas: z.number().nullable(),
  /** Pontos de cerclagem presentes. */
  cerclagem: z.boolean(),
  /** Observação livre do médico (corpo), verbatim. null se não houver. */
  observacoes: z.string().nullable(),
});

export type CervicometriaFindings = z.infer<typeof CervicometriaFindingsSchema>;

/**
 * O mesmo exame quando acrescentado a um laudo obstétrico/morfológico.
 * A idade gestacional vem do exame principal — não criamos uma segunda fonte
 * para a mesma informação.
 */
export const CervicometriaAddonSchema = CervicometriaFindingsSchema.omit({
  ig_semanas: true,
});
export type CervicometriaAddon = z.infer<typeof CervicometriaAddonSchema>;

export const CERVICOMETRIA_ADDON_JSON_SCHEMA = {
  type: ["object", "null"],
  additionalProperties: false,
  required: [
    "colo_oi_oe_cm",
    "orificio_interno_fechado",
    "placenta_distancia_cm",
    "placenta_distante",
    "cerclagem",
    "observacoes",
  ],
  properties: {
    colo_oi_oe_cm: { type: ["number", "null"] },
    orificio_interno_fechado: { type: "boolean" },
    placenta_distancia_cm: { type: ["number", "null"] },
    placenta_distante: { type: "boolean" },
    cerclagem: { type: "boolean" },
    observacoes: { type: ["string", "null"] },
  },
} as const;

export const CERVICOMETRIA_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "colo_oi_oe_cm",
    "orificio_interno_fechado",
    "placenta_distancia_cm",
    "placenta_distante",
    "ig_semanas",
    "cerclagem",
    "observacoes",
  ],
  properties: {
    colo_oi_oe_cm: { type: ["number", "null"] },
    orificio_interno_fechado: { type: "boolean" },
    placenta_distancia_cm: { type: ["number", "null"] },
    placenta_distante: { type: "boolean" },
    ig_semanas: { type: ["number", "null"] },
    cerclagem: { type: "boolean" },
    observacoes: { type: ["string", "null"] },
  },
} as const;

// ─────────────────────────── Prompt de extração ───────────────────────────

export const CERVICOMETRIA_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para a ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL PARA A MEDIDA DO COLO UTERINO (cervicometria). Exame MUITO simples: o médico dita basicamente duas medidas. NÃO redija laudo — quem escreve é o código. NÃO invente nada.

CAMPOS:
1. colo_oi_oe_cm: a medida do COMPRIMENTO do colo = distância do orifício interno ao orifício externo do colo uterino, SEMPRE EM CENTÍMETROS. É a medida principal. null se não ditada. Converta "2,4" ou "2.4" → 2.4. CONVERTA MILÍMETROS PARA CENTÍMETROS: "30 mm"/"30 milímetros" → 3.0; "25 mm" → 2.5; "8 mm" → 0.8. O comprimento do colo é fisiologicamente ~0,5 a 5,0 cm — um número como 30 é milímetros (=3,0 cm).
2. orificio_interno_fechado: true por padrão (o normal). false SOMENTE se o médico disser explicitamente que o orifício interno está aberto/dilatado/com afunilamento.
3. placenta_distancia_cm: distância do orifício interno até a borda (extremidade) inferior da placenta, SEMPRE EM CENTÍMETROS (converta mm→cm: "35 mm" → 3.5). null se não ditada.
4. placenta_distante: true SOMENTE se o médico disser que a placenta está "distante"/"muito distante"/"longe" do orifício interno SEM dar um número. Se deu número, use placenta_distancia_cm e deixe placenta_distante = false. Se não falou de placenta, ambos ficam null/false.
5. ig_semanas: idade gestacional em semanas, se o médico disser (ex.: "34 semanas", "com 33 semanas"). null se não disser.
6. cerclagem: true se o médico mencionar cerclagem / pontos de cerclagem / cerclage.
7. observacoes: qualquer observação clínica adicional que o médico dite e não caiba nos campos acima, verbatim. null se não houver.

NUNCA invente medida. Preserve exatamente os números ditados.`;

// ─────────────────────────── Formatação ───────────────────────────

/** 1 casa decimal, vírgula (estilo da casa). */
function cm(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "____";
  return v.toFixed(1).replace(".", ",");
}

/**
 * Guard determinístico mm→cm (review dex1): cervicometria costuma vir em mm. Se o
 * comprimento do colo veio > 6 (implausível em cm — o colo mede ~0,5–5,0 cm),
 * quase certamente é milímetro → divide por 10. Idem para a distância da placenta
 * (implausível > 30 cm). Conservador: só corrige valores claramente-mm.
 *
 * NOTA (dex1, a confirmar com o Luiz na ativação): é um BACKSTOP — o prompt já
 * manda o LLM converter mm→cm. O limiar > 6 nunca corrompe um colo fisiológico
 * (máx ~5 cm); o único risco teórico é um "6,5 cm" ditado literalmente virar 0,65,
 * mas 6,5 cm de colo não é fisiológico. Se o Luiz preferir, dá p/ trocar por
 * "só dividir quando o raw disser mm" (exigiria passar o raw ao renderer).
 */
function normalizeMedidasMm(f: CervicometriaFindings): CervicometriaFindings {
  const fixColo =
    f.colo_oi_oe_cm !== null && f.colo_oi_oe_cm > 6 ? f.colo_oi_oe_cm / 10 : f.colo_oi_oe_cm;
  const fixPlac =
    f.placenta_distancia_cm !== null && f.placenta_distancia_cm > 30
      ? f.placenta_distancia_cm / 10
      : f.placenta_distancia_cm;
  return { ...f, colo_oi_oe_cm: fixColo, placenta_distancia_cm: fixPlac };
}

const TITULO = "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL";
const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 6.5 MHz, pela técnica transvaginal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";
const TECNICA_OBJETIVA =
  "Exame realizado pela via transvaginal, com transdutor endocavitário, para avaliação do colo uterino.";

/** Classe do colo pelo comprimento (thresholds do Dr. Luiz — a confirmar). */
type ColoClasse = "normal" | "um_pouco_curto" | "curto";
function classificarColo(l: number | null): ColoClasse {
  if (l === null || !Number.isFinite(l)) return "normal";
  if (l < 2.0) return "curto";
  if (l < 2.5) return "um_pouco_curto";
  return "normal";
}

/**
 * Item(ns) de conclusão do colo. SEGURANÇA (review dex1):
 *  - Sem a medida principal (colo null) → NUNCA concluir normalidade; sinaliza.
 *  - Orifício interno ABERTO → é achado anormal por si só (afunilamento/risco);
 *    NUNCA "ecograficamente normal", mesmo com comprimento ≥ 2,5.
 */
function coloConclusaoItens(f: CervicometriaFindings): string[] {
  const l = f.colo_oi_oe_cm;
  // Sem medida → não afirma normalidade. Mas OI aberto é achado importante mesmo
  // sem a medida (review dex1): sinaliza a medida faltante E o OI aberto.
  if (l === null || !Number.isFinite(l)) {
    const itens = ["Medida do comprimento do colo uterino não caracterizada pelo método. [REVISAR]"];
    if (!f.orificio_interno_fechado) {
      itens.push("Orifício interno do colo uterino aberto, com risco para trabalho de parto prematuro.");
    }
    return itens;
  }
  const classe = classificarColo(l);
  const itens: string[] = [];
  // Orifício interno aberto: item próprio (nunca "normal").
  if (!f.orificio_interno_fechado) {
    itens.push(`Orifício interno do colo uterino aberto (colo medindo ${cm(l)} cm), com risco para trabalho de parto prematuro.`);
    return itens;
  }
  switch (classe) {
    case "curto":
      itens.push(`Colo uterino curto (medindo ${cm(l)} cm), com alto risco para trabalho de parto prematuro.`);
      break;
    case "um_pouco_curto":
      itens.push(`Colo uterino um pouco curto (medindo ${cm(l)} cm).`);
      break;
    case "normal":
    default:
      itens.push("Colo uterino ecograficamente normal.");
      break;
  }
  return itens;
}

// ─────────────────────────── Render ───────────────────────────

export type CervicometriaBloco = {
  achados: string[];
  conclusao: string[];
};

/**
 * Fonte clínica única da cervicometria isolada e integrada. O chamador decide
 * apenas os cabeçalhos; medidas, conversões, limiares e hard stops são comuns.
 */
export function renderCervicometriaBloco(
  input: CervicometriaAddon,
  igSemanas: number | null,
): CervicometriaBloco {
  const f = normalizeMedidasMm({ ...input, ig_semanas: igSemanas });
  // ----- OS SEGUINTES ASPECTOS FORAM OBSERVADOS -----
  const aspectos: string[] = [];
  aspectos.push(
    `Distância do orifício interno ao orifício externo do colo uterino de ${cm(f.colo_oi_oe_cm)} cm.`,
  );
  aspectos.push(
    f.orificio_interno_fechado
      ? "Orifício interno do colo uterino fechado."
      : "Orifício interno do colo uterino aberto.",
  );
  if (f.cerclagem) {
    aspectos.push(
      "Imagens hiperecoicas puntiformes na topografia do canal endocervical, compatíveis com pontos de cerclagem.",
    );
  }
  // Placenta: medida ditada → com número; muito distante → sem número; senão omite.
  if (f.placenta_distancia_cm !== null) {
    aspectos.push(
      `Extremidade inferior da placenta distando cerca de ${cm(f.placenta_distancia_cm)} cm do orifício interno do colo.`,
    );
  } else if (f.placenta_distante) {
    aspectos.push(
      "Extremidade inferior da placenta distante do orifício interno do colo.",
    );
  }
  if (f.observacoes && f.observacoes.trim() !== "") {
    aspectos.push(f.observacoes.trim());
  }

  // ----- CONCLUSÃO -----
  const conclusao: string[] = [...coloConclusaoItens(f)];
  if (f.cerclagem) {
    conclusao.push("Pontos de cerclagem uterina em topografia habitual.");
  }
  // Placenta prévia: só a partir de 32 semanas (Dr. Luiz), e só se houve avaliação
  // da placenta (medida ou "distante"). Antes de 32 sem NÃO se menciona.
  const avaliouPlacenta = f.placenta_distancia_cm !== null || f.placenta_distante;
  if (f.ig_semanas !== null && f.ig_semanas >= 32 && avaliouPlacenta) {
    conclusao.push("Não há sinais de placenta prévia.");
  }

  return { achados: aspectos, conclusao };
}

export function renderCervicometria(
  input: CervicometriaFindings,
  _prefs?: unknown,
  opts?: { objetivo?: boolean },
): string {
  const { ig_semanas: igSemanas, ...addon } = input;
  const bloco = renderCervicometriaBloco(addon, igSemanas);
  const conclusaoTxt =
    bloco.conclusao.length === 1
      ? (bloco.conclusao[0] as string)
      : bloco.conclusao
          .map((it, i) => `${i + 1}${opts?.objetivo ? "." : ")"} ${it}`)
          .join("\n");

  const corpo = opts?.objetivo
    ? [
        TITULO,
        "",
        "TÉCNICA:",
        TECNICA_OBJETIVA,
        "",
        "ACHADOS:",
        bloco.achados.join("\n"),
        "",
        "IMPRESSÃO:",
        conclusaoTxt,
      ].join("\n")
    : [
        TITULO,
        "",
        COMENTARIOS,
        "",
        "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
        bloco.achados.join("\n"),
        "",
        "CONCLUSÃO:",
        conclusaoTxt,
      ].join("\n");

  return corpo.replace(/\n{3,}/g, "\n\n").trim();
}

export function parseCervicometria(raw: unknown): CervicometriaFindings {
  return CervicometriaFindingsSchema.parse(raw);
}
