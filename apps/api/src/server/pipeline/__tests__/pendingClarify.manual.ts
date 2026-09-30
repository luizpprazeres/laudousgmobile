import assert from 'node:assert/strict'
import { pendingClarifyMetadata } from '../pendingClarify'

const questions = [
  { id: 'lado', question: 'Qual lado foi avaliado?', expects: 'choice', choices: ['direito', 'esquerdo'] },
]
assert.deepEqual(pendingClarifyMetadata(questions), {
  pending_clarify: { contractVersion: 1, questions },
})
assert.throws(() => pendingClarifyMetadata([]), /at least 1/i)
assert.throws(() => pendingClarifyMetadata([{ id: '', question: 'x', expects: 'invalid' }]))
console.log('pendingClarify API metadata contract: OK')
