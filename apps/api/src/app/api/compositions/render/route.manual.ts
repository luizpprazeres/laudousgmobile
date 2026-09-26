import assert from "node:assert/strict";
import {
  CLINICAL_COMPOSITION_CONTRACT_VERSION,
  ClinicalCompositionResponseV1Schema,
} from "@laudousg/shared";
import { achadoNormalDe, mesclarFundo } from "@/server/renderer/catalog/modeloNormal";
import { modeloNormalDe } from "@/server/renderer/catalog/modeloNormalRegistry";
import { POST } from "./route";

const TOKEN = "composition-test-token-1234567890";

function normalData(category: string): Record<string, unknown> {
  const model = modeloNormalDe(category);
  assert.ok(model, `modelo ausente: ${category}`);
  return mesclarFundo(
    achadoNormalDe(model.schema) as Record<string, unknown>,
    model.seed ?? {},
  );
}

function body() {
  return {
    contractVersion: CLINICAL_COMPOSITION_CONTRACT_VERSION,
    requestId: "10000000-0000-4000-8000-000000000001",
    compositionId: "10000000-0000-4000-8000-000000000002",
    revision: 12,
    associationCode: "MAMARIA__PELVE_FEMININA",
    writingStyle: "OBJETIVO",
    components: [
      {
        componentId: "10000000-0000-4000-8000-000000000003",
        categoryCode: "MAMARIA",
        acquisitionContextId: "10000000-0000-4000-8000-000000000004",
        data: { alteracoes: [] as string[], dados: normalData("MAMARIA") },
      },
      {
        componentId: "10000000-0000-4000-8000-000000000005",
        categoryCode: "PELVE_FEMININA",
        acquisitionContextId: "10000000-0000-4000-8000-000000000006",
        data: { alteracoes: [] as string[], dados: normalData("PELVE_FEMININA") },
      },
    ],
    sharedStructures: [],
  };
}

function request(payload: unknown, token = TOKEN): Request {
  return new Request("http://localhost/api/compositions/render", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function main() {
  const previousToken = process.env.CATALOG_SERVICE_TOKEN;
  process.env.CATALOG_SERVICE_TOKEN = TOKEN;
  try {
    const success = await POST(request(body()));
    assert.equal(success.status, 200);
    const successJson = ClinicalCompositionResponseV1Schema.parse(await success.json());
    assert.equal(successJson.status, "complete");
    assert.equal(successJson.requestId, body().requestId);
    assert.equal(successJson.revision, 12);
    console.log("✓ endpoint autentica e devolve composição completa versionada");

    const invalid = body();
    invalid.components[0]!.data.alteracoes = ["alteracao_inexistente"];
    const failed = await POST(request(invalid));
    assert.equal(failed.status, 400);
    const failedJson = ClinicalCompositionResponseV1Schema.parse(await failed.json());
    assert.equal(failedJson.status, "error");
    if (failedJson.status === "error") {
      assert.equal(failedJson.error.code, "UNKNOWN_ALTERATION");
      assert.equal(failedJson.requestId, invalid.requestId);
      assert.equal(failedJson.revision, invalid.revision);
      assert.equal("document" in failedJson, false);
    }
    console.log("✓ endpoint ecoa identidade no erro e não retorna documento parcial");

    const malformed = body();
    malformed.components = [malformed.components[0]!] as typeof malformed.components;
    const malformedResponse = await POST(request(malformed));
    assert.equal(malformedResponse.status, 400);
    const malformedJson = ClinicalCompositionResponseV1Schema.parse(
      await malformedResponse.json(),
    );
    assert.equal(malformedJson.status, "error");
    if (malformedJson.status === "error") {
      assert.equal(malformedJson.error.code, "INVALID_REQUEST");
      assert.equal(malformedJson.requestId, malformed.requestId);
      assert.equal(malformedJson.revision, malformed.revision);
    }
    console.log("✓ contrato inválido ainda ecoa requestId e revision quando identificáveis");

    const oversized = body();
    oversized.components[0]!.data.dados.achados_adicionais = "x".repeat(270_000);
    const oversizedResponse = await POST(request(oversized));
    assert.equal(oversizedResponse.status, 413);
    const oversizedJson = ClinicalCompositionResponseV1Schema.parse(
      await oversizedResponse.json(),
    );
    assert.equal(oversizedJson.status, "error");
    if (oversizedJson.status === "error") {
      assert.equal(oversizedJson.error.code, "PAYLOAD_LIMIT_EXCEEDED");
      assert.equal(oversizedJson.requestId, oversized.requestId);
      assert.equal(oversizedJson.revision, oversized.revision);
    }
    console.log("✓ limite HTTP também ecoa requestId e revision");

    const unauthorized = await POST(request(body(), "token-incorreto-com-tamanho-suficiente"));
    assert.equal(unauthorized.status, 401);
    console.log("✓ endpoint preserva autenticação pelo service token");
  } finally {
    if (previousToken === undefined) delete process.env.CATALOG_SERVICE_TOKEN;
    else process.env.CATALOG_SERVICE_TOKEN = previousToken;
  }

  console.log("\n5 grupos de endpoint composição v1: PASS");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
