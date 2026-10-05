import assert from 'node:assert/strict'
import { composeReport, initialExamState } from '../src/lib/deterministic/compose'
import { GENERIC_CATEGORIES } from '../src/lib/deterministic'
import { prostataTransretal } from '../src/lib/deterministic/organs/prostataTransretal'
import { paratireoide } from '../src/lib/deterministic/organs/paratireoide'
import { glandulasSalivares } from '../src/lib/deterministic/organs/glandulasSalivares'
import { pendenciasLocais } from '../src/lib/deterministic/organs/pendenciasLocais'
import { lerEixos, lerMedida } from '../src/lib/deterministic/organs/medidasLocais'
import { STRUCTURED_WEB_CATEGORY_CODES, isWriterCategory } from '../src/lib/writerCategories'
import { categoriaMigrada } from '../src/lib/catalog/migradas'

let cases = 0
function test(name: string, run: () => void) {
  run()
  cases++
  console.log(`ok ${cases} - ${name}`)
}

/** Nenhum identificador cru (snake_case ou CAIXA_ALTA) vaza para o laudo. */
function semIdentificadorCru(text: string) {
  assert.doesNotMatch(text, /\b[a-z]+_[a-z_]+\b/, 'identificador snake_case no laudo')
  assert.doesNotMatch(text, /\b[A-Z]+_[A-Z_]+\b/, 'código de categoria no laudo')
  assert.doesNotMatch(text, /undefined|null|NaN|\[object/, 'valor cru no laudo')
}

const CODES = ['PROSTATA_TRANSRETAL', 'PARATIREOIDE', 'GLANDULAS_SALIVARES']

test('as três categorias estão registradas como estruturadas e compõem localmente', () => {
  for (const code of CODES) {
    assert.ok(GENERIC_CATEGORIES.some((c) => c.id === code), `${code} fora do registro`)
    assert.ok((STRUCTURED_WEB_CATEGORY_CODES as readonly string[]).includes(code))
    assert.equal(isWriterCategory(code), false)
    assert.equal(categoriaMigrada(code), false)
  }
})

test('leitura estrita de medidas: unidade, eixos e formato inválido', () => {
  assert.equal(lerMedida('8 mm', 'cm'), 0.8)
  assert.equal(lerMedida('4,2', 'cm'), 4.2)
  assert.equal(lerMedida('', 'cm'), null)
  assert.equal(lerMedida('4,2 cm aprox', 'cm'), 'invalida')
  assert.deepEqual(lerEixos('1,0 x 0,6 x 0,5', 3, 'cm'), [1, 0.6, 0.5])
  assert.deepEqual(lerEixos('12 x 9 x 8 mm', 3, 'cm'), [1.2, 0.9, 0.8])
  assert.equal(lerEixos('1,0 x 0,6', 3, 'cm'), 'invalida')
})

// ── Próstata transretal ──────────────────────────────────────────────────────
test('próstata transretal normal: modelo coerente, volume e peso calculados', () => {
  const state = initialExamState(prostataTransretal)
  state.prostata = { ...state.prostata, d1: '4,2', d2: '3,0', d3: '3,8' }
  const { text } = composeReport(prostataTransretal, state)
  assert.match(text, /^ULTRASSONOGRAFIA DA PRÓSTATA \(TRANSRETAL\)/)
  assert.match(text, /transdutor endocavitário/)
  assert.match(text, /Próstata medindo 4,2 x 3,0 x 3,8 cm, de contornos regulares e ecotextura homogênea/)
  assert.match(text, /1\. Bexiga ecograficamente normal\./)
  assert.match(text, /2\. Próstata de dimensões normais \(volume estimado de 25,1 cm³ e peso aproximado de 26,3 gramas\)\./)
  assert.match(text, /3\. Vesículas seminais ecograficamente normais\./)
  assert.doesNotMatch(text, /hiperplasia|PSA|transabdominal/i)
  assert.deepEqual(pendenciasLocais('PROSTATA_TRANSRETAL', state), [])
  semIdentificadorCru(text)
})

test('próstata transretal alterada: HPB explícita, IPP, resíduo, calcificação e lesão lateralizada', () => {
  const state = initialExamState(prostataTransretal)
  state.bexiga = { ...state.bexiga, residuo: '65' }
  state.prostata = {
    ...state.prostata, d1: '5,5', d2: '4,6', d3: '5,2', padrao: 'hpb', 'padrao.hpb.ipp': '8 mm',
    achados: ['calcificacoes'], 'achados.calcificacoes.local': 'capsula',
  }
  state.zona_periferica = {
    ...state.zona_periferica, lesao: 'presente', 'lesao.presente.lado': 'esquerda',
    'lesao.presente.medidas': '1,1 x 0,8 x 0,9', 'lesao.presente.contornos': 'irregulares', 'lesao.presente.doppler': 'aumentado',
  }
  const { text } = composeReport(prostataTransretal, state)
  assert.match(text, /Resíduo pós-miccional de 65 mL\./)
  assert.doesNotMatch(text, /resíduo.*elevado/i)
  assert.match(text, /aumento volumétrico da zona de transição/)
  assert.match(text, /Hiperplasia prostática benigna \(volume estimado de 68,8 cm³ e peso aproximado de 72,3 gramas\)\./)
  assert.match(text, /Índice de protrusão prostática \(IPP\) de 0,8 cm, grau 2\./)
  assert.match(text, /Calcificações na região da cápsula cirúrgica\./)
  assert.match(text, /Imagem hipoecoica na zona periférica, à esquerda, no terço médio, medindo 1,1 x 0,8 x 0,9 cm, de contornos irregulares\./)
  assert.match(text, /Imagem hipoecoica na zona periférica esquerda, a esclarecer\. Convém, a critério clínico, correlacionar com a dosagem de PSA/)
  assert.deepEqual(pendenciasLocais('PROSTATA_TRANSRETAL', state), [])
  semIdentificadorCru(text)
})

test('próstata transretal bloqueia inferência sem dados essenciais', () => {
  const state = initialExamState(prostataTransretal)
  state.prostata = { ...state.prostata, padrao: 'hpb' }
  state.zona_periferica = { ...state.zona_periferica, lesao: 'presente' }
  const { text } = composeReport(prostataTransretal, state)
  assert.doesNotMatch(text, /Hiperplasia prostática benigna/)
  assert.doesNotMatch(text, /zona periférica (direita|esquerda)/)
  assert.match(text, /dados pendentes/)
  const issues = pendenciasLocais('PROSTATA_TRANSRETAL', state)
  assert.ok(issues.some((i) => /exige as três medidas/.test(i)))
  assert.ok(issues.some((i) => /lado/.test(i)))
  assert.ok(issues.some((i) => /três medidas da imagem/.test(i)))
})

test('próstata transretal: bexiga não avaliada sai do laudo; volume não deduz HPB', () => {
  const state = initialExamState(prostataTransretal)
  state.bexiga = { ...state.bexiga, estado: 'nao_avaliada' }
  state.prostata = { ...state.prostata, d1: '6,0', d2: '5,0', d3: '5,0' }
  const { text } = composeReport(prostataTransretal, state)
  assert.doesNotMatch(text, /Bexiga/)
  assert.doesNotMatch(text, /hiperplasia|aumentad/i)
})

// ── Paratireoide ─────────────────────────────────────────────────────────────
test('paratireoide normal', () => {
  const state = initialExamState(paratireoide)
  const { text } = composeReport(paratireoide, state)
  assert.match(text, /^ULTRASSONOGRAFIA DAS GLÂNDULAS PARATIREOIDES/)
  assert.match(text, /Tireoide de dimensões, ecogenicidade e ecotextura normais\./)
  assert.match(text, /Não se identificam imagens nodulares nas lojas paratireoidianas habituais/)
  assert.match(text, /Lojas paratireoidianas sem imagens nodulares identificáveis ao método\./)
  assert.doesNotMatch(text, /adenoma/i)
  assert.deepEqual(pendenciasLocais('PARATIREOIDE', state), [])
  semIdentificadorCru(text)
})

test('paratireoide alterada: imagem única com lado e medidas → adenoma provável', () => {
  const state = initialExamState(paratireoide)
  state.lojas = { ...state.lojas, imagem_1: 'presente', 'imagem_1.presente.lado': 'direito', 'imagem_1.presente.medidas': '1,2 x 0,7 x 0,5' }
  const { text } = composeReport(paratireoide, state)
  assert.match(text, /Imagem hipoecoica, oval, situada na loja paratireoidiana posterior ao polo inferior do lobo tireoidiano direito, medindo 1,2 x 0,7 x 0,5 cm, apresentando pedículo vascular polar ao Doppler colorido\./)
  assert.match(text, /que tem como diagnóstico mais provável adenoma de paratireoide/)
  assert.doesNotMatch(text, /compatível com adenoma|nódulo/i)
  assert.match(text, /Região infratireoidiana sem imagens nodulares\./)
  semIdentificadorCru(text)
})

test('paratireoide: duas imagens → hiperplasia; a esclarecer respeitado', () => {
  const state = initialExamState(paratireoide)
  state.lojas = {
    ...state.lojas,
    imagem_1: 'presente', 'imagem_1.presente.lado': 'direito', 'imagem_1.presente.medidas': '1,0 x 0,6 x 0,5',
    imagem_2: 'presente', 'imagem_2.presente.lado': 'esquerdo', 'imagem_2.presente.medidas': '0,9 x 0,6 x 0,4',
  }
  assert.match(composeReport(paratireoide, state).text, /a correlacionar com hiperplasia das paratireoides/)
  state.lojas.hipotese = 'esclarecer'
  const text = composeReport(paratireoide, state).text
  assert.doesNotMatch(text, /hiperplasia|adenoma/)
  assert.match(text, /lobo tireoidiano direito e na loja paratireoidiana posterior ao polo inferior do lobo tireoidiano esquerdo, a esclarecer/)
})

test('paratireoide bloqueia diagnóstico sem lado ou medidas', () => {
  const state = initialExamState(paratireoide)
  state.lojas = { ...state.lojas, imagem_1: 'presente' }
  const { text } = composeReport(paratireoide, state)
  assert.doesNotMatch(text, /adenoma/)
  assert.match(text, /dados pendentes/)
  const issues = pendenciasLocais('PARATIREOIDE', state)
  assert.deepEqual(issues, ['Imagem 1: selecione o lado.', 'Imagem 1: informe as três medidas.'])
})

// ── Glândulas salivares ──────────────────────────────────────────────────────
test('glândulas salivares normais', () => {
  const state = initialExamState(glandulasSalivares)
  const { text } = composeReport(glandulasSalivares, state)
  assert.match(text, /^ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES/)
  for (const nome of ['parótida direita', 'parótida esquerda', 'submandibular direita', 'submandibular esquerda']) {
    assert.match(text, new RegExp(`Glândula ${nome} de dimensões e ecotextura preservadas, sem nódulos, cálculos ou dilatação ductal\\.`))
  }
  assert.match(text, /CONCLUSÃO:\nGlândulas parótidas e submandibulares com dimensões e ecotextura preservadas bilateralmente/)
  assert.deepEqual(pendenciasLocais('GLANDULAS_SALIVARES', state), [])
  semIdentificadorCru(text)
})

test('glândulas salivares alteradas: cálculo com dilatação, sialoadenite e nódulo, lado preservado', () => {
  const state = initialExamState(glandulasSalivares)
  state.submandibular_esquerda = {
    ...state.submandibular_esquerda, parenquima: 'aguda', ducto: 'visivel', 'ducto.visivel.calibre': '3,5',
    achados: ['calculo'], 'achados.calculo.tamanho': '6',
  }
  state.parotida_direita = {
    ...state.parotida_direita, medidas: '32 x 58', achados: ['nodulo'], 'achados.nodulo.medidas': '18 x 12 x 10',
  }
  const { text } = composeReport(glandulasSalivares, state)
  assert.match(text, /Glândula parótida direita com dimensões de 32,0 x 58,0 mm \(eixos anteroposterior x longitudinal\)/)
  assert.match(text, /Cálculo no ducto de Wharton da glândula submandibular esquerda, medindo 6,0 mm, com ducto a montante de calibre máximo de 3,5 mm/)
  assert.match(text, /Sinais ecográficos de sialoadenite aguda em glândula submandibular esquerda/)
  assert.match(text, /Nódulo no lobo superficial da glândula parótida direita, medindo 18,0 x 12,0 x 10,0 mm, com características ecográficas predominantemente benignas/)
  assert.match(text, /O diagnóstico histológico definitivo requer avaliação por especialista/)
  assert.doesNotMatch(text, /Warthin|pleomórfico|carcinoma|Sjögren/i)
  assert.match(text, /Demais glândulas salivares maiores avaliadas sem alterações ecográficas\./)
  assert.deepEqual(pendenciasLocais('GLANDULAS_SALIVARES', state), [])
  semIdentificadorCru(text)
})

test('glândulas salivares: nódulo irregular é suspeito; sem medidas, não caracteriza', () => {
  const state = initialExamState(glandulasSalivares)
  state.parotida_esquerda = { ...state.parotida_esquerda, achados: ['nodulo'], 'achados.nodulo.contornos': 'irregulares' }
  let text = composeReport(glandulasSalivares, state).text
  assert.doesNotMatch(text, /benignas|suspeitas/)
  assert.match(text, /medidas pendentes/)
  assert.deepEqual(pendenciasLocais('GLANDULAS_SALIVARES', state), ['Parótida esquerda: informe as três medidas do nódulo.'])
  state.parotida_esquerda['achados.nodulo.medidas'] = '15 x 11 x 9'
  text = composeReport(glandulasSalivares, state).text
  assert.match(text, /características ecográficas suspeitas de atipia/)
})

test('glândulas salivares: cálculo sem medida e sem sombra bloqueiam a afirmação', () => {
  const state = initialExamState(glandulasSalivares)
  state.parotida_direita = { ...state.parotida_direita, achados: ['calculo'], 'achados.calculo.sombra': 'nao' }
  const { text } = composeReport(glandulasSalivares, state)
  assert.doesNotMatch(text, /sugestiva de cálculo/)
  assert.ok(pendenciasLocais('GLANDULAS_SALIVARES', state).some((i) => /tamanho do cálculo/.test(i)))
  state.parotida_direita['achados.calculo.tamanho'] = '1,5'
  assert.match(composeReport(glandulasSalivares, state).text, /sugestiva de cálculo de pequenas dimensões/)
})

console.log(`# ${cases} casos`)
