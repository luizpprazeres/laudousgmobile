import { z } from "zod";

export const FigoFamilySchema = z.enum(["submucoso", "intramural", "subseroso", "outros"]);
export type FigoFamily = z.infer<typeof FigoFamilySchema>;

export const FIGO_CATEGORIES = [
  { figo: 0, family: "submucoso", title: "Pediculado intracavitário", description: "Dentro da cavidade, com haste" },
  { figo: 1, family: "submucoso", title: "< 50% intramural", description: "Faz contato com o endométrio" },
  { figo: 2, family: "submucoso", title: "≥ 50% intramural", description: "Faz contato com o endométrio" },
  { figo: 3, family: "intramural", title: "Contato com endométrio", description: "100% intramural, toca a cavidade" },
  { figo: 4, family: "intramural", title: "Intramural puro", description: "Sem tocar endométrio nem serosa" },
  { figo: 5, family: "subseroso", title: "≥ 50% intramural", description: "Faz contato com a serosa" },
  { figo: 6, family: "subseroso", title: "< 50% intramural", description: "Faz contato com a serosa" },
  { figo: 7, family: "subseroso", title: "Pediculado externo", description: "Externo, com haste" },
  { figo: 8, family: "outros", title: "Localização atípica", description: "Cervical, ligamento largo ou parasitário" },
] as const satisfies readonly { figo: number; family: FigoFamily; title: string; description: string }[];

export const FIGO_FAMILY_COLORS: Record<FigoFamily, string> = {
  submucoso: "#E0584A",
  intramural: "#D8932B",
  subseroso: "#7B59C6",
  outros: "#3D8BBF",
};

export const MyomaLocationSchema = z.enum([
  "not_informed",
  "anterior",
  "posterior",
  "lateral_direita",
  "lateral_esquerda",
  "fundo",
  "cervical",
]);
export type MyomaLocation = z.infer<typeof MyomaLocationSchema>;

export const MYOMA_LOCATION_LABELS: Record<MyomaLocation, string> = {
  not_informed: "Não informada",
  anterior: "Anterior",
  posterior: "Posterior",
  lateral_direita: "Lateral direita",
  lateral_esquerda: "Lateral esquerda",
  fundo: "Fundo",
  cervical: "Cervical",
};

export const MyomaEchoSchema = z.enum(["hipoecoica", "heterogenea", "calcificada", "degenerada"]);
export type MyomaEcho = z.infer<typeof MyomaEchoSchema>;

export const MYOMA_ECHO_LABELS: Record<MyomaEcho, string> = {
  hipoecoica: "Hipoecoica",
  heterogenea: "Heterogênea",
  calcificada: "Calcificada",
  degenerada: "Degenerada",
};

const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() }).strict();

export const MyomaFindingSchema = z.object({
  id: z.string().min(1),
  figo: z.number().int().min(0).max(8),
  figoConfirmed: z.boolean(),
  sizeMaxMm: z.number().finite().positive().max(500).nullable(),
  location: MyomaLocationSchema,
  echo: MyomaEchoSchema.nullable(),
  sagittalPoint: PointSchema.nullable().default(null),
  axialPoint: PointSchema.nullable().default(null),
}).strict();

export type MyomaFinding = z.infer<typeof MyomaFindingSchema>;

let localSequence = 0;
export function newMyomaFinding(patch: Partial<MyomaFinding> = {}): MyomaFinding {
  localSequence += 1;
  return {
    id: `mioma-${Date.now()}-${localSequence}`,
    figo: 4,
    figoConfirmed: false,
    sizeMaxMm: null,
    location: "not_informed",
    echo: null,
    sagittalPoint: null,
    axialPoint: null,
    ...patch,
  };
}

export function myomaFamily(figo: number): FigoFamily {
  return FIGO_CATEGORIES.find((category) => category.figo === figo)?.family ?? "outros";
}

export function canonicalSagittalPoint(figo: number) {
  const points: Record<number, { x: number; y: number }> = {
    0: { x: 208, y: 236 }, 1: { x: 176, y: 250 }, 2: { x: 244, y: 250 },
    3: { x: 150, y: 300 }, 4: { x: 272, y: 300 }, 5: { x: 120, y: 210 },
    6: { x: 304, y: 168 }, 7: { x: 360, y: 108 }, 8: { x: 232, y: 440 },
  };
  return points[figo] ?? points[8];
}

export function canonicalAxialPoint(location: MyomaLocation) {
  const points: Record<MyomaLocation, { x: number; y: number }> = {
    not_informed: { x: 280, y: 200 },
    anterior: { x: 280, y: 150 }, posterior: { x: 280, y: 252 },
    lateral_direita: { x: 420, y: 188 }, lateral_esquerda: { x: 140, y: 200 },
    fundo: { x: 280, y: 200 }, cervical: { x: 280, y: 320 },
  };
  return points[location];
}

export type MyomaDrawingPoint =
  | { plane: "sagittal"; point: { x: number; y: number } }
  | { plane: "axial"; point: { x: number; y: number } };

/** Converte um toque no PNG canônico (820 × 560) para a geometria editável. */
export function myomaPointFromExportTouch(exportX: number, exportY: number): MyomaDrawingPoint | null {
  if (exportX >= 24 && exportX <= 386 && exportY >= 76 && exportY <= 456) {
    return {
      plane: "sagittal",
      point: {
        x: Math.max(70, Math.min(370, (exportX - 44) / (320 / 420))),
        y: Math.max(40, Math.min(480, (exportY - 78) / (355 / 520))),
      },
    };
  }
  if (exportX >= 410 && exportX <= 796 && exportY >= 76 && exportY <= 456) {
    return {
      plane: "axial",
      point: {
        x: Math.max(50, Math.min(510, (exportX - 430) / (330 / 560))),
        y: Math.max(20, Math.min(380, (exportY - 105) / (300 / 400))),
      },
    };
  }
  return null;
}

function match(pattern: RegExp, text: string) {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

function explicitFigo(text: string): number | null {
  const found = /FIGO\s*[:\-]?\s*([0-8])/i.exec(text);
  return found ? Number(found[1]) : null;
}

function maxAxisMm(text: string): number | null {
  const multi = /(\d+(?:[,.]\d+)?)\s*(?:x|por|×)\s*(\d+(?:[,.]\d+)?)(?:\s*(?:x|por|×)\s*(\d+(?:[,.]\d+)?))?\s*(cm|mm)/i.exec(text);
  if (multi) {
    const values = multi.slice(1, 4).filter(Boolean).map((value) => Number(value!.replace(",", ".")));
    const maximum = Math.max(...values);
    return multi[4]!.toLowerCase() === "cm" ? maximum * 10 : maximum;
  }
  const single = /(?:medindo|de)\s+(\d+(?:[,.]\d+)?)\s*(cm|mm)/i.exec(text);
  if (!single) return null;
  const value = Number(single[1]!.replace(",", "."));
  return single[2]!.toLowerCase() === "cm" ? value * 10 : value;
}

function location(text: string): MyomaLocation {
  if (match(/parede\s+posterior|face\s+posterior|\bposterior\b/i, text)) return "posterior";
  if (match(/parede\s+anterior|face\s+anterior|\banterior\b/i, text)) return "anterior";
  if (match(/lateral\s+direita|à\s+direita|\bdireita\b/i, text)) return "lateral_direita";
  if (match(/lateral\s+esquerda|à\s+esquerda|\besquerda\b/i, text)) return "lateral_esquerda";
  if (match(/fundo\s+uterino|no\s+fundo|f[úu]ndic/i, text)) return "fundo";
  if (match(/cervical|do\s+colo/i, text)) return "cervical";
  return "not_informed";
}

function echo(text: string): MyomaEcho | null {
  if (match(/calcific/i, text)) return "calcificada";
  if (match(/degener/i, text)) return "degenerada";
  if (match(/heterog/i, text)) return "heterogenea";
  if (match(/hipoec/i, text)) return "hipoecoica";
  return null;
}

/**
 * Extrai somente FIGO explicitamente escrito. Localização vaga nunca vira
 * classificação numérica escondida; o editor exige confirmação antes do envio.
 */
export function parseMyomaFindings(reportText: string): MyomaFinding[] {
  if (!reportText.trim()) return [];
  const sentences = reportText.replace(/\n/g, " ").split(/[.;]/).map((part) => part.trim()).filter(Boolean);
  const candidates = sentences.filter((sentence) =>
    match(/mioma|leiomioma|miomatos/i, sentence) ||
    (match(/intramural|submucos|subseros/i, sentence) && match(/n[óo]dul|parede|mi[oó]metri|f[úu]ndic|cervical|\d/i, sentence)),
  );
  const measured = candidates.filter((sentence) => maxAxisMm(sentence) !== null);
  const source = candidates.filter((sentence) => !measured.length || maxAxisMm(sentence) !== null || !/^(conclus[aã]o|impress[aã]o)/i.test(sentence));
  const findings: MyomaFinding[] = [];
  for (const sentence of source) {
    const sizeMaxMm = maxAxisMm(sentence);
    const loc = location(sentence);
    const figo = explicitFigo(sentence);
    findings.push(newMyomaFinding({
      figo: figo ?? 4,
      figoConfirmed: figo !== null,
      sizeMaxMm,
      location: loc,
      echo: echo(sentence),
    }));
  }
  if (!findings.length) {
    const explicit = [...reportText.matchAll(/FIGO\s*[:\-]?\s*([0-8])/gi)];
    return explicit.map((item) => newMyomaFinding({ figo: Number(item[1]), figoConfirmed: true, sizeMaxMm: null }));
  }
  return findings;
}

export function validMyomaFindings(value: unknown): MyomaFinding[] | null {
  const parsed = z.array(MyomaFindingSchema).min(1).max(20).safeParse(value);
  if (!parsed.success) return null;
  if (new Set(parsed.data.map((finding) => finding.id)).size !== parsed.data.length) return null;
  return parsed.data;
}

export function canSendMyomaScheme(value: unknown): value is MyomaFinding[] {
  const findings = validMyomaFindings(value);
  return !!findings && findings.every((finding) => finding.figoConfirmed);
}

/** Contrato compartilhado entre Web, iOS, Android e Sala. */
export const MYOMA_SCHEME_CONTRACT_VERSION = "myoma-scheme/v1" as const;
export const MyomaSchemeContractSchema = z.object({
  contractVersion: z.literal(MYOMA_SCHEME_CONTRACT_VERSION),
  examType: z.literal("MIOMAS"),
  findings: z.array(MyomaFindingSchema).min(1).max(20),
}).strict().superRefine((value, context) => {
  if (new Set(value.findings.map((finding) => finding.id)).size !== value.findings.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["findings"], message: "Identificadores de miomas devem ser únicos." });
  }
  value.findings.forEach((finding, index) => {
    if (!finding.figoConfirmed) context.addIssue({ code: z.ZodIssueCode.custom, path: ["findings", index, "figoConfirmed"], message: "A classificação FIGO precisa ser confirmada pelo médico." });
  });
});
export type MyomaSchemeContract = z.infer<typeof MyomaSchemeContractSchema>;

export function createMyomaSchemeContract(findings: unknown): MyomaSchemeContract | null {
  const parsed = MyomaSchemeContractSchema.safeParse({
    contractVersion: MYOMA_SCHEME_CONTRACT_VERSION,
    examType: "MIOMAS",
    findings,
  });
  return parsed.success ? parsed.data : null;
}
