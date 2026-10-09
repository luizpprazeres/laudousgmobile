/* eslint-disable @typescript-eslint/no-explicit-any -- fakes de teste */
/**
 * Writer padrão (Haiku 5.5): o exame escolhido vai no ditado do fast-path, e a
 * recusa do modelo vira erro claro. Cliente Anthropic FALSO — sem rede.
 *
 * Rodar (de apps/api):
 *   pnpm exec tsx --env-file=../../.env src/server/pipeline/__tests__/writerChosenExam.manual.ts
 */
import assert from "node:assert/strict";
import { LlmOutputError } from "../../ai/llm";
import { buildRawUserMessage, runWriterStream } from "../writer";
import type { WriterModelConfig } from "../modelResolver";

let passed = 0;
let failed = 0;
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}\n  ${err instanceof Error ? err.message : String(err)}`);
  }
}

function fakeClient(text: string, stop_reason = "end_turn", seen?: any[]) {
  return {
    messages: {
      stream: (params: any) => {
        seen?.push(params);
        return {
          async *[Symbol.asyncIterator]() {
            yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } };
          },
          finalMessage: async () => ({
            content: [{ type: "text", text }],
            stop_reason,
            stop_details: stop_reason === "refusal" ? { category: "general_harms" } : null,
            usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0 },
          }),
        };
      },
    },
  } as any;
}

const HAIKU_DEFAULT: WriterModelConfig = { provider: "anthropic", model: "claude-haiku-5-5", reasoningEffort: "medium", credentialRef: "default" };
const NORMAL = "Exame sem alterações dignas de nota.";

async function drain(gen: AsyncGenerator<string, unknown, void>) {
  for (;;) if ((await gen.next()).done) return;
}

async function main() {
  await check("mensagem com o exame: cabeçalho, código e regra do ditado curto, antes do ditado", async () => {
    const seen: any[] = [];
    await drain(
      runWriterStream({
        findings: { categoria_detectada: "TIREOIDE" } as any,
        ragBlocks: [],
        writingStyleCode: "CLASSICO_COMPLETO",
        categoryCode: "TIREOIDE",
        categoryLabel: "Tireoide",
        rawUserMessage: NORMAL,
        sourceTranscript: NORMAL,
        modelConfig: HAIKU_DEFAULT,
        anthropicClient: fakeClient("ULTRASSONOGRAFIA DA TIREOIDE", "end_turn", seen),
      }),
    );
    const user: string = seen[0].messages[0].content;
    assert.match(user, /^=== EXAME ESCOLHIDO PELO MÉDICO ===\nTireoide \(TIREOIDE\)\./);
    assert.match(user, /laudo\nNORMAL completo deste exame/);
    assert.ok(user.indexOf("EXAME ESCOLHIDO") < user.indexOf("=== DITADO DO MÉDICO"));
    assert.ok(user.includes(NORMAL));
  });

  await check("sem exame (Livre, modo difícil, TESTE): mensagem idêntica à de antes", () => {
    const msg = buildRawUserMessage(NORMAL);
    assert.ok(msg.startsWith("=== DITADO DO MÉDICO (achados + instruções) ===\nExame sem alterações dignas de nota.\n"));
    assert.equal(msg.includes("EXAME ESCOLHIDO"), false);
    assert.equal(buildRawUserMessage(NORMAL, true).includes("EXCEÇÃO DO EXAME ISOLADO"), true);
  });

  await check("recusa do Haiku vira LLM_REFUSED com mensagem para o médico", async () => {
    await assert.rejects(
      drain(
        runWriterStream({
          findings: { categoria_detectada: "ABDOMEN_TOTAL" } as any,
          ragBlocks: [],
          writingStyleCode: "CLASSICO_COMPLETO",
          categoryCode: "ABDOMEN_TOTAL",
          categoryLabel: "Abdome total",
          rawUserMessage: NORMAL,
          sourceTranscript: NORMAL,
          modelConfig: HAIKU_DEFAULT,
          anthropicClient: fakeClient("", "refusal"),
        }),
      ),
      (err: unknown) =>
        err instanceof LlmOutputError &&
        err.code === "LLM_REFUSED" &&
        /recusou escrever este laudo/.test(err.message) &&
        /general_harms/.test(err.message),
    );
  });

  console.log(`\nwriterChosenExam: ${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

void main();
