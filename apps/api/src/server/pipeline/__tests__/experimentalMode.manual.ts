/**
 * Integração modo → caminho → modelo.
 *
 * POR QUE ESTE ARQUIVO EXISTE: os 21 testes de `modelResolver.manual.ts`
 * passavam com o modo experimental QUEBRADO. Eles exercitam o resolver
 * isolado, e o defeito estava na composição — `resolveGenerationPath` tratava
 * `experimental` como `standard`, então numa categoria do renderer o pipeline
 * montava o laudo deterministicamente e o provider alternativo NUNCA era
 * chamado. O médico ligaria o experimento, receberia um laudo normal e acharia
 * que era o outro modelo.
 *
 * A lição: testar as peças não prova que elas se encaixam. Estes casos vão pelo
 * par (path, model) junto, que é o que decide o comportamento real.
 */
import assert from "node:assert/strict";
import { resolveGenerationPath } from "../generationPathResolver";
import { resolveWriterModel } from "../modelResolver";
import type { GenerationMode } from "../modelResolver";

const env = {
  OPENAI_MODEL_WRITER: "gpt-4.1-mini",
  OPENAI_WRITER_REASONING_EFFORT: "none",
  HARD_MODE_ENABLED: "true",
  HARD_MODE_MODEL: "gpt-5.4",
  TESTE_CATEGORY_MODEL: "deepseek-v4-flash",
  TESTE_CATEGORY_BASE_URL: "https://example.test/v1",
  TESTE_CATEGORY_API_KEY: "k",
  TESTE_REASONING_EFFORT: "low",
  TESTE_ALLOWED_USER_ID: "luiz",
  // Categorias que normalmente NÃO passam pelo writer LLM.
  RENDERER_CATEGORIES: "ABDOMEN_TOTAL,TIREOIDE,OBSTETRICA",
};

let pass = 0;
function check(name: string, condition: boolean) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  pass += 1;
  console.log(`✓ ${name}`);
}

/** Resolve as duas coisas juntas, como a rota faz. */
function resolve(mode: GenerationMode, categoryCode: string, userId = "luiz") {
  const path = resolveGenerationPath({ mode, categoryCode }, env);
  const model = resolveWriterModel({ mode, categoryCode, userId }, env);
  return { path: path.path, model: model.model, provider: model.provider };
}

// ── O bug de 09/08, agora coberto ────────────────────────────────────────────
// Em TODA categoria do renderer, o modo experimental precisa sair do renderer
// e chegar no provider alternativo. Era exatamente aqui que ele morria.
for (const categoria of ["ABDOMEN_TOTAL", "TIREOIDE", "OBSTETRICA"]) {
  const r = resolve("experimental", categoria);
  check(
    `experimental em ${categoria} (categoria de renderer) chega no writer`,
    r.path === "writer-pure",
  );
  check(
    `experimental em ${categoria} usa o provider alternativo`,
    r.provider === "openai-compat" && r.model === "deepseek-v4-flash",
  );
}

// Categoria que já era writer segue igual, agora com o outro modelo.
const msk = resolve("experimental", "MUSCULOESQUELETICO_V2");
check(
  "experimental em categoria de writer mantém o caminho e troca o modelo",
  msk.path === "writer-pure" && msk.model === "deepseek-v4-flash",
);

// ── O que NÃO pode ter mudado ────────────────────────────────────────────────
const padraoRenderer = resolve("standard", "TIREOIDE");
check(
  "standard em categoria de renderer continua no renderer, modelo da casa",
  padraoRenderer.path === "renderer" && padraoRenderer.model === "gpt-4.1-mini",
);

const padraoWriter = resolve("standard", "MUSCULOESQUELETICO_V2");
check(
  "standard em categoria de writer continua igual",
  padraoWriter.path === "writer-pure" && padraoWriter.model === "gpt-4.1-mini",
);

const hard = resolve("hard", "TIREOIDE");
check(
  "hard continua forçando writer com o modelo grande da casa",
  hard.path === "writer-pure" && hard.model === "gpt-5.4",
);

const livre = resolve("standard", "LIVRE");
check(
  "LIVRE segue writer puro com o modelo da casa",
  livre.path === "writer-pure" && livre.model === "gpt-4.1-mini",
);

// ── Autorização não pode vazar pela composição ───────────────────────────────
// O caminho pode até ser resolvido, mas o MODELO tem de recusar. Isto protege
// contra alguém "consertar" o path e esquecer que a trava vive no resolver.
let negou = false;
try {
  resolveWriterModel(
    { mode: "experimental", categoryCode: "TIREOIDE", userId: "outro" },
    env,
  );
} catch {
  negou = true;
}
check("experimental de usuário não autorizado é recusado", negou);

console.log(`\n${pass}/${pass} PASS`);
