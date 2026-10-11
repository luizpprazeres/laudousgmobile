import { llmText, writerTarget, type LlmTextOptions } from "../ai/llm";

const MAX_CHANGED_LINES = 3;

const EDIT_SYSTEM_PROMPT = [
  "Você EDITA um laudo de ultrassonografia conforme um ajuste falado pelo médico.",
  "Devolva o LAUDO INTEIRO já editado. Tudo que NÃO for alvo do ajuste permanece BYTE-IDÊNTICO: mesmas quebras de linha, seções, ordem, pontuação, maiúsculas e espaços.",
  "SUBSTITUIÇÃO (trocar/mudar/corrigir uma frase, medida ou achado): localize a frase/linha JÁ EXISTENTE sobre o MESMO ASSUNTO e SUBSTITUA-A pela nova, NO LUGAR dela. A versão antiga tem que SUMIR — NUNCA deixe a antiga e a nova coexistindo.",
  'Ex.: laudo com "O índice do líquido amniótico mede 10,4 cm." + pedido "troca a frase do líquido para maior bolsão vertical mede 5 cm" → a linha do líquido vira "Maior bolsão vertical mede 5,0 cm." e a frase do ILA some (é a MESMA informação: líquido amniótico).',
  'Use a redação canônica da casa (ex.: ILA 10,4 → "O índice do líquido amniótico mede 10,4 cm.").',
  "ACRÉSCIMO (acrescentar/adicionar/incluir um achado num órgão/estrutura): o achado entra na linha DESSE órgão (ou logo abaixo dela). Se essa linha afirma o que o achado desmente (ex.: \"sem imagens de cálculos ou cistos\" + cisto; \"miométrio homogêneo\" + mioma; \"de aspecto normal\"), reescreva-a tirando SÓ o trecho desmentido e incorporando o achado. NUNCA deixe a frase normal desmentida ao lado do achado.",
  'Ex.: "Rins tópicos, de dimensões normais, sem imagens de cálculos ou cistos." + "acrescente cisto simples de 2 cm no rim direito" → "Rins tópicos, de dimensões normais, sem imagens de cálculos. Cisto simples no rim direito, medindo 2,0 cm."',
  'CONCLUSÃO coerente com o ACRÉSCIMO: se ela afirma que o exame inteiro ou aquele órgão é normal ("dentro dos limites da normalidade", "sem alterações", "sem evidência de alterações ecográficas"), TROQUE esse item por um item curto com o achado, nas palavras do médico (ex.: "Cisto simples no rim direito."); mantenha os outros itens e renumere no formato já usado (item único sem número). Vale também quando o médico diz "acrescente no corpo" (é onde o achado é descrito; a conclusão normal desmentida sai do mesmo jeito). Se a conclusão não afirma essa normalidade, não mexa nela.',
  "NÃO conserte, reescreva, reorganize, complete, resuma nem melhore nada FORA do ajuste pedido.",
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

export type EditTarget = "body" | "conclusion" | "both";

export type EditReportArgs = {
  baseText: string;
  instruction: string;
  category: string;
  /** Onde aplicar: corpo / conclusão / ambos. Default "body". */
  target?: EditTarget;
  signal?: AbortSignal;
  /** Bancada: cliente injetado (ex.: assinatura via `claude -p`). Produção não passa. */
  anthropicClient?: LlmTextOptions["anthropicClient"];
};

type ReportSection = "tecnica" | "body" | "conclusion" | "unknown";
type DiffOp =
  | { kind: "equal"; beforeIndex: number; afterIndex: number; text: string }
  | { kind: "delete"; beforeIndex: number; text: string }
  | { kind: "insert"; afterIndex: number; text: string };

export async function editReport(args: EditReportArgs): Promise<EditReportResult> {
  const baseText = normalizeTrailingNewline(args.baseText);
  const acrescimo = isAcrescimo(args.instruction);
  const attempt = async (retryNote?: string) => {
    const modelText = await requestEditedReport(args, baseText, acrescimo, retryNote);
    return guardNormalConclusion(normalizeTrailingNewline(normalizeModelOutput(modelText)), args.instruction);
  };
  let guarded = await attempt();
  if (guarded.rejection && guarded.normalItem) {
    // W17: o Haiku às vezes acrescenta o achado e esquece a conclusão normal
    // (sobretudo com "acrescente no corpo"). Uma nova tentativa, apontando o item.
    guarded = await attempt(
      `CORREÇÃO: a conclusão continuou afirmando "${guarded.normalItem}" ao lado do achado acrescentado — o laudo se contradiz. Troque esse item pelo achado (regra do ACRÉSCIMO).`,
    );
  }
  const editedText = guarded.text;
  const changedLines = diffChangedLines(baseText, editedText);
  const rejection =
    validateEditScope({
      target: args.target ?? "body",
      changedLines,
      acrescimo,
    }) ?? guarded.rejection;

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

async function requestEditedReport(
  args: EditReportArgs,
  baseText: string,
  acrescimo: boolean,
  retryNote?: string,
) {
  // Modelo do writer (Claude Haiku 5.5 pelo motor ai/llm.ts).
  const { text } = await llmText({
    target: writerTarget(),
    system: EDIT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildEditUserMessage(baseText, args.instruction, args.category, args.target ?? "body", acrescimo, retryNote),
      },
    ],
    maxTokens: 16000,
    openaiMaxTokens: 3500,
    openaiTemperature: 0,
    signal: args.signal,
    label: "editReport",
    anthropicClient: args.anthropicClient,
  });
  if (!text) throw new Error("editReport: resposta vazia do modelo");
  return text;
}

function buildEditUserMessage(
  baseText: string,
  instruction: string,
  category: string,
  target: EditTarget,
  acrescimo: boolean,
  retryNote?: string,
) {
  return [
    `CATEGORIA: ${category}`,
    "",
    "=== LAUDO ATUAL ===",
    baseText,
    "",
    "=== AJUSTE FALADO PELO MÉDICO ===",
    instruction.trim(),
    "",
    targetDirective(target, acrescimo),
    ...(retryNote ? [retryNote] : []),
    "Retorne somente o laudo inteiro editado.",
  ].join("\n");
}

function targetDirective(target: EditTarget, acrescimo: boolean): string {
  if (target === "body" && acrescimo) {
    // W17: achado novo no corpo derruba a normalidade afirmada na conclusão; sem
    // esta exceção o laudo saía com o achado E "exame dentro da normalidade".
    return "ALVO: o achado entra no CORPO do laudo. Na CONCLUSÃO, mexa SÓ para trocar a normalidade que o achado desmente (regra do ACRÉSCIMO) — vale mesmo se o pedido disser \"no corpo\"; nada mais.";
  }
  switch (target) {
    case "conclusion":
      return "ALVO: aplique o ajuste APENAS na CONCLUSÃO/IMPRESSÃO. NÃO altere o corpo do laudo.";
    case "both":
      return "ALVO: aplique o ajuste onde a frase aparecer, TANTO no corpo QUANTO na conclusão.";
    case "body":
    default:
      return "ALVO: aplique o ajuste APENAS no CORPO do laudo (a parte descritiva antes de CONCLUSÃO/IMPRESSÃO). NÃO altere a conclusão.";
  }
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
  target: EditTarget;
  changedLines: EditReportChangedLine[];
  /** W17: acréscimo com alvo "body" pode ajustar a conclusão (coerência). */
  acrescimo?: boolean;
}): string | null {
  if (args.changedLines.length === 0) return "sem alteração";
  if (args.target === "body" && args.acrescimo) {
    // Corpo e conclusão contam cada um até o teto: trocar a frase normal do
    // órgão + o item normal da conclusão (com renumeração) não é "edição ampla".
    const conclusion = args.changedLines.filter((l) => l.section === "conclusion").length;
    const rest = args.changedLines.length - conclusion;
    if (rest > MAX_CHANGED_LINES || conclusion > MAX_CHANGED_LINES) return "edição ampla — confirme";
    return null;
  }
  if (args.changedLines.length > MAX_CHANGED_LINES) return "edição ampla — confirme";

  // "body" = tudo que NÃO é conclusão (técnica + corpo); "conclusion" = só a
  // conclusão; "both" = livre. Barra mudança fora do alvo pedido.
  const allowConclusion = args.target !== "body";
  const allowBody = args.target !== "conclusion";
  const outside = args.changedLines.find((line) => {
    const isConclusion = line.section === "conclusion";
    return isConclusion ? !allowConclusion : !allowBody;
  });
  if (outside) {
    if (args.target === "conclusion") return "mudança fora da conclusão — confirme";
    if (args.target === "body") return "mudança na conclusão (você pediu só o corpo) — confirme";
    return "mudança fora do alvo — confirme";
  }
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

// ── W17: "acrescente <achado>" ──────────────────────────────────────────────

/** Verbo de acréscimo, sem ser troca ("coloca X no lugar de Y" é substituição). */
const ACRESCIMO_RE = /\b(?:acrescent|adicion|inclu[ia]|insir|inser[ei]|coloqu|coloc|ponh|p[õo]e\b)/i;
const SUBSTITUICAO_RE =
  /\b(?:troc|mud[ae]|corrij|corrig|substitu|remov)|\b(?:tire|tira|tirar|apague|apaga|apagar)\b|no\s+lugar\s+d/i;

export function isAcrescimo(instruction: string): boolean {
  return ACRESCIMO_RE.test(instruction) && !SUBSTITUICAO_RE.test(instruction);
}

/**
 * Achado patológico no ajuste (lista fechada). Só com ele o guard da conclusão
 * age: "acrescente circular de cordão" ou "acrescente que o exame foi limitado
 * por gases" não desmentem um "exame normal" de forma inequívoca.
 */
const ACHADO_RE =
  /\b(?:cist|n[óo]dul|c[áa]lcul|lit[ií]as|miom|p[óo]lip|placas?\b|les[ãa]o|les[õo]es|massa|h[ée]rni|esteatos|cole[çc][ãa]o|hidronefros|dilata[çc]|ectasi|aneurism|espessament|calcifica|endometrioma|adenomiose|hemangioma|abscesso|trombo|derrame|ascite|l[ií]quido\s+livre|hepatomegalia|esplenomegalia)/i;

/** Item de conclusão que declara o EXAME inteiro normal (não "demais órgãos…"). */
const NORMAL_RE =
  /dentro\s+dos\s+limites\s+da\s+normalidade|sem\s+(?:evid[êe]ncias?\s+de\s+)?altera[çc][õo]es|sem\s+anormalidades|exame\s+normal/i;
const GLOBAL_SUBJECT_RE = /^(?:exame|estudo|[óo]rg[ãa]os|estruturas|dentro\s+dos|sem\s)/i;
const NOT_GLOBAL_RE = /\b(?:demais|restante|restantes|outros|outras)\b/i;
const NUMBERED_RE = /^(\s*)\d+(\s*[).-]\s*)(.*)$/;

export function isGlobalNormalItem(line: string): boolean {
  const item = line.trim().replace(/^\d+\s*[).-]\s*/, "");
  return NORMAL_RE.test(item) && GLOBAL_SUBJECT_RE.test(item) && !NOT_GLOBAL_RE.test(item);
}

/**
 * Guard pós-geração do ACRÉSCIMO: achado patológico novo não convive com
 * "exame dentro dos limites da normalidade" na conclusão. Se o modelo já pôs o
 * achado na conclusão e esqueceu o item normal, o item sai e a numeração é
 * refeita (item único fica sem número). Se o item normal é tudo o que há na
 * conclusão, não há com o que trocar sem inventar: recusa (o editReport pede
 * ao modelo uma nova tentativa antes de devolver a recusa).
 */
export function guardNormalConclusion(
  editedText: string,
  instruction: string,
): { text: string; rejection: string | null; normalItem?: string } {
  if (!isAcrescimo(instruction) || !ACHADO_RE.test(instruction) || /coment[áa]rio/i.test(instruction)) {
    return { text: editedText, rejection: null };
  }
  const lines = editedText.split("\n");
  const sections = sectionMap(lines);
  const itemIdx = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l, i }) => sections[i] === "conclusion" && l.trim() !== "" && !detectHeading(l))
    .map(({ i }) => i);
  const normalIdx = itemIdx.filter((i) => isGlobalNormalItem(lines[i] ?? ""));
  if (normalIdx.length === 0) return { text: editedText, rejection: null };
  if (normalIdx.length === itemIdx.length) {
    return {
      text: editedText,
      rejection: "achado novo com conclusão normal — confirme",
      normalItem: (lines[normalIdx[0]!] ?? "").trim(),
    };
  }

  const kept = itemIdx.filter((i) => !normalIdx.includes(i));
  kept.forEach((i, k) => {
    const m = (lines[i] ?? "").match(NUMBERED_RE);
    if (!m) return;
    lines[i] = kept.length === 1 ? `${m[1]}${m[3]}` : `${m[1]}${k + 1}${m[2]}${m[3]}`;
  });
  const drop = new Set(normalIdx);
  return { text: lines.filter((_, i) => !drop.has(i)).join("\n"), rejection: null };
}
