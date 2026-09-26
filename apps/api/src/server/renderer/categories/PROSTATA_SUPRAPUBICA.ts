import { z } from "zod";
import {
  DICTATED_BLADDER_LESION_JSON,
  DICTATED_BLADDER_LESION_PROMPT,
  DictatedBladderLesionSchema,
  fraseLesaoFocalVesical,
  LESAO_FOCAL_VESICAL_CONCLUSAO,
  renderSharedBladder,
  SharedBladderSchema,
  linhaUnica,
  textoDitadoOpcional,
  textoEmLinhaUnica,
} from "./sharedUrinary";

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
  bexiga_detalhada: SharedBladderSchema.optional(),
  // Lesão focal vesical DITADA (caminho legado, sem bexiga_detalhada). Ausente
  // ou null = comportamento anterior. Com bexiga_detalhada presente (Web), a
  // bexiga compartilhada tem autoridade e este campo é ignorado.
  bexiga_lesao_focal: DictatedBladderLesionSchema.nullable().optional(),
  // Opcional (Web estruturada e ditado). Ausente ou null = vesículas descritas como
  // normais, como sempre foi. `.nullable()` é obrigatório: o modelo normal da
  // Biblioteca (`achadoNormalDe`) desce em `.optional()` e materializaria o
  // primeiro enum ("nao_caracterizadas") no laudo padrão; com null, a frase
  // histórica. No ditado, o JSON Schema devolve null salvo menção explícita.
  vesiculas_seminais: z.object({
    estado: z.enum(["nao_caracterizadas", "alteradas"]),
    lateralidade: z.enum(["bilateral", "direita", "esquerda"]),
    // "alteradas" sem descrição NÃO derruba o parse (o ditado perderia o laudo
    // inteiro): sai com [REVISAR] visível. A Web bloqueia antes, no adapter.
    descricao: textoDitadoOpcional,
  }).nullable().optional(),
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
    "bexiga_lesao_focal",
    "vesiculas_seminais",
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
    bexiga_lesao_focal: DICTATED_BLADDER_LESION_JSON,
    vesiculas_seminais: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["estado", "lateralidade", "descricao"],
      properties: {
        estado: { type: "string", enum: ["nao_caracterizadas", "alteradas"] },
        lateralidade: { type: "string", enum: ["bilateral", "direita", "esquerda"] },
        descricao: str,
      },
    },
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
   (ex.: nódulo/lesão focal). NUNCA frases de normalidade. null se exame normal.
10. ${DICTATED_BLADDER_LESION_PROMPT}
11. vesiculas_seminais: null por padrão (vesículas normais ou não mencionadas). Preencha
   SÓ se ditado explicitamente: estado "nao_caracterizadas" quando o médico disser que
   não foram visualizadas/caracterizadas adequadamente; "alteradas" quando descrever
   alteração (descricao = palavras do médico, obrigatória). lateralidade: "direita" ou
   "esquerda" se ditado um lado; senão "bilateral". NUNCA deduza pela ausência de menção.`;

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

/**
 * Menor medida imprimível: o laudo usa 1 casa em cm, e abaixo de 0,05 cm o valor
 * sairia "0,0". É precisão de exibição, não limiar clínico (QA 26/09, B3/R2).
 */
const MENOR_MEDIDA_CM = 0.05;

/** Medida linear imprimível. Zero, negativo, NaN ou valor que arredonda para 0,0 nunca vão ao laudo. */
const medidaPositiva = (n: number | null): n is number =>
  n !== null && Number.isFinite(n) && n >= MENOR_MEDIDA_CM;

const VESICULAS_NORMAIS_CORPO = "Vesículas seminais de dimensões, ecogenicidade e contornos normais.";
const VESICULAS_NORMAIS_CONCLUSAO = "Vesículas seminais ecograficamente normais.";

/**
 * Vesículas seminais. Sem o campo opcional, a frase normal histórica. "Não
 * caracterizadas" registra a limitação do exame, sem afirmar normalidade do lado
 * afetado; "alteradas" usa a descrição do médico, sem rótulo diagnóstico.
 */
function blocosVesiculas(v: ProstataSuprapubicaFindings["vesiculas_seminais"]): {
  corpo: string[];
  conclusao: string[];
  normaisNaConclusao: string[];
} {
  if (!v) return { corpo: [VESICULAS_NORMAIS_CORPO], conclusao: [VESICULAS_NORMAIS_CONCLUSAO], normaisNaConclusao: [VESICULAS_NORMAIS_CONCLUSAO] };
  const outro = v.lateralidade === "direita" ? "esquerda" : v.lateralidade === "esquerda" ? "direita" : null;
  const corpo: string[] = [];
  const conclusao: string[] = [];
  const normaisNaConclusao: string[] = [];
  const descricao = linhaUnica(v.descricao ?? "").replace(/\.+$/, "");
  if (v.estado === "nao_caracterizadas") {
    if (v.lateralidade === "bilateral") {
      corpo.push("Vesículas seminais não caracterizadas adequadamente nesta avaliação.");
      conclusao.push("Vesículas seminais não adequadamente caracterizadas nesta avaliação.");
    } else {
      corpo.push(`Vesícula seminal ${v.lateralidade} não caracterizada adequadamente nesta avaliação.`);
      conclusao.push(`Vesícula seminal ${v.lateralidade} não adequadamente caracterizada nesta avaliação.`);
    }
  } else if (!descricao) {
    // Alteração citada sem descrição (só pelo ditado): não afirma normalidade
    // nem inventa morfologia; o médico completa.
    const sujeito = v.lateralidade === "bilateral" ? "das vesículas seminais" : `da vesícula seminal ${v.lateralidade}`;
    corpo.push(`Alteração ${sujeito} mencionada, sem descrição. [REVISAR: descrever a alteração ${sujeito}]`);
    conclusao.push(`Alteração ${sujeito}, a descrever.`);
  } else if (v.lateralidade === "bilateral") {
    corpo.push(`Vesículas seminais: ${descricao}.`);
    conclusao.push("Alteração das vesículas seminais, conforme descrita.");
  } else {
    corpo.push(`Vesícula seminal ${v.lateralidade}: ${descricao}.`);
    conclusao.push(`Alteração da vesícula seminal ${v.lateralidade}, conforme descrita.`);
  }
  if (outro) {
    corpo.push(`Vesícula seminal ${outro} de dimensões, ecogenicidade e contornos normais.`);
    const normal = `Vesícula seminal ${outro} ecograficamente normal.`;
    conclusao.push(normal);
    normaisNaConclusao.push(normal);
  }
  return { corpo, conclusao, normaisNaConclusao };
}

function blocosProstata(f: ProstataSuprapubicaFindings): {
  aspectos: string[];
  conclusao: string[];
  normaisNaConclusao: string[];
} {
  const aspectos: string[] = [];
  const conclusao: string[] = [];
  const aumentada = f.hiperplasia;
  const sharedBladder = f.bexiga_detalhada
    ? renderSharedBladder(f.bexiga_detalhada, {
        normalBody: "Bexiga de forma, ecotextura e contornos regulares.",
        normalConclusion: "Bexiga ecograficamente normal.",
      })
    : null;

  // Lesão ditada só vale no caminho legado; com bexiga compartilhada, é ignorada.
  const lesaoDitada = sharedBladder ? null : f.bexiga_lesao_focal ?? null;
  const achadoLivre = f.bexiga_achado && f.bexiga_achado.trim() !== "" ? f.bexiga_achado.trim() : null;
  const bexigaBody = sharedBladder ? sharedBladder.body.join("\n") :
    [
      achadoLivre ? `Bexiga com ${achadoLivre}.` : lesaoDitada ? null : "Bexiga de forma, ecotextura e contornos regulares.",
      lesaoDitada ? fraseLesaoFocalVesical(lesaoDitada) : null,
    ].filter((linha): linha is string => linha !== null).join("\n");
  const volTxt = sharedBladder ? "" :
    f.volume_pre_miccional_ml !== null
      ? ` Volume pré-miccional de ${intStr(f.volume_pre_miccional_ml)} mL.`
      : "";
  aspectos.push(`${bexigaBody}${volTxt}`);

  // As três dimensões só entram juntas e válidas; qualquer uma inválida mantém
  // o placeholder histórico em vez de imprimir "-5,0" ou "0,0" e calcular peso.
  const tresValidas =
    medidaPositiva(f.prostata_d1_cm) && medidaPositiva(f.prostata_d2_cm) && medidaPositiva(f.prostata_d3_cm);
  const peso = tresValidas
    ? calcPesoProstatico(f.prostata_d1_cm, f.prostata_d2_cm, f.prostata_d3_cm)
    : null;
  const medidas = tresValidas
    ? `${ptBr1(f.prostata_d1_cm as number)} x ${ptBr1(f.prostata_d2_cm as number)} x ${ptBr1(f.prostata_d3_cm as number)} cm`
    : "____ cm";
  const ippValido = medidaPositiva(f.ipp_cm);
  aspectos.push(
    aumentada
      ? `Próstata aumentada de volume, medindo ${medidas}.`
      : `Próstata medindo ${medidas}.`,
  );
  if (f.calcificacoes) aspectos.push("Calcificações prostáticas.");
  if (aumentada && ippValido) {
    aspectos.push(`Índice de protrusão prostática (IPP) mede ${ptBr1(f.ipp_cm as number)} cm.`);
  }
  const vesiculas = blocosVesiculas(f.vesiculas_seminais);
  aspectos.push(...vesiculas.corpo);
  if (f.achados_adicionais && f.achados_adicionais.trim() !== "") {
    aspectos.push(f.achados_adicionais.trim());
  }

  if (sharedBladder) conclusao.push(...sharedBladder.conclusion);
  else {
    if (achadoLivre) conclusao.push(`Alterações vesicais (${achadoLivre}), a correlacionar com obstrução infravesical.`);
    if (lesaoDitada) conclusao.push(LESAO_FOCAL_VESICAL_CONCLUSAO);
    if (!achadoLivre && !lesaoDitada) conclusao.push("Bexiga ecograficamente normal.");
  }
  if (!sharedBladder && f.residuo_pos_miccional_ml !== null) {
    conclusao.push(
      f.residuo_pos_miccional_ml > 100
        ? `Resíduo pós-miccional elevado (${intStr(f.residuo_pos_miccional_ml)} mL).`
        : `Resíduo pós-miccional de ${intStr(f.residuo_pos_miccional_ml)} mL.`,
    );
  } else if (!sharedBladder && f.residuo_desprezivel) {
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
  if (aumentada && ippValido) {
    conclusao.push(`Protrusão prostática intravesical de ${ptBr1(f.ipp_cm as number)} cm (${ippGrau(f.ipp_cm as number)}).`);
  }
  if (f.calcificacoes) conclusao.push("Calcificações prostáticas.");
  conclusao.push(...vesiculas.conclusao);

  return { aspectos, conclusao, normaisNaConclusao: vesiculas.normaisNaConclusao };
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
  // Texto livre (ditado ou Web) em linha única: nenhuma quebra vira cabeçalho.
  const { aspectos, conclusao, normaisNaConclusao } = blocosProstata(textoEmLinhaUnica(f));
  // O clássico fecha todas as estruturas normais por decisão histórica. No
  // objetivo, a impressão fica só com a próstata, medidas pós-miccionais e
  // alterações — bexiga/vesículas normais já estão descritas nos achados.
  const conclusaoDoEstilo = opts?.objetivo
    ? conclusao.filter(
        (item) =>
          item !== "Bexiga ecograficamente normal." &&
          !normaisNaConclusao.includes(item),
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
