import assert from 'node:assert/strict';
import { salaDayStart, serializeSalaReport } from '../reportContract';
assert.equal(salaDayStart(new Date('2026-09-28T02:59:59Z')).toISOString(), '2026-09-27T03:00:00.000Z');
assert.equal(salaDayStart(new Date('2026-09-28T03:00:00Z')).toISOString(), '2026-09-28T03:00:00.000Z');
const row = { id: 'synthetic', final_output: null, generated_output: 'Rim medindo 123 cm. [REVISAR medida]\nBexiga: ____ mL.', category_code: 'ABDOME_TOTAL', created_at: '2026-09-28T12:00:00Z', content_revision: 2 };
assert.equal(serializeSalaReport(row).reviewStatus, 'pending');
assert.equal(serializeSalaReport(row).outputText, 'Rim medindo 123 cm.\nBexiga: ____ mL.');
assert.equal(serializeSalaReport(row, { report_id: row.id, reviewed_revision: 1, reviewed_at: row.created_at }).reviewStatus, 'pending');
assert.equal(serializeSalaReport(row, { report_id: row.id, reviewed_revision: 2, reviewed_at: row.created_at }).reviewStatus, 'reviewed');
const reviewedWithAlerts = serializeSalaReport({
  ...row,
  sanity_result: {
    verdict: 'critical',
    issues: [{ severity: 'critical', detail: 'Magnitude improvável.', trecho_laudo: '123 cm' }],
  },
}, { report_id: row.id, reviewed_revision: 2, reviewed_at: row.created_at });
assert.equal(reviewedWithAlerts.reviewStatus, 'reviewed');
assert.deepEqual(reviewedWithAlerts.reviewSignals.highlights.map((item) => [item.kind, item.anchor]), [
  ['missing', '____'],
  ['warning', '123 cm'],
]);
assert.ok(reviewedWithAlerts.reviewSignals.highlights[1]);
assert.equal(reviewedWithAlerts.reviewSignals.highlights[1].message, 'Magnitude improvável.');
console.log('PASS Sala day boundary, independent review and review signals DTO');
