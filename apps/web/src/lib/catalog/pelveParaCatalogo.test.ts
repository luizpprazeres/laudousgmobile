import assert from 'node:assert/strict'
import { newMyomaFinding } from '@laudousg/schemes'
import { adaptarPelve } from './pelveParaCatalogo'

const extras = [
  newMyomaFinding({
    id: 'mioma-4',
    figo: 6,
    figoConfirmed: true,
    sizeMaxMm: 42,
    location: 'posterior',
    echo: 'heterogenea',
  }),
  newMyomaFinding({
    id: 'mioma-5',
    figo: 4,
    figoConfirmed: false,
    sizeMaxMm: 18,
    location: 'fundo',
    echo: null,
  }),
]

const resultado = adaptarPelve({
  utero: {
    mioma: ['sim'],
    'mioma.sim.medidas': '3,0 x 2,5 x 2,0',
    'mioma.sim.classificacao': 'intramural',
    'mioma.sim.parede': 'parede anterior',
    'mioma.sim.figo': '4',
    'mioma.sim.ecotextura': 'hipoecoica',
    '__myoma.extraFindings': JSON.stringify(extras),
  },
}, { via: 'tv' })

const miomas = resultado.dados.miomas as Array<Record<string, unknown>>
assert.equal(miomas.length, 3, 'miomas dinâmicos não podem se perder no adaptador canônico')
assert.deepEqual(miomas[1], {
  classificacao: 'subseroso',
  medidas_cm: [4.2],
  parede: 'parede posterior',
  relacao: null,
  figo: '6',
  ecotextura: 'heterogenea',
})
assert.equal(miomas[2]?.classificacao, null, 'FIGO não confirmado não pode gerar classificação implícita')
assert.equal(miomas[2]?.figo, null, 'FIGO não confirmado não pode aparecer no laudo')
assert.equal(miomas[2]?.parede, 'região fúndica')

const estruturado = adaptarPelve({
  endometrio: {
    frase: 'nao_correlacionavel',
    'frase.nao_correlacionavel.motivo': 'paciente refere amenorreia',
    liquido_livre: ['sim'],
    'liquido_livre.sim.localizacao': 'fundo_saco_posterior',
    'liquido_livre.sim.quantidade': 'moderada',
  },
}, { via: 'tv' })
assert.equal(estruturado.dados.endometrio_frase, 'nao_correlacionavel')
assert.equal(estruturado.dados.endometrio_motivo, 'paciente refere amenorreia')
assert.equal(estruturado.dados.liquido_livre_descricao, 'moderada quantidade no fundo de saco posterior')

const outroIncompleto = adaptarPelve({ endometrio: { frase: 'outro' } }, { via: 'tv' })
assert.equal(outroIncompleto.pendencias.some((item) => item.onde === 'endométrio' && item.bloqueia), true)

console.log('pelveParaCatalogo: ok')
