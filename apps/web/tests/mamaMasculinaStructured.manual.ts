import assert from 'node:assert/strict'
import { categoryDisplayLabel } from '@laudousg/shared'
import { CATEGORIES, GENERIC_CATEGORIES, composeReport, initialExamState, mamaria, type ExamState } from '../src/lib/deterministic'
import { mamaMasculina } from '../src/lib/deterministic/organs/mamaMasculina'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'
import { CATEGORY_GROUPS, groupCategories, matchesCategory } from '../src/components/laudar/categoryGroups'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}

const conclusao = (text: string) => text.split('CONCLUSÃO:\n')[1]?.split('\n\nBreast Imaging')[0] ?? ''
const achados = (text: string) => text.split('OS SEGUINTES ASPECTOS FORAM OBSERVADOS:\n\n')[1]?.split('\n\nCONCLUSÃO:')[0] ?? ''
const novo = (): ExamState => initialExamState(mamaMasculina)
const comBirads = (state: ExamState, birads: string) => { state.__opts = { ...state.__opts, birads } }

function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const report = composeReport(mamaMasculina, state)
  assert.equal(report.text, '', `laudo deveria estar bloqueado (${onde})`)
  assert.ok(report.pendencias.some((p) => p.onde === onde && motivo.test(p.motivo)), `sem pendência ${onde} ${motivo}: ${JSON.stringify(report.pendencias)}`)
}

/** Nódulo completo na mama esquerda, retroareolar. */
function noduloCompleto(state: ExamState) {
  Object.assign(state.mamas, {
    me_achado: 'nodulo',
    'me_achado.nodulo.medidas': '1,2 x 0,8 x 0,7',
    'me_achado.nodulo.margem': 'circunscrita',
    'me_achado.nodulo.local': 'retroareolar',
  })
}

test('seletor: Pequenas partes, rótulo humano, busca e caminho estruturado', () => {
  assert.ok(CATEGORIES.MAMA_MASCULINA)
  assert.ok(GENERIC_CATEGORIES.includes(mamaMasculina))
  assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes('MAMA_MASCULINA'))
  assert.equal(isWriterCategory('MAMA_MASCULINA'), false)
  assert.ok(CATEGORY_GROUPS.find((g) => g.id === 'pequenas_partes')?.categories.includes('MAMA_MASCULINA'))
  assert.equal(categoryDisplayLabel('MAMA_MASCULINA'), 'Mama masculina')
  const entry = groupCategories([{ id: 'MAMA_MASCULINA', name: 'Mama masculina' }]).flatMap((g) => g.entries)[0]!
  assert.equal(entry.name, 'Mama masculina')
  for (const termo of ['ginecomastia', 'mama masculina', 'retroareolar']) assert.ok(matchesCategory(entry, termo), termo)
})

test('reuso do contrato mamário: campos do nódulo/cisto vêm de mamaria.ts', () => {
  const campos = mamaMasculina.sections[0]!.module!.schema.fields
  const nodulo = campos.find((f) => f.key === 'md_achado')!.options!.find((o) => o.value === 'nodulo')!.subFields!
  const original = mamaria.sections[0]!.module!.schema.fields.find((f) => f.key === 'md_tipo')!.options!.find((o) => o.value === 'nodulo')!.subFields!
  for (const key of ['medidas', 'eco', 'forma', 'margem', 'orientacao', 'posterior', 'calc']) {
    assert.equal(nodulo.find((f) => f.key === key), original.find((f) => f.key === key), key)
  }
  assert.ok(!nodulo.some((f) => f.key === 'birads'), 'BI-RADS é do exame, não do nódulo')
})

test('modelo basal masculino: normal sem BI-RADS inventado nem rodapé', () => {
  const report = composeReport(mamaMasculina, novo())
  assert.deepEqual(report.pendencias, [])
  assert.match(report.text, /^ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES\n\nCOMENTÁRIOS:\nExame realizado com transdutor de 12 MHz, abrangendo a região retroareolar/)
  assert.match(achados(report.text), /Região retroareolar direita sem aumento do tecido fibroglandular\./)
  assert.match(achados(report.text), /Pele e tecido celular subcutâneo da mama esquerda com espessura e ecogenicidade preservadas\./)
  assert.match(achados(report.text), /Não há sinais evidentes de imagem nodular sólida, cística ou complexa\./)
  assert.equal(conclusao(report.text), '1. Mamas ecograficamente normais.\n2. Linfonodos axilares normais.')
  assert.doesNotMatch(report.text, /BI-RADS|____|pendente/)
})

test('normal com BI-RADS 1 escolhido pelo médico leva categoria e rodapé; só mamas ajusta título e técnica', () => {
  const state = novo()
  state.__opts = { ...state.__opts, birads: '1', escopo_exame: 'mamas' }
  const { text } = composeReport(mamaMasculina, state)
  assert.match(text, /^ULTRASSONOGRAFIA DAS MAMAS\n/)
  assert.doesNotMatch(text, /regiões axilares|Linfonodos axilares/)
  assert.equal(conclusao(text), '1. Mamas ecograficamente normais.\n2. Categoria BI-RADS® 1.')
  assert.match(text, /\n\nBreast Imaging Reporting and Data System do Colégio Americano de Radiologia \(BI-RADS®\)\.$/)
})

test('ginecomastia unilateral e bilateral, preservando lado e espessura', () => {
  const state = novo()
  Object.assign(state.mamas, { md_retroareolar: 'ginecomastia', 'md_retroareolar.ginecomastia.espessura': '1.8' })
  let { text } = composeReport(mamaMasculina, state)
  assert.match(achados(text), /Mama direita com aumento do tecido fibroglandular retroareolar, com espessura de 1,8 cm\./)
  assert.match(achados(text), /Região retroareolar esquerda sem aumento/)
  assert.equal(conclusao(text), '1. Ginecomastia à direita.\n2. Linfonodos axilares normais.')
  assert.doesNotMatch(achados(text), /ginecomastia/i)
  state.mamas.me_retroareolar = 'ginecomastia'
  text = composeReport(mamaMasculina, state).text
  assert.equal(conclusao(text), '1. Ginecomastia bilateral.\n2. Linfonodos axilares normais.')
})

test('alterado: nódulo com BI-RADS do médico, cisto, pele e axila alterada', () => {
  const state = novo()
  noduloCompleto(state)
  comBirads(state, '4A')
  Object.assign(state.mamas, {
    md_achado: 'cisto', 'md_achado.cisto.medidas': '0,6 x 0,4 x 0,4', 'md_achado.cisto.local': 'qsl',
    md_pele: 'espessamento', 'md_pele.espessamento.espessura': '0,4',
  })
  Object.assign(state.axilas, { axilas: 'alteradas', 'axilas.alteradas.lado': 'esquerda', 'axilas.alteradas.medidas': '1,8 x 0,9', 'axilas.alteradas.hilo': 'ausente' })
  const { text, pendencias } = composeReport(mamaMasculina, state)
  assert.deepEqual(pendencias, [])
  assert.match(achados(text), /Imagem anecoica na mama direita, com margem circunscrita, medindo 0,6 x 0,4 x 0,4 cm, situada no quadrante superolateral\./)
  assert.match(achados(text), /Imagem hipoecoica na mama esquerda, de forma oval, com margem circunscrita, maior eixo paralelo à pele, medindo 1,2 x 0,8 x 0,7 cm, situada na região retroareolar\./)
  assert.match(achados(text), /Linfonodo axilar de aspecto alterado à esquerda, o maior medindo 1,8 x 0,9 cm, sem hilo gorduroso identificável\./)
  assert.equal(conclusao(text), [
    '1. Cisto simples na mama direita, situado no quadrante superolateral.',
    '2. Imagem sólida na mama esquerda, situada na região retroareolar.',
    '3. Espessamento cutâneo na mama direita.',
    '4. Categoria BI-RADS® 4A.',
    '5. Linfonodo axilar de aspecto alterado à esquerda.',
  ].join('\n'))
  assert.doesNotMatch(text, /regulares/)
})

test('incompleto: nódulo sem medidas, margem, localização ou BI-RADS bloqueia o laudo', () => {
  const state = novo()
  state.mamas.me_achado = 'nodulo'
  bloqueado(state, 'Nódulo na mama esquerda', /três eixos/)
  bloqueado(state, 'Nódulo na mama esquerda', /margem/)
  bloqueado(state, 'Nódulo na mama esquerda', /localização/)
  bloqueado(state, 'BI-RADS', /nódulo sólido exige/)
  noduloCompleto(state)
  state.mamas['me_achado.nodulo.medidas'] = '1,2 x 0,8'
  bloqueado(state, 'Nódulo na mama esquerda', /inválidas/)
})

test('incompleto: BI-RADS incoerente, pele, cisto e axila sem dado essencial bloqueiam', () => {
  let state = novo()
  state.mamas.md_retroareolar = 'ginecomastia'
  comBirads(state, '1')
  bloqueado(state, 'BI-RADS', /incompatível/)
  state = novo()
  comBirads(state, '3')
  bloqueado(state, 'BI-RADS', /exige achado/)
  state = novo()
  state.mamas.md_pele = 'alteracao'
  bloqueado(state, 'Pele/subcutâneo da mama direita', /descreva/)
  state = novo()
  state.mamas.md_achado = 'cisto'
  state.mamas['md_achado.cisto.local'] = 'retroareolar'
  bloqueado(state, 'Cisto na mama direita', /três eixos/)
  state = novo()
  state.axilas.axilas = 'alteradas'
  bloqueado(state, 'Axilas', /lado/)
  bloqueado(state, 'Axilas', /hilo/)
})

test('reversão: voltar a "sem achados" descarta subcampos e reproduz o laudo normal', () => {
  const baseline = composeReport(mamaMasculina, novo()).text
  const state = novo()
  noduloCompleto(state)
  comBirads(state, '4A')
  Object.assign(state.mamas, { md_retroareolar: 'ginecomastia', md_pele: 'alteracao', 'md_pele.alteracao.desc': 'edema' })
  Object.assign(state.axilas, { axilas: 'alteradas', 'axilas.alteradas.lado': 'direita' })
  assert.notEqual(composeReport(mamaMasculina, state).text, baseline)
  Object.assign(state.mamas, { me_achado: 'nenhum', md_retroareolar: 'normal', md_pele: 'normal' })
  state.axilas.axilas = 'normais'
  comBirads(state, 'nao_informado')
  const revertido = composeReport(mamaMasculina, state)
  assert.deepEqual(revertido.pendencias, [])
  assert.equal(revertido.text, baseline)
})

console.log(`${cases} mama masculina structured web cases passed`)
