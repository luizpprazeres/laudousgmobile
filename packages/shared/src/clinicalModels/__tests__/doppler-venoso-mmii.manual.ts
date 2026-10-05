import assert from "node:assert/strict";
import { createInitialDopplerVenosoMmiiInput, DOPPLER_VENOSO_MMII_TVP_REQUIRED, DOPPLER_VENOSO_MMII_REFLUX_REQUIRED, DopplerVenosoMmiiSchema, renderDopplerVenosoMmii, validateDopplerVenosoMmii, type DopplerVenosoMmiiInput, type DopplerVenosoMmiiSegmentId } from "../dopplerVenosoMmii";

let count = 0;
function test(name: string, run: () => void) { run(); count++; console.log(`PASS ${name}`); }
function normal(laterality: DopplerVenosoMmiiInput["laterality"] = "right", protocol: DopplerVenosoMmiiInput["protocol"] = "tvp_only"): DopplerVenosoMmiiInput {
  const value = createInitialDopplerVenosoMmiiInput(); value.laterality = laterality; value.protocol = protocol;
  for (const side of ["right", "left"] as const) {
    if (laterality !== "bilateral" && laterality !== side) continue;
    for (const s of value.sides[side].segments) {
      if (DOPPLER_VENOSO_MMII_TVP_REQUIRED.includes(s.id) || protocol !== "tvp_only" && DOPPLER_VENOSO_MMII_REFLUX_REQUIRED.includes(s.id)) {
        s.assessment = "evaluated"; s.compressibility = "complete";
      }
      if (protocol !== "tvp_only" && DOPPLER_VENOSO_MMII_REFLUX_REQUIRED.includes(s.id)) s.reflux = { tested: true, time: { value: 0, unit: "s" }, maneuver: "distal_compression", position: "standing" };
    }
  }
  return value;
}
function segment(v: DopplerVenosoMmiiInput, id: DopplerVenosoMmiiSegmentId, side: "right" | "left" = "right") { return v.sides[side].segments.find((s) => s.id === id)!; }
function reflux(v: DopplerVenosoMmiiInput, id: DopplerVenosoMmiiSegmentId, value: number, unit: "s" | "ms" = "s") {
  const s = segment(v, id); s.assessment = "evaluated"; s.compressibility = "complete"; s.reflux = { tested: true, time: { value, unit }, maneuver: "distal_compression", position: "standing" }; return s;
}
function thrombosis(v: DopplerVenosoMmiiInput, id: DopplerVenosoMmiiSegmentId = "popliteal", side: "right" | "left" = "right") {
  const s = segment(v, id, side); s.assessment = "evaluated"; s.compressibility = "absent";
  s.thrombosis = { physicianConfirmed: true, phase: "not_assessed", phaseConfirmed: false, intraluminalMaterial: "present", occlusion: "occlusive" }; return s;
}
const conclusion = (v: DopplerVenosoMmiiInput) => renderDopplerVenosoMmii(v).split("CONCLUSÃO:\n")[1]!;

test("unassessed defaults fail closed", () => { const v = createInitialDopplerVenosoMmiiInput(); assert.equal(validateDopplerVenosoMmii(v).success, false); assert.throws(() => renderDopplerVenosoMmii(v)); });
test("normal unilateral has explicit compression, no contralateral assertion", () => { const text = renderDopplerVenosoMmii(normal()); assert.match(text, /Não se identificam sinais de trombose venosa profunda/); assert.doesNotMatch(text, /esquerdo|competente|aguda/); });
test("normal complete protocol does not assume competence", () => { const text = renderDopplerVenosoMmii(normal("bilateral", "complete")); assert.match(text, /Pesquisa de refluxo negativa/); assert.doesNotMatch(text, /competentes/); });
test("missing calf coverage is blocked", () => { const v = normal(); segment(v, "fibular").assessment = "not_assessed"; segment(v, "fibular").compressibility = "not_assessed"; assert.equal(validateDopplerVenosoMmii(v).success, false); });
test("documented calf limitation blocks blanket negative", () => { const v = normal(); const s = segment(v, "fibular"); s.assessment = "limited"; s.compressibility = "not_testable"; s.limitation = "Curativo impede a compressão neste segmento"; const text = conclusion(v); assert.match(text, /Pesquisa de trombose venosa profunda limitada/); assert.doesNotMatch(text, /Não se identificam sinais/); });
test("positive DVT requires partial or absent compression", () => { const v = normal(); thrombosis(v); assert.match(conclusion(v), /Trombose venosa profunda/); assert.doesNotMatch(conclusion(v), /Não se identificam sinais/); segment(v, "popliteal").compressibility = "complete"; assert.equal(validateDopplerVenosoMmii(v).success, false); });
test("partial compression also anchors DVT", () => { const v = normal(); thrombosis(v).compressibility = "partial"; assert.match(conclusion(v), /Trombose venosa profunda/); });
test("unconfirmed thrombosis cannot produce final diagnosis", () => { const v = normal(); thrombosis(v).thrombosis!.physicianConfirmed = false; assert.throws(() => renderDopplerVenosoMmii(v)); });
test("phase requires independent evidence and physician confirmation", () => { const v = normal(); const s = thrombosis(v); s.thrombosis!.phase = "acute"; assert.equal(validateDopplerVenosoMmii(v).success, false); s.thrombosis!.phaseConfirmed = true; s.thrombosis!.phaseEvidence = "Veia distendida por material hipoecoico"; assert.match(conclusion(v), /profunda aguda/); });
test("subacute phase cannot enter schema", () => { const v = normal(); const s = thrombosis(v); const invalid = JSON.parse(JSON.stringify(v)); invalid.sides.right.segments.find((x: {id:string}) => x.id === s.id).thrombosis.phase = "subacute"; assert.equal(DopplerVenosoMmiiSchema.safeParse(invalid).success, false); });
test("deep exact 1 second stays body only", () => { const v = normal(); reflux(v, "common_femoral", 1); assert.doesNotMatch(conclusion(v), /Refluxo/); assert.match(renderDopplerVenosoMmii(v), /sem ultrapassar o limiar/); });
test("deep above 1 second enters conclusion", () => { const v = normal(); reflux(v, "common_femoral", 1001, "ms"); assert.match(conclusion(v), /Refluxo/); });
test("superficial exact 500ms stays body only", () => { const v = normal(); reflux(v, "great_saphenous_proximal_thigh", 500, "ms"); assert.doesNotMatch(conclusion(v), /Refluxo/); });
test("superficial greater than 500ms enters conclusion", () => { const v = normal(); reflux(v, "great_saphenous_proximal_thigh", 501, "ms"); assert.match(conclusion(v), /Refluxo/); });
test("deep femoral uses 0.5s instead of 1s", () => { const v = normal(); reflux(v, "deep_femoral", 0.6); assert.match(conclusion(v), /Refluxo/); });
test("muscular reflux observation is not automatically classified", () => { const v = normal(); reflux(v, "soleal", 2); assert.doesNotMatch(conclusion(v), /Refluxo/); assert.match(renderDopplerVenosoMmii(v), /sem classificação automática/); });
test("reflux without maneuver or valid posture is blocked", () => { const v = normal(); const s = reflux(v, "popliteal", 2); s.reflux.maneuver = "not_documented"; assert.equal(validateDopplerVenosoMmii(v).success, false); s.reflux.maneuver = "release"; s.reflux.position = "supine"; assert.equal(validateDopplerVenosoMmii(v).success, false); });
function perforator(diameter: number, time: number, unit: "mm"|"cm" = "mm") { const v = normal(); v.sides.right.perforators.push({ id: "p1", location: "face medial do terço distal da perna", diameter: { value: diameter, unit }, reflux: { tested: true, time: { value: time, unit: "s" }, maneuver: "release", position: "standing" }, outwardFlow: "documented" }); return v; }
test("perforator requires both strict thresholds", () => { assert.doesNotMatch(conclusion(perforator(3.5, 0.6)), /Perfurante insuficiente/); assert.doesNotMatch(conclusion(perforator(3.6, 0.5)), /Perfurante insuficiente/); assert.match(conclusion(perforator(3.6, 0.6)), /Perfurante insuficiente/); });
test("perforator cm conversion is correct", () => { assert.match(conclusion(perforator(0.36, 0.6, "cm")), /Perfurante insuficiente/); assert.doesNotMatch(conclusion(perforator(0.35, 0.6, "cm")), /Perfurante insuficiente/); });
test("missing perforator diameter does not become incompetent", () => { const v = perforator(3.6, 0.6); delete v.sides.right.perforators[0]!.diameter; assert.throws(() => renderDopplerVenosoMmii(v)); });
test("bilateral pathology remains ipsilateral", () => { const v = normal("bilateral"); thrombosis(v, "popliteal", "left"); const c = conclusion(v); assert.match(c, /Trombose venosa profunda.*esquerdo/); assert.match(c, /Não se identificam sinais.*direito/); assert.doesNotMatch(c, /Trombose venosa profunda.*direito/); });
test("unrequested-side observations rejected", () => { const v = normal(); const s = segment(v, "common_femoral", "left"); s.assessment = "evaluated"; s.compressibility = "complete"; assert.equal(validateDopplerVenosoMmii(v).success, false); });
test("recommendation only appears after separate approval", () => { const v = normal(); v.recommendations.push({ text: "Correlacionar com a avaliação clínica", physicianConfirmed: false }); assert.doesNotMatch(renderDopplerVenosoMmii(v), /Correlacionar/); v.recommendations[0]!.physicianConfirmed = true; assert.match(renderDopplerVenosoMmii(v), /Correlacionar/); });
test("measurements presentation shares rules and preserves original unit", () => { const v = normal(); v.categoryCode = "DOPPLER_VENOSO_MMII_MEDIDAS"; segment(v, "common_femoral").diameter = { value: 1.2, unit: "cm" }; assert.match(renderDopplerVenosoMmii(v), /calibre de 1,2 cm/); });
test("duplicate segment rejected", () => { const v = normal(); v.sides.right.segments.push({ ...segment(v, "popliteal") }); assert.equal(validateDopplerVenosoMmii(v).success, false); });
test("invalid nonfinite time rejected", () => { const v = normal(); reflux(v, "popliteal", Number.POSITIVE_INFINITY); assert.equal(validateDopplerVenosoMmii(v).success, false); });
test("objective headings preserve body rules", () => { const text = renderDopplerVenosoMmii(normal(), "OBJETIVO"); assert.match(text, /TÉCNICA:/); assert.match(text, /ACHADOS:/); assert.match(text, /IMPRESSÃO:/); });
test("limited required SFJ prevents blanket DVT negative", () => { const v = normal(); const s = segment(v, "saphenofemoral_junction"); s.assessment = "limited"; s.compressibility = "not_testable"; s.limitation = "Impossibilidade de compressão por dor local"; assert.doesNotMatch(conclusion(v), /Não se identificam sinais/); });
test("superficial incompressibility is descriptive, never automatic superficial thrombosis", () => { const v = normal(); thrombosis(v, "saphenofemoral_junction"); const text = renderDopplerVenosoMmii(v); assert.match(text, /Junção safenofemoral com compressibilidade ausente/); assert.doesNotMatch(text, /Trombose venosa superficial|Não se identificam sinais/); });
console.log(`${count} tests passed`);
