/**
 * TRANSFONTANELAR — correções fail-closed do backlog
 * (docs/competitor-study/laudario/transfontanelar.md).
 */
import assert from 'node:assert/strict'
import { composeReport, initialExamState, type ExamState } from '../src/lib/deterministic/compose'
import { transfontanela } from '../src/lib/deterministic/organs/transfontanela'
import { pendenciasLocais } from '../src/lib/deterministic/organs/pendenciasLocais'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
function patch(state: ExamState, section: string, values: Record<string, string>): ExamState {
  return { ...state, [section]: { ...state[section], ...values } }
}
const emBranco = () => initialExamState(transfontanela)
const normal = (): ExamState => ({ ...emBranco(), __opts: { ...emBranco().__opts, modelo: 'normal' } })
const compor = (state: ExamState) => composeReport(transfontanela, state)
const ondes = (state: ExamState) => compor(state).pendencias.map((p) => p.onde)
function bloqueado(state: ExamState, onde: string, motivo: RegExp) {
  const r = compor(state)
  assert.equal(r.text, '')
  assert.ok(r.pendencias.some((p) => p.onde === onde && motivo.test(p.motivo)), JSON.stringify(r.pendencias))
}

test('em branco: nenhuma normalidade — janela e estruturas principais ficam pendentes', () => {
  const r = compor(emBranco())
  assert.equal(r.text, '')
  assert.deepEqual(r.pendencias.map((p) => p.onde), ['Janela acústica', 'Parênquima', 'Ventrículos laterais', 'Região periventricular', 'Linha média', 'Fossa posterior'])
})

test('sem modelo normal, marcar cada estrutura à mão também libera o laudo', () => {
  let s = patch(emBranco(), 'dados_neonatais', { janela: 'adequada' })
  s = patch(s, 'parenquima_ventriculos', { parenquima: 'normal', laterais: 'normal', periventricular: 'normal' })
  s = patch(s, 'linha_media', { linha_media: 'normal', fossa_posterior: 'nao_avaliada' })
  const r = compor(s)
  assert.deepEqual(r.pendencias, [])
  assert.match(r.text, /Fossa posterior não avaliada\./)
  assert.doesNotMatch(r.text, /dentro dos limites da normalidade/)
  assert.equal(compor(normal()).text.includes('dentro dos limites da normalidade'), true)
})

test('lado nunca é presumido: dilatação e alteração periventricular exigem lado', () => {
  bloqueado(patch(normal(), 'parenquima_ventriculos', { laterais: 'dilatados' }), 'Ventrículos laterais', /lado da dilatação/)
  bloqueado(patch(normal(), 'parenquima_ventriculos', { periventricular: 'hiperecogenica' }), 'Região periventricular', /lado/)
  bloqueado(patch(normal(), 'parenquima_ventriculos', { periventricular: 'cistica' }), 'Região periventricular', /lado/)
  const esquerda = compor(patch(normal(), 'parenquima_ventriculos', { laterais: 'dilatados', 'laterais.dilatados.lado': 'esquerdo' }))
  assert.match(esquerda.text, /Ventrículo lateral esquerdo com calibre aumentado\.\nVentrículo lateral direito de calibre normal\./)
  assert.match(esquerda.text, /Dilatação do ventrículo lateral esquerdo\./)
})

test('achado sem localização ou lado bloqueia em vez de imprimir lacuna', () => {
  bloqueado(patch(normal(), 'parenquima_ventriculos', { calcificacoes: 'presente' }), 'Focos hiperecogênicos', /localização/)
  bloqueado(patch(normal(), 'parenquima_ventriculos', { cistos: 'presente' }), 'Cistos subependimários', /lado/)
  bloqueado(patch(normal(), 'parenquima_ventriculos', { cistos: 'presente', 'cistos.presente.lado': 'direito', 'cistos.presente.medida': 'grande' }), 'Cistos subependimários', /medida inválida/)
})

test('entrada inválida vira pendência; nenhum texto produzido contém "____"', () => {
  assert.deepEqual(ondes(patch(normal(), 'dados_neonatais', { dias_vida: 'dez', ig_nascimento: '50+1' })), ['Dias de vida', 'IG ao nascimento'])
  assert.deepEqual(ondes(patch(normal(), 'parenquima_ventriculos', { levene_d: 'abc', terceiro_mm: '200' })), ['Índice de Levene D', '3º ventrículo'])
  assert.deepEqual(ondes(patch(normal(), 'linha_media', { cisterna_magna_mm: 'x' })), ['Cisterna magna'])
  const variantes: ExamState[] = [
    normal(),
    patch(normal(), 'parenquima_ventriculos', { laterais: 'dilatados', 'laterais.dilatados.lado': 'bilateral' }),
    patch(normal(), 'parenquima_ventriculos', { hemorragia: 'presente', 'hemorragia.presente.lado': 'direito', 'hemorragia.presente.extensao': 'iv_com_dilatacao' }),
    patch(normal(), 'parenquima_ventriculos', { calcificacoes: 'presente', 'calcificacoes.presente.local': 'difusos', cistos: 'presente', 'cistos.presente.lado': 'esquerdo' }),
  ]
  for (const s of variantes) {
    const r = compor(s)
    assert.deepEqual(r.pendencias, [])
    assert.doesNotMatch(r.text, /____/)
  }
})

test('janela limitada: estrutura herdada do modelo exige marcação explícita para salvar', () => {
  const limitada = patch(normal(), 'dados_neonatais', { janela: 'limitada', 'janela.limitada.motivo': 'fontanela anterior pequena' })
  const issues = pendenciasLocais('TRANSFONTANELA', limitada)
  assert.equal(issues.length, 1)
  assert.match(issues[0]!, /parênquima, ventrículos laterais, região periventricular, linha média e fossa posterior/)
  let marcada = patch(limitada, 'parenquima_ventriculos', { parenquima: 'normal', laterais: 'normal', periventricular: 'normal' })
  marcada = patch(marcada, 'linha_media', { linha_media: 'normal', fossa_posterior: 'nao_avaliada' })
  assert.deepEqual(pendenciasLocais('TRANSFONTANELA', marcada), [])
  assert.deepEqual(pendenciasLocais('TRANSFONTANELA', normal()), [])
})

test('reversão e persistência: desfazer achados volta ao laudo normal; estado salvo reabre igual', () => {
  const base = compor(normal()).text
  let s = patch(normal(), 'parenquima_ventriculos', { laterais: 'dilatados', 'laterais.dilatados.lado': 'direito', cistos: 'presente', 'cistos.presente.lado': 'direito' })
  const alterado = compor(s).text
  assert.notEqual(alterado, base)
  assert.equal(compor(JSON.parse(JSON.stringify(s)) as ExamState).text, alterado)
  s = patch(s, 'parenquima_ventriculos', { laterais: 'modelo', cistos: 'ausente' })
  assert.equal(compor(s).text, base)
})

console.log(`${cases} transfontanelar fail-closed Web cases passed`)
