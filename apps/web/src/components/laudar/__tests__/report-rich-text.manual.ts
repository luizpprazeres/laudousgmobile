import assert from 'node:assert/strict'
import {
  appendInitialsToReportHtml,
  attachReportPresentation,
  extractReportPresentation,
  mergeReportHtml,
  reportHtmlToText,
  sanitizeReportHtml,
  textToReportHtml,
} from '../reportRichText'

const original = 'ULTRASSONOGRAFIA DO ABDOME TOTAL\n\nCOMENTÁRIOS:\nExame realizado.\n\nCONCLUSÃO:\nExame normal.'
const generated = textToReportHtml(original)
assert.equal(reportHtmlToText(generated), original)
assert.match(generated, /<strong>COMENTÁRIOS:<\/strong>/)

const formatted = generated.replace('Exame realizado.', '<u>Exame realizado.</u>')
const updated = 'ULTRASSONOGRAFIA DO ABDOME TOTAL\n\nCOMENTÁRIOS:\nExame realizado.\n\nCONCLUSÃO:\nEsteatose hepática leve.'
const merged = mergeReportHtml(formatted, updated)
assert.match(merged, /<u>Exame realizado.<\/u>/)
assert.match(merged, /Esteatose hepática leve/)
assert.doesNotMatch(merged, /Exame normal/)
assert.equal(reportHtmlToText(merged), updated)

const attacked = '<p onclick="steal()">Seguro<script>alert(1)</script><img src=x onerror=steal()><span style="background:red">marcado</span></p>'
const safe = sanitizeReportHtml(attacked)
assert.equal(safe, '<p data-report-block="true">Seguro<mark>marcado</mark></p>')
assert.doesNotMatch(safe, /onclick|script|img|onerror|style=/i)

const withInitials = appendInitialsToReportHtml(merged, '/lp')
assert.match(withInitials, />\/lp<\/p>$/)
assert.match(reportHtmlToText(withInitials), /\/lp$/)

const stored = attachReportPresentation({ feto: { situacao: 'longitudinal' } }, withInitials)
assert.deepEqual((stored.feto as Record<string, unknown>).situacao, 'longitudinal')
assert.equal(extractReportPresentation(stored), withInitials)
assert.equal(extractReportPresentation({ __presentation: { format: 'desconhecido', html: safe } }), null)

console.log('sprint 17: HTML seguro, merge de blocos e persistência da apresentação aprovados')
