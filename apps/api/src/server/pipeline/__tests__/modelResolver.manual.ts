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
  DOPPLER_STANDALONE_V2: "true",
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
check(
  "adapter compat não envia reasoning_effort nem temperature",
  !("reasoning_effort" in compatParams) && !("temperature" in compatParams),
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
  "adapter OpenAI reasoning usa effort low sem temperature",
  hardParams.reasoning_effort === "low" &&
    hardParams.max_completion_tokens === 2500 &&
    !("temperature" in hardParams),
);

for (const [name, userId, config, expectedCode] of [
  ["TESTE rejeita usuário não autorizado", "outro", baseEnv, "TESTE_FORBIDDEN"],
  [
    "TESTE falha fechado sem configuração",
    "luiz",
    { ...baseEnv, TESTE_CATEGORY_API_KEY: "" },
    "TESTE_PROVIDER_NOT_CONFIGURED",
  ],
] as const) {
  let code = "";
  try {
    resolveWriterModel({ mode: "standard", categoryCode: "TESTE", userId }, config);
  } catch (error) {
    if (error instanceof WriterModelResolutionError) code = error.code;
  }
  check(name, code === expectedCode);
}

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

const dopplerV2 = resolveGenerationPath(
  { mode: "standard", categoryCode: "DOPPLER_OBSTETRICO" },
  baseEnv,
);
check(
  "Doppler v2 usa renderer mesmo fora da allowlist histórica",
  dopplerV2.path === "renderer" && dopplerV2.guardsMode === "full",
);
const dopplerRollback = resolveGenerationPath(
  { mode: "standard", categoryCode: "DOPPLER_OBSTETRICO" },
  { ...baseEnv, DOPPLER_STANDALONE_V2: "false" },
);
check(
  "Doppler v2 tem rollback explícito para o writer",
  dopplerRollback.path === "writer-pure" && dopplerRollback.guardsMode === "full",
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
