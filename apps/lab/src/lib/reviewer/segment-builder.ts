import type { TrechoTier } from "@/lib/mock/reviewer";

const STOP_WORDS = new Set([
  "a", "o", "as", "os", "um", "uma", "de", "do", "da", "dos", "das", "em", "na", "no", "nas", "nos",
  "com", "sem", "por", "para", "que", "se", "e", "ou", "mas", "ao", "à", "às", "aos", "como",
  "muito", "mais", "menos", "este", "esta", "isto", "esse", "essa", "isso", "ele", "ela", "eles", "elas",
]);

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3 && !STOP_WORDS.has(t)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type RetrievedBlock = {
  id: string;
  title?: string;
  kind?: string;
  content?: string;
  priority?: number;
  similarity?: number;
  category_code?: string;
};

export function tierOf(priority: number): TrechoTier {
  if (priority >= 90) return "universal";
  if (priority >= 75) return "contextual";
  if (priority >= 60) return "optional";
  return "optional";
}

export type BuiltSegment =
  | { type: "block"; blockId: string; tier: TrechoTier; text: string }
  | { type: "text"; text: string };

export type BuiltSection = {
  heading: string;
  paragraphs?: BuiltSegment[][];
  list?: BuiltSegment[][];
};

const KNOWN_HEADINGS = [
  "ULTRASSONOGRAFIA",
  "COMENTÁRIOS:",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "ACHADOS:",
  "ANÁLISE:",
  "CONCLUSÃO:",
  "CONCLUSÕES:",
  "IMPRESSÃO DIAGNÓSTICA:",
];

function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length === 0) return false;
  return KNOWN_HEADINGS.some((h) => t.toUpperCase().startsWith(h)) || /^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s]{6,}:$/.test(t);
}

function isListItem(line: string): boolean {
  return /^\s*\d+[\.\)]\s/.test(line);
}

type ScoredBlock = { block: RetrievedBlock; tokens: Set<string> };

function findBestBlock(text: string, candidates: ScoredBlock[]): { block: RetrievedBlock; score: number } | null {
  const tokens = tokenize(text);
  if (tokens.size === 0) return null;
  let best: { block: RetrievedBlock; score: number } | null = null;
  for (const c of candidates) {
    const score = jaccard(tokens, c.tokens);
    if (!best || score > best.score) best = { block: c.block, score };
  }
  return best;
}

export function buildSections(outputText: string, retrieved: RetrievedBlock[]): BuiltSection[] {
  const scored: ScoredBlock[] = retrieved
    .filter((b) => b.content && b.content.trim().length > 20)
    .map((b) => ({ block: b, tokens: tokenize(b.content!) }));

  const lines = outputText.split("\n");
  const sections: BuiltSection[] = [];
  let llmCounter = 0;

  let current: BuiltSection | null = null;
  let buffer: string[] = [];
  let inList = false;

  const flushBuffer = () => {
    if (!current) return;
    if (buffer.length === 0) return;
    const paragraphText = buffer.join(" ").trim();
    if (paragraphText.length === 0) {
      buffer = [];
      return;
    }
    const segments = makeSegments(paragraphText, scored, () => `llm-${llmCounter++}`);
    if (inList) {
      current.list ||= [];
      current.list.push(segments);
    } else {
      current.paragraphs ||= [];
      current.paragraphs.push(segments);
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/ /g, " ");
    const trimmed = line.trim();

    if (isHeading(line)) {
      flushBuffer();
      current = { heading: trimmed };
      sections.push(current);
      inList = false;
      continue;
    }

    if (trimmed.length === 0) {
      flushBuffer();
      continue;
    }

    if (isListItem(line)) {
      if (!inList) flushBuffer();
      inList = true;
      buffer.push(line.replace(/^\s*\d+[\.\)]\s/, ""));
      flushBuffer();
      continue;
    }

    if (inList) {
      flushBuffer();
      inList = false;
    }

    if (!current) {
      current = { heading: trimmed };
      sections.push(current);
      continue;
    }

    buffer.push(line);
  }
  flushBuffer();

  return sections.filter((s) => (s.paragraphs?.length ?? 0) + (s.list?.length ?? 0) > 0 || /ULTRASSONOGRAFIA/i.test(s.heading));
}

function makeSegments(
  text: string,
  scored: ScoredBlock[],
  llmIdFactory: () => string,
): BuiltSegment[] {
  const sentences = text.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];

  return sentences.map((sentence): BuiltSegment => {
    const best = findBestBlock(sentence, scored);
    if (best && best.score >= 0.12) {
      const priority = best.block.priority ?? 0;
      return { type: "block", blockId: best.block.id, tier: tierOf(priority), text: appendSpace(sentence) };
    }
    return { type: "block", blockId: llmIdFactory(), tier: "llm-pure", text: appendSpace(sentence) };
  });
}

function appendSpace(s: string): string {
  return s.endsWith(" ") ? s : s + " ";
}

export function computeCoverage(sections: BuiltSection[]): {
  universal: number;
  contextual: number;
  optional: number;
  llmPure: number;
  totalSegments: number;
  uniqueBlocks: Set<string>;
} {
  let universal = 0;
  let contextual = 0;
  let optional = 0;
  let llmPure = 0;
  const blockIds = new Set<string>();

  for (const section of sections) {
    const all = [...(section.paragraphs ?? []), ...(section.list ?? [])];
    for (const segs of all) {
      for (const seg of segs) {
        if (seg.type !== "block") continue;
        if (seg.tier === "universal") universal++;
        else if (seg.tier === "contextual") contextual++;
        else if (seg.tier === "optional") optional++;
        else llmPure++;
        if (!seg.blockId.startsWith("llm-")) blockIds.add(seg.blockId);
      }
    }
  }

  return {
    universal,
    contextual,
    optional,
    llmPure,
    totalSegments: universal + contextual + optional + llmPure,
    uniqueBlocks: blockIds,
  };
}
