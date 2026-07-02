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
1. colo_oi_oe_cm: a medida do COMPRIMENTO do colo = distância do orifício interno ao orifício externo do colo uterino, em cm. É a medida principal. null se não ditada. Converta "2,4" ou "2.4" → 2.4.
2. orificio_interno_fechado: true por padrão (o normal). false SOMENTE se o médico disser explicitamente que o orifício interno está aberto/dilatado/com afunilamento.
3. placenta_distancia_cm: distância do orifício interno até a borda (extremidade) inferior da placenta, em cm. null se não ditada.
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

const TITULO = "ULTRASSONOGRAFIA PÉLVICA TRANSVAGINAL";
const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 6.5 MHz, pela técnica transvaginal. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.";

/** Classe do colo pelo comprimento (thresholds do Dr. Luiz — a confirmar). */
type ColoClasse = "normal" | "um_pouco_curto" | "curto";
function classificarColo(l: number | null): ColoClasse {
  if (l === null || !Number.isFinite(l)) return "normal";
  if (l < 2.0) return "curto";
  if (l < 2.5) return "um_pouco_curto";
  return "normal";
}

/** Item de conclusão do colo pela classe. */
function coloConclusao(l: number | null): string {
  switch (classificarColo(l)) {
    case "curto":
      return `Colo uterino curto (medindo ${cm(l)} cm), com alto risco para trabalho de parto prematuro.`;
    case "um_pouco_curto":
      return `Colo uterino um pouco curto (medindo ${cm(l)} cm).`;
    case "normal":
    default:
      return "Colo uterino ecograficamente normal.";
  }
}

// ─────────────────────────── Render ───────────────────────────

export function renderCervicometria(f: CervicometriaFindings): string {
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
  const conclusao: string[] = [coloConclusao(f.colo_oi_oe_cm)];
  if (f.cerclagem) {
    conclusao.push("Pontos de cerclagem uterina em topografia habitual.");
  }
  // Placenta prévia: só a partir de 32 semanas (Dr. Luiz), e só se houve avaliação
  // da placenta (medida ou "distante"). Antes de 32 sem NÃO se menciona.
  const avaliouPlacenta = f.placenta_distancia_cm !== null || f.placenta_distante;
  if (f.ig_semanas !== null && f.ig_semanas >= 32 && avaliouPlacenta) {
    conclusao.push("Não há sinais de placenta prévia.");
  }

  const conclusaoTxt =
    conclusao.length === 1
      ? (conclusao[0] as string)
      : conclusao.map((it, i) => `${i + 1}) ${it}`).join("\n");

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

export function parseCervicometria(raw: unknown): CervicometriaFindings {
  return CervicometriaFindingsSchema.parse(raw);
}
