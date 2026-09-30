import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { breastPoint, nextMarkerId, thyroidPoints, validMarkers, type VisualMarker } from "./visualSchemeState";

const thyroid: VisualMarker = { id: 1, kind: "thyroid", side: "direito", third: "superior", type: "solid" };
const breast: VisualMarker = { id: 1, kind: "breast", side: "direita", type: "cyst", hour: 12, nippleDistanceCm: 0 };

test("estado visual valida categoria, lateralidade, localizacao e IDs", () => {
  assert.deepEqual(validMarkers("TIREOIDE", [thyroid]), [thyroid]);
  assert.equal(validMarkers("MAMARIA", [thyroid]), null);
  assert.equal(validMarkers("TIREOIDE", [{ ...thyroid, side: "istmo", third: "superior" }]), null);
  assert.equal(validMarkers("MAMARIA", [{ ...breast, hour: 13 }]), null);
  assert.equal(validMarkers("MAMARIA", [{ ...breast, nippleDistanceCm: 6.5 }]), null);
  assert.equal(validMarkers("MAMARIA", [breast, breast]), null);
  assert.equal(nextMarkerId([thyroid, { ...thyroid, id: 3 }]), 4);
});

test("geometria espelha o cartograma Web sem inferir profundidade", () => {
  assert.deepEqual(thyroidPoints(thyroid), [{ x: 145, y: 188 }, { x: 500, y: 178 }]);
  assert.deepEqual(thyroidPoints({ ...thyroid, side: "istmo", third: null }), [{ x: 200, y: 252 }, { x: 565, y: 188 }]);
  assert.deepEqual(breastPoint(breast), { x: 435, y: 686 });
  assert.deepEqual(breastPoint({ ...breast, side: "esquerda" }), { x: 1208, y: 686 });
});

test("bases tireoidianas sao byte-identicas aos assets aprovados", () => {
  for (const [name, expected] of [
    ["frontal-v2.png", "6c9aac3ce785d7c872e0478c98acb72899a8f4f7d74970d8ca5bf82c8eeceac2"],
    ["transverse-v2.png", "92cfd76df6dc12320118cb29ee9c7b250ff2ff2d2c6dead310f7d8a10e459a0e"],
  ]) {
    const bytes = readFileSync(resolve(process.cwd(), "apps/mobile/assets/schemes/thyroid", name));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), expected);
  }
  const breastPng = readFileSync(resolve(process.cwd(), "apps/mobile/assets/schemes/breast/frontal-v5.png"));
  assert.equal(breastPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.ok(breastPng.length > 100_000);
});
