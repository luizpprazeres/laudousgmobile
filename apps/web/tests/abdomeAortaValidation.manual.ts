import assert from 'node:assert/strict'
import { adaptarAbdome } from '../src/lib/catalog/abdomeParaCatalogo'

const base = {
  aorta: {
    calibre: 'normal',
    paredes: 'regulares',
    'calibre.ectasia.diametro': '',
    'calibre.aneurisma.diametro': '',
  },
}

for (const calibre of ['ectasia', 'aneurisma'] as const) {
  for (const diametro of ['', 'abc5', '-2', '0', '45']) {
    const resultado = adaptarAbdome({
      ...base,
      aorta: { ...base.aorta, calibre, [`calibre.${calibre}.diametro`]: diametro },
    })
    assert.ok(
      resultado.pendencias.some((item) => item.onde === 'aorta' && item.bloqueia),
      `${calibre} com diâmetro ${JSON.stringify(diametro)} deveria bloquear`,
    )
  }
}

const valido = adaptarAbdome({
  ...base,
  aorta: { ...base.aorta, calibre: 'aneurisma', 'calibre.aneurisma.diametro': '45 mm' },
})
assert.equal(valido.pendencias.some((item) => item.onde === 'aorta' && item.bloqueia), false)
assert.deepEqual(
  ((valido.dados.orgaos as any).aorta.achados[0].medidas_cm),
  [4.5],
)

const centimetrosExplicitos = adaptarAbdome({
  ...base,
  aorta: { ...base.aorta, calibre: 'aneurisma', 'calibre.aneurisma.diametro': '10 cm' },
})
assert.equal(centimetrosExplicitos.pendencias.some((item) => item.onde === 'aorta' && item.bloqueia), false)

console.log('Abdome: ectasia e aneurisma da aorta exigem diâmetro válido')
