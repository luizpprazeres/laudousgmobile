import { z } from "zod";

export const CLINICAL_COMPOSITION_CONTRACT_VERSION = "clinical-composition/v1" as const;

export const CLINICAL_COMPOSITION_ASSOCIATION_CODES = [
  "ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA",
  "MAMARIA__PELVE_FEMININA",
] as const;

export const ClinicalCompositionAssociationCodeSchema = z.enum(
  CLINICAL_COMPOSITION_ASSOCIATION_CODES,
);

export const ClinicalCompositionCategoryCodeSchema = z.enum([
  "ABDOMEN_TOTAL",
  "PROSTATA_SUPRAPUBICA",
  "MAMARIA",
  "PELVE_FEMININA",
]);

export const ClinicalCompositionWritingStyleSchema = z.enum([
  "CLASSICO_COMPLETO",
  "OBJETIVO",
]);

const ComponentDataSchema = z
  .object({
    alteracoes: z.array(z.string().min(1).max(128)).max(20),
    dados: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

const ComponentSchema = z
  .object({
    componentId: z.string().uuid(),
    categoryCode: ClinicalCompositionCategoryCodeSchema,
    acquisitionContextId: z.string().uuid(),
    data: ComponentDataSchema,
  })
  .strict();

const SharedStructureSchema = z
  .object({
    sharedStructureId: z.string().uuid(),
    structureCode: z.literal("URINARY_BLADDER"),
    acquisitionContextId: z.string().uuid(),
    componentIds: z.tuple([z.string().uuid(), z.string().uuid()]),
    sourceComponentId: z.string().uuid(),
  })
  .strict();

const ASSOCIATION_CATEGORIES = {
  ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA: [
    "ABDOMEN_TOTAL",
    "PROSTATA_SUPRAPUBICA",
  ],
  MAMARIA__PELVE_FEMININA: ["MAMARIA", "PELVE_FEMININA"],
} as const;

export const ClinicalCompositionRequestV1Schema = z
  .object({
    contractVersion: z.literal(CLINICAL_COMPOSITION_CONTRACT_VERSION),
    requestId: z.string().uuid(),
    compositionId: z.string().uuid(),
    revision: z.number().int().nonnegative(),
    associationCode: ClinicalCompositionAssociationCodeSchema,
    writingStyle: ClinicalCompositionWritingStyleSchema,
    components: z.array(ComponentSchema).length(2),
    sharedStructures: z.array(SharedStructureSchema).max(1),
  })
  .strict()
  .superRefine((request, ctx) => {
    const ids = request.components.map((component) => component.componentId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "componentId deve ser único",
      });
    }

    const expected = [...ASSOCIATION_CATEGORIES[request.associationCode]].sort();
    const received = request.components.map((component) => component.categoryCode).sort();
    if (expected.join("|") !== received.join("|")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "componentes não correspondem à associação",
      });
    }

    if (
      request.associationCode === "MAMARIA__PELVE_FEMININA" &&
      request.sharedStructures.length > 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sharedStructures"],
        message: "MAMARIA__PELVE_FEMININA não compartilha estruturas",
      });
    }

    for (const [index, shared] of request.sharedStructures.entries()) {
      const memberIds = new Set(shared.componentIds);
      if (memberIds.size !== 2 || ids.some((id) => !memberIds.has(id))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sharedStructures", index, "componentIds"],
          message: "estrutura compartilhada deve referenciar os dois componentes",
        });
      }
      if (!memberIds.has(shared.sourceComponentId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sharedStructures", index, "sourceComponentId"],
          message: "sourceComponentId deve pertencer à estrutura compartilhada",
        });
      }
      const members = request.components.filter((component) => memberIds.has(component.componentId));
      if (
        members.some(
          (component) => component.acquisitionContextId !== shared.acquisitionContextId,
        )
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sharedStructures", index, "acquisitionContextId"],
          message: "contexto compartilhado deve coincidir com os componentes",
        });
      }
      const source = request.components.find(
        (component) => component.componentId === shared.sourceComponentId,
      );
      if (source?.categoryCode !== "ABDOMEN_TOTAL") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sharedStructures", index, "sourceComponentId"],
          message: "a origem canônica da bexiga compartilhada deve ser ABDOMEN_TOTAL",
        });
      }
    }
  });

const ProvenanceBlockSchema = z
  .object({
    blockId: z.string().min(1).max(160),
    section: z.enum(["title", "technique", "findings", "conclusion"]),
    componentIds: z.array(z.string().uuid()).min(1).max(2),
    categoryCodes: z.array(ClinicalCompositionCategoryCodeSchema).min(1).max(2),
    structureCode: z.literal("URINARY_BLADDER").optional(),
    text: z.string().min(1).max(100_000),
  })
  .strict();

const ComponentStatusSchema = z
  .object({
    componentId: z.string().uuid(),
    categoryCode: ClinicalCompositionCategoryCodeSchema,
    status: z.enum(["rendered", "error", "blocked"]),
    message: z.string().min(1).max(2_000).optional(),
  })
  .strict();

const ResponseIdentity = {
  contractVersion: z.literal(CLINICAL_COMPOSITION_CONTRACT_VERSION),
  requestId: z.string().uuid(),
  compositionId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  associationCode: ClinicalCompositionAssociationCodeSchema,
} as const;

const ClinicalCompositionSuccessV1BaseSchema = z
  .object({
    ...ResponseIdentity,
    status: z.literal("complete"),
    document: z
      .object({
        title: z.string().min(1).max(2_000),
        technique: z.string().min(1).max(100_000),
        findings: z.string().min(1).max(100_000),
        conclusion: z.string().min(1).max(100_000),
        fullText: z.string().min(1).max(300_000),
      })
      .strict(),
    blocks: z.array(ProvenanceBlockSchema).min(4).max(16),
    components: z.array(ComponentStatusSchema).length(2),
  })
  .strict();

function refineCompositionSuccess(
  response: z.infer<typeof ClinicalCompositionSuccessV1BaseSchema>,
  ctx: z.RefinementCtx,
) {
    const ids = response.components.map((component) => component.componentId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "componentId deve ser único",
      });
    }

    const expected = [...ASSOCIATION_CATEGORIES[response.associationCode]].sort();
    const received = response.components.map((component) => component.categoryCode).sort();
    if (expected.join("|") !== received.join("|")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["components"],
        message: "status dos componentes não corresponde à associação",
      });
    }

    const componentIds = new Set(ids);
    for (const [index, block] of response.blocks.entries()) {
      if (block.componentIds.some((id) => !componentIds.has(id))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks", index, "componentIds"],
          message: "bloco referencia componente ausente na resposta",
        });
      }
      const blockCategories = [...new Set(block.componentIds
        .map((id) => response.components.find((component) => component.componentId === id)?.categoryCode)
        .filter((category): category is ClinicalCompositionCategoryCode => category !== undefined))].sort();
      if (blockCategories.join("|") !== [...block.categoryCodes].sort().join("|")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks", index, "categoryCodes"],
          message: "categorias do bloco não correspondem aos componentes de origem",
        });
      }
    }
}

export const ClinicalCompositionSuccessV1Schema =
  ClinicalCompositionSuccessV1BaseSchema.superRefine(refineCompositionSuccess);

export const ClinicalCompositionErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "PAYLOAD_LIMIT_EXCEEDED",
  "UNKNOWN_ALTERATION",
  "INVALID_COMPONENT_DATA",
  "COMPONENT_RENDER_FAILED",
  "CANONICAL_SECTION_ERROR",
  "SHARED_STRUCTURE_REQUIRED",
  "SHARED_STRUCTURE_CONFLICT",
]);

const CompositionConflictSchema = z
  .object({
    componentId: z.string().uuid().optional(),
    structureCode: z.literal("URINARY_BLADDER").optional(),
    motivo: z.string().min(1).max(2_000),
  })
  .strict();

export const ClinicalCompositionErrorV1Schema = z
  .object({
    ...ResponseIdentity,
    status: z.literal("error"),
    error: z
      .object({
        code: ClinicalCompositionErrorCodeSchema,
        message: z.string().min(1).max(2_000),
      })
      .strict(),
    conflicts: z.array(CompositionConflictSchema).max(50).optional(),
    components: z.array(ComponentStatusSchema).length(2).optional(),
  })
  .strict();

export const ClinicalCompositionResponseV1Schema = z
  .discriminatedUnion("status", [
  ClinicalCompositionSuccessV1BaseSchema,
  ClinicalCompositionErrorV1Schema,
  ])
  .superRefine((response, ctx) => {
    if (response.status === "complete") refineCompositionSuccess(response, ctx);
  });

export type ClinicalCompositionAssociationCode = z.infer<
  typeof ClinicalCompositionAssociationCodeSchema
>;
export type ClinicalCompositionCategoryCode = z.infer<
  typeof ClinicalCompositionCategoryCodeSchema
>;
export type ClinicalCompositionRequestV1 = z.infer<
  typeof ClinicalCompositionRequestV1Schema
>;
export type ClinicalCompositionSuccessV1 = z.infer<
  typeof ClinicalCompositionSuccessV1Schema
>;
export type ClinicalCompositionErrorV1 = z.infer<
  typeof ClinicalCompositionErrorV1Schema
>;
export type ClinicalCompositionResponseV1 = z.infer<
  typeof ClinicalCompositionResponseV1Schema
>;
