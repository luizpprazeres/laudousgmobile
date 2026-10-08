import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ExamState } from '@/lib/deterministic'
import { carotidVisualFromState } from '../carotidAdapter'

const state: ExamState = {
  direita: {
    avaliacao: 'avaliado',
    emi: '0,7',
    placas_status: 'presentes',
    comum_vps: '72', comum_vdf: '18',
    interna_vps: '110', interna_vdf: '34',
    externa_vps: '86', externa_vdf: '12',
    vertebral_vps: '42', vertebral_direcao: 'anterogrado',
    placas_ids: ['p1', 'p2'],
    'placas.p1.localizacao': 'bulbo carotídeo',
    'placas.p1.composicao': 'mista',
    'placas.p1.superficie': 'irregular',
    'placas.p1.espessura': '2,4',
    'placas.p1.estenose': '35',
    'placas.p2.localizacao': 'carótida interna proximal',
    'placas.p2.composicao': 'calcificada',
    'placas.p2.superficie': 'regular',
    'placas.p2.espessura': '1,8',
    'placas.p2.estenose': '',
  },
  esquerda: {
    avaliacao: 'limitado',
    emi: '', placas_status: 'ausentes',
    comum_vps: '', comum_vdf: '', interna_vps: '', interna_vdf: '',
    externa_vps: '', externa_vdf: '', vertebral_vps: '', vertebral_direcao: 'retrogrado',
    placas_ids: [],
  },
  conclusao: {
    classificacao_direita: 'estenose_menor_50',
    classificacao_esquerda: '',
  },
}

const visual = carotidVisualFromState(state)
assert.equal(visual.sides.direita.imt, '0,7')
assert.equal(visual.sides.direita.measurements.find((item) => item.vessel === 'interna')?.psv, '110')
assert.equal(visual.sides.direita.plates.length, 2)
assert.equal(visual.sides.direita.plates[0]?.anchor, 'bulbo')
assert.equal(visual.sides.direita.plates[1]?.anchor, 'interna')
assert.equal(visual.sides.direita.plates[0]?.stenosis, '35')
assert.equal(visual.sides.direita.classification, 'estenose_menor_50')
assert.equal(visual.sides.esquerda.measurements.find((item) => item.vessel === 'vertebral')?.direction, 'retrogrado')
assert.equal(visual.sides.esquerda.classification, '', 'o mapa não pode inferir classificação')

const empty = carotidVisualFromState({})
assert.equal(empty.sides.direita.assessment, '')
assert.equal(empty.sides.direita.plates.length, 0)
assert.ok(empty.sides.direita.measurements.every((item) => !item.psv && !item.edv), 'estado vazio não pode ganhar medidas')
const unknownLocation = carotidVisualFromState({
  direita: { placas_ids: ['x'], 'placas.x.localizacao': 'segmento não especificado' },
})
assert.equal(unknownLocation.sides.direita.plates[0]?.anchor, 'unmapped', 'localização livre desconhecida não pode ser projetada no bulbo')

const repoRoot = process.cwd().endsWith('/apps/web') ? resolve(process.cwd(), '../..') : process.cwd()
const schema = readFileSync(resolve(repoRoot, 'apps/web/src/components/visualSchemas/CarotidSchema.tsx'), 'utf8')
assert.match(schema, /anchorIndex \* 14/, 'placas no mesmo segmento precisam ter rótulos empilhados sem sobreposição')
assert.match(schema, /role="group"/, 'os lados interativos precisam continuar expostos à tecnologia assistiva')
assert.match(schema, /event\.preventDefault\(\)/, 'a tecla espaço não pode rolar a página ao abrir um lado')
assert.match(schema, /plate\.anchor !== 'unmapped'/, 'a legenda só pode contar placas efetivamente projetadas')
const panel = readFileSync(resolve(repoRoot, 'apps/web/src/components/visualSchemas/VisualSchemaPanel.tsx'), 'utf8')
assert.match(panel, /category === 'CAROTID' \? 'CAROTIDAS'/, 'o mapa precisa ser enviado à Sala com tipo estável')
assert.match(panel, /<CarotidSchema/, 'o painel visual precisa montar o mapa carotídeo')
const proxy = readFileSync(resolve(repoRoot, 'apps/web/src/app/api/sala/schema/route.ts'), 'utf8')
assert.match(proxy, /'CAROTIDAS'/, 'o proxy precisa aceitar o mapa carotídeo')
const sala = readFileSync(resolve(repoRoot, 'apps/api/src/app/sala/[token]/page.tsx'), 'utf8')
assert.match(sala, /DOPPLER_CAROTIDAS: \["CAROTIDAS"\]/, 'a Sala precisa associar o mapa ao exame correto')

console.log('Carotid visual schema: projeção, ausência de inferência e envio aprovados')
