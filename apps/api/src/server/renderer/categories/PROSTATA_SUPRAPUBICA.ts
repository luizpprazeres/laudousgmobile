import { z } from "zod";

/**
 * S6 / DET-5 — Renderer de PROSTATA_SUPRAPUBICA (via transabdominal).
 *
 * Estrutura garantida por construção. O LLM extrai dados tipados; o código
 * calcula peso (fórmula do elipsoide) e gradua o IPP. Aplica a curadoria A10 do
 * Luiz (docs/curadoria-showcase-2026-06-12.md) + revisão clínica dex1
 * (/tmp/dex1-prostata-review.md):
 *  - Título "ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)".
 *  - Corpo: bexiga (paredes/volume pré-miccional) → próstata medida (A x B x C cm)
 *    → IPP → resíduo pós-miccional.
 *  - Peso = D1×D2×D3×0,5233×1,05 (só com 3 medidas ≥ 1 cm; senão placeholder).
 *  - Conclusão: SÓ "peso aproximado de Y gramas" (sem redundância volume+peso).
 *    HPB não é graduada (leve/mod/acent); só o IPP é graduado (cm → Grau 1/2/3).
 *  - Observação final: limitação da via transabdominal.
 *
 * category_code interno permanece PROSTATA_SUPRAPUBICA (alias; evita migração) —
 * só o TEXTO do laudo diz TRANSABDOMINAL (dex1 #4).
 */

const num = { type: ["number", "null"] } as const;
const str = { type: ["string", "null"] } as const;

export const ProstataSuprapubicaFindingsSchema = z.object({
  // 3 medidas da próstata em cm (DAP x DT x DL).
  prostata_d1_cm: z.number().nullable(),
  prostata_d2_cm: z.number().nullable(),
  prostata_d3_cm: z.number().nullable(),
  hiperplasia: z.boolean(), // próstata aumentada / HPB (sem graduar)
  calcificacoes: z.boolean(),
  ipp_cm: z.number().nullable(), // índice de protrusão prostática, em cm
  // Bexiga.
  bexiga_achado: z.string().nullable(), // espessamento/trabeculação/cálculo/divertículo (texto do médico)
  volume_pre_miccional_ml: z.number().nullable(),
  residuo_pos_miccional_ml: z.number().nullable(),
  residuo_desprezivel: z.boolean(),
  achados_adicionais: z.string().nullable(),
});

export type ProstataSuprapubicaFindings = z.infer<
  typeof ProstataSuprapubicaFindingsSchema
>;

export const PROSTATA_SUPRAPUBICA_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "prostata_d1_cm",
    "prostata_d2_cm",
    "prostata_d3_cm",
    "hiperplasia",
    "calcificacoes",
    "ipp_cm",
    "bexiga_achado",
    "volume_pre_miccional_ml",
    "residuo_pos_miccional_ml",
    "residuo_desprezivel",
    "achados_adicionais",
  ],
  properties: {
    prostata_d1_cm: num,
    prostata_d2_cm: num,
    prostata_d3_cm: num,
    hiperplasia: { type: "boolean" },
    calcificacoes: { type: "boolean" },
    ipp_cm: num,
    bexiga_achado: str,
    volume_pre_miccional_ml: num,
    residuo_pos_miccional_ml: num,
    residuo_desprezivel: { type: "boolean" },
    achados_adicionais: str,
  },
} as const;

export const PROSTATA_SUPRAPUBICA_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL / via suprapúbica).
Organize o ditado no JSON tipado. NÃO redija laudo. NÃO invente nada.

REGRAS:
1. prostata_d1_cm/d2_cm/d3_cm: as 3 medidas da próstata, SEMPRE em cm (ex.: "5,1 x
   4,4 x 3,9"). PRESERVE a casa decimal (vírgula → ponto: "5,1" → 5.1). Se vier em
   mm explícito, converta para cm (÷10). Medida não dita → null. NUNCA invente.
2. ipp_cm: índice de protrusão prostática, em cm (se vier em mm, ÷10). null se não dito.
   "lobo médio protruso/protrusão do lobo médio" sem medida → ipp_cm null.
3. hiperplasia: true se o médico disser próstata aumentada/HPB/hiperplasia. Senão false.
4. calcificacoes: true se calcificações/litíase prostática. Senão false.
5. bexiga_achado: texto do médico SOMENTE se houver alteração vesical (espessamento,
   trabeculação, cálculo, divertículo). null se a bexiga for normal.
6. volume_pre_miccional_ml: volume da bexiga pré-micção em ml, se dito. null senão.
7. residuo_pos_miccional_ml: resíduo em ml, se dito numericamente. null senão.
8. residuo_desprezivel: true se o médico disser resíduo "desprezível/ausente/mínimo"
   sem valor. Senão false.
9. achados_adicionais: SOMENTE alterações patológicas reais nas palavras do médico
   (ex.: nódulo/lesão focal). NUNCA frases de normalidade. null se exame normal.`;

// ---------------------------------------------------------------------------
// Cálculos determinísticos
// ---------------------------------------------------------------------------

function ptBr1(n: number): string {
  return n.toFixed(1).replace(".", ",");
}
function intStr(n: number): string {
  return String(Math.round(n));
}

/**
 * Peso prostático pela fórmula do elipsoide. Volume = D1×D2×D3×0,5233 (cm³);
 * Peso ≈ Volume × 1,05 (g). Validação dex1: exige 3 medidas em cm, cada uma ≥ 1
 * cm (medida < 1 cm = provável truncação de voz → não calcula). null = sem peso.
 */
export function calcPesoProstatico(
  d1: number | null,
  d2: number | null,
  d3: number | null,
): { pesoG: number; volumeCm3: number } | null {
  if (d1 === null || d2 === null || d3 === null) return null;
  if (d1 < 1 || d2 < 1 || d3 < 1) return null;
  const volumeCm3 = d1 * d2 * d3 * 0.5233;
  const pesoG = volumeCm3 * 1.05;
  return { pesoG: Math.round(pesoG * 10) / 10, volumeCm3: Math.round(volumeCm3 * 10) / 10 };
}

/**
 * Grau do IPP pela escala A10 (em cm): Grau 1 ≤ 0,5; Grau 2 > 0,5 e ≤ 1,0; Grau 3
 * > 1,0 e ≤ 1,5; acima de 1,5 cm = protrusão acentuada (fora do range do briefing).
 */
export function ippGrau(cm: number): string {
  if (cm <= 0.5) return "Grau 1";
  if (cm <= 1.0) return "Grau 2";
  if (cm <= 1.5) return "Grau 3";
  return "protrusão acentuada";
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const TITULO = "ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)";
const COMENTARIOS =
  "COMENTÁRIOS:\nExame realizado com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais abrangendo toda a pelve.";
const OBSERVACAO_VIA =
  "Observação: a avaliação por via transabdominal não detalha adequadamente lesões focais do parênquima prostático; havendo suspeita clínica, recomenda-se correlação com PSA e avaliação urológica (complementação por via transretal ou ressonância multiparamétrica).";
const TECNICA_OBJETIVA =
  "Exame realizado pela via transabdominal, com a bexiga repleta, utilizando transdutor convexo multifrequencial.";

function blocosProstata(f: ProstataSuprapubicaFindings): {
  aspectos: string[];
  conclusao: string[];
} {
  const aspectos: string[] = [];
  const conclusao: string[] = [];
  const aumentada = f.hiperplasia;

  const bexigaBody =
    f.bexiga_achado && f.bexiga_achado.trim() !== ""
      ? `Bexiga com ${f.bexiga_achado.trim()}.`
      : "Bexiga de forma, ecotextura e contornos regulares.";
  const volTxt =
    f.volume_pre_miccional_ml !== null
      ? ` Volume pré-miccional de ${intStr(f.volume_pre_miccional_ml)} mL.`
      : "";
  aspectos.push(`${bexigaBody}${volTxt}`);

  const peso = calcPesoProstatico(f.prostata_d1_cm, f.prostata_d2_cm, f.prostata_d3_cm);
  const medidas =
    f.prostata_d1_cm !== null && f.prostata_d2_cm !== null && f.prostata_d3_cm !== null
      ? `${ptBr1(f.prostata_d1_cm)} x ${ptBr1(f.prostata_d2_cm)} x ${ptBr1(f.prostata_d3_cm)} cm`
      : "____ cm";
  aspectos.push(
    aumentada
      ? `Próstata aumentada de volume, medindo ${medidas}.`
      : `Próstata medindo ${medidas}.`,
  );
  if (f.calcificacoes) aspectos.push("Calcificações prostáticas.");
  if (aumentada && f.ipp_cm !== null) {
    aspectos.push(`Índice de protrusão prostática (IPP) mede ${ptBr1(f.ipp_cm)} cm.`);
  }
  aspectos.push("Vesículas seminais de dimensões, ecogenicidade e contornos normais.");
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(f.achados_adicionais.trim());
  }

  conclusao.push(
    f.bexiga_achado && f.bexiga_achado.trim() !== ""
      ? `Alterações vesicais (${f.bexiga_achado.trim()}), a correlacionar com obstrução infravesical.`
      : "Bexiga ecograficamente normal.",
  );
  if (f.residuo_pos_miccional_ml !== null) {
    conclusao.push(
      f.residuo_pos_miccional_ml > 100
        ? `Resíduo pós-miccional elevado (${intStr(f.residuo_pos_miccional_ml)} mL).`
        : `Resíduo pós-miccional de ${intStr(f.residuo_pos_miccional_ml)} mL.`,
    );
  } else if (f.residuo_desprezivel) {
    conclusao.push("Resíduo pós-miccional desprezível.");
  }
  const pesoTxt = peso
    ? `peso aproximado de ${ptBr1(peso.pesoG)} gramas`
    : "peso não calculável (medidas incompletas)";
  conclusao.push(
    aumentada
      ? `Próstata de volume aumentado (${pesoTxt}).`
      : `Próstata de dimensões normais (${pesoTxt}).`,
  );
  if (aumentada && f.ipp_cm !== null) {
    conclusao.push(`Protrusão prostática intravesical de ${ptBr1(f.ipp_cm)} cm (${ippGrau(f.ipp_cm)}).`);
  }
  if (f.calcificacoes) conclusao.push("Calcificações prostáticas.");
  conclusao.push("Vesículas seminais ecograficamente normais.");

  return { aspectos, conclusao };
}

/**
 * Render do laudo de próstata transabdominal. Curadoria do Luiz (2026-06-18):
 *  - Corpo NÃO descreve ecotextura da próstata (só no transretal); próstata = só
 *    "medindo X x X x X cm". Vesículas seminais SEMPRE descritas.
 *  - Resíduo pós-miccional vai SÓ na conclusão (opcional, quando disponível).
 *  - Conclusão cobre TODAS as estruturas avaliadas, inclusive normais (bexiga,
 *    resíduo, próstata, vesículas) — nunca omitir o normal.
 *  - Próstata aumentada NÃO é rotulada "hiperplasia prostática benigna" (não se
 *    crava o diagnóstico pela via transabdominal); só "volume aumentado".
 *  - IPP só aparece quando a próstata está aumentada.
 *  - Resíduo elevado: só "elevado (X mL)", sem inferir o tipo de obstrução.
 */
export function renderProstataSuprapubica(
  f: ProstataSuprapubicaFindings,
  _prefs?: unknown,
  opts?: { objetivo?: boolean },
): string {
  const { aspectos, conclusao } = blocosProstata(f);
  // O clássico fecha todas as estruturas normais por decisão histórica. No
  // objetivo, a impressão fica só com a próstata, medidas pós-miccionais e
  // alterações — bexiga/vesículas normais já estão descritas nos achados.
  const conclusaoDoEstilo = opts?.objetivo
    ? conclusao.filter(
        (item) =>
          item !== "Bexiga ecograficamente normal." &&
          item !== "Vesículas seminais ecograficamente normais.",
      )
    : conclusao;

  const conclTxt =
    conclusaoDoEstilo.length === 1
      ? conclusaoDoEstilo[0] ?? ""
      : conclusaoDoEstilo
          .map((it, i) => `${i + 1}${opts?.objetivo ? "." : ")"} ${it}`)
          .join("\n");

  if (opts?.objetivo) {
    return [
      TITULO,
      "",
      "TÉCNICA:",
      TECNICA_OBJETIVA,
      "",
      "ACHADOS:",
      aspectos.join("\n"),
      "",
      "IMPRESSÃO:",
      conclTxt,
      "",
      OBSERVACAO_VIA,
    ]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return [
    TITULO,
    "",
    COMENTARIOS,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    aspectos.join("\n"),
    "",
    "CONCLUSÃO:",
    conclTxt,
    "",
    OBSERVACAO_VIA,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
