import {
  resolveWriterModel,
  WriterModelResolutionError,
} from "../modelResolver";
import { resolveGenerationPath } from "../generationPathResolver";
import { writerRequestParams } from "../../ai/writerClient";

const baseEnv = {
  OPENAI_MODEL_WRITER: "gpt-4.1-mini",
  OPENAI_WRITER_REASONING_EFFORT: "none",
  HARD_MODE_ENABLED: "false",
  HARD_MODE_MODEL: "gpt-5.4",
  TESTE_CATEGORY_MODEL: "deepseek-v4-pro",
  TESTE_CATEGORY_BASE_URL: "https://example.test/v1",
  TESTE_CATEGORY_API_KEY: "test-key",
  TESTE_REASONING_EFFORT: "low",
  TESTE_ALLOWED_USER_ID: "luiz",
  RENDERER_CATEGORIES: "ABDOMEN_TOTAL,TIREOIDE",
};

let passed = 0;
function check(name: string, condition: boolean) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  passed += 1;
  console.log(`✓ ${name}`);
}

const standard = resolveWriterModel(
  { mode: "standard", categoryCode: "ABDOMEN_TOTAL", userId: "outro" },
  baseEnv,
);
check(
  "standard preserva modelo e effort atuais",
  standard.provider === "openai" &&
    standard.model === "gpt-4.1-mini" &&
    standard.reasoningEffort === "none" &&
    standard.credentialRef === "default",
);

const hardDisabled = resolveWriterModel(
  { mode: "hard", categoryCode: "ABDOMEN_TOTAL", userId: "outro" },
  baseEnv,
);
check("hard com flag OFF cai no standard", hardDisabled.model === standard.model);

const hardEnabledEnv = { ...baseEnv, HARD_MODE_ENABLED: "true" };
const hard = resolveWriterModel(
  { mode: "hard", categoryCode: "ABDOMEN_TOTAL", userId: "outro" },
  hardEnabledEnv,
);
check(
  "hard com flag ON usa gpt-5.4 low",
  hard.model === "gpt-5.4" && hard.reasoningEffort === "low",
);

const livre = resolveWriterModel(
  { mode: "standard", categoryCode: "LIVRE", userId: "outro" },
  hardEnabledEnv,
);
check("LIVRE usa o modelo default", livre.model === standard.model);

const teste = resolveWriterModel(
  { mode: "standard", categoryCode: "TESTE", userId: "luiz" },
  baseEnv,
);
check(
  "TESTE autorizado usa provider compat sem expor key",
  teste.provider === "openai-compat" &&
    teste.model === "deepseek-v4-pro" &&
    teste.credentialRef === "teste" &&
    !("apiKey" in teste),
);
const compatParams = writerRequestParams({
  config: teste,
  systemMessage: "system",
  userMessage: "user",
  temperature: 0.2,
});
// MUDANÇA DE COMPORTAMENTO (09/08). Este teste afirmava o contrário — que o
// compat NÃO enviava reasoning_effort — e com isso congelava dois bugs:
//
//   1. TESTE_REASONING_EFFORT era configuração morta: resolvida e descartada.
//   2. max_tokens 2500 não cobria raciocínio + laudo. Medido em produção com
//      deepseek-v4-flash: duas de três gerações bateram exatamente no teto e
//      voltaram VAZIAS, porque o raciocínio consome o orçamento primeiro.
check(
  "adapter compat envia reasoning_effort configurado, sem temperature",
  compatParams.reasoning_effort === "low" && !("temperature" in compatParams),
);
check(
  "adapter compat reserva orçamento para raciocínio + laudo",
  compatParams.max_tokens === 8000,
);
// Sem a env, nada de reasoning_effort: provider compatível é terreno de
// terceiros, e os estritos devolvem 400 em parâmetro desconhecido.
const compatSemEffort = writerRequestParams({
  config: { ...teste, reasoningEffort: "" },
  systemMessage: "system",
  userMessage: "user",
  temperature: 0.2,
});
check(
  "adapter compat omite reasoning_effort quando não configurado",
  !("reasoning_effort" in compatSemEffort),
);

const standardParams = writerRequestParams({
  config: standard,
  systemMessage: "system",
  userMessage: "user",
  temperature: 0.2,
});
check(
  "adapter OpenAI clássico preserva temperature e max_tokens",
  standardParams.temperature === 0.2 && standardParams.max_tokens === 2500,
);

const hardParams = writerRequestParams({
  config: hard,
  systemMessage: "system",
  userMessage: "user",
  temperature: 0.2,
});
check(
  // 8000, não 2500: em modelo de raciocínio o orçamento cobre raciocínio E
  // conteúdo, então dimensioná-lo pelo tamanho do laudo apaga o laudo.
  "adapter OpenAI reasoning usa effort low sem temperature",
  hardParams.reasoning_effort === "low" &&
    hardParams.max_completion_tokens === 8000 &&
    !("temperature" in hardParams),
);

for (const [name, mode, categoryCode, userId, config, expectedCode] of [
  ["TESTE rejeita usuário não autorizado", "standard", "TESTE", "outro", baseEnv, "TESTE_FORBIDDEN"],
  [
    "TESTE falha fechado sem configuração",
    "standard", "TESTE", "luiz",
    { ...baseEnv, TESTE_CATEGORY_API_KEY: "" },
    "TESTE_PROVIDER_NOT_CONFIGURED",
  ],
  // O modo experimental herda EXATAMENTE as mesmas travas da categoria antiga:
  // trocar o gatilho de categoria para modo não pode afrouxar a autorização.
  [
    "experimental rejeita usuário não autorizado",
    "experimental", "TIREOIDE", "outro", baseEnv, "TESTE_FORBIDDEN",
  ],
  [
    "experimental falha fechado sem configuração",
    "experimental", "TIREOIDE", "luiz",
    { ...baseEnv, TESTE_CATEGORY_BASE_URL: "" },
    "TESTE_PROVIDER_NOT_CONFIGURED",
  ],
] as const) {
  let code = "";
  try {
    resolveWriterModel({ mode, categoryCode, userId }, config);
  } catch (error) {
    if (error instanceof WriterModelResolutionError) code = error.code;
  }
  check(name, code === expectedCode);
}

// O ganho do refactor: o modelo experimental agora vale em QUALQUER categoria,
// que é o ponto — comparar provider no exame real, não numa categoria sem
// contrato clínico.
const experimental = resolveWriterModel(
  { mode: "experimental", categoryCode: "OBSTETRICA", userId: "luiz" },
  baseEnv,
);
check(
  "experimental troca o provider em categoria clínica normal",
  experimental.provider === "openai-compat" &&
    experimental.credentialRef === "teste" &&
    experimental.model === baseEnv.TESTE_CATEGORY_MODEL,
);

const standardRenderer = resolveGenerationPath(
  { mode: "standard", categoryCode: "ABDOMEN_TOTAL" },
  baseEnv,
);
check(
  "standard renderer preserva RAG e guards full",
  standardRenderer.path === "renderer" &&
    standardRenderer.ragFewShots &&
    standardRenderer.guardsMode === "full",
);

const standardWriter = resolveGenerationPath(
  { mode: "standard", categoryCode: "DOPPLER_OBSTETRICO" },
  baseEnv,
);
check(
  "standard fora da flag usa writer com comportamento atual",
  standardWriter.path === "writer-pure" &&
    standardWriter.ragFewShots &&
    standardWriter.guardsMode === "full",
);

const hardPathOff = resolveGenerationPath(
  { mode: "hard", categoryCode: "ABDOMEN_TOTAL" },
  baseEnv,
);
check("hard OFF preserva renderer", hardPathOff.path === "renderer");

for (const categoryCode of ["ABDOMEN_TOTAL", "LIVRE", "TESTE"]) {
  const path = resolveGenerationPath(
    {
      mode: categoryCode === "ABDOMEN_TOTAL" ? "hard" : "standard",
      categoryCode,
    },
    hardEnabledEnv,
  );
  check(
    `${categoryCode} usa writer puro advisory sem few-shots`,
    path.path === "writer-pure" &&
      !path.ragFewShots &&
      path.guardsMode === "advisory-only",
  );
}

console.log(`\n${passed}/${passed} PASS`);
