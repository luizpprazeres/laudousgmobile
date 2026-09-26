import {
  CLINICAL_COMPOSITION_CONTRACT_VERSION,
  type ClinicalCompositionCategoryCode,
  type ClinicalCompositionErrorV1,
  type ClinicalCompositionRequestV1,
  type ClinicalCompositionResponseV1,
  type ClinicalCompositionSuccessV1,
} from "@laudousg/shared";
import {
  renderSharedBladder,
  SharedBladderSchema,
  type SharedBladder,
} from "../categories/sharedUrinary";
import {
  removeConclusionItems,
  removeExactLines,
  renderCompositionComponent,
  type RenderContextResolver,
  type RenderedCompositionComponent,
} from "./contractAdapters";

type ProvenanceBlock = ClinicalCompositionSuccessV1["blocks"][number];

const COMPONENT_ORDER = {
  ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA: [
    "ABDOMEN_TOTAL",
    "PROSTATA_SUPRAPUBICA",
  ],
  MAMARIA__PELVE_FEMININA: ["MAMARIA", "PELVE_FEMININA"],
} as const;

const LABELS: Record<ClinicalCompositionCategoryCode, string> = {
  ABDOMEN_TOTAL: "ABDOME TOTAL",
  PROSTATA_SUPRAPUBICA: "PRÓSTATA (VIA TRANSABDOMINAL)",
  MAMARIA: "MAMAS E REGIÕES AXILARES",
  PELVE_FEMININA: "PELVE FEMININA",
};

function errorResponse(
  request: ClinicalCompositionRequestV1,
  code: ClinicalCompositionErrorV1["error"]["code"],
  message: string,
  options?: {
    conflicts?: ClinicalCompositionErrorV1["conflicts"];
    components?: ClinicalCompositionErrorV1["components"];
  },
): ClinicalCompositionErrorV1 {
  return {
    contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
    requestId: request.requestId,
    compositionId: request.compositionId,
    revision: request.revision,
    associationCode: request.associationCode,
    status: "error",
    error: { code, message },
    ...(options?.conflicts ? { conflicts: options.conflicts } : {}),
    ...(options?.components ? { components: options.components } : {}),
  };
}

function componentStatus(
  component: ClinicalCompositionRequestV1["components"][number],
  status: "rendered" | "error" | "blocked",
  message?: string,
): NonNullable<ClinicalCompositionErrorV1["components"]>[number] {
  return {
    componentId: component.componentId,
    categoryCode: component.categoryCode,
    status,
    ...(message ? { message } : {}),
  };
}

function orderedComponents(request: ClinicalCompositionRequestV1) {
  const order = COMPONENT_ORDER[request.associationCode] as readonly string[];
  return [...request.components].sort(
    (left, right) => order.indexOf(left.categoryCode) - order.indexOf(right.categoryCode),
  );
}

function titleFor(
  request: ClinicalCompositionRequestV1,
  rendered: readonly RenderedCompositionComponent[],
): string {
  if (request.associationCode === "ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA") {
    return "ULTRASSONOGRAFIA DO ABDOME TOTAL E DA PRÓSTATA (VIA TRANSABDOMINAL)";
  }
  const breast = rendered.find((item) => item.component.categoryCode === "MAMARIA");
  const scope = breast?.parsedData.escopo_exame;
  if (scope === "axilas") {
    return "ULTRASSONOGRAFIA DAS REGIÕES AXILARES E DA PELVE FEMININA";
  }
  if (scope === "mamas_axilas") {
    return "ULTRASSONOGRAFIA DAS MAMAS, REGIÕES AXILARES E DA PELVE FEMININA";
  }
  return "ULTRASSONOGRAFIA DAS MAMAS E DA PELVE FEMININA";
}

function labelFor(item: RenderedCompositionComponent): string {
  if (item.component.categoryCode !== "MAMARIA") return LABELS[item.component.categoryCode];
  if (item.parsedData.escopo_exame === "axilas") return "REGIÕES AXILARES";
  if (item.parsedData.escopo_exame === "mamas_axilas") return "MAMAS E REGIÕES AXILARES";
  return "MAMAS";
}

function componentBlock(
  item: RenderedCompositionComponent,
  section: "technique" | "findings" | "conclusion",
): ProvenanceBlock {
  return {
    blockId: `${section}:${item.component.componentId}`,
    section,
    componentIds: [item.component.componentId],
    categoryCodes: [item.component.categoryCode],
    text: `${labelFor(item)}:\n${item.sections[section]}`,
  };
}

function sharedBladderOf(item: RenderedCompositionComponent): SharedBladder | null {
  const parsed = SharedBladderSchema.safeParse(item.parsedData.bexiga_detalhada);
  return parsed.success ? parsed.data : null;
}

function structurallyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function dedupeSharedBladder(
  request: ClinicalCompositionRequestV1,
  rendered: RenderedCompositionComponent[],
):
  | { ok: true; findings?: ProvenanceBlock; conclusion?: ProvenanceBlock }
  | { ok: false; response: ClinicalCompositionErrorV1 } {
  if (request.associationCode !== "ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA") {
    return { ok: true };
  }

  const [abdomenComponent, prostateComponent] = orderedComponents(request);
  if (!abdomenComponent || !prostateComponent) {
    return {
      ok: false,
      response: errorResponse(request, "INVALID_COMPONENT_DATA", "componentes urinários ausentes"),
    };
  }
  const sameContext =
    abdomenComponent.acquisitionContextId === prostateComponent.acquisitionContextId;
  const shared = request.sharedStructures[0];
  if (sameContext && !shared) {
    return {
      ok: false,
      response: errorResponse(
        request,
        "SHARED_STRUCTURE_REQUIRED",
        "bexiga coincidente deve ser declarada como estrutura compartilhada",
        {
          conflicts: [{
            structureCode: "URINARY_BLADDER",
            motivo: "componentes usam o mesmo contexto transabdominal sem identidade vesical compartilhada",
          }],
        },
      ),
    };
  }
  if (!shared) return { ok: true };
  if (!sameContext) {
    return {
      ok: false,
      response: errorResponse(
        request,
        "SHARED_STRUCTURE_CONFLICT",
        "bexiga não pode ser compartilhada entre contextos de aquisição diferentes",
        {
          conflicts: [{
            structureCode: "URINARY_BLADDER",
            motivo: "acquisitionContextId divergente",
          }],
        },
      ),
    };
  }

  const abdomen = rendered.find((item) => item.component.categoryCode === "ABDOMEN_TOTAL");
  const prostate = rendered.find((item) => item.component.categoryCode === "PROSTATA_SUPRAPUBICA");
  const abdomenBladder = abdomen ? sharedBladderOf(abdomen) : null;
  const prostateBladder = prostate ? sharedBladderOf(prostate) : null;
  if (!abdomen || !prostate || !abdomenBladder || !prostateBladder) {
    return {
      ok: false,
      response: errorResponse(
        request,
        "INVALID_COMPONENT_DATA",
        "bexiga_detalhada é obrigatória nos dois componentes quando compartilhada",
        {
          conflicts: [{
            structureCode: "URINARY_BLADDER",
            motivo: "estado vesical canônico ausente",
          }],
        },
      ),
    };
  }
  if (!structurallyEqual(abdomenBladder, prostateBladder)) {
    return {
      ok: false,
      response: errorResponse(
        request,
        "SHARED_STRUCTURE_CONFLICT",
        "estados divergentes para a bexiga compartilhada",
        {
          conflicts: [{
            structureCode: "URINARY_BLADDER",
            motivo: "ABDOMEN_TOTAL e PROSTATA_SUPRAPUBICA enviaram estados vesicais diferentes",
          }],
        },
      ),
    };
  }

  const abdomenWording = renderSharedBladder(abdomenBladder, {
    normalBody: "Bexiga com adequada repleção, de paredes regulares e conteúdo anecoico.",
    normalConclusion: "Bexiga ecograficamente normal.",
  });
  const prostateWording = renderSharedBladder(prostateBladder, {
    normalBody: "Bexiga de forma, ecotextura e contornos regulares.",
    normalConclusion: "Bexiga ecograficamente normal.",
  });

  abdomen.sections.findings = removeExactLines(
    abdomen.sections.findings,
    abdomenWording.body,
  );
  abdomen.sections.conclusion = removeConclusionItems(
    abdomen.sections.conclusion,
    abdomenWording.conclusion,
  );
  prostate.sections.findings = removeExactLines(
    prostate.sections.findings,
    prostateWording.body,
  );
  prostate.sections.conclusion = removeConclusionItems(
    prostate.sections.conclusion,
    prostateWording.conclusion,
  );

  const componentIds = [abdomen.component.componentId, prostate.component.componentId];
  const categoryCodes = [abdomen.component.categoryCode, prostate.component.categoryCode];
  const findingsText = `BEXIGA (AVALIAÇÃO COMPARTILHADA):\n${abdomenWording.body.join("\n")}`;
  const conclusionText = abdomenWording.conclusion.length
    ? `BEXIGA (AVALIAÇÃO COMPARTILHADA):\n${abdomenWording.conclusion.join("\n")}`
    : null;

  return {
    ok: true,
    findings: {
      blockId: `findings:${shared.sharedStructureId}`,
      section: "findings",
      componentIds,
      categoryCodes,
      structureCode: "URINARY_BLADDER",
      text: findingsText,
    },
    ...(conclusionText
      ? {
          conclusion: {
            blockId: `conclusion:${shared.sharedStructureId}`,
            section: "conclusion" as const,
            componentIds,
            categoryCodes,
            structureCode: "URINARY_BLADDER" as const,
            text: conclusionText,
          },
        }
      : {}),
  };
}

export function assembleClinicalCompositionFullText(
  style: ClinicalCompositionRequestV1["writingStyle"],
  document: Omit<ClinicalCompositionSuccessV1["document"], "fullText">,
): string {
  const headings = style === "OBJETIVO"
    ? { technique: "TÉCNICA:", findings: "ACHADOS:", conclusion: "IMPRESSÃO:" }
    : {
        technique: "COMENTÁRIOS:",
        findings: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
        conclusion: "CONCLUSÃO:",
      };
  return [
    document.title,
    "",
    headings.technique,
    document.technique,
    "",
    headings.findings,
    document.findings,
    "",
    headings.conclusion,
    document.conclusion,
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function renderClinicalComposition(
  request: ClinicalCompositionRequestV1,
  dependencies?: { resolveContext?: RenderContextResolver },
): Promise<ClinicalCompositionResponseV1> {
  const ordered = orderedComponents(request);
  const rendered: RenderedCompositionComponent[] = [];

  for (const component of ordered) {
    const result = await renderCompositionComponent(
      component,
      request.writingStyle,
      dependencies?.resolveContext,
    );
    if (!result.ok) {
      const statuses = ordered.map((item) => {
        if (item.componentId === component.componentId) {
          return componentStatus(item, "error", result.error.message);
        }
        const wasRendered = rendered.some(
          (completed) => completed.component.componentId === item.componentId,
        );
        return componentStatus(item, wasRendered ? "rendered" : "blocked");
      });
      return errorResponse(request, result.error.code, result.error.message, {
        conflicts: result.error.conflicts?.map((conflict) => ({
          componentId: component.componentId,
          motivo: conflict.motivo,
        })),
        components: statuses,
      });
    }
    rendered.push(result.value);
  }

  const shared = dedupeSharedBladder(request, rendered);
  if (!shared.ok) {
    shared.response.components = ordered.map((component) =>
      componentStatus(component, "blocked", shared.response.error.message),
    );
    return shared.response;
  }

  const title = titleFor(request, rendered);
  const titleBlock: ProvenanceBlock = {
    blockId: "title",
    section: "title",
    componentIds: rendered.map((item) => item.component.componentId),
    categoryCodes: rendered.map((item) => item.component.categoryCode),
    text: title,
  };
  const techniqueBlocks = rendered.map((item) => componentBlock(item, "technique"));
  const findingsBlocks = rendered.map((item) => componentBlock(item, "findings"));
  if (shared.findings) findingsBlocks.splice(1, 0, shared.findings);
  const conclusionBlocks = rendered
    .filter((item) => item.sections.conclusion !== "")
    .map((item) => componentBlock(item, "conclusion"));
  if (shared.conclusion) conclusionBlocks.splice(1, 0, shared.conclusion);

  const documentWithoutFullText = {
    title,
    technique: techniqueBlocks.map((block) => block.text).join("\n\n"),
    findings: findingsBlocks.map((block) => block.text).join("\n\n"),
    conclusion: conclusionBlocks.map((block) => block.text).join("\n\n"),
  };
  const document = {
    ...documentWithoutFullText,
    fullText: assembleClinicalCompositionFullText(
      request.writingStyle,
      documentWithoutFullText,
    ),
  };

  return {
    contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
    requestId: request.requestId,
    compositionId: request.compositionId,
    revision: request.revision,
    associationCode: request.associationCode,
    status: "complete",
    document,
    blocks: [titleBlock, ...techniqueBlocks, ...findingsBlocks, ...conclusionBlocks],
    components: rendered.map((item) => componentStatus(item.component, "rendered")),
  };
}
