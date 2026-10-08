import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { POST } from "../../../app/api/companion/form-patch/route";
import {
  companionFormPatchRateAllowed,
  resetCompanionFormPatchRateLimitForTests,
} from "../formPatchRateLimit";

async function main() {
  const unauthenticated = await POST(new Request("http://localhost/api/companion/form-patch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }));
  assert.equal(unauthenticated.status, 401, "JWT é obrigatório mesmo com a flag desligada");

  resetCompanionFormPatchRateLimitForTests();
  for (let index = 0; index < 10; index += 1) {
    assert.equal(companionFormPatchRateAllowed("usuario-sintetico", 1_000 + index), true);
  }
  assert.equal(companionFormPatchRateAllowed("usuario-sintetico", 1_020), false);
  assert.equal(companionFormPatchRateAllowed("usuario-sintetico", 62_000), true);

  const apiRoot = process.cwd().endsWith("/apps/api")
    ? process.cwd()
    : process.cwd().endsWith("/apps/web")
      ? resolve(process.cwd(), "../api")
      : resolve(process.cwd(), "apps/api");
  const source = readFileSync(resolve(
    apiRoot,
    "src/app/api/companion/form-patch/route.ts",
  ), "utf8");
  assert.ok(
    source.indexOf("const user = await verifyJwt(req)")
      < source.indexOf("if (!companionFormPatchCategoryEnabled"),
  );
  assert.match(source, /MAX_BODY_BYTES = 16 \* 1024/);
  assert.match(source, /no_applicable_findings/);
  assert.doesNotMatch(source, /console\.(?:log|error)\([^\n]*(?:raw|text|body|parsed)/i);

  console.log("companion form patch route: auth, rate limit, bounds e no-findings aprovados");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
