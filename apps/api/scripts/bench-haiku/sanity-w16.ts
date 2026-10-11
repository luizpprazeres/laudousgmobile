/**
 * BANCADA CURTA DA SANITY (W16, item 5) — pela ASSINATURA, sem API.
 *
 * Pergunta: a sanity por IA (roda depois do `done`; só custo) pode ir para
 * esforço low ou sem raciocínio sem perder o que ela acha?
 *
 * Casos: laudos obstétricos reais de uma rodada da bancada (ditado + laudo gerado).
 * Cada caso entra duas vezes: o laudo LIMPO (a sanity não deveria reclamar de
 * divergência) e o laudo com UM defeito injetado (medida do ditado trocada, ou
 * lateralidade invertida) — a sanity deveria dar critical. Três configurações:
 *   M  adaptativo, esforço medium (produção)
 *   L  adaptativo, esforço low
 *   D  sem raciocínio, esforço medium
 *
 * Rodar (de apps/api):
 *   pnpm exec tsx scripts/bench-haiku/sanity-w16.ts <rodada com results.json> [--n 12] [--key A6]
 * Saída: <rodada>/sanity-w16.json (gitignored — contém ditados reais).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { callClaude } from "./claudeCli";

Object.assign(process.env, {
  LLM_SANITY_MODEL: "claude-haiku-5-5",
  ANTHROPIC_API_KEY: "sk-ant-bench-blocked-no-real-anthropic-calls",
});

const argv = process.argv.slice(2);
const arg = (k: string, d?: string) => (argv.indexOf(`--${k}`) >= 0 ? argv[argv.indexOf(`--${k}`) + 1] : d);
const RUN = resolve(argv[0] ?? "");
const N = Number(arg("n", "12"));
const KEY = arg("key", "A6")!;

/** Cliente "Anthropic" que responde pela assinatura, respeitando thinking e esforço do pedido. */
function cliClient(log: Array<Record<string, unknown>>): Pick<Anthropic, "messages"> {
  return {
    messages: {
      stream: (params: any) => {
        const system = params.system.map((b: any) => b.text).join("\n\n");
        const user = params.messages.map((m: any) => (typeof m.content === "string" ? m.content : "")).join("\n\n");
        const pending = callClaude({
          model: params.model,
          system,
          user,
          schema: params.output_config?.format?.schema,
          effort: params.output_config?.effort,
          thinking: params.thinking?.type === "disabled" ? "disabled" : "adaptive",
        }).then((r) => (log.push({ ms: r.ms, api: r.api }), r));
        return {
          async *[Symbol.asyncIterator]() {
            const r = await pending;
            yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: r.text } };
          },
          finalMessage: async () => {
            const r = await pending;
            return {
              content: [{ type: "text", text: r.text }],
              stop_reason: "end_turn",
              stop_details: null,
              usage: { input_tokens: r.api?.input ?? r.inputTokens, output_tokens: r.api?.output ?? r.outputTokens, cache_read_input_tokens: r.api?.cacheRead ?? 0 },
            };
          },
        };
      },
    },
  } as unknown as Pick<Anthropic, "messages">;
}

/** Um defeito factual por caso: medida do ditado alterada no laudo, ou lado invertido. */
function injetar(laudo: string, i: number): { texto: string; defeito: string } | null {
  if (i % 2 === 1) {
    const m = /\b(direit[oa])\b/i.exec(laudo);
    if (m) {
      const troca = m[1].replace(/direit/i, (x) => (x[0] === "D" ? "Esquerd" : "esquerd"));
      return { texto: laudo.slice(0, m.index) + troca + laudo.slice(m.index + m[1].length), defeito: `lateralidade: "${m[1]}" → "${troca}"` };
    }
  }
  const m = /\b(\d{1,3}),(\d{1,2})\s*(cm|mm)\b/.exec(laudo);
  if (!m) return null;
  const v = Number(`${m[1]}.${m[2]}`);
  const novo = (v * 1.4).toFixed(m[2].length).replace(".", ",");
  return { texto: laudo.slice(0, m.index) + `${novo} ${m[3]}` + laudo.slice(m.index + m[0].length), defeito: `medida: ${m[0]} → ${novo} ${m[3]}` };
}

const CONFIGS = [
  { key: "M", effort: "medium", thinking: "" },
  { key: "L", effort: "low", thinking: "" },
  { key: "D", effort: "medium", thinking: "disabled" },
] as const;

async function main() {
  const { recarregarEnvParaTeste } = await import("../../src/server/env");
  const { runSanityCheck } = await import("../../src/server/pipeline/sanityCheck");
  const results = JSON.parse(readFileSync(join(RUN, "results.json"), "utf8")) as any[];
  const casos = results
    .filter((r) => r[KEY]?.[0]?.text)
    .slice(0, N)
    .flatMap((r, i) => {
      const limpo = r[KEY][0].text as string;
      const sujo = injetar(limpo, i);
      return [
        { id8: r.id8, versao: "limpo", defeito: null as string | null, ditado: r.ditado as string, laudo: limpo },
        ...(sujo ? [{ id8: r.id8, versao: "defeito", defeito: sujo.defeito, ditado: r.ditado as string, laudo: sujo.texto }] : []),
      ];
    });
  console.log(`sanity W16: ${casos.length} laudos (${casos.filter((c) => c.defeito).length} com defeito) × ${CONFIGS.length} configurações`);
  const out: any[] = [];
  for (const cfg of CONFIGS) {
    process.env.LLM_SANITY_EFFORT = cfg.effort;
    if (cfg.thinking) process.env.LLM_SANITY_THINKING = cfg.thinking;
    else delete process.env.LLM_SANITY_THINKING;
    recarregarEnvParaTeste();
    let idx = 0;
    const worker = async () => {
      while (idx < casos.length) {
        const c = casos[idx++]!;
        const log: Array<Record<string, any>> = [];
        try {
          const { result } = await runSanityCheck({ findings: {} as never, finalText: c.laudo, rawInput: c.ditado, anthropicClient: cliClient(log) });
          out.push({ cfg: cfg.key, ...c, ditado: undefined, laudo: undefined, verdict: result.verdict, issues: result.issues, api: log[0]?.api });
        } catch (err) {
          out.push({ cfg: cfg.key, ...c, ditado: undefined, laudo: undefined, erro: String(err).slice(0, 300) });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const mine = out.filter((o) => o.cfg === cfg.key && !o.erro);
    const pegou = mine.filter((o) => o.defeito && o.verdict === "critical").length;
    const comDefeito = mine.filter((o) => o.defeito).length;
    const alarmes = mine.filter((o) => !o.defeito && o.verdict !== "ok").length;
    const media = (f: (o: any) => number) => Math.round(mine.reduce((s, o) => s + f(o), 0) / Math.max(1, mine.length));
    console.log(
      `${cfg.key} (${cfg.thinking || "adaptativo"}, ${cfg.effort}): defeito → critical ${pegou}/${comDefeito} · limpo ≠ ok ${alarmes}/${mine.length - comDefeito} · saída média ${media((o) => o.api?.output ?? 0)} tok · tempo médio ${media((o) => o.api?.ms ?? 0)} ms · erros ${out.filter((o) => o.cfg === cfg.key && o.erro).length}`,
    );
  }
  writeFileSync(join(RUN, "sanity-w16.json"), JSON.stringify(out, null, 2));
  console.log(`saída: ${join(RUN, "sanity-w16.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
