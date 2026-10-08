import assert from 'node:assert/strict'
import { applyCompanionBreast, applyCompanionCarotids, applyCompanionStructured, applyCompanionThyroid, companionConflictDisplay, markCompanionFieldTouched } from './companionStructured'
import { initialExamState } from './deterministic/compose'
import { dopplerObstetrico } from './deterministic/organs/dopplerObstetrico'
import { morfologico as morfologicoCategory } from './deterministic/organs/morfologico'
import { initialTireoideState } from './deterministic/organs/tireoide'

const obstetrica = applyCompanionStructured({}, {
  category: 'OBSTETRICA',
  data: {
    dbp: '8.2 cm', cc: '295 mm', weight: '1.250 g', percentile: 'P48',
    gestAgeBiometry: '32s4d', ipRightUterine: '0,72', ipLeftUterine: '0,68', ipUmbilical: '1,02',
  },
})
assert.deepEqual(obstetrica.biometria, { dbp: '82', cc: '295', peso: '1250' })
assert.deepEqual(obstetrica.ig, { bio_sem: '32', bio_dias: '4' })
assert.equal(obstetrica.crescimento_fetal?.avaliar, 'sim')
assert.equal(obstetrica.crescimento_fetal?.['avaliar.sim.percentil'], '48')
assert.equal(obstetrica.crescimento_fetal?.['avaliar.sim.fonte_outra'], 'informado pelo aparelho')
assert.equal(obstetrica.doppler, undefined)

const isolado = applyCompanionStructured({ __opts: { somente_doppler: 'sim' } }, {
  category: 'DOPPLER_OBSTETRICO',
  data: { dbp: '90', gestAgeLMP: '28w3d', irUmbilical: '0,58', ipUmbilical: '1,00' },
})
assert.equal(isolado.biometria, undefined)
assert.deepEqual(isolado.doppler, { ir_umb: '0,58', ip_umb: '1' })
assert.deepEqual(isolado.ig, { bio_sem: '28', bio_dias: '3' })

const combinado = applyCompanionStructured({}, {
  category: 'DOPPLER_OBSTETRICO',
  data: { dbp: '9 cm', weight: '2 kg', gestAge: '32s2d', ipUmbilical: '1,00', ila: '120 mm' },
})
assert.deepEqual(combinado.biometria, { dbp: '90', peso: '2000' })
assert.deepEqual(combinado.ig, { bio_sem: '32', bio_dias: '2' })
assert.deepEqual(combinado.liquido, { tipo: 'ila', 'tipo.ila.cm': '12' })
assert.equal(combinado.doppler.ip_umb, '1')

const morfologico = applyCompanionStructured({ extrafetal: { placenta_loc: 'posterior' } }, {
  category: 'MORFOLOGICO',
  data: {
    cf: '3.3 cm', cerebellum: '20 mm', ila: '120 mm', gender: 'feminino',
    gestAgeBiometry: '21+2', percentile: '52%',
  },
})
assert.equal(morfologico.biometria?.femur, '33')
assert.equal(morfologico.biometria?.cerebelo, '20')
assert.deepEqual(morfologico.extrafetal, { placenta_loc: 'posterior', ila: '12' })
assert.deepEqual(morfologico.ig, { bio_sem: '21', bio_dias: '2' })
assert.equal(morfologico.anatomia?.genitalia, 'feminina')
assert.equal(morfologico.crescimento_fetal?.['avaliar.sim.percentil'], '52')

const tireoide = applyCompanionThyroid(initialTireoideState(), {
  category: 'TIREOIDE',
  data: {
    thyroidRightLobe: { a: '4.2', b: '1.6', c: '1.8' },
    thyroidNodules: [{ lobe: 'lobo_direito', c1: '1.2', c2: '0.9', c3: '0.8', echogenicity: 'hipoecoica', margin: 'regular' }],
  },
})
assert.deepEqual(tireoide.lobo_direito, { a: '4.2', b: '1.6', c: '1.8', ecotextura: 'normal' })
assert.equal(tireoide.nodulos.length, 1)
assert.equal(tireoide.nodulos[0]?.ecogenicidade, 'hipoecoica')
assert.equal(tireoide.nodulos[0]?.margem, 'regular')

const tireoidePreservada = applyCompanionThyroid({
  ...tireoide,
  lobo_direito: { ...tireoide.lobo_direito, a: '4,5' },
}, {
  category: 'TIREOIDE',
  data: {
    thyroidRightLobe: { a: '4.8', b: '1.7' },
    thyroidNodules: [{ lobe: 'lobo_direito', c1: '1.2', c2: '0.9', c3: '0.8', echogenicity: 'hipoecoica', margin: 'irregular', shape: 'mais_larga_que_alta' }],
  },
})
assert.equal(tireoidePreservada.lobo_direito.a, '4,5')
assert.equal(tireoidePreservada.lobo_direito.b, '1.6')
assert.equal(tireoidePreservada.nodulos.length, 1)
assert.equal(tireoidePreservada.nodulos[0]?.forma, 'mais_larga_que_alta')
assert.equal(tireoidePreservada.nodulos[0]?.margem, 'regular')
assert.equal(tireoidePreservada.companionConflitos?.length, 3)

const mama = applyCompanionBreast({ mamas: { fundo: 'heterogeneo', achados_ids: [] } }, {
  category: 'MAMARIA',
  data: { breastFindings: [
    { side: 'direita', type: 'nodulo', c1: '1.2', c2: '0.9', c3: '0.8', margin: 'circunscrita' },
    { side: 'direita', type: 'cisto_simples', c1: '0.6', c2: '0.5', c3: '0.4' },
  ] },
})
assert.equal(mama.mamas?.achados_ids.length, 2)
const firstBreastId = mama.mamas?.achados_ids[0]
assert.equal(mama.mamas?.[`achados.${firstBreastId}.medidas`], '1.2 x 0.9 x 0.8')
assert.equal(mama.mamas?.[`achados.${firstBreastId}.margem`], 'circunscrita')

const mamaEnriquecida = applyCompanionBreast(mama, {
  category: 'MAMARIA',
  data: { breastFindings: [
    { side: 'direita', type: 'nodulo', c1: '1.2', c2: '0.9', c3: '0.8', margin: 'espiculada', shape: 'oval' },
  ] },
})
assert.equal(mamaEnriquecida.mamas?.achados_ids.length, 2)
assert.equal(mamaEnriquecida.mamas?.[`achados.${firstBreastId}.forma`], 'oval')
assert.equal(mamaEnriquecida.mamas?.[`achados.${firstBreastId}.margem`], 'circunscrita')
assert.equal(mamaEnriquecida.mamas?.companion_conflitos.length, 1)

const carotidas = applyCompanionCarotids({}, {
  category: 'DOPPLER_CAROTIDAS',
  data: {
    carotidMeasurements: [
      { side: 'direita', vessel: 'interna', psv: '82', vdf: '24', ir: '0.71' },
      { side: 'direita', vessel: 'externa', psv: '90', vdf: '18' },
      { side: 'esquerda', vessel: 'vertebral', psv: '41', flowDirection: 'anterogrado' },
    ],
    carotidPlaques: [{
      side: 'direita', location: 'bulbo carotídeo', composition: 'mista', surface: 'irregular',
      thickness: '2.1', stenosisPercent: '35', description: 'Placa no bulbo direito',
    }],
    carotidClassifications: [
      { side: 'direita', classification: 'estenose_menor_50' },
      { side: 'esquerda', classification: 'normal' },
    ],
    carotidConclusion: 'Estenose inferior a 50% à direita',
    carotidAdditionalFindings: 'Sem outros achados relevantes',
  },
})
assert.equal(carotidas.direita?.interna_vps, '82')
assert.equal(carotidas.direita?.externa_vdf, '18')
assert.equal(carotidas.esquerda?.vertebral_direcao, 'anterogrado')
assert.equal(carotidas.direita?.placas_ids.length, 1)
assert.equal(carotidas.direita?.placas_status, 'presentes')
const firstCarotidPlaqueId = carotidas.direita?.placas_ids[0]
assert.equal(carotidas.direita?.[`placas.${firstCarotidPlaqueId}.composicao`], 'mista')
assert.equal(carotidas.direita?.[`placas.${firstCarotidPlaqueId}.superficie`], 'irregular')
assert.equal(carotidas.direita?.[`placas.${firstCarotidPlaqueId}.descricao`], 'Placa no bulbo direito')
assert.equal(carotidas.conclusao?.classificacao_direita, 'estenose_menor_50')
assert.equal(carotidas.conclusao?.classificacao_esquerda, 'normal')
assert.equal(carotidas.conclusao?.conclusao_livre, 'Estenose inferior a 50% à direita')
assert.equal(carotidas.conclusao?.achados_adicionais, 'Sem outros achados relevantes')

const carotidasComConflito = applyCompanionCarotids({}, {
  category: 'DOPPLER_CAROTIDAS',
  data: { carotidMeasurements: [
    { side: 'direita', vessel: 'interna', psv: '82' },
    { side: 'direita', vessel: 'interna', psv: '120' },
  ] },
})
assert.equal(carotidasComConflito.direita?.interna_vps, undefined)
assert.equal(carotidasComConflito.direita?.companion_conflitos.length, 1)

const carotidasPreservadas = applyCompanionCarotids({ direita: { interna_vps: '80' } }, {
  category: 'DOPPLER_CAROTIDAS',
  data: { carotidMeasurements: [{ side: 'direita', vessel: 'interna', psv: '82', vdf: '24' }] },
})
assert.equal(carotidasPreservadas.direita?.interna_vps, '80')
assert.equal(carotidasPreservadas.direita?.interna_vdf, undefined, 'PSV/VDF do mesmo ditado são aplicadas como par atômico')
assert.equal(carotidasPreservadas.direita?.companion_conflitos.length, 2)
assert.match(String(carotidasPreservadas.direita?.companion_conflitos[1]), /VDF.*não aplicado/)

const carotidasSemSobrescrever = applyCompanionCarotids({
  direita: { placas_status: 'ausentes', placas_ids: [] },
  conclusao: { classificacao_direita: 'normal', conclusao_livre: 'Conclusão revisada pelo médico' },
}, {
  category: 'DOPPLER_CAROTIDAS',
  data: {
    carotidPlaques: [{ side: 'direita', location: 'bulbo', thickness: '2,4' }],
    carotidClassifications: [{ side: 'direita', classification: 'estenose_50_69' }],
    carotidConclusion: 'Estenose de 50 a 69% à direita',
  },
})
assert.equal(carotidasSemSobrescrever.direita?.placas_status, 'ausentes')
assert.equal(carotidasSemSobrescrever.direita?.placas_ids.length, 1, 'a placa recebida fica preservada para revisão sem trocar o status manual')
assert.equal(carotidasSemSobrescrever.direita?.companion_conflitos.length, 1)
assert.equal(carotidasSemSobrescrever.conclusao?.classificacao_direita, 'normal')
assert.equal(carotidasSemSobrescrever.conclusao?.conclusao_livre, 'Conclusão revisada pelo médico')
assert.equal(carotidasSemSobrescrever.conclusao?.companion_conflitos.length, 2)

const carotidasEnriquecidas = applyCompanionCarotids({
  direita: {
    placas_status: 'presentes', placas_ids: ['placa-1'],
    'placas.placa-1.localizacao': 'bulbo', 'placas.placa-1.espessura': '2,4',
    'placas.placa-1.estenose': '35', 'placas.placa-1.superficie': 'regular',
  },
}, {
  category: 'DOPPLER_CAROTIDAS',
  data: { carotidPlaques: [{
    side: 'direita', location: 'bulbo', composition: 'mista', surface: 'irregular',
    thickness: '2.4', stenosisPercent: '35',
  }] },
})
assert.deepEqual(carotidasEnriquecidas.direita?.placas_ids, ['placa-1'])
assert.equal(carotidasEnriquecidas.direita?.['placas.placa-1.composicao'], 'mista')
assert.equal(carotidasEnriquecidas.direita?.['placas.placa-1.superficie'], 'regular')
assert.equal(carotidasEnriquecidas.direita?.companion_conflitos.length, 1)

const duasPlacasIguais = applyCompanionCarotids({}, {
  category: 'DOPPLER_CAROTIDAS',
  data: { carotidPlaques: [
    { side: 'direita', location: 'bulbo', composition: 'calcificada' },
    { side: 'direita', location: 'bulbo', composition: 'calcificada' },
  ] },
})
assert.equal(duasPlacasIguais.direita?.placas_ids.length, 2, 'itens repetidos no mesmo ditado preservam a quantidade')

const placaParcialEnriquecida = applyCompanionCarotids({
  direita: {
    placas_status: 'presentes', placas_ids: ['placa-parcial'],
    'placas.placa-parcial.localizacao': 'bulbo', 'placas.placa-parcial.espessura': '2,4',
    'placas.placa-parcial.estenose': '35',
  },
}, {
  category: 'DOPPLER_CAROTIDAS',
  data: { carotidPlaques: [{ side: 'direita', location: 'bulbo', thickness: '2.4' }] },
})
assert.deepEqual(placaParcialEnriquecida.direita?.placas_ids, ['placa-parcial'], 'ditado parcial casa com a placa existente sem duplicar')

const obstetricaPreservada = applyCompanionStructured({
  biometria: { dbp: '80', cc: '' },
  ig: { bio_sem: '31', bio_dias: '2' },
  crescimento_fetal: {
    avaliar: 'sim',
    'avaliar.sim.percentil': '40',
    'avaliar.sim.fonte': 'Hadlock 1991',
    'avaliar.sim.fonte_outra': '',
  },
  doppler: {
    realizado: 'nao',
    'realizado.sim.ip_ut_dir': '0,80',
    'realizado.sim.ip_ut_esq': '',
    'realizado.sim.ip_ut_medio': '',
  },
}, {
  category: 'MORFOLOGICO',
  data: {
    dbp: '82', cc: '295', gestAgeBiometry: '32s4d', percentile: '48',
    ipRightUterine: '0,72', ipLeftUterine: '0,68',
  },
})
assert.equal(obstetricaPreservada.biometria?.dbp, '80')
assert.equal(obstetricaPreservada.biometria?.cc, '295')
assert.equal(obstetricaPreservada.biometria?.companion_conflitos.length, 1)
assert.deepEqual(
  { sem: obstetricaPreservada.ig?.bio_sem, dias: obstetricaPreservada.ig?.bio_dias },
  { sem: '31', dias: '2' },
)
assert.equal(obstetricaPreservada.ig?.companion_conflitos.length, 2)
assert.equal(obstetricaPreservada.crescimento_fetal?.['avaliar.sim.percentil'], '40')
assert.equal(obstetricaPreservada.crescimento_fetal?.['avaliar.sim.fonte'], 'Hadlock 1991')
assert.equal(obstetricaPreservada.crescimento_fetal?.companion_conflitos.length, 1)
assert.equal(obstetricaPreservada.doppler?.realizado, 'sim')
assert.equal(obstetricaPreservada.doppler?.['realizado.sim.ip_ut_dir'], '0,80')
assert.equal(obstetricaPreservada.doppler?.['realizado.sim.ip_ut_esq'], '0,68')
assert.equal(obstetricaPreservada.doppler?.['realizado.sim.ip_ut_medio'], '')
assert.equal(obstetricaPreservada.doppler?.companion_conflitos.length, 1)

const obstetricaReaplicada = applyCompanionStructured(obstetricaPreservada, {
  category: 'MORFOLOGICO',
  data: {
    dbp: '82', cc: '295', gestAgeBiometry: '32s4d', percentile: '48',
    ipRightUterine: '0,72', ipLeftUterine: '0,68',
  },
})
assert.deepEqual(obstetricaReaplicada, obstetricaPreservada)

const biometriaEditada = markCompanionFieldTouched(obstetricaPreservada.biometria!, 'dbp', '82')
assert.equal(biometriaEditada.companion_conflitos, undefined)
assert.equal(biometriaEditada.__companion_touched?.includes('dbp'), true)
const biometriaConflitoResolvido = applyCompanionStructured({ ...obstetricaPreservada, biometria: biometriaEditada }, {
  category: 'MORFOLOGICO',
  data: { dbp: '82' },
})
assert.equal(biometriaConflitoResolvido.biometria?.companion_conflitos, undefined)

const percentilIgualAtivaSemTrocarFonte = applyCompanionStructured({
  crescimento_fetal: {
    avaliar: 'nao',
    'avaliar.sim.percentil': '48',
    'avaliar.sim.fonte': 'Hadlock 1991',
    'avaliar.sim.fonte_outra': '',
  },
}, {
  category: 'OBSTETRICA',
  data: { percentile: '48' },
})
assert.equal(percentilIgualAtivaSemTrocarFonte.crescimento_fetal?.avaliar, 'sim')
assert.equal(percentilIgualAtivaSemTrocarFonte.crescimento_fetal?.['avaliar.sim.fonte'], 'Hadlock 1991')
assert.equal(percentilIgualAtivaSemTrocarFonte.crescimento_fetal?.['avaliar.sim.fonte_outra'], '')

const percentilNovoPreservaFonteManual = applyCompanionStructured({
  crescimento_fetal: {
    avaliar: 'sim',
    'avaliar.sim.percentil': '',
    'avaliar.sim.fonte': 'Intergrowth-21st',
    'avaliar.sim.fonte_outra': '',
  },
}, {
  category: 'OBSTETRICA',
  data: { percentile: '48' },
})
assert.equal(percentilNovoPreservaFonteManual.crescimento_fetal?.['avaliar.sim.percentil'], '48')
assert.equal(percentilNovoPreservaFonteManual.crescimento_fetal?.['avaliar.sim.fonte'], 'Intergrowth-21st')
assert.equal(percentilNovoPreservaFonteManual.crescimento_fetal?.['avaliar.sim.fonte_outra'], '')

const biometriaNumericamenteIgual = applyCompanionStructured({ biometria: { dbp: '82,0' } }, {
  category: 'OBSTETRICA',
  data: { dbp: '8.2 cm' },
})
assert.equal(biometriaNumericamenteIgual.biometria?.dbp, '82,0')
assert.equal(biometriaNumericamenteIgual.biometria?.companion_conflitos, undefined)

const igAtomicaComConflito = applyCompanionStructured({ ig: { bio_sem: '31', bio_dias: '' } }, {
  category: 'OBSTETRICA',
  data: { gestAgeBiometry: '32s4d' },
})
assert.equal(igAtomicaComConflito.ig?.bio_sem, '31')
assert.equal(igAtomicaComConflito.ig?.bio_dias, '')
assert.equal(igAtomicaComConflito.ig?.companion_conflitos.length, 1)

const igCompletaDiaVazio = applyCompanionStructured({ ig: { bio_sem: '31', bio_dias: '' } }, {
  category: 'OBSTETRICA',
  data: { gestAgeBiometry: '31s4d' },
})
assert.equal(igCompletaDiaVazio.ig?.bio_sem, '31')
assert.equal(igCompletaDiaVazio.ig?.bio_dias, '4')

const morfologicoInicial = initialExamState(morfologicoCategory)
const sexoAplicado = applyCompanionStructured(morfologicoInicial, {
  category: 'MORFOLOGICO',
  data: { gender: 'feminino' },
})
assert.equal(sexoAplicado.anatomia?.genitalia, 'feminina')
assert.equal(sexoAplicado.anatomia?.companion_conflitos, undefined)
const sexoPreservado = applyCompanionStructured({ ...morfologicoInicial, anatomia: { ...morfologicoInicial.anatomia, genitalia: 'masculina' } }, {
  category: 'MORFOLOGICO',
  data: { gender: 'feminino' },
})
assert.equal(sexoPreservado.anatomia?.genitalia, 'masculina')
assert.equal(sexoPreservado.anatomia?.companion_conflitos.length, 1)
assert.match(companionConflictDisplay(String(sexoPreservado.anatomia?.companion_conflitos[0])), /^Genitália:/)
const sexoNaoAvaliadoEscolhido = applyCompanionStructured({
  ...morfologicoInicial,
  anatomia: markCompanionFieldTouched(morfologicoInicial.anatomia!, 'genitalia', 'na'),
}, {
  category: 'MORFOLOGICO',
  data: { gender: 'feminino' },
})
assert.equal(sexoNaoAvaliadoEscolhido.anatomia?.genitalia, 'na')
assert.equal(sexoNaoAvaliadoEscolhido.anatomia?.companion_conflitos.length, 1)

const dopplerInicial = initialExamState(dopplerObstetrico)
const ilaAplicado = applyCompanionStructured(dopplerInicial, {
  category: 'DOPPLER_OBSTETRICO',
  data: { ila: '120 mm' },
})
assert.equal(ilaAplicado.liquido?.tipo, 'ila')
assert.equal(ilaAplicado.liquido?.['tipo.ila.cm'], '12')
assert.equal(ilaAplicado.liquido?.companion_conflitos, undefined)
const mbvPreservado = applyCompanionStructured({
  ...dopplerInicial,
  liquido: { tipo: 'mbv', 'tipo.mbv.cm': '5,6' },
}, {
  category: 'DOPPLER_OBSTETRICO',
  data: { ila: '120 mm' },
})
assert.equal(mbvPreservado.liquido?.tipo, 'mbv')
assert.equal(mbvPreservado.liquido?.['tipo.mbv.cm'], '5,6')
assert.equal(mbvPreservado.liquido?.['tipo.ila.cm'], undefined)
assert.equal(mbvPreservado.liquido?.companion_conflitos.length, 1)
const subjetivoEscolhido = applyCompanionStructured({
  ...dopplerInicial,
  liquido: markCompanionFieldTouched(dopplerInicial.liquido!, 'tipo', 'subjetivo'),
}, {
  category: 'DOPPLER_OBSTETRICO',
  data: { ila: '120 mm' },
})
assert.equal(subjetivoEscolhido.liquido?.tipo, 'subjetivo')
assert.equal(subjetivoEscolhido.liquido?.['tipo.ila.cm'], undefined)
assert.equal(subjetivoEscolhido.liquido?.companion_conflitos.length, 1)

const dopplerTodoConflitante = applyCompanionStructured({
  doppler: { realizado: 'nao', 'realizado.sim.ip_ut_dir': '0,80' },
}, {
  category: 'MORFOLOGICO',
  data: { ipRightUterine: '0,72' },
})
assert.equal(dopplerTodoConflitante.doppler?.realizado, 'nao')
assert.equal(dopplerTodoConflitante.doppler?.['realizado.sim.ip_ut_dir'], '0,80')
assert.equal(dopplerTodoConflitante.doppler?.companion_conflitos.length, 1)
const dopplerRecusadoExplicitamente = applyCompanionStructured({
  doppler: markCompanionFieldTouched({ realizado: 'nao', 'realizado.sim.ip_ut_dir': '' }, 'realizado', 'nao'),
}, {
  category: 'MORFOLOGICO',
  data: { ipRightUterine: '0,72' },
})
assert.equal(dopplerRecusadoExplicitamente.doppler?.realizado, 'nao')
assert.equal(dopplerRecusadoExplicitamente.doppler?.['realizado.sim.ip_ut_dir'], '')
assert.equal(dopplerRecusadoExplicitamente.doppler?.companion_conflitos.length, 1)

const crescimentoRecusadoExplicitamente = applyCompanionStructured({
  crescimento_fetal: markCompanionFieldTouched({
    avaliar: 'nao', 'avaliar.sim.percentil': '', 'avaliar.sim.fonte': 'nao_informada',
  }, 'avaliar', 'nao'),
}, {
  category: 'OBSTETRICA',
  data: { percentile: '48' },
})
assert.equal(crescimentoRecusadoExplicitamente.crescimento_fetal?.avaliar, 'nao')
assert.equal(crescimentoRecusadoExplicitamente.crescimento_fetal?.['avaliar.sim.percentil'], '')
assert.equal(crescimentoRecusadoExplicitamente.crescimento_fetal?.companion_conflitos.length, 1)

console.log('companionStructured: ok')
