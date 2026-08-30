import { z } from "zod";
import {
  CERVICOMETRIA_ADDON_JSON_SCHEMA,
  CervicometriaAddonSchema,
  renderCervicometriaBloco,
} from "./CERVICOMETRIA";
import {
  DOPPLER_OBSTETRICO_MODULE_JSON_SCHEMA,
  DOPPLER_MODULE_EXTRACTION_RULES,
  DOPPLER_TECNICA_CLASSICO,
  DOPPLER_TECNICA_OBJETIVO,
  DopplerObstetricoModuleSchema,
  renderDopplerModule,
} from "./dopplerObstetricoModule";

/** Exame Doppler isolado. Obstétrica e Morfológico usam o mesmo módulo aninhado. */
export const DopplerObstetricoFindingsSchema = DopplerObstetricoModuleSchema.extend({
  observacoes_adicionais: z.string().nullable(),
  itens_conclusao_livres: z.array(z.string()),
  ig_semanas: z.number().nullable(),
  cervicometria: CervicometriaAddonSchema.nullable().optional(),
});

export type DopplerObstetricoFindings = z.infer<typeof DopplerObstetricoFindingsSchema>;

export const DOPPLER_OBSTETRICO_JSON_SCHEMA = {
  ...DOPPLER_OBSTETRICO_MODULE_JSON_SCHEMA,
  required: [
    ...DOPPLER_OBSTETRICO_MODULE_JSON_SCHEMA.required,
    "observacoes_adicionais",
    "itens_conclusao_livres",
    "ig_semanas",
    "cervicometria",
  ],
  properties: {
    ...DOPPLER_OBSTETRICO_MODULE_JSON_SCHEMA.properties,
    observacoes_adicionais: { type: ["string", "null"] },
    itens_conclusao_livres: { type: "array", items: { type: "string" } },
    ig_semanas: { type: ["number", "null"] },
    cervicometria: CERVICOMETRIA_ADDON_JSON_SCHEMA,
  },
} as const;

export const DOPPLER_OBSTETRICO_EXTRACTION_PROMPT = `Você é a etapa de EXTRAÇÃO do LaudoUSG para DOPPLERVELOCIMETRIA OBSTÉTRICA ISOLADA.
Organize o ditado no JSON tipado. NÃO redija o laudo. NÃO invente valores. Campo não ditado → null.

${DOPPLER_MODULE_EXTRACTION_RULES}

REGRAS DO EXAME ISOLADO:
- Não extraia biometria fetal, placenta, líquido, idade gestacional ou anatomia: esses dados pertencem ao exame obstétrico base.
- observacoes_adicionais: descrição vascular relevante sem campo próprio, exatamente como ditada; null se ausente.
- itens_conclusao_livres: conclusões adicionais expressamente ditadas e sem campo próprio; [] se ausentes.
- cervicometria é um complemento independente. Preencha apenas se explicitamente realizada; ig_semanas serve somente para sua interpretação e não entra no corpo do Doppler.`;

const TITULO = "DOPPLERVELOCIMETRIA OBSTÉTRICA";

/** Compatibilidade transitória com o pipeline anterior, que mesclava IG. */
export function mergeStructuredIg(
  f: DopplerObstetricoFindings,
  _rawInput: string,
): DopplerObstetricoFindings {
  return f;
}

function numerar(itens: string[], objetivo: boolean): string {
  if (itens.length === 1) return itens[0] ?? "";
  return itens
    .map((item, index) => `${index + 1}${objetivo ? "." : ")"} ${item}`)
    .join("\n");
}

export function renderDopplerObstetrico(
  f: DopplerObstetricoFindings,
  _prefs?: unknown,
  opts?: { objetivo?: boolean; umbilicalSafety?: boolean; rawInput?: string },
): string {
  const objetivo = opts?.objetivo ?? false;
  const bloco = renderDopplerModule(f, {
    rawInput: opts?.rawInput,
    umbilicalSafety: opts?.umbilicalSafety,
  });
  const achados = [...bloco.achados];
  if (f.observacoes_adicionais?.trim()) achados.push(f.observacoes_adicionais.trim());
  const conclusao = [
    ...bloco.conclusao,
    ...f.itens_conclusao_livres.map((item) => item.trim()).filter(Boolean),
  ];
  if (f.cervicometria) {
    const cervico = renderCervicometriaBloco(f.cervicometria, f.ig_semanas);
    achados.push("CERVICOMETRIA:", ...cervico.achados);
    conclusao.push(...cervico.conclusao);
  }

  if (objetivo) {
    return [
      TITULO,
      "",
      "TÉCNICA:",
      `${DOPPLER_TECNICA_OBJETIVO}${f.cervicometria ? " Avaliação complementar do colo uterino realizada pela via transvaginal." : ""}`,
      "",
      "ACHADOS:",
      ...achados,
      "",
      "IMPRESSÃO:",
      numerar(conclusao, true),
    ].join("\n").trim();
  }

  return [
    TITULO,
    "",
    "COMENTÁRIOS:",
    `${DOPPLER_TECNICA_CLASSICO}${f.cervicometria ? "\nFoi realizada avaliação complementar do colo uterino pela via transvaginal." : ""}`,
    "",
    "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
    ...achados,
    "",
    "CONCLUSÃO:",
    numerar(conclusao, false),
  ].join("\n").trim();
}
