import { openai } from "../ai/openai";
import { env } from "../env";

const MAX_CHANGED_LINES = 3;

const EDIT_SYSTEM_PROMPT = [
  "Você EDITA um laudo de ultrassonografia.",
  "Dado o laudo ATUAL e um ajuste falado pelo médico, devolva o laudo editado para satisfazer SÓ aquele ajuste, com a redação canônica da casa.",
  'Exemplo: ILA 10,4 -> "O índice do líquido amniótico mede 10,4 cm."',
  "TODO o resto deve permanecer BYTE-IDÊNTICO: mesmas quebras de linha, seções, ordem, pontuação, maiúsculas e espaços.",
  "NÃO conserte, reescreva, reorganize, complete, resuma nem melhore nada que não tenha sido pedido.",
  "Saída = só o laudo inteiro editado, nada mais.",
].join("\n");

export type EditReportChangedLine = {
  line: number;
  before: string | null;
  after: string | null;
  section: ReportSection;
};

export type EditReportResult = {
  editedText: string;
  changedLines: EditReportChangedLine[];
  accepted: boolean;
  reason?: string;
};

export type EditReportArgs = {
  baseText: string;
  instruction: string;
  category: string;
  signal?: AbortSignal;
};

type ReportSection = "tecnica" | "body" | "conclusion" | "unknown";
type DiffOp =
  | { kind: "equal"; beforeIndex: number; afterIndex: number; text: string }
  | { kind: "delete"; beforeIndex: number; text: string }
  | { kind: "insert"; afterIndex: number; text: string };

export async function editReport(args: EditReportArgs): Promise<EditReportResult> {
  const baseText = normalizeTrailingNewline(args.baseText);
  const modelText = await requestEditedReport(args, baseText);
  const editedCandidate = normalizeModelOutput(modelText);
  const editedText = normalizeTrailingNewline(editedCandidate);
  const changedLines = diffChangedLines(baseText, editedText);
  const rejection = validateEditScope({
    baseText,
    instruction: args.instruction,
    changedLines,
  });

  if (rejection) {
    return {
      editedText: baseText,
      changedLines,
      accepted: false,
      reason: rejection,
    };
  }

  return {
    editedText,
    changedLines,
    accepted: true,
  };
}

async function requestEditedReport(args: EditReportArgs, baseText: string) {
  const writerModel = env().OPENAI_MODEL_WRITER;
  const isReasoningModel =
    /gpt-5/.test(writerModel) && !/chat-latest/.test(writerModel);
  const reqParams: Record<string, unknown> = {
    model: writerModel,
    messages: [
      { role: "system", content: EDIT_SYSTEM_PROMPT },
      { role: "user", content: buildEditUserMessage(baseText, args.instruction, args.category) },
    ],
  };

  if (isReasoningModel) {
    reqParams.max_completion_tokens = 3500;
    reqParams.reasoning_effort = env().OPENAI_WRITER_REASONING_EFFORT;
  } else {
    reqParams.temperature = 0;
    reqParams.max_tokens = 3500;
  }

  const res = (await openai().chat.completions.create(
    reqParams as unknown as Parameters<
      ReturnType<typeof openai>["chat"]["completions"]["create"]
    >[0],
    { signal: args.signal },
  )) as { choices: Array<{ message?: { content?: string | null } }> };
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("editReport: resposta vazia do modelo");
  return text;
}

function buildEditUserMessage(baseText: string, instruction: string, category: string) {
  return [
    `CATEGORIA: ${category}`,
    "",
    "=== LAUDO ATUAL ===",
    baseText,
    "",
    "=== AJUSTE FALADO PELO MÉDICO ===",
    instruction.trim(),
    "",
    "Retorne somente o laudo inteiro editado.",
  ].join("\n");
}

function normalizeModelOutput(text: string) {
  let out = text.trim();
  const fence = out.match(/^```(?:\w+)?\n([\s\S]*?)\n```$/);
  if (fence?.[1]) out = fence[1].trim();
  return out;
}

function normalizeTrailingNewline(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function validateEditScope(args: {
  baseText: string;
  instruction: string;
  changedLines: EditReportChangedLine[];
}): string | null {
  if (args.changedLines.length === 0) return "sem alteração";
  if (args.changedLines.length > MAX_CHANGED_LINES) return "edição ampla — confirme";

  const requestedSection = requestedSectionFromInstruction(args.instruction);
  if (requestedSection) {
    const outside = args.changedLines.find((line) => line.section !== requestedSection);
    if (outside) return "mudança fora da seção pedida — confirme";
  }

  return null;
}

function requestedSectionFromInstruction(instruction: string): ReportSection | null {
  const text = instruction.toLowerCase();
  if (/\b(conclus[aã]o|impress[aã]o)\b/.test(text)) return "conclusion";
  if (/\b(t[ée]cnica|coment[áa]rios?)\b/.test(text)) return "tecnica";
  if (/\b(achados?|corpo|descri[çc][aã]o)\b/.test(text)) return "body";
  return null;
}

function diffChangedLines(baseText: string, editedText: string): EditReportChangedLine[] {
  const before = baseText.split("\n");
  const after = editedText.split("\n");
  const ops = buildLineDiff(before, after);
  const sectionsBefore = sectionMap(before);
  const sectionsAfter = sectionMap(after);
  const changed: EditReportChangedLine[] = [];

  for (let i = 0; i < ops.length; i += 1) {
    const op = ops[i];
    if (!op) continue;
    const next = ops[i + 1];
    if (op.kind === "delete" && next?.kind === "insert") {
      changed.push({
        line: op.beforeIndex + 1,
        before: op.text,
        after: next.text,
        section: sectionsBefore[op.beforeIndex] ?? sectionsAfter[next.afterIndex] ?? "unknown",
      });
      i += 1;
      continue;
    }
    if (op.kind === "delete") {
      changed.push({
        line: op.beforeIndex + 1,
        before: op.text,
        after: null,
        section: sectionsBefore[op.beforeIndex] ?? "unknown",
      });
      continue;
    }
    if (op.kind === "insert") {
      changed.push({
        line: op.afterIndex + 1,
        before: null,
        after: op.text,
        section: sectionsAfter[op.afterIndex] ?? "unknown",
      });
    }
  }

  return changed;
}

function buildLineDiff(before: string[], after: string[]): DiffOp[] {
  const dp: number[][] = Array.from({ length: before.length + 1 }, () =>
    Array(after.length + 1).fill(0),
  );
  for (let i = before.length - 1; i >= 0; i -= 1) {
    for (let j = after.length - 1; j >= 0; j -= 1) {
      dp[i]![j] =
        before[i] === after[j]
          ? (dp[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      ops.push({ kind: "equal", beforeIndex: i, afterIndex: j, text: before[i]! });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      ops.push({ kind: "delete", beforeIndex: i, text: before[i]! });
      i += 1;
    } else {
      ops.push({ kind: "insert", afterIndex: j, text: after[j]! });
      j += 1;
    }
  }
  while (i < before.length) {
    ops.push({ kind: "delete", beforeIndex: i, text: before[i]! });
    i += 1;
  }
  while (j < after.length) {
    ops.push({ kind: "insert", afterIndex: j, text: after[j]! });
    j += 1;
  }
  return ops.filter((op) => op.kind !== "equal");
}

function sectionMap(lines: string[]): ReportSection[] {
  const sections: ReportSection[] = [];
  let current: ReportSection = "body";
  for (let i = 0; i < lines.length; i += 1) {
    const detected = detectHeading(lines[i] ?? "");
    if (detected) current = detected;
    sections[i] = current;
  }
  return sections;
}

function detectHeading(line: string): ReportSection | null {
  const normalized = line
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
  if (/^(CONCLUSAO|IMPRESSAO)\s*:/.test(normalized)) return "conclusion";
  if (/^(TECNICA|COMENTARIOS)\s*:/.test(normalized)) return "tecnica";
  if (/^(ACHADOS|OS SEGUINTES ASPECTOS FORAM OBSERVADOS)\s*:/.test(normalized)) {
    return "body";
  }
  return null;
}
