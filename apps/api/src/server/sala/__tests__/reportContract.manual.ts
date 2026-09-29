import assert from 'node:assert/strict';
import { salaDayStart, serializeSalaReport } from '../reportContract';
assert.equal(salaDayStart(new Date('2026-09-28T02:59:59Z')).toISOString(), '2026-09-27T03:00:00.000Z');
assert.equal(salaDayStart(new Date('2026-09-28T03:00:00Z')).toISOString(), '2026-09-28T03:00:00.000Z');
const row = { id: 'synthetic', final_output: null, generated_output: 'Normal [REVISAR medida]', category_code: 'ABDOME_TOTAL', created_at: '2026-09-28T12:00:00Z', content_revision: 2 };
assert.equal(serializeSalaReport(row).reviewStatus, 'pending');
assert.equal(serializeSalaReport(row).outputText, 'Normal');
assert.equal(serializeSalaReport(row, { report_id: row.id, reviewed_revision: 1, reviewed_at: row.created_at }).reviewStatus, 'pending');
assert.equal(serializeSalaReport(row, { report_id: row.id, reviewed_revision: 2, reviewed_at: row.created_at }).reviewStatus, 'reviewed');
console.log('PASS Sala day boundary and review DTO');

assert.equal(serializeSalaReport({ ...row, sanity_result: { verdict: 'critical' } }, { report_id: row.id, reviewed_revision: 2, reviewed_at: row.created_at }).reviewStatus, 'pending');
assert.equal(serializeSalaReport({ ...row, sanity_result: { verdict: 'warning', issues: [{ severity: 'critical' }] } }, { report_id: row.id, reviewed_revision: 2, reviewed_at: row.created_at }).reviewStatus, 'pending');
