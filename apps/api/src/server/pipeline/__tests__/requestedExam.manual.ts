import assert from "node:assert/strict";
import { requestedExamCategory, requestedExamInstruction } from "../requestedExam";

assert.equal(requestedExamCategory("DOPPLER_OBSTETRICO", "combined"), "OBSTETRICA");
assert.equal(requestedExamCategory("DOPPLER_OBSTETRICO", "isolated"), "DOPPLER_OBSTETRICO");
assert.equal(requestedExamCategory("DOPPLER_OBSTETRICO"), undefined);
assert.equal(requestedExamCategory("MORFOLOGICO", "isolated"), "MORFOLOGICO");
assert.equal(requestedExamCategory("MORFOLOGICO"), "MORFOLOGICO");
assert.equal(requestedExamCategory("PELVE_FEMININA", "combined"), undefined);
assert.equal(requestedExamCategory("VIAS_URINARIAS", "isolated"), undefined);
assert.equal(requestedExamInstruction("MORFOLOGICO", "isolated"), "");
assert.equal(requestedExamInstruction("PELVE_FEMININA", "isolated"), "");
assert.match(requestedExamInstruction("OBSTETRICA", "combined"), /Preserve o modelo obstétrico/);
assert.match(requestedExamInstruction("DOPPLER_OBSTETRICO", "isolated"), /somente Doppler/);
console.log("requestedExam: 11 assertions passed");
