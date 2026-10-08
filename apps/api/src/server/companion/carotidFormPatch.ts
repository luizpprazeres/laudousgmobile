import {
  COMPANION_FORM_PATCH_CONTRACT_VERSION,
  CompanionFormPatchResponseSchema,
  type CompanionFormPatchRequest,
  type CompanionFormPatchResponse,
  type CompanionFormPatchWarning,
} from "@laudousg/shared";
import {
  DopplerCarotidasFindingsSchema,
  type DopplerCarotidasFindings,
} from "../renderer/categories/DOPPLER_CAROTIDAS";
import { runRendererExtraction } from "../renderer/extraction";

type Extraction = (args: {
  categoryCode: string;
  rawInput: string;
  signal?: AbortSignal;
}) => Promise<{ findings: unknown }>;

export class CompanionFormPatchNoFindingsError extends Error {
  readonly warnings: CompanionFormPatchWarning[];

  constructor(warnings: CompanionFormPatchWarning[] = []) {
    super("no_applicable_findings");
    this.name = "CompanionFormPatchNoFindingsError";
    this.warnings = warnings;
  }
}

export function companionFormPatchCategoryEnabled(
  category: string,
  allowlist = process.env.COMPANION_FORM_PATCH_CATEGORIES ?? "",
): boolean {
  return allowlist
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean)
    .includes(category.toUpperCase());
}

const numericText = (value: number | null): string | undefined =>
  value === null ? undefined : String(value);

const cleanText = (value: string | null): string | undefined => {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
};

export function toCompanionCarotidFormPatch(
  findingsInput: unknown,
  sourceKind: CompanionFormPatchRequest["sourceKind"],
): CompanionFormPatchResponse {
  const findings = DopplerCarotidasFindingsSchema.parse(findingsInput);
  const carotidMeasurements: CompanionFormPatchResponse["data"]["carotidMeasurements"] = [];
  const carotidPlaques: CompanionFormPatchResponse["data"]["carotidPlaques"] = [];
  const warnings: CompanionFormPatchWarning[] = [];

  for (const side of ["direita", "esquerda"] as const) {
    const sideFindings = findings[side];
    for (const vessel of ["comum", "interna", "externa"] as const) {
      const measurement = sideFindings[vessel];
      const psv = numericText(measurement.vps_cms);
      const vdf = numericText(measurement.vdf_cms);
      const emi = vessel === "comum" ? numericText(sideFindings.emi_mm) : undefined;
      if (psv || vdf || emi) {
        carotidMeasurements.push({ side, vessel, ...(psv ? { psv } : {}), ...(vdf ? { vdf } : {}), ...(emi ? { emi } : {}) });
      }
    }

    const vertebralPsv = numericText(sideFindings.vertebral.vps_cms);
    const flowDirection = sideFindings.vertebral.direcao ?? undefined;
    if (vertebralPsv || flowDirection) {
      carotidMeasurements.push({
        side,
        vessel: "vertebral",
        ...(vertebralPsv ? { psv: vertebralPsv } : {}),
        ...(flowDirection ? { flowDirection } : {}),
      });
    }

    for (const plaque of sideFindings.placas) {
      const location = cleanText(plaque.localizacao);
      const thickness = numericText(plaque.espessura_mm);
      const stenosisPercent = numericText(plaque.estenose_percentual);
      const description = cleanText(plaque.descricao_raw);
      const mapped = {
        side,
        ...(location ? { location } : {}),
        ...(plaque.composicao ? { composition: plaque.composicao } : {}),
        ...(plaque.superficie ? { surface: plaque.superficie } : {}),
        ...(thickness ? { thickness } : {}),
        ...(stenosisPercent ? { stenosisPercent } : {}),
        ...(description ? { description } : {}),
      };
      if (Object.keys(mapped).length > 1) carotidPlaques.push(mapped);
    }
  }

  const carotidClassifications: CompanionFormPatchResponse["data"]["carotidClassifications"] = [];
  if (findings.classificacao_explicita) {
    if (findings.lado_classificacao === "bilateral") {
      if (findings.classificacao_explicita === "normal") {
        carotidClassifications.push(
          { side: "direita", classification: "normal" },
          { side: "esquerda", classification: "normal" },
        );
      } else {
        warnings.push({
          code: "BILATERAL_PATHOLOGIC_CLASSIFICATION_REVIEW",
          message: "Uma classificação patológica bilateral precisa ser confirmada separadamente em cada lado; ela não será aplicada automaticamente.",
          blocking: true,
        });
      }
    } else if (findings.lado_classificacao) {
      carotidClassifications.push({
        side: findings.lado_classificacao,
        classification: findings.classificacao_explicita,
      });
    } else {
      warnings.push({
        code: "CLASSIFICATION_SIDE_MISSING",
        message: "A classificação foi reconhecida, mas o lado não foi informado; ela não será aplicada automaticamente.",
        blocking: true,
      });
    }
  }

  const carotidConclusion = cleanText(findings.conclusao_livre);
  const carotidAdditionalFindings = cleanText(findings.achados_adicionais);
  const data = {
    carotidMeasurements,
    carotidPlaques,
    carotidClassifications,
    ...(carotidConclusion ? { carotidConclusion } : {}),
    ...(carotidAdditionalFindings ? { carotidAdditionalFindings } : {}),
  };

  const response = CompanionFormPatchResponseSchema.safeParse({
    contractVersion: COMPANION_FORM_PATCH_CONTRACT_VERSION,
    category: "DOPPLER_CAROTIDAS",
    sourceKind,
    data,
    warnings,
  });
  if (!response.success) throw new CompanionFormPatchNoFindingsError(warnings);
  return response.data;
}

export async function extractCompanionCarotidFormPatch(args: {
  request: CompanionFormPatchRequest;
  signal?: AbortSignal;
  extract?: Extraction;
}): Promise<CompanionFormPatchResponse> {
  const extracted = await (args.extract ?? runRendererExtraction)({
    categoryCode: "DOPPLER_CAROTIDAS",
    rawInput: args.request.text,
    signal: args.signal,
  });
  const parsedFindings = DopplerCarotidasFindingsSchema.parse(extracted.findings);
  const hasCompleteVelocityPair = (["direita", "esquerda"] as const).some((side) =>
    (["comum", "interna", "externa"] as const).some((vessel) =>
      parsedFindings[side][vessel].vps_cms !== null && parsedFindings[side][vessel].vdf_cms !== null,
    ),
  );
  const isolatedIrWarning: CompanionFormPatchWarning | null = /(?<![\p{L}\d])(?:ir(?=\s*(?:de\s*)?(?:[:=]\s*)?\d)|í?ndice\s+de\s+(?:resistividade|resist[êe]ncia))(?![\p{L}\d])/iu.test(args.request.text)
    ? {
        code: "ISOLATED_IR_NOT_APPLICABLE",
        message: hasCompleteVelocityPair
          ? "O IR ditado não é copiado diretamente; ele será calculado a partir da PSV e da VDF reconhecidas."
          : "O IR ditado não pode ser aplicado isoladamente; informe PSV e VDF ou preencha o campo manualmente.",
        blocking: !hasCompleteVelocityPair,
      }
    : null;
  try {
    const response = toCompanionCarotidFormPatch(parsedFindings, args.request.sourceKind);
    if (!isolatedIrWarning) return response;
    return CompanionFormPatchResponseSchema.parse({
      ...response,
      warnings: [...response.warnings, isolatedIrWarning],
    });
  } catch (error) {
    if (error instanceof CompanionFormPatchNoFindingsError && isolatedIrWarning) {
      throw new CompanionFormPatchNoFindingsError([...error.warnings, isolatedIrWarning]);
    }
    throw error;
  }
}

export type { DopplerCarotidasFindings };
