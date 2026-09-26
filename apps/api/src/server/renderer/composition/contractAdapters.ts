import type {
  ClinicalCompositionCategoryCode,
  ClinicalCompositionRequestV1,
} from "@laudousg/shared";
import {
  renderizarSelecao,
  type AlteracaoSpec,
  type Conflito,
} from "../catalog/alteracoes";
import { alteracoesDe } from "../catalog/alteracoes/index";
import { contextoDeRender } from "../catalog/contextoDeRender";
import { achadoNormalDe, mesclarFundo } from "../catalog/modeloNormal";
import { modeloNormalDe } from "../catalog/modeloNormalRegistry";

export type CanonicalReportSections = {
  title: string;
  technique: string;
  findings: string;
  conclusion: string;
};

export type RenderedCompositionComponent = {
  component: ClinicalCompositionRequestV1["components"][number];
  parsedData: Record<string, unknown>;
  sections: CanonicalReportSections;
};

export type CompositionAdapterFailure = {
  code:
    | "PAYLOAD_LIMIT_EXCEEDED"
    | "UNKNOWN_ALTERATION"
    | "INVALID_COMPONENT_DATA"
    | "COMPONENT_RENDER_FAILED"
    | "CANONICAL_SECTION_ERROR";
  message: string;
  conflicts?: Conflito[];
};

export type RenderContextResolver = typeof contextoDeRender;

const LIMITS = {
  maxDepth: 16,
  maxNodes: 2_000,
  maxArrayItems: 100,
  maxStringLength: 20_000,
} as const;

function validateValueLimits(value: unknown): string | null {
  let nodes = 0;

  const visit = (current: unknown, depth: number, path: string): string | null => {
    nodes += 1;
    if (nodes > LIMITS.maxNodes) return "dados excedem 2000 valores estruturados";
    if (depth > LIMITS.maxDepth) return `dados excedem profundidade máxima em ${path}`;
    if (typeof current === "string" && current.length > LIMITS.maxStringLength) {
      return `texto excede 20000 caracteres em ${path}`;
    }
    if (Array.isArray(current)) {
      if (current.length > LIMITS.maxArrayItems) {
        return `lista excede 100 itens em ${path}`;
      }
      for (const [index, item] of current.entries()) {
        const issue = visit(item, depth + 1, `${path}[${index}]`);
        if (issue) return issue;
      }
      return null;
    }
    if (current && typeof current === "object") {
      for (const [key, item] of Object.entries(current)) {
        const issue = visit(item, depth + 1, path === "$" ? key : `${path}.${key}`);
        if (issue) return issue;
      }
    }
    return null;
  };

  return visit(value, 0, "$");
}

/**
 * Zod remove chaves desconhecidas por padrão. Na composição isto seria perda
 * silenciosa de estado salvo, então toda chave enviada precisa sobreviver ao
 * parse canônico, inclusive dentro de objetos e arrays.
 */
function firstStrippedPath(raw: unknown, parsed: unknown, path = "dados"): string | null {
  if (Array.isArray(raw)) {
    if (!Array.isArray(parsed)) return path;
    for (const [index, item] of raw.entries()) {
      const issue = firstStrippedPath(item, parsed[index], `${path}[${index}]`);
      if (issue) return issue;
    }
    return null;
  }
  if (raw && typeof raw === "object") {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return path;
    const parsedRecord = parsed as Record<string, unknown>;
    for (const [key, item] of Object.entries(raw)) {
      if (!Object.prototype.hasOwnProperty.call(parsedRecord, key)) return `${path}.${key}`;
      const issue = firstStrippedPath(item, parsedRecord[key], `${path}.${key}`);
      if (issue) return issue;
    }
  }
  return null;
}

function parseCanonicalSections(
  report: string,
  style: ClinicalCompositionRequestV1["writingStyle"],
): CanonicalReportSections | null {
  const markers =
    style === "OBJETIVO"
      ? {
          technique: "TÉCNICA:",
          findings: "ACHADOS:",
          conclusion: "IMPRESSÃO:",
        }
      : {
          technique: "COMENTÁRIOS:",
          findings: "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
          conclusion: "CONCLUSÃO:",
        };

  const techniqueAt = report.indexOf(markers.technique);
  const findingsAt = report.indexOf(markers.findings);
  const conclusionAt = report.indexOf(markers.conclusion);
  if (
    techniqueAt <= 0 ||
    findingsAt <= techniqueAt ||
    conclusionAt <= findingsAt ||
    report.lastIndexOf(markers.technique) !== techniqueAt ||
    report.lastIndexOf(markers.findings) !== findingsAt ||
    report.lastIndexOf(markers.conclusion) !== conclusionAt
  ) {
    return null;
  }

  const sections = {
    title: report.slice(0, techniqueAt).trim(),
    technique: report
      .slice(techniqueAt + markers.technique.length, findingsAt)
      .trim(),
    findings: report.slice(findingsAt + markers.findings.length, conclusionAt).trim(),
    conclusion: report.slice(conclusionAt + markers.conclusion.length).trim(),
  };
  return Object.values(sections).every((section) => section !== "") ? sections : null;
}

function parsedComponentData(
  categoryCode: ClinicalCompositionCategoryCode,
  alterations: AlteracaoSpec[],
  data: Record<string, unknown> | undefined,
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const model = modeloNormalDe(categoryCode);
  if (!model) return { ok: false, message: `categoria ${categoryCode} sem renderer canônico` };

  const scenario = alterations.reduce<Record<string, unknown>>(
    (current, alteration) => mesclarFundo(current, alteration.seed),
    {},
  );
  const supplied = mesclarFundo(scenario, data ?? {});
  const raw = mesclarFundo(
    mesclarFundo(
      achadoNormalDe(model.schema) as Record<string, unknown>,
      model.seed ?? {},
    ),
    supplied,
  );
  const parsed = model.schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const where = first?.path.length ? ` em dados.${first.path.join(".")}` : "";
    return {
      ok: false,
      message: `dados inválidos${where}: ${first?.message ?? "schema recusado"}`,
    };
  }

  const stripped = firstStrippedPath(data ?? {}, parsed.data);
  if (stripped) {
    return { ok: false, message: `campo desconhecido ou descartado: ${stripped}` };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export async function renderCompositionComponent(
  component: ClinicalCompositionRequestV1["components"][number],
  style: ClinicalCompositionRequestV1["writingStyle"],
  resolveContext: RenderContextResolver = contextoDeRender,
): Promise<
  | { ok: true; value: RenderedCompositionComponent }
  | { ok: false; error: CompositionAdapterFailure }
> {
  const limitIssue = validateValueLimits(component.data);
  if (limitIssue) {
    return {
      ok: false,
      error: { code: "PAYLOAD_LIMIT_EXCEEDED", message: limitIssue },
    };
  }

  const available = alteracoesDe(component.categoryCode);
  const selected = component.data.alteracoes.map((id) => available.find((item) => item.id === id));
  const unknown = component.data.alteracoes.filter((_, index) => selected[index] === undefined);
  if (unknown.length > 0) {
    return {
      ok: false,
      error: {
        code: "UNKNOWN_ALTERATION",
        message: `alteração desconhecida em ${component.categoryCode}`,
        conflicts: unknown.map((id) => ({ a: id, b: component.categoryCode, motivo: "alteração desconhecida" })),
      },
    };
  }

  const alterations = selected.filter((item): item is NonNullable<typeof item> => item !== undefined);
  const parsed = parsedComponentData(component.categoryCode, alterations, component.data.dados);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: "INVALID_COMPONENT_DATA", message: parsed.message },
    };
  }

  let context: Awaited<ReturnType<RenderContextResolver>>;
  try {
    context = await resolveContext(component.categoryCode, style);
  } catch {
    return {
      ok: false,
      error: {
        code: "COMPONENT_RENDER_FAILED",
        message: `contexto canônico indisponível para ${component.categoryCode}`,
      },
    };
  }
  const rendered = renderizarSelecao(
    component.categoryCode,
    style,
    alterations,
    component.data.dados,
    context,
  );
  if (!rendered.ok) {
    return {
      ok: false,
      error: "conflitos" in rendered
        ? {
            code: "COMPONENT_RENDER_FAILED",
            message: `seleção recusada em ${component.categoryCode}`,
            conflicts: rendered.conflitos,
          }
        : { code: "COMPONENT_RENDER_FAILED", message: rendered.erro },
    };
  }

  const sections = parseCanonicalSections(rendered.texto, style);
  if (!sections) {
    return {
      ok: false,
      error: {
        code: "CANONICAL_SECTION_ERROR",
        message: `renderer ${component.categoryCode} não devolveu as seções canônicas esperadas`,
      },
    };
  }

  return {
    ok: true,
    value: { component, parsedData: parsed.data, sections },
  };
}

export function removeExactLines(section: string, linesToRemove: readonly string[]): string {
  const targets = new Set(linesToRemove.map((line) => line.trim()).filter(Boolean));
  return section
    .split("\n")
    .filter((line) => !targets.has(line.trim()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function removeConclusionItems(section: string, itemsToRemove: readonly string[]): string {
  const targets = new Set(itemsToRemove.map((item) => item.trim()).filter(Boolean));
  const kept = section.split("\n").filter((line) => {
    const item = line.trim().replace(/^\d+[.)]\s*/, "");
    return !targets.has(item);
  });
  let index = 0;
  return kept
    .map((line) => {
      const match = /^(\s*)\d+([.)])\s+(.*)$/.exec(line);
      if (!match) return line;
      index += 1;
      return `${match[1]}${index}${match[2]} ${match[3]}`;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
