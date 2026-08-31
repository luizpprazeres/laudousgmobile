import { z } from "zod";

const MedidasSchema = z.object({
  vps_cms: z.number().positive().nullable(),
  vdf_cms: z.number().nonnegative().nullable(),
});

const PlacaSchema = z.object({
  localizacao: z.string().nullable(),
  composicao: z.enum(["calcificada", "lipidica", "mista"]).nullable(),
  superficie: z.enum(["regular", "irregular", "ulcerada"]).nullable(),
  espessura_mm: z.number().positive().nullable(),
  estenose_percentual: z.number().min(0).max(100).nullable(),
  descricao_raw: z.string().nullable(),
});

const LadoSchema = z.object({
  emi_mm: z.number().positive().nullable(),
  comum: MedidasSchema,
  interna: MedidasSchema,
  externa: MedidasSchema,
  vertebral: z.object({
    vps_cms: z.number().positive().nullable(),
    direcao: z.enum(["anterogrado", "retrogrado", "ausente"]).nullable(),
  }),
  placas: z.array(PlacaSchema).max(12),
});

export const DopplerCarotidasFindingsSchema = z.object({
  direita: LadoSchema,
  esquerda: LadoSchema,
  classificacao_explicita: z
    .enum([
      "normal",
      "ateromatose_sem_estenose_significativa",
      "estenose_menor_50",
      "estenose_50_69",
      "estenose_70_99",
      "oclusao",
    ])
    .nullable(),
  lado_classificacao: z.enum(["direita", "esquerda", "bilateral"]).nullable(),
  conclusao_livre: z.string().nullable(),
  achados_adicionais: z.string().nullable(),
});

export type DopplerCarotidasFindings = z.infer<typeof DopplerCarotidasFindingsSchema>;

const nullableNumber = { type: ["number", "null"] } as const;
const nullableString = { type: ["string", "null"] } as const;
const nullableEnum = (values: readonly string[]) => ({
  type: ["string", "null"],
  enum: [...values, null],
});

const MEDIDAS_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["vps_cms", "vdf_cms"],
  properties: { vps_cms: nullableNumber, vdf_cms: nullableNumber },
} as const;

const PLACA_JSON = {
  type: "object",
  additionalProperties: false,
  required: [
    "localizacao",
    "composicao",
    "superficie",
    "espessura_mm",
    "estenose_percentual",
    "descricao_raw",
  ],
  properties: {
    localizacao: nullableString,
    composicao: nullableEnum(["calcificada", "lipidica", "mista"]),
    superficie: nullableEnum(["regular", "irregular", "ulcerada"]),
    espessura_mm: nullableNumber,
    estenose_percentual: nullableNumber,
    descricao_raw: nullableString,
  },
} as const;

const LADO_JSON = {
  type: "object",
  additionalProperties: false,
  required: ["emi_mm", "comum", "interna", "externa", "vertebral", "placas"],
  properties: {
    emi_mm: nullableNumber,
    comum: MEDIDAS_JSON,
    interna: MEDIDAS_JSON,
    externa: MEDIDAS_JSON,
    vertebral: {
      type: "object",
      additionalProperties: false,
      required: ["vps_cms", "direcao"],
      properties: {
        vps_cms: nullableNumber,
        direcao: nullableEnum(["anterogrado", "retrogrado", "ausente"]),
      },
    },
    placas: { type: "array", items: PLACA_JSON, maxItems: 12 },
  },
} as const;

export const DOPPLER_CAROTIDAS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "direita",
    "esquerda",
    "classificacao_explicita",
    "lado_classificacao",
    "conclusao_livre",
    "achados_adicionais",
  ],
  properties: {
    direita: LADO_JSON,
    esquerda: LADO_JSON,
    classificacao_explicita: nullableEnum([
      "normal",
      "ateromatose_sem_estenose_significativa",
      "estenose_menor_50",
      "estenose_50_69",
      "estenose_70_99",
      "oclusao",
    ]),
    lado_classificacao: nullableEnum(["direita", "esquerda", "bilateral"]),
    conclusao_livre: nullableString,
    achados_adicionais: nullableString,
  },
} as const;

export const DOPPLER_CAROTIDAS_EXTRACTION_PROMPT = `Você extrai dados de Doppler de carótidas e vertebrais para JSON.
Não redija laudo e não conclua. Copie somente vaso, lado e valores explicitamente ditados.
Nunca derive grau de estenose das velocidades. classificacao_explicita só pode ser preenchida
quando o médico disser a classificação. Não invente composição ou superfície de placa.
Converta velocidades para cm/s e espessura médio-intimal para mm.`;

const fmt = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);

export function indiceResistividade(vps: number | null, vdf: number | null): number | null {
  if (vps === null || vdf === null || vps <= 0 || vdf < 0 || vdf > vps) return null;
  return (vps - vdf) / vps;
}

function linhaVaso(nome: string, m: z.infer<typeof MedidasSchema>): string | null {
  const partes: string[] = [];
  if (m.vps_cms !== null) partes.push(`PSV de ${fmt(m.vps_cms)} cm/s`);
  if (m.vdf_cms !== null) partes.push(`VDF de ${fmt(m.vdf_cms)} cm/s`);
  const ir = indiceResistividade(m.vps_cms, m.vdf_cms);
  if (ir !== null) partes.push(`IR de ${fmt(ir)}`);
  return partes.length ? `${nome}: ${partes.join(", ")}.` : null;
}

function descricaoPlaca(p: z.infer<typeof PlacaSchema>): string {
  if (p.descricao_raw?.trim()) return p.descricao_raw.trim().replace(/[.]$/, "") + ".";
  const detalhes = [
    p.composicao ? `de composição ${p.composicao}` : null,
    p.superficie ? `superfície ${p.superficie}` : null,
    p.espessura_mm !== null ? `espessura de ${fmt(p.espessura_mm)} mm` : null,
    p.estenose_percentual !== null
      ? `redução luminal informada de ${fmt(p.estenose_percentual)}%`
      : null,
  ].filter(Boolean);
  const local = p.localizacao?.trim() || "território carotídeo";
  return `Placa ateromatosa em ${local}${detalhes.length ? `, ${detalhes.join(", ")}` : ""}.`;
}

function blocoLado(
  rotulo: "DIREITO" | "ESQUERDO",
  lado: z.infer<typeof LadoSchema>,
  objetivo: boolean,
): string {
  const linhas: string[] = [];
  const ladoTexto = rotulo === "DIREITO" ? "direito" : "esquerdo";
  const ladoFeminino = rotulo === "DIREITO" ? "direita" : "esquerda";
  if (lado.emi_mm !== null) {
    linhas.push(
      objetivo
        ? `Espessura médio-intimal do lado ${ladoTexto}: ${fmt(lado.emi_mm)} mm.`
        : `A espessura do complexo médio-intimal do lado ${ladoTexto} mede ${fmt(lado.emi_mm)} mm.`,
    );
  } else if (!objetivo) {
    linhas.push(`O complexo médio-intimal do lado ${ladoTexto} apresenta aspecto habitual.`);
  }
  if (lado.placas.length === 0) linhas.push(objetivo ? `Sem placas à ${ladoFeminino}.` : `Não se observam placas ateromatosas à ${ladoFeminino}.`);
  else linhas.push(...lado.placas.map(descricaoPlaca));
  for (const linha of [
    linhaVaso(`Carótida comum ${ladoFeminino}`, lado.comum),
    linhaVaso(`Carótida interna ${ladoFeminino}`, lado.interna),
    linhaVaso(`Carótida externa ${ladoFeminino}`, lado.externa),
  ]) if (linha) linhas.push(linha);
  const vertebral: string[] = [];
  if (lado.vertebral.direcao) {
    const direcao = lado.vertebral.direcao === "anterogrado"
      ? "anterógrado"
      : lado.vertebral.direcao === "retrogrado" ? "retrógrado" : "ausente";
    vertebral.push(`fluxo ${direcao}`);
  }
  if (lado.vertebral.vps_cms !== null) vertebral.push(`PSV de ${fmt(lado.vertebral.vps_cms)} cm/s`);
  if (vertebral.length) linhas.push(`Artéria vertebral ${ladoFeminino}: ${vertebral.join(", ")}.`);
  else if (!objetivo) linhas.push(`A artéria vertebral ${ladoFeminino} apresenta fluxo anterógrado.`);
  return `${objetivo ? rotulo : `LADO ${rotulo}`}\n${linhas.join("\n")}`;
}

function conclusao(f: DopplerCarotidasFindings): string[] {
  if (f.conclusao_livre?.trim()) return [f.conclusao_livre.trim().replace(/[.]$/, "") + "."];
  const lado = f.lado_classificacao === "direita" ? "à direita"
    : f.lado_classificacao === "esquerda" ? "à esquerda"
      : f.lado_classificacao === "bilateral" ? "bilateralmente" : "";
  switch (f.classificacao_explicita) {
    case "ateromatose_sem_estenose_significativa": return [`Ateromatose carotídea ${lado}, sem estenose hemodinamicamente significativa.`.replace("  ", " ")];
    case "estenose_menor_50": return [`Estenose carotídea inferior a 50% ${lado}.`.replace("  ", " ")];
    case "estenose_50_69": return [`Estenose carotídea de 50 a 69% ${lado}.`.replace("  ", " ")];
    case "estenose_70_99": return [`Estenose carotídea de 70 a 99% ${lado}.`.replace("  ", " ")];
    case "oclusao": return [`Oclusão carotídea ${lado}.`.replace("  ", " ")];
    case "normal": return ["Estudo Doppler das artérias carótidas e vertebrais dentro dos limites da normalidade."];
    default:
      return f.direita.placas.length || f.esquerda.placas.length
        ? ["Ateromatose carotídea. Grau de estenose não classificado neste formulário."]
        : ["Estudo Doppler das artérias carótidas e vertebrais dentro dos limites da normalidade."];
  }
}

export function renderDopplerCarotidas(
  findings: DopplerCarotidasFindings,
  opts?: { objetivo?: boolean },
): string {
  const f = DopplerCarotidasFindingsSchema.parse(findings);
  const objetivo = opts?.objetivo === true;
  const tecnica = objetivo
    ? "Exame realizado com transdutor linear de alta frequência, utilizando modos bidimensional, Doppler colorido e espectral."
    : "Foram realizados cortes ultrassonográficos com transdutor linear de alta frequência, utilizando os modos bidimensional, Doppler colorido e espectral para avaliação bilateral das artérias carótidas e vertebrais.";
  const blocos = [
    "ULTRASSONOGRAFIA DOPPLER DE CARÓTIDAS E VERTEBRAIS",
    objetivo ? `TÉCNICA:\n${tecnica}` : `COMENTÁRIOS:\n${tecnica}`,
    `${objetivo ? "ACHADOS:" : "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:"}\n${blocoLado("DIREITO", f.direita, objetivo)}\n\n${blocoLado("ESQUERDO", f.esquerda, objetivo)}`,
  ];
  if (f.achados_adicionais?.trim()) blocos.push(f.achados_adicionais.trim());
  const itens = conclusao(f);
  blocos.push(`${objetivo ? "IMPRESSÃO:" : "CONCLUSÃO:"}\n${itens.length > 1 ? itens.map((x, i) => `${i + 1}) ${x}`).join("\n") : itens[0]}`);
  return blocos.join("\n\n");
}
