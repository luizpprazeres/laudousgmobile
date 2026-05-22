import type { GenerationState } from "./use-generate";
import type { RagBlockSummary } from "./sse-types";

const FMT1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function tierLabel(priority: number): string {
  if (priority >= 90) return "universal";
  if (priority >= 75) return "contextual";
  return "opcional";
}

function groupByKind(blocks: RagBlockSummary[]): Map<string, RagBlockSummary[]> {
  const m = new Map<string, RagBlockSummary[]>();
  for (const b of blocks) {
    const k = b.kind ?? "—";
    const arr = m.get(k) ?? [];
    arr.push(b);
    m.set(k, arr);
  }
  return m;
}

export function buildTestbenchMarkdown(args: {
  state: GenerationState;
  category: string;
  style: string;
  input: string;
}): string {
  const { state, category, style, input } = args;

  const status = state.status === "done" ? "✅ done" : state.status === "error" ? "❌ erro" : state.status;
  const totalMs = state.startedAt && state.finishedAt ? state.finishedAt - state.startedAt : null;
  const ftMs = state.startedAt && state.firstTokenAt ? state.firstTokenAt - state.startedAt : null;

  const lines: string[] = [];

  lines.push(`# Testbench — ${new Date().toISOString().replace("T", " ").slice(0, 19)} BRT`);
  lines.push("");
  lines.push(`**Categoria selecionada:** \`${category}\``);
  lines.push(`**Writing style:** \`${style}\``);
  lines.push(`**Status:** ${status}`);
  if (state.reportId) lines.push(`**Report ID:** \`${state.reportId}\``);
  lines.push("");

  lines.push("## 📥 Input do médico");
  lines.push("```");
  lines.push(input.trim());
  lines.push("```");
  lines.push("");

  lines.push("## 📄 Laudo gerado");
  if (state.text.trim().length === 0) {
    lines.push("_(vazio — geração não completou ou não rodou)_");
  } else {
    lines.push("```");
    lines.push(state.text.trim());
    lines.push("```");
  }
  lines.push("");

  lines.push(`## 🔍 Blocks RAG retrieved (${state.retrieved.length})`);
  if (state.retrieved.length === 0) {
    lines.push("_(nenhum block retrieved — pode indicar RAG_EMPTY)_");
  } else {
    const groups = groupByKind(state.retrieved);
    for (const [kind, items] of groups) {
      lines.push(`### ${kind} (${items.length})`);
      const sorted = [...items].sort((a, b) => b.priority - a.priority);
      for (const b of sorted) {
        lines.push(`- **${b.title}** — p${b.priority} · ${tierLabel(b.priority)}`);
      }
      lines.push("");
    }
  }

  lines.push("## ⚡ Estatísticas");
  lines.push(`- **Tempo total:** ${totalMs ? FMT1.format(totalMs / 1000).replace(".", ",") + "s" : "—"}`);
  lines.push(`- **First-token:** ${ftMs ? FMT1.format(ftMs / 1000).replace(".", ",") + "s" : "—"}`);
  lines.push(`- **Sanity issues:** ${state.sanityIssuesCount}`);
  if (state.warning) {
    lines.push(`- **Warning:** ${state.warning.code}${state.warning.message ? ` — ${state.warning.message}` : ""}`);
  }
  if (state.error) {
    lines.push(`- **Erro:** ${state.error.code} — ${state.error.message}`);
  }
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("**O que precisa ajustar:** _(descreva aqui o que está errado neste laudo)_");

  return lines.join("\n");
}
