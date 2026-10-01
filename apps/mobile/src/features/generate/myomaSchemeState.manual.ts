import assert from "node:assert/strict";
import { test } from "node:test";
import { canSendMyomaScheme, canonicalAxialPoint, canonicalSagittalPoint, myomaFamily, myomaPointFromExportTouch, newMyomaFinding, parseMyomaFindings, validMyomaFindings } from "@laudousg/schemes/myoma";
import { createMyomaSalaPayload } from "./myomaSchemePayload";

test("contrato FIGO e geometria espelham o editor iOS", () => {
  assert.equal(myomaFamily(0), "submucoso");
  assert.equal(myomaFamily(4), "intramural");
  assert.equal(myomaFamily(7), "subseroso");
  assert.equal(myomaFamily(8), "outros");
  assert.deepEqual(canonicalSagittalPoint(4), { x: 272, y: 300 });
  assert.deepEqual(canonicalAxialPoint("lateral_direita"), { x: 420, y: 188 });
});

test("toque e arraste convertem para posições manuais nos dois cortes", () => {
  const sagittal = myomaPointFromExportTouch(204, 255);
  const axial = myomaPointFromExportTouch(595, 255);
  assert.equal(sagittal?.plane, "sagittal");
  assert.equal(axial?.plane, "axial");
  assert.equal(myomaPointFromExportTouch(400, 40), null);
  if (sagittal?.plane === "sagittal") {
    assert.ok(sagittal.point.x >= 70 && sagittal.point.x <= 370);
    assert.ok(sagittal.point.y >= 40 && sagittal.point.y <= 480);
  }
  if (axial?.plane === "axial") {
    assert.ok(axial.point.x >= 50 && axial.point.x <= 510);
    assert.ok(axial.point.y >= 20 && axial.point.y <= 380);
  }
});

test("novo marcador não inventa medida nem libera FIGO sem confirmação", () => {
  const finding = newMyomaFinding();
  assert.equal(finding.sizeMaxMm, null);
  assert.equal(finding.figoConfirmed, false);
  assert.equal(canSendMyomaScheme([finding]), false);
});

test("parser conserva medida, local, ecotextura e FIGO explicito", () => {
  const findings = parseMyomaFindings("Nódulo miomatoso FIGO 5, heterogêneo, na parede anterior, medindo 2,3 x 1,8 x 2,0 cm. Conclusão: mioma FIGO 5.");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].figo, 5);
  assert.equal(findings[0].figoConfirmed, true);
  assert.equal(findings[0].sizeMaxMm, 23);
  assert.equal(findings[0].location, "anterior");
  assert.equal(findings[0].echo, "heterogenea");
  assert.equal(canSendMyomaScheme(findings), true);
});

test("localizacao vaga nao vira FIGO silenciosamente", () => {
  const findings = parseMyomaFindings("Nódulo miomatoso intramural posterior medindo 18 mm.");
  assert.equal(findings.length, 1);
  assert.equal(findings[0].figoConfirmed, false);
  assert.equal(canSendMyomaScheme(findings), false);
});

test("estado invalido ou IDs duplicados falham fechado", () => {
  const finding = parseMyomaFindings("Mioma FIGO 4 medindo 2 cm.")[0];
  assert.equal(validMyomaFindings([finding, finding]), null);
  assert.equal(validMyomaFindings([{ ...finding, figo: 9 }]), null);
});

test("payload Android envia contrato canônico e bloqueia FIGO não confirmado", () => {
  const confirmed = parseMyomaFindings("Mioma FIGO 5 na parede posterior, medindo 2,4 cm.");
  const payload = createMyomaSalaPayload({ reportId: "report-test", findings: confirmed, png: "png-base64" });
  assert.ok(payload);
  assert.equal(payload.contractVersion, "myoma-scheme/v1");
  assert.equal(payload.examType, "MIOMAS");
  assert.deepEqual(payload.findings, confirmed);
  assert.equal(payload.findings.every((finding) => finding.figoConfirmed), true);

  const pending = [{ ...confirmed[0], figoConfirmed: false }];
  assert.equal(createMyomaSalaPayload({ findings: pending, png: "png-base64" }), null);
});
