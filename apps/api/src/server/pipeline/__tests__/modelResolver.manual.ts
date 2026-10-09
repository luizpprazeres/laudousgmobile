import {
  resolveWriterModel,
  WriterModelResolutionError,
} from "../modelResolver";
import { rendererCategoryEnabled, resolveGenerationPath } from "../generationPathResolver";
import { writerRequestParams } from "../../ai/writerClient";

const baseEnv = {
  LLM_WRITER_MODEL: "claude-haiku-5-5",
  LLM_WRITER_EFFORT: "medium",
  HARD_MODE_ENABLED: "false",
  HARD_MODE_MODEL: "gpt-5.4",
  TESTE_CATEGORY_MODEL: "deepseek-v4-pro",
  TESTE_CATEGORY_BASE_URL: "https://example.test/v1",
  TESTE_CATEGORY_API_KEY: "test-key",
  TESTE_REASONING_EFFORT: "low",
  TESTE_ALLOWED_USER_ID: "luiz",
  RENDERER_CATEGORIES: "ABDOMEN_TOTAL,TIREOIDE,CERVICAL,OBSTETRICA,PELVE_FEMININA",
  DOPPLER_STANDALONE_V2: "true",
  DOPPLER_RENAL_WRITER_ENABLED: "true",
  DOPPLER_VENOSO_MMII_WRITER_ENABLED: "true",
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
  "standard = Claude Haiku 5.5 (Anthropic), esforço médio",
  standard.provider === "anthropic" &&
    standard.model === "claude-haiku-5-5" &&
    standard.reasoningEffort === "medium" &&
    standard.credentialRef === "default",
);
const rollback = resolveWriterModel(
  { mode: "standard", categoryCode: "ABDOMEN_TOTAL", userId: "outro" },
  { ...baseEnv, LLM_WRITER_MODEL: "gpt-5.4-mini", LLM_WRITER_EFFORT: "low" },
);
check(
  "rollback por env: modelo não-Claude vai para a OpenAI",
  rollback.provider === "openai" && rollback.model === "gpt-5.4-mini" && rollback.reasoningEffort === "low",
);
for (const retired of ["gpt-4.1-mini", "gpt-4.1", " gpt-4.1-nano "]) {
  const r = resolveWriterModel(
    { mode: "standard", categoryCode: "ABDOMEN_TOTAL", userId: "outro" },
    { ...baseEnv, LLM_WRITER_MODEL: retired },
  );
  check(`gpt-4.1 aposentado (${retired.trim()}) nunca é usado: vira Haiku`, r.provider === "anthropic" && r.model === "claude-haiku-5-5");
}
check(
  "env vazia cai no Haiku",
  resolveWriterModel({ mode: "standard", categoryCode: "X" }, { ...baseEnv, LLM_WRITER_MODEL: "" }).model === "claude-haiku-5-5",
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
  config: { ...rollback, model: "gpt-4o-mini" },
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
  { mode: "standard", categoryCode: "CERVICAL" },
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

const renalDedicated = resolveGenerationPath(
  { mode: "standard", categoryCode: "DOPPLER_RENAL" },
  { ...baseEnv, RENDERER_CATEGORIES: "" },
);
check("Doppler renal aprovado usa writer dedicado sem allowlist", renalDedicated.path === "renderer");
const renalHard = resolveGenerationPath(
  { mode: "hard", categoryCode: "DOPPLER_RENAL" },
  { ...hardEnabledEnv, RENDERER_CATEGORIES: "" },
);
check("modo hard não contorna o fact-audit renal", renalHard.path === "renderer");
const renalRollback = resolveGenerationPath(
  { mode: "standard", categoryCode: "DOPPLER_RENAL" },
  { ...baseEnv, RENDERER_CATEGORIES: "", DOPPLER_RENAL_WRITER_ENABLED: "false" },
);
check("Doppler renal mantém rollback explícito", renalRollback.path === "writer-pure");
check(
  "rollback renal vence allowlist histórica",
  !rendererCategoryEnabled("DOPPLER_RENAL", {
    RENDERER_CATEGORIES: "DOPPLER_RENAL",
    DOPPLER_STANDALONE_V2: "true",
    DOPPLER_RENAL_WRITER_ENABLED: "false",
  }),
);

for (const categoryCode of ["DOPPLER_VENOSO_MMII", "DOPPLER_VENOSO_MMII_MEDIDAS"]) {
  const venousDedicated = resolveGenerationPath(
    { mode: "standard", categoryCode },
    { ...baseEnv, RENDERER_CATEGORIES: "" },
  );
  check(`${categoryCode} usa writer venoso dedicado sem allowlist`, venousDedicated.path === "renderer");
  const venousHard = resolveGenerationPath(
    { mode: "hard", categoryCode },
    { ...hardEnabledEnv, RENDERER_CATEGORIES: "" },
  );
  check(`${categoryCode} não perde o fact-audit no modo hard`, venousHard.path === "renderer");
  const venousRollback = resolveGenerationPath(
    { mode: "standard", categoryCode },
    {
      ...baseEnv,
      RENDERER_CATEGORIES: categoryCode,
      DOPPLER_VENOSO_MMII_WRITER_ENABLED: "false",
    },
  );
  check(`${categoryCode} respeita rollback fail-closed`, venousRollback.path === "writer-pure");
  check(
    `${categoryCode} rollback vence allowlist histórica`,
    !rendererCategoryEnabled(categoryCode, {
      RENDERER_CATEGORIES: categoryCode,
      DOPPLER_STANDALONE_V2: "true",
      DOPPLER_VENOSO_MMII_WRITER_ENABLED: "false",
    }),
  );
}

const hardPathOff = resolveGenerationPath(
  { mode: "hard", categoryCode: "CERVICAL" },
  baseEnv,
);
check("hard OFF preserva renderer", hardPathOff.path === "renderer");

// ---- Migração Haiku 5.5: roteamento por FULL_WRITER_CATEGORIES ----
const abdomeDefault = resolveGenerationPath({ mode: "standard", categoryCode: "ABDOMEN_TOTAL" }, baseEnv);
check(
  "default: ABDOMEN_TOTAL clássico vai ao writer completo (bundle + guards full)",
  abdomeDefault.path === "writer-pure" && abdomeDefault.ragFewShots && abdomeDefault.guardsMode === "full",
);
check(
  "default: TIREOIDE clássico vai ao writer completo",
  resolveGenerationPath({ mode: "standard", categoryCode: "TIREOIDE" }, baseEnv).path === "writer-pure",
);
check(
  "estilo objetivo fica no renderer",
  resolveGenerationPath({ mode: "standard", categoryCode: "ABDOMEN_TOTAL", objetivo: true }, baseEnv).path === "renderer",
);
check(
  "default: família obstétrica e CERVICAL seguem no renderer",
  resolveGenerationPath({ mode: "standard", categoryCode: "OBSTETRICA" }, baseEnv).path === "renderer" &&
    resolveGenerationPath({ mode: "standard", categoryCode: "CERVICAL" }, baseEnv).path === "renderer",
);
check(
  "default: PELVE_FEMININA mantém o caminho atual",
  resolveGenerationPath({ mode: "standard", categoryCode: "PELVE_FEMININA" }, baseEnv).path === "renderer",
);
check(
  "PELVE_FEMININA alternável por env para o writer completo",
  resolveGenerationPath(
    { mode: "standard", categoryCode: "PELVE_FEMININA" },
    { ...baseEnv, FULL_WRITER_CATEGORIES: "PELVE_FEMININA" },
  ).path === "writer-pure",
);
check(
  "FULL_WRITER_CATEGORIES vazia devolve tudo ao renderer (rollback)",
  resolveGenerationPath({ mode: "standard", categoryCode: "ABDOMEN_TOTAL" }, { ...baseEnv, FULL_WRITER_CATEGORIES: "" }).path === "renderer",
);
check(
  "renderers clínicos e writers Doppler dedicados ignoram FULL_WRITER_CATEGORIES",
  ["TORAX", "QUADRIL_INFANTIL", "DOPPLER_RENAL", "DOPPLER_VENOSO_MMII"].every(
    (categoryCode) =>
      resolveGenerationPath(
        { mode: "standard", categoryCode },
        { ...baseEnv, FULL_WRITER_CATEGORIES: "TORAX,QUADRIL_INFANTIL,DOPPLER_RENAL,DOPPLER_VENOSO_MMII" },
      ).path === "renderer",
  ),
);

for (const categoryCode of ["CERVICAL", "LIVRE", "TESTE"]) {
  const path = resolveGenerationPath(
    {
      mode: categoryCode === "CERVICAL" ? "hard" : "standard",
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
