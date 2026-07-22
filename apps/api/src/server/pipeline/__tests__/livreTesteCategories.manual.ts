import assert from "node:assert/strict";
import { filterVisibleCategories } from "../../categories/categoryVisibility";
import { buildSystemMessage } from "../../prompts/buildSystemMessage";
import { LIVRE_SYSTEM_PROMPT } from "../livreSystemPrompt";

const promptArgs = {
  categoryLabel: "Livre",
  writingStyleCode: "CLASSICO_COMPLETO" as const,
  ragBlocks: [
    {
      id: "ignored",
      kind: "regra" as const,
      title: "Não deve entrar",
      content: "CONTEUDO_RAG_NAO_DEVE_ENTRAR",
      priority: 100,
    },
  ],
};

assert.equal(
  buildSystemMessage({ ...promptArgs, categoryCode: "LIVRE" }),
  LIVRE_SYSTEM_PROMPT,
);
assert.equal(
  buildSystemMessage({ ...promptArgs, categoryCode: "TESTE" }),
  LIVRE_SYSTEM_PROMPT,
);
assert.ok(!LIVRE_SYSTEM_PROMPT.includes("CONTEUDO_RAG_NAO_DEVE_ENTRAR"));

const categories = [
  { id: "1", code: "LIVRE", label: "Livre" },
  { id: "2", code: "TESTE", label: "Teste" },
  { id: "3", code: "TIREOIDE", label: "Tireoide" },
];

assert.deepEqual(
  filterVisibleCategories(categories, "usuario-comum", "usuario-teste").map(
    ({ code }) => code,
  ),
  ["LIVRE", "TIREOIDE"],
);
assert.deepEqual(
  filterVisibleCategories(categories, "usuario-teste", "usuario-teste").map(
    ({ code }) => code,
  ),
  ["LIVRE", "TESTE", "TIREOIDE"],
);
assert.deepEqual(
  filterVisibleCategories(categories, "usuario-comum", "").map(
    ({ code }) => code,
  ),
  ["LIVRE", "TIREOIDE"],
);

console.log("livre/teste categories: 6/6 passed");
