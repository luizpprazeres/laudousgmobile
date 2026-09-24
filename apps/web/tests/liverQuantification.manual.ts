import { buildLiverQuantificationBlock } from '../src/lib/deterministic/liverQuantification.ts'
import type { OrganState } from '../src/lib/deterministic/types.ts'

let pass = 0
let fail = 0
const check = (name: string, condition: boolean) => condition ? (pass++, console.log(`✓ ${name}`)) : (fail++, console.error(`✗ ${name}`))
const base = (): OrganState => ({})

check('tudo desligado não produz texto', buildLiverQuantificationBlock(base()).text === '')
check('elastografia sem modalidade não produz texto', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim' }).text === '')
check('rigidez negativa não produz resultado', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: '2d-swe', rigidezUnidade: 'kPa', rigidezMediana: '-8' }).text === '')
check('rigidez não numérica não produz resultado', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: '2d-swe', rigidezUnidade: 'kPa', rigidezMediana: 'abc' }).text === '')
check('transitória em m/s é incoerente sem conversão', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: 'te', rigidezUnidade: 'm/s', rigidezMediana: '1.2' }).text === '')
const stiffness = buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: '2d-swe', rigidezUnidade: 'kPa', rigidezMediana: '8', rigidezIqr: '1.6', rigidezNumeroMedicoes: '5', rigidezQualidade: 'adequada' })
check('rigidez válida preserva unidade e calcula apenas IQR/mediana', stiffness.text.includes('8 kPa') && stiffness.text.includes('1.6 kPa') && stiffness.text.includes('20.0%') && !stiffness.text.includes('fibrose'))
check('unidade m/s é preservada sem conversão', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: 'pswe', rigidezUnidade: 'm/s', rigidezMediana: '1.4' }).text.includes('1.4 m/s'))
check('IQR negativo não produz resultado residual', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: '2d-swe', rigidezUnidade: 'kPa', rigidezMediana: '8', rigidezIqr: '-1' }).text === '')
check('IQR zero é válido', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: '2d-swe', rigidezUnidade: 'kPa', rigidezMediana: '8', rigidezIqr: '0' }).text.includes('0.0%'))
check('mediana vazia reporta pendência', buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: '2d-swe', rigidezUnidade: 'kPa' }).text === '' && buildLiverQuantificationBlock({ elastografiaAtiva: 'sim', elastografiaModalidade: '2d-swe', rigidezUnidade: 'kPa' }).errors.some((error) => error.includes('Mediana')))
check('CAP exige dB/m', buildLiverQuantificationBlock({ gorduraAtiva: 'sim', gorduraMetodo: 'cap', gorduraUnidade: 'dB/m', gorduraValor: '250' }).text.includes('CAP') && buildLiverQuantificationBlock({ gorduraAtiva: 'sim', gorduraMetodo: 'cap', gorduraUnidade: 'dB/cm/MHz', gorduraValor: '250' }).text === '')
check('atenuação exige dB/cm/MHz', buildLiverQuantificationBlock({ gorduraAtiva: 'sim', gorduraMetodo: 'attenuation', gorduraUnidade: 'dB/cm/MHz', gorduraValor: '0.7' }).text.includes('0.7 dB/cm/MHz'))
check('gordura negativa não produz resultado', buildLiverQuantificationBlock({ gorduraAtiva: 'sim', gorduraMetodo: 'cap', gorduraUnidade: 'dB/m', gorduraValor: '-10' }).text === '')
check('não realizável com valor não produz medida válida', buildLiverQuantificationBlock({ gorduraAtiva: 'sim', gorduraMetodo: 'cap', gorduraUnidade: 'dB/m', gorduraValor: '250', gorduraQualidade: 'nao-realizavel' }).text === '')
const fraction = { gorduraAtiva: 'sim', gorduraMetodo: 'fraction', gorduraUnidade: '%', gorduraValor: '20', gorduraEquipamento: 'Equipamento X', gorduraTecnologia: 'USFF' }
check('fração exige equipamento/tecnologia e respeita0-100', buildLiverQuantificationBlock(fraction).text.includes('20 %') && buildLiverQuantificationBlock({ ...fraction, gorduraValor: '101' }).text === '' && buildLiverQuantificationBlock({ ...fraction, gorduraTecnologia: '' }).text === '')
check('zero percentual informado é preservado', buildLiverQuantificationBlock({ ...fraction, gorduraValor: '0' }).text.includes('0 %'))
check('CAP e atenuação nunca aceitam porcentagem', ['cap','attenuation'].every(gorduraMetodo => buildLiverQuantificationBlock({ ...fraction, gorduraMetodo }).text === ''))
check('elastografia não realizável bloqueia medida', buildLiverQuantificationBlock({ elastografiaAtiva:'sim', elastografiaModalidade:'2d-swe', rigidezUnidade:'kPa', rigidezMediana:'8', rigidezQualidade:'nao-realizavel' }).text === '')
check('erro em uma modalidade bloqueia resultado parcial', buildLiverQuantificationBlock({ ...fraction, gorduraValor:'inválido', elastografiaAtiva:'sim', elastografiaModalidade:'2d-swe', rigidezUnidade:'kPa', rigidezMediana:'8' }).text === '')
check('texto parcialmente numérico não é aceito', buildLiverQuantificationBlock({ ...fraction, gorduraValor:'20abc' }).errors.length > 0)

check('não classifica automaticamente nem recomenda conduta', !stiffness.text.includes('normal') && !stiffness.text.includes('recomend') && !buildLiverQuantificationBlock({ gorduraAtiva: 'sim', gorduraMetodo: 'cap', gorduraUnidade: 'dB/m', gorduraValor: '250' }).text.includes('%'))

if (fail) process.exitCode = 1
console.log(`${pass} passed, ${fail} failed`)
