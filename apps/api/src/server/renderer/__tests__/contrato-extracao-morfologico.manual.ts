import assert from "node:assert/strict";
import { MORFOLOGICO_JSON_SCHEMA, MorfologicoFindingsSchema } from "../categories/MORFOLOGICO";

function checkStrictObjects(schema: unknown, path = "MORFOLOGICO") {
  if (!schema || typeof schema !== "object") return;
  const node = schema as Record<string, unknown>;
  if (node.properties && typeof node.properties === "object") {
    const properties = node.properties as Record<string, unknown>;
    assert.equal(node.additionalProperties, false, `${path}: additionalProperties`);
    assert.deepEqual([...(node.required as string[] ?? [])].sort(), Object.keys(properties).sort(), `${path}: todas as propriedades precisam ser required`);
    for (const [key, child] of Object.entries(properties)) checkStrictObjects(child, `${path}.${key}`);
  }
  if (node.items) checkStrictObjects(node.items, `${path}[]`);
  for (const keyword of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(node[keyword])) for (const child of node[keyword]) checkStrictObjects(child, `${path}.${keyword}`);
  }
}

checkStrictObjects(MORFOLOGICO_JSON_SCHEMA);
assert.deepEqual(Object.keys(MorfologicoFindingsSchema.shape).sort(), Object.keys(MORFOLOGICO_JSON_SCHEMA.properties).sort());
console.log("morfologico: strict schema and Zod fields match, including nested modules");
