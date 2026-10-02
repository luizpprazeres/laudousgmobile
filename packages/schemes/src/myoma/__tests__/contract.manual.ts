import assert from "node:assert/strict";
import {
  FIGO_CATEGORIES,
  MYOMA_EXPORT_WIDTH,
  MYOMA_MIN_TOUCH_TARGET_PX,
  MYOMA_PLANES,
  MYOMA_SCHEME_CONTRACT_VERSION,
  MyomaLocationSchema,
  canonicalAxialPoint,
  canonicalSagittalPoint,
  createMyomaSchemeContract,
  myomaExportPoint,
  myomaHitRadius,
  myomaPointFromExportTouch,
  myomaPointInPlane,
  parseMyomaFindings,
} from "../index";

const vague = parseMyomaFindings("Nódulo miomatoso intramural na parede posterior, medindo 2,5 cm.");
assert.equal(vague.length, 1);
assert.equal(vague[0]!.figoConfirmed, false, "termo intramural vago não pode inferir FIGO");
assert.equal(createMyomaSchemeContract(vague), null, "FIGO não confirmado bloqueia envio");
const withoutLocation = parseMyomaFindings("Nódulo miomatoso FIGO 4, medindo 2,5 cm.");
assert.equal(withoutLocation[0]!.location, "not_informed", "localização ausente não pode virar anterior");
const explicitAnterior = parseMyomaFindings("Nódulo miomatoso FIGO 4 na face anterior, medindo 2,5 cm.");
assert.equal(explicitAnterior[0]!.location, "anterior", "face anterior explícita deve ser preservada");
const repeated = parseMyomaFindings("Mioma FIGO 4 medindo 2,0 cm. Mioma FIGO 4 medindo 2,0 cm.");
assert.equal(repeated.length, 2, "achados distintos com mesmos descritores não podem ser deduplicados");
const mixed = parseMyomaFindings("Mioma FIGO 4 medindo 2,0 cm. Outro mioma FIGO 5 na parede posterior. Conclusão: miomas uterinos.");
assert.equal(mixed.length, 2, "achado sem medida não pode sumir quando outro tem medida");

const explicit = parseMyomaFindings("Mioma FIGO 4 na parede posterior, hipoecoico, medindo 2,5 x 2,0 cm.");
const contract = createMyomaSchemeContract(explicit);
assert.ok(contract);
assert.equal(contract.contractVersion, MYOMA_SCHEME_CONTRACT_VERSION);
assert.equal(contract.findings[0]!.figo, 4);
assert.equal(contract.findings[0]!.location, "posterior");
assert.equal(contract.findings[0]!.sizeMaxMm, 25);

assert.equal(createMyomaSchemeContract([{ ...explicit[0]!, id: "a" }, { ...explicit[0]!, id: "a" }]), null, "ids duplicados bloqueiam contrato");

// Geometria compartilhada: Web e Android desenham e leem toques pela mesma conta.
const MAX_MARKER_RADIUS = 26;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
for (const plane of ["sagittal", "axial"] as const) {
  const { rect, bounds } = MYOMA_PLANES[plane];
  const editable = [
    ...(plane === "sagittal"
      ? FIGO_CATEGORIES.map((category) => canonicalSagittalPoint(category.figo))
      : MyomaLocationSchema.options.map((location) => canonicalAxialPoint(location))),
    { x: bounds.minX, y: bounds.minY }, { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY }, { x: bounds.maxX, y: bounds.minY },
  ];
  for (const point of editable) {
    const exported = myomaExportPoint(plane, point);
    assert.ok(exported.x - MAX_MARKER_RADIUS >= rect.x0 && exported.x + MAX_MARKER_RADIUS <= rect.x1, `${plane} ${JSON.stringify(point)}: marcador sai do corte na horizontal`);
    assert.ok(exported.y - MAX_MARKER_RADIUS >= rect.y0 && exported.y + MAX_MARKER_RADIUS <= rect.y1, `${plane} ${JSON.stringify(point)}: marcador sai do corte na vertical`);
    const touched = myomaPointFromExportTouch(exported.x, exported.y);
    assert.equal(touched?.plane, plane, `${plane}: toque no marcador cai no corte certo`);
    assert.ok(touched && close(touched.point.x, point.x) && close(touched.point.y, point.y), `${plane}: ida e volta preserva o ponto`);
  }
  const outside = myomaPointInPlane(plane, -1000, 5000);
  assert.deepEqual(outside, { x: bounds.minX, y: bounds.maxY }, `${plane}: arrasto fora do corte fica preso ao útero`);
}
assert.equal(myomaPointFromExportTouch(398, 200), null, "faixa entre os cortes não move marcador");
assert.equal(myomaPointFromExportTouch(400, 40), null, "título não move marcador");

for (const width of [280, 320, 360, 414, 560, 820]) {
  for (const markerRadius of [13, 18, 26]) {
    const diameterPx = 2 * myomaHitRadius(markerRadius, width) * width / MYOMA_EXPORT_WIDTH;
    assert.ok(diameterPx >= MYOMA_MIN_TOUCH_TARGET_PX - 1e-9, `largura ${width}px, raio ${markerRadius}: alvo de ${diameterPx.toFixed(1)}px`);
    assert.ok(myomaHitRadius(markerRadius, width) > markerRadius, "área tocável cobre o marcador inteiro");
  }
}
console.log("myoma scheme contract: OK");
