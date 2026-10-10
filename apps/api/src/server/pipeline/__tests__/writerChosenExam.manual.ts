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
import { buildRawUserMessage, chosenExamLabel, runWriterStream } from "../writer";
import { buildSystemMessage } from "../../prompts/buildSystemMessage";
import { WRITER_OUTPUT_RULE } from "../writerOutputGuard";
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

  await check("MAMARIA: rótulo sem axilas (axilas só quando ditadas); demais categorias com o rótulo do banco", async () => {
    assert.equal(chosenExamLabel("MAMARIA", "Mamas e axilas"), "Mamas (axilas somente se citadas no ditado)");
    assert.equal(chosenExamLabel("TIREOIDE", "Tireoide"), "Tireoide");
    const seen: any[] = [];
    await drain(
      runWriterStream({
        findings: { categoria_detectada: "MAMARIA" } as any,
        ragBlocks: [],
        writingStyleCode: "CLASSICO_COMPLETO",
        categoryCode: "MAMARIA",
        categoryLabel: "Mamas e axilas",
        rawUserMessage: NORMAL,
        sourceTranscript: NORMAL,
        modelConfig: HAIKU_DEFAULT,
        anthropicClient: fakeClient("ULTRASSONOGRAFIA MAMÁRIA", "end_turn", seen),
      }),
    );
    const user: string = seen[0].messages[0].content;
    assert.match(user, /^=== EXAME ESCOLHIDO PELO MÉDICO ===\nMamas \(axilas somente se citadas no ditado\) \(MAMARIA\)\./);
    assert.equal(user.includes("Mamas e axilas"), false);
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

  const EXEMPLO = [{ id: "ex1", kind: "exemplo", title: "Exemplo", content: "Laudo de exemplo.", priority: 1, tags: [] }] as any;
  const STRUCTURED_LINES = [
    "- NUNCA mencione achados que estejam APENAS nos exemplos e não estejam nos ACHADOS ESTRUTURADOS do médico.",
    "- Os dados clínicos vêm EXCLUSIVAMENTE da seção ACHADOS ESTRUTURADOS no user message.",
  ];
  await check("system: caso estruturado mantém o texto de sempre", () => {
    const sys = buildSystemMessage({ categoryCode: "TIREOIDE", categoryLabel: "Tireoide", writingStyleCode: "CLASSICO_COMPLETO", ragBlocks: EXEMPLO });
    for (const line of STRUCTURED_LINES) assert.ok(sys.includes(line), line);
    assert.equal(sys.includes("DITADO DO MÉDICO"), false);
  });
  await check("system + writer: no fast-path a fonte dos dados é o DITADO DO MÉDICO; saída limpa e regra de saída no Haiku", async () => {
    const seen: any[] = [];
    const gen = runWriterStream({
      findings: { categoria_detectada: "CERVICAL" } as any,
      ragBlocks: EXEMPLO,
      writingStyleCode: "CLASSICO_COMPLETO",
      categoryCode: "CERVICAL",
      categoryLabel: "Cervical",
      rawUserMessage: NORMAL,
      sourceTranscript: NORMAL,
      modelConfig: HAIKU_DEFAULT,
      anthropicClient: fakeClient("**ULTRASSONOGRAFIA CERVICAL**\n\nCONCLUSÃO:\nNormal.\n\nObs. para revisão: o ditado foi curto.", "end_turn", seen),
    });
    let result: any;
    for (;;) {
      const n = await gen.next();
      if (n.done) { result = n.value; break; }
    }
    const system: string = seen[0].system[0].text;
    assert.ok(system.includes("- Os dados clínicos vêm EXCLUSIVAMENTE do DITADO DO MÉDICO (achados + instruções) no user message."));
    assert.ok(system.includes("- NUNCA mencione achados que estejam APENAS nos exemplos e não estejam no DITADO DO MÉDICO."));
    for (const line of STRUCTURED_LINES) assert.equal(system.includes(line), false, line);
    assert.ok(system.endsWith(WRITER_OUTPUT_RULE));
    assert.equal(result.fullText, "ULTRASSONOGRAFIA CERVICAL\n\nCONCLUSÃO:\nNormal.");
  });

  console.log(`\nwriterChosenExam: ${passed}/${passed + failed} passed`);
  if (failed > 0) process.exit(1);
}

void main();
