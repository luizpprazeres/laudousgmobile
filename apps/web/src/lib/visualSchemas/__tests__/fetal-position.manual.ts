import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fetalPositionFromState, supportsFetalPositionSchema } from '../fetalPosition'

const base = { situacao: 'longitudinal', 'situacao.longitudinal.apresentacao': 'cefálica', 'situacao.transversa.polo_cefalico': 'à direita', dorso: '' }
assert.equal(fetalPositionFromState(base).variant, 'longitudinal_cefalica')
assert.equal(fetalPositionFromState({ ...base, 'situacao.longitudinal.apresentacao': 'pélvica' }).variant, 'longitudinal_pelvica')
assert.equal(fetalPositionFromState({ ...base, situacao: 'transversa' }).variant, 'transversa_polo_direita')
assert.equal(fetalPositionFromState({ ...base, situacao: 'transversa', 'situacao.transversa.polo_cefalico': 'à esquerda', dorso: 'posterior' }).variant, 'transversa_polo_esquerda')
assert.equal(fetalPositionFromState({ ...base, situacao: 'transversa', dorso: 'posterior' }).dorsum, 'posterior')
assert.equal(supportsFetalPositionSchema('OBSTETRICA', undefined), true)
assert.equal(supportsFetalPositionSchema('MORFOLOGICO', '2t'), true)
assert.equal(supportsFetalPositionSchema('MORFOLOGICO', '3t'), true)
assert.equal(supportsFetalPositionSchema('MORFOLOGICO', '1t'), false)
assert.equal(supportsFetalPositionSchema('MORFOLOGICO', undefined), false)
assert.equal(supportsFetalPositionSchema('DOPPLER_OBSTETRICO', undefined), false)

const assetDirectory = resolve(process.cwd(), 'apps/web/public/schemas/fetal')
const manifest = JSON.parse(readFileSync(resolve(assetDirectory, 'manifest.json'), 'utf8')) as { assets: Array<{ file: string; sha256: string }> }
assert.equal(manifest.assets.length, 4)
for (const asset of manifest.assets) {
  const path = resolve(assetDirectory, asset.file)
  assert.equal(existsSync(path), true, `${asset.file} ausente`)
  const checksum = createHash('sha256').update(readFileSync(path)).digest('hex')
  assert.equal(checksum, asset.sha256, `${asset.file} divergiu do manifesto`)
}

console.log('Sprint 19 fetal position matrix: OK')
