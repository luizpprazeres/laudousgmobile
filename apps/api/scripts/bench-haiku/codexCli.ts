/**
 * Chama um modelo OpenAI pela ASSINATURA do ChatGPT (Codex CLI `codex exec`),
 * nunca pela API: OPENAI_API_KEY é removida do ambiente do processo filho.
 *
 * O system prompt da categoria substitui as instruções-base do Codex
 * (`model_instructions_file`). O harness do Codex ainda injeta definições de
 * ferramentas e contexto de ambiente (~26k tokens, medido em 09/10) — não dá
 * para desligar; a saída é forçada pelo schema estrito (`--output-schema`).
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ClaudeResult } from "./claudeCli";

export async function callCodex(c: {
  model: string;
  system: string;
  user: string;
  schema?: Record<string, unknown>;
  reasoning?: "none" | "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<ClaudeResult> {
  const dir = mkdtempSync(join(tmpdir(), "bench-codex-"));
  try {
    writeFileSync(join(dir, "instructions.md"), c.system);
    const args = [
      "exec",
      "-m", c.model,
      "--ignore-user-config",
      "--ignore-rules",
      "--ephemeral",
      "--skip-git-repo-check",
      "-s", "read-only",
      "-c", `model_instructions_file=${JSON.stringify(join(dir, "instructions.md"))}`,
      "-c", `model_reasoning_effort=${JSON.stringify(c.reasoning ?? "none")}`,
      "-o", join(dir, "out.txt"),
      "--json",
    ];
    if (c.schema) {
      writeFileSync(join(dir, "schema.json"), JSON.stringify(c.schema));
      args.push("--output-schema", join(dir, "schema.json"));
    }
    args.push("-");

    const env = { ...process.env };
    delete env.OPENAI_API_KEY;

    const t0 = Date.now();
    const so = await new Promise<string>((resolve, reject) => {
      const p = spawn("codex", args, { cwd: dir, env, stdio: ["pipe", "pipe", "pipe"] });
      let out = "";
      let err = "";
      const timer = setTimeout(() => {
        p.kill("SIGKILL");
        reject(new Error(`codex exec timeout (${c.model})`));
      }, c.timeoutMs ?? 300_000);
      p.stdout.on("data", (d) => (out += d));
      p.stderr.on("data", (d) => (err += d));
      p.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error(`codex exec saiu com ${code}: ${(err || out).slice(-500)}`));
        else resolve(out);
      });
      p.stdin.end(c.user);
    });

    let inputTokens = 0;
    let outputTokens = 0;
    let thinkingTokens = 0;
    for (const line of so.split("\n")) {
      if (!line.startsWith("{")) continue;
      const ev = JSON.parse(line);
      if (ev.type === "turn.completed" && ev.usage) {
        inputTokens = ev.usage.input_tokens ?? 0;
        outputTokens = ev.usage.output_tokens ?? 0;
        thinkingTokens = ev.usage.reasoning_output_tokens ?? 0;
      }
      if (ev.type === "turn.failed" || ev.type === "error") {
        throw new Error(`codex exec: ${JSON.stringify(ev).slice(0, 400)}`);
      }
    }
    const text = readFileSync(join(dir, "out.txt"), "utf8").trim();
    if (c.schema) JSON.parse(text); // falha alto se não vier JSON válido
    return { text, ms: Date.now() - t0, inputTokens, outputTokens, thinkingTokens };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
