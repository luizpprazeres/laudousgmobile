export type ReviewSignalKind = "missing" | "warning";

export type ReviewSignalIssue = {
  type?: string | null;
  code?: string | null;
  severity?: string | null;
  detail?: string | null;
  message?: string | null;
  trecho_laudo?: string | null;
  range?: string | null;
};

export type ReviewHighlight = {
  id: string;
  kind: ReviewSignalKind;
  anchor: string;
  message: string;
  severity: string;
};

export type ReviewNotice = {
  id: string;
  message: string;
  severity: string;
};

export type ReviewSignals = {
  highlights: ReviewHighlight[];
  notices: ReviewNotice[];
};

const PLACEHOLDER_SOURCE = String.raw`____|\{(?:LINHA|CONCLUSAO)_[A-Z_]+\}`;
const REVIEW_MARKER_RE = /\s*\[REVISAR\b[^\]]*\]/gi;
const DEFAULT_MISSING_MESSAGE = "Informação pendente: preencha este trecho antes de finalizar o laudo.";

export function stripAutomaticReviewMarkers(text: string): string {
  return text.replace(REVIEW_MARKER_RE, "");
}

export function buildReviewSignals(
  sourceText: string,
  issues: readonly ReviewSignalIssue[] = [],
): ReviewSignals {
  const text = stripAutomaticReviewMarkers(sourceText);
  const highlights: ReviewHighlight[] = [];
  const notices: ReviewNotice[] = [];
  const seenHighlights = new Set<string>();
  const seenNotices = new Set<string>();

  const placeholderRe = new RegExp(PLACEHOLDER_SOURCE, "g");
  for (const match of text.matchAll(placeholderRe)) {
    const anchor = match[0];
    pushHighlight({
      kind: "missing",
      anchor,
      message: DEFAULT_MISSING_MESSAGE,
      severity: "critical",
    });
  }

  for (const issue of issues) {
    const message = clean(issue.detail ?? issue.message) || "Confira este trecho do laudo.";
    const rawAnchor = clean(issue.trecho_laudo ?? issue.range);
    const anchor = rawAnchor ? resolveAnchor(text, stripAutomaticReviewMarkers(rawAnchor)) : null;
    const issueCode = `${issue.type ?? ""} ${issue.code ?? ""}`.toLowerCase();
    const missing = issueCode.includes("placeholder") || (anchor ? new RegExp(`^(?:${PLACEHOLDER_SOURCE})$`).test(anchor) : false);
    const severity = clean(issue.severity) || "warning";

    if (anchor) {
      pushHighlight({
        kind: missing ? "missing" : "warning",
        anchor,
        message,
        severity,
      });
    } else {
      pushNotice({ message, severity });
    }
  }

  return { highlights, notices };

  function pushHighlight(input: Omit<ReviewHighlight, "id">) {
    const existing = highlights.find(
      (highlight) => highlight.kind === input.kind && highlight.anchor === input.anchor,
    );
    if (existing) {
      if (existing.message === DEFAULT_MISSING_MESSAGE && input.message !== DEFAULT_MISSING_MESSAGE) {
        existing.message = input.message;
        existing.severity = input.severity;
      } else if (
        input.message !== DEFAULT_MISSING_MESSAGE
        && !existing.message.split(" • ").includes(input.message)
      ) {
        existing.message = `${existing.message} • ${input.message}`;
      }
      return;
    }
    const key = `${input.kind}\u0000${input.anchor}\u0000${input.message}`;
    if (seenHighlights.has(key)) return;
    seenHighlights.add(key);
    highlights.push({ ...input, id: stableId("highlight", key) });
  }

  function pushNotice(input: Omit<ReviewNotice, "id">) {
    const key = `${input.severity}\u0000${input.message}`;
    if (seenNotices.has(key)) return;
    seenNotices.add(key);
    notices.push({ ...input, id: stableId("notice", key) });
  }
}

function resolveAnchor(text: string, rawAnchor: string): string | null {
  const anchor = clean(rawAnchor);
  if (!anchor) return null;
  if (text.includes(anchor)) return anchor;

  const index = text.toLocaleLowerCase("pt-BR").indexOf(anchor.toLocaleLowerCase("pt-BR"));
  return index >= 0 ? text.slice(index, index + anchor.length) : null;
}

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
