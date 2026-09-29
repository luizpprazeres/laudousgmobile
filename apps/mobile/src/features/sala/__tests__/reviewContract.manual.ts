import assert from "node:assert/strict";
import { reviewedRevision } from "../reviewContract";
const text = "Fígado de dimensões normais.\nConclusão: sem alterações.";
assert.equal(reviewedRevision({ report: { content_revision: 2, final_output: text, generated_output: "old" } }, text), 2);
assert.equal(reviewedRevision({ report: { content_revision: 1, final_output: null, generated_output: text } }, text), 1);
for (const revision of [undefined, null, 0, -1, 1.5, "2"]) {
  assert.throws(() => reviewedRevision({ report: { content_revision: revision, final_output: text } }, text));
}
assert.throws(() => reviewedRevision({ report: { content_revision: 2, final_output: text + " " } }, text));
assert.throws(() => reviewedRevision({ report: { content_revision: 2, final_output: "", generated_output: text } }, text));
assert.throws(() => reviewedRevision({ report: { content_revision: 2, final_output: " " } }, " "));
assert.throws(() => reviewedRevision(null, text));
console.log("RN review contract: exact text, version, legacy and empty guards passed");
