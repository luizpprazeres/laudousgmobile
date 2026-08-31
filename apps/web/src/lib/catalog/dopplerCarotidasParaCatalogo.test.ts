import assert from 'node:assert/strict'
import { adaptarDopplerCarotidas } from './dopplerCarotidasParaCatalogo'

const result = adaptarDopplerCarotidas({
  direita: {
    emi: '0,8', comum_vps: '80', comum_vdf: '20', interna_vps: '120', interna_vdf: '30',
    externa_vps: '90', externa_vdf: '18', vertebral_vps: '45', vertebral_direcao: 'anterogrado',
    placas_ids: ['p1', 'p2'],
    'placas.p1.localizacao': 'bulbo direito', 'placas.p1.composicao': 'mista',
    'placas.p1.superficie': 'regular', 'placas.p1.espessura': '2,1', 'placas.p1.estenose': '',
    'placas.p1.descricao': '',
    'placas.p2.localizacao': 'carótida interna', 'placas.p2.composicao': 'calcificada',
    'placas.p2.superficie': 'irregular', 'placas.p2.espessura': '1,4', 'placas.p2.estenose': '35',
    'placas.p2.descricao': '',
  },
  esquerda: { placas_ids: [], vertebral_direcao: 'anterogrado' },
  conclusao: { classificacao: 'ateromatose_sem_estenose_significativa', lado: 'direita', conclusao_livre: '', achados_adicionais: '' },
})

const data = result.dados as any
assert.equal(data.direita.emi_mm, 0.8)
assert.equal(data.direita.interna.vps_cms, 120)
assert.equal(data.direita.placas.length, 2)
assert.equal(data.direita.placas[1].estenose_percentual, 35)
assert.equal(data.esquerda.comum.vps_cms, null)
assert.equal(data.classificacao_explicita, 'ateromatose_sem_estenose_significativa')
assert.equal(data.lado_classificacao, 'direita')
assert.deepEqual(result.alteracoes, [])
const invalid = adaptarDopplerCarotidas({
  direita: { placas_ids: ['x'], interna_vps: '20', interna_vdf: '30', 'placas.x.estenose': '120' },
  esquerda: { placas_ids: [] },
  conclusao: {},
})
assert.equal(invalid.pendencias.filter((item) => item.bloqueia).length, 2)
console.log('doppler-carotidas-adapter: 9 verificações aprovadas')
