import assert from 'node:assert/strict'

import * as importedAdapter from './morfologicoParaCatalogo.ts'
import * as importedCategory from '../deterministic/organs/morfologico.ts'
import * as importedRenderer from '../../../../api/src/server/renderer/categories/MORFOLOGICO.ts'

const adapterModule = importedAdapter as typeof importedAdapter & { default?: typeof importedAdapter }
const categoryModule = importedCategory as typeof importedCategory & { default?: typeof importedCategory }
const rendererModule = importedRenderer as typeof importedRenderer & { default?: typeof importedRenderer }
const { adaptarMorfologico } = adapterModule.default ?? adapterModule
const { morfologico } = categoryModule.default ?? categoryModule
const { MorfologicoFindingsSchema, renderMorfologico } = rendererModule.default ?? rendererModule

const estado = {
  ig: { bio_sem: '12', bio_dias: '3' },
  primeiro_trimestre: {
    bcf: '158',
    ccn: '64,0',
    tn: '1,5',
    osso_nasal: 'presente',
    ducto_venoso: 'normal',
    placenta_loc: 'posterior',
  },
  doppler: {
    realizado: 'sim',
    'realizado.sim.ip_ut_dir': '1,20',
    'realizado.sim.ip_ut_esq': '1,40',
  },
}

const adaptado = adaptarMorfologico(estado, { trimestre: '1t' })
assert.deepEqual(adaptado.pendencias, [])
assert.equal(adaptado.dados.trimestre, '1t')
assert.equal(adaptado.dados.bcf_bpm, 158)
assert.equal(adaptado.dados.ccn_mm, 64)
assert.equal(adaptado.dados.tn_mm, 1.5)
assert.equal(adaptado.dados.osso_nasal, 'presente')
assert.equal(adaptado.dados.ducto_venoso, 'normal')
assert.equal(adaptado.dados.uterina_ip_direita, 1.2)
assert.equal(adaptado.dados.uterina_ip_esquerda, 1.4)
assert.equal(adaptado.dados.placenta_localizacao, 'posterior')

const secoes1t = morfologico.resolveSections?.({ trimestre: '1t' }) ?? []
assert.deepEqual(
  secoes1t.map((secao) => secao.id),
  ['ig', 'primeiro_trimestre', 'avaliacao_precoce', 'cervicometria', 'doppler', 'achados'],
)
assert.equal(morfologico.resolveTitle?.({ trimestre: '1t' }), 'ULTRASSONOGRAFIA MORFOLÓGICA DO PRIMEIRO TRIMESTRE')
assert.deepEqual(morfologico.resolveCalculators?.({ trimestre: '2t' }), [])
assert.equal(morfologico.resolveCalculators?.({ trimestre: '1t' })?.[0]?.id, 'pre-eclampsia-fmf')

const estadoInicial = Object.fromEntries(
  secoes1t.map((secao) => [secao.id, secao.module.initialState()]),
)
const inicialAdaptado = adaptarMorfologico(estadoInicial, { trimestre: '1t' })
assert.equal(inicialAdaptado.dados.osso_nasal, 'nao_avaliado')
assert.equal(inicialAdaptado.dados.regurgitacao_tricuspide, 'nao_avaliado')
assert.equal(inicialAdaptado.dados.ducto_venoso, 'nao_avaliado')
assert.equal(inicialAdaptado.dados.anatomia_avaliada, false)
assert.equal(inicialAdaptado.dados.apresentacao, null)
assert.equal(inicialAdaptado.dados.vitalidade, 'nao_avaliada')
assert.equal(inicialAdaptado.dados.movimentos_fetais, 'nao_avaliados')
assert.equal(inicialAdaptado.dados.liquido_avaliacao, 'nao_avaliado')
assert.equal(inicialAdaptado.dados.tn_classificacao, null)
assert.equal(inicialAdaptado.dados.anatomia_precoce, null)
assert.deepEqual(
  inicialAdaptado.pendencias.filter((p) => p.bloqueia).map((p) => p.onde),
  ['BCF', 'CCN', 'TN'],
)

for (const objetivo of [false, true]) {
  const texto = renderMorfologico(
    MorfologicoFindingsSchema.parse(inicialAdaptado.dados),
    null,
    { objetivo },
  )
  assert.match(texto, /Osso nasal não avaliado\./)
  assert.match(texto, /Regurgitação tricúspide não avaliada\./)
  assert.match(texto, /Ducto venoso não avaliado\./)
  assert.doesNotMatch(texto, /Presença de osso nasal|Osso nasal presente/)
  assert.doesNotMatch(texto, /Ausência de regurgitação tricúspide|Regurgitação tricúspide ausente/)
  assert.doesNotMatch(texto, /Doppler do ducto venoso normal|onda trifásica/)
  assert.doesNotMatch(texto, /Morfologia fetal normal/)
  assert.doesNotMatch(texto, /apresentação cefálica|Batimentos cardíacos presentes|movimentos fetais são ativos|Líquido amniótico de quantidade normal/i)
}

const avaliacaoBasal = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal',
    bcf: '156',
    movimentos: 'normais',
    liquido: 'normal',
  },
}, { trimestre: '1t' })
const textoBasal = renderMorfologico(MorfologicoFindingsSchema.parse(avaliacaoBasal.dados))
assert.match(textoBasal, /BCF = 156 bpm/)
assert.match(textoBasal, /movimentos fetais são ativos/i)
assert.match(textoBasal, /Líquido amniótico de quantidade normal/i)

const contraditorio = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'ausente',
    bcf: '156',
    movimentos: 'normais',
  },
}, { trimestre: '1t' })
assert.ok(contraditorio.pendencias.some((p) => p.bloqueia && p.onde === 'vitalidade'))
assert.ok(contraditorio.pendencias.some((p) => p.bloqueia && p.onde === 'movimentos'))

const numerosInvalidos = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    bcf: '156 bpm',
    ccn: '62x',
    tn: '1,6 mm',
  },
}, { trimestre: '1t' })
assert.deepEqual(
  numerosInvalidos.pendencias.filter((p) => p.bloqueia).map((p) => p.onde),
  ['BCF', 'CCN', 'TN'],
)
assert.equal(numerosInvalidos.dados.bcf_bpm, null)
assert.equal(numerosInvalidos.dados.ccn_mm, null)
assert.equal(numerosInvalidos.dados.tn_mm, null)

const limitacaoSemConclusao = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '156', ccn: '62', tn: '1,6',
  },
  achados: { texto: 'Avaliação da anatomia precoce limitada pelo biotipo materno.' },
}, { trimestre: '1t' })
assert.ok(limitacaoSemConclusao.pendencias.some((p) => p.bloqueia && p.onde === 'achados adicionais'))

const limitacaoCompleta = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '156', ccn: '62', tn: '1,6',
  },
  achados: {
    texto: 'Avaliação da anatomia precoce limitada pelo biotipo materno.',
    conclusao: 'Avaliação anatômica precoce limitada pelo biotipo materno',
    dispensar_conclusao: [],
  },
}, { trimestre: '1t' })
assert.equal(limitacaoCompleta.pendencias.some((p) => p.bloqueia), false)
const textoLimitado = renderMorfologico(MorfologicoFindingsSchema.parse(limitacaoCompleta.dados))
assert.match(textoLimitado, /Avaliação da anatomia precoce limitada pelo biotipo materno\./)
assert.match(textoLimitado.split('CONCLUSÃO:')[1] ?? '', /Avaliação anatômica precoce limitada pelo biotipo materno\./)
assert.doesNotMatch(textoLimitado, /Morfologia fetal normal/)

const datadoPeloCcn = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '1,6',
  },
}, { trimestre: '1t' })
assert.equal(datadoPeloCcn.dados.ig_semanas, 12)
assert.equal(datadoPeloCcn.dados.ig_dias, 4)
assert.match(renderMorfologico(MorfologicoFindingsSchema.parse(datadoPeloCcn.dados)), /Gestação em torno de 12 semanas e 4 dias/)

const foraDaJanela = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '92', tn: '2,0',
  },
}, { trimestre: '1t' })
assert.ok(foraDaJanela.pendencias.some((p) => !p.bloqueia && p.onde === 'CCN' && /45–84 mm/.test(p.motivo)))
assert.equal(foraDaJanela.dados.ig_semanas, 14)
assert.equal(foraDaJanela.dados.ig_dias, 4)

const tnAumentadaAutomatica = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '3,5',
  },
}, { trimestre: '1t' })
assert.equal(tnAumentadaAutomatica.dados.tn_classificacao, 'aumentada')
for (const objetivo of [false, true]) {
  const texto = renderMorfologico(MorfologicoFindingsSchema.parse(tnAumentadaAutomatica.dados), null, { objetivo })
  assert.match(texto, /Translucência nucal aumentada \(TN de 3,5 mm\)\./)
  assert.doesNotMatch(texto, /Morfologia fetal normal/)
}

const tnLimitrofe = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '2,8', tn_classificacao: 'limitrofe',
  },
}, { trimestre: '1t' })
assert.equal(tnLimitrofe.dados.tn_classificacao, 'limitrofe')
for (const objetivo of [false, true]) {
  const texto = renderMorfologico(MorfologicoFindingsSchema.parse(tnLimitrofe.dados), null, { objetivo })
  assert.match(texto, /Translucência nucal acima dos valores usuais para a idade gestacional\./)
  assert.match(texto, /reavaliar ultrassonograficamente no prazo de 01 semana, com objetivo de acompanhar a evolução\./)
  assert.doesNotMatch(texto, /Morfologia fetal normal/)
}

const estruturasPrecocesNormais = {
  'realizada.sim.cranio': 'normal',
  'realizada.sim.face': 'normal',
  'realizada.sim.coluna': 'normal',
  'realizada.sim.coracao': 'normal',
  'realizada.sim.parede_abdominal': 'normal',
  'realizada.sim.estomago_bexiga': 'normal',
  'realizada.sim.membros': 'normal',
}
const avaliacaoPrecoceNormal = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', movimentos: 'normais', ccn: '62', tn: '1,6',
    osso_nasal: 'presente', tricuspide: 'ausente', ducto_venoso: 'normal',
  },
  avaliacao_precoce: {
    ...estadoInicial.avaliacao_precoce,
    realizada: 'sim',
    'realizada.sim.dbp': '21,4',
    'realizada.sim.cc': '76',
    'realizada.sim.ca': '63,2',
    'realizada.sim.femur': '9',
    ...estruturasPrecocesNormais,
  },
}, { trimestre: '1t' })
assert.equal(avaliacaoPrecoceNormal.pendencias.some((p) => p.bloqueia), false)
assert.equal(avaliacaoPrecoceNormal.dados.anatomia_avaliada, true)
assert.equal(avaliacaoPrecoceNormal.dados.dbp_mm, 21.4)
assert.equal(avaliacaoPrecoceNormal.dados.ca_mm, 63.2)
for (const objetivo of [false, true]) {
  const texto = renderMorfologico(MorfologicoFindingsSchema.parse(avaliacaoPrecoceNormal.dados), null, { objetivo })
  assert.match(texto, /Biometria fetal precoce:/)
  assert.match(texto, /Diâmetro biparietal \(DBP\).*21,4 mm\./)
  assert.match(texto, /Avaliação anatômica precoce:/)
  assert.match(texto, /Parede abdominal íntegra/)
  assert.match(texto, /Morfologia fetal normal para esta fase da gestação\./)
}

const avaliacaoPrecoceParcial = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '1,6',
    osso_nasal: 'presente', tricuspide: 'ausente', ducto_venoso: 'normal',
  },
  avaliacao_precoce: {
    ...estadoInicial.avaliacao_precoce,
    realizada: 'sim',
    'realizada.sim.cranio': 'normal',
  },
}, { trimestre: '1t' })
assert.equal(avaliacaoPrecoceParcial.dados.anatomia_avaliada, false)
const textoPrecoceParcial = renderMorfologico(MorfologicoFindingsSchema.parse(avaliacaoPrecoceParcial.dados))
assert.match(textoPrecoceParcial, /Estruturas não avaliadas nesta etapa:/)
assert.doesNotMatch(textoPrecoceParcial, /Morfologia fetal normal/)

const avaliacaoPrecoceAlteradaIncompleta = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '1,6',
  },
  avaliacao_precoce: {
    ...estadoInicial.avaliacao_precoce,
    realizada: 'sim',
    'realizada.sim.coracao': 'alterada',
  },
}, { trimestre: '1t' })
assert.equal(avaliacaoPrecoceAlteradaIncompleta.pendencias.filter((p) => p.bloqueia && p.onde === 'anatomia precoce').length, 2)

const avaliacaoPrecoceAlterada = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '1,6',
  },
  avaliacao_precoce: {
    ...estadoInicial.avaliacao_precoce,
    realizada: 'sim',
    'realizada.sim.coracao': 'alterada',
    'realizada.sim.achado': 'imagem cardíaca de aspecto atípico',
    'realizada.sim.conclusao': 'alteração cardíaca fetal a esclarecer',
  },
}, { trimestre: '1t' })
assert.equal(avaliacaoPrecoceAlterada.pendencias.some((p) => p.bloqueia), false)
const textoPrecoceAlterado = renderMorfologico(MorfologicoFindingsSchema.parse(avaliacaoPrecoceAlterada.dados))
assert.match(textoPrecoceAlterado, /Imagem cardíaca de aspecto atípico\./)
assert.match(textoPrecoceAlterado.split('CONCLUSÃO:')[1] ?? '', /Alteração cardíaca fetal a esclarecer\./)
assert.doesNotMatch(textoPrecoceAlterado, /Morfologia fetal normal/)

const biometriaPrecoceInvalida = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '1,6',
  },
  avaliacao_precoce: {
    ...estadoInicial.avaliacao_precoce,
    realizada: 'sim',
    'realizada.sim.dbp': '21 mm',
    'realizada.sim.cranio': 'normal',
  },
}, { trimestre: '1t' })
assert.ok(biometriaPrecoceInvalida.pendencias.some((p) => p.bloqueia && p.onde === 'avaliação precoce · DBP'))
assert.equal(biometriaPrecoceInvalida.dados.dbp_mm, null)

const avaliacaoPrecoceLimitada = adaptarMorfologico({
  ...estadoInicial,
  primeiro_trimestre: {
    ...estadoInicial.primeiro_trimestre,
    vitalidade: 'normal', bcf: '150', ccn: '62', tn: '1,6',
  },
  avaliacao_precoce: {
    ...estadoInicial.avaliacao_precoce,
    realizada: 'sim',
    'realizada.sim.coracao': 'limitada',
    'realizada.sim.limitacao': 'posição fetal desfavorável',
  },
}, { trimestre: '1t' })
assert.equal(avaliacaoPrecoceLimitada.pendencias.some((p) => p.bloqueia), false)
const textoPrecoceLimitado = renderMorfologico(MorfologicoFindingsSchema.parse(avaliacaoPrecoceLimitada.dados))
assert.match(textoPrecoceLimitado, /Avaliação anatômica precoce limitada em coração por posição fetal desfavorável\./)
assert.doesNotMatch(textoPrecoceLimitado, /Morfologia fetal normal/)

const uterinasAltas = adaptarMorfologico({
  ...estadoInicial,
  ig: { bio_sem: '12', bio_dias: '4' },
  doppler: {
    realizado: 'sim',
    'realizado.sim.ip_ut_dir': '2,6',
    'realizado.sim.ip_ut_esq': '2,9',
  },
}, { trimestre: '1t' })
for (const objetivo of [false, true]) {
  const texto = renderMorfologico(
    MorfologicoFindingsSchema.parse(uterinasAltas.dados),
    null,
    { objetivo },
  )
  assert.equal((texto.match(/artéria uterina direita/gi) ?? []).length, 1)
  assert.equal((texto.match(/artéria uterina esquerda/gi) ?? []).length, 1)
  assert.match(texto, /IP médio das artérias uterinas acima do percentil 95/i)
  assert.doesNotMatch(texto, /Dopplervelocimetria normal das artérias uterinas/)
  assert.doesNotMatch(texto, /incisura|centralização/i)
}

console.log('✓ Morfológico 1º trimestre: tela → renderer e navegação aprovados')
