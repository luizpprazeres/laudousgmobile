import assert from 'node:assert/strict'
import { adaptarMamaria } from './mamariaParaCatalogo'

const resultado = adaptarMamaria({
  mamas: {
    fundo: 'heterogeneo',
    achados_ids: ['a', 'b', 'c'],
    'achados.a.lado': 'direita',
    'achados.a.tipo': 'nodulo',
    'achados.a.medidas': '1,2 x 0,9 x 0,8',
    'achados.a.margem': 'circunscrita',
    'achados.a.local': 'quadrante superolateral',
    'achados.b.lado': 'direita',
    'achados.b.tipo': 'cisto_simples',
    'achados.b.medidas': '0,7 x 0,6 x 0,5',
    'achados.c.lado': 'esquerda',
    'achados.c.tipo': 'nodulo',
    'achados.c.medidas': '0,9 x 0,8 x 0,6',
    'achados.c.forma': 'irregular',
  },
  axilas: { axilas: 'nao' },
})

const achados = resultado.dados.achados as Array<Record<string, unknown>>
assert.equal(achados.length, 3)
assert.equal(achados.filter((achado) => achado.lado === 'direita').length, 2)
assert.deepEqual(achados[0]?.medidas_cm, [1.2, 0.9, 0.8])
assert.equal(achados[1]?.tipo, 'cisto_simples')
assert.equal(achados[2]?.forma, 'irregular')
assert.deepEqual(resultado.pendencias, [])

const incompleto = adaptarMamaria({
  mamas: { fundo: 'heterogeneo', achados_ids: ['x'], 'achados.x.tipo': 'nodulo' },
})
assert.equal((incompleto.dados.achados as unknown[]).length, 0)
assert.equal(incompleto.pendencias[0]?.bloqueia, true)

console.log('mamariaParaCatalogo: ok')
