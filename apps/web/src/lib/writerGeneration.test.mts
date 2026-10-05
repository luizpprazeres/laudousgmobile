import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { GenerateSSEEvent } from '@laudousg/shared'
import * as generationModule from './writerGeneration.ts'
import * as categoryModule from './writerCategories.ts'
import * as flowModule from './writerFlow.ts'
import * as pendingModule from './writerPendingClarify.ts'

const generation = generationModule.default ?? generationModule
const categories = categoryModule.default ?? categoryModule
const flow = flowModule.default ?? flowModule
const pending = pendingModule.default ?? pendingModule
const { readGenerateEvents, validateWriterRequest } = generation
const { STRUCTURED_WEB_CATEGORY_CODES, WRITER_CATEGORY_CODES, isWriterCategory } = categories
const { clarifyIsAnswered, initialWriterFlow, writerFlowReducer } = flow
const { questionsFromPendingClarify } = pending

const reportId = '11111111-1111-4111-8111-111111111111'

test('allowlist separa as 38 categorias estruturadas da categoria livre', () => {
  assert.equal(STRUCTURED_WEB_CATEGORY_CODES.length, 38)
  assert.equal(WRITER_CATEGORY_CODES.length, 1)
  assert.equal(new Set([...STRUCTURED_WEB_CATEGORY_CODES, ...WRITER_CATEGORY_CODES]).size, 39)
  for (const category of WRITER_CATEGORY_CODES) assert.equal(isWriterCategory(category), true)
  for (const category of ['PERFIL_BIOFISICO_FETAL', 'HISTEROSSONOGRAFIA', 'PAREDE_ABDOMINAL', 'REGIAO_INGUINAL', 'ESCROTAL', 'PROSTATA_TRANSRETAL', 'PARATIREOIDE', 'GLANDULAS_SALIVARES', 'TRANSFONTANELA', 'OCULAR', 'DOPPLER_ARTERIAL_MMII', 'DOPPLER_FISTULA_AV', 'DOPPLER_MESENTERICO', 'DOPPLER_ARTERIAS_TEMPORAIS', 'DOPPLER_AORTA_ILIACAS', 'DOPPLER_TRANSPLANTE_RENAL', 'MAMA_MASCULINA', 'BOLSA_TESTICULAR_DOPPLER', 'PELVICO_TRANSVAGINAL', 'ABDOMEN_TOTAL_DOPPLER', 'DOPPLER_HEPATICO', 'DOPPLER_ARTERIAL_MMSS', 'DOPPLER_VENOSO_MMSS', 'QUADRIL_INFANTIL', 'TORAX', 'TESTE', 'MUSCULOESQUELETICO_RARAS']) {
    assert.equal(isWriterCategory(category), false, category)
    assert.throws(() => validateWriterRequest({ raw_input: 'Achados ditados', category_hint: category }), /Categoria não disponível/)
  }
})

test('payload preserva achados, category_hint e retomada no mesmo reportId', () => {
  assert.deepEqual(validateWriterRequest({
    raw_input: 'Achados observados e ditados pelo médico.',
    category_hint: 'LIVRE',
    resume_from_report_id: reportId,
    clarify_answers: [{ question_id: 'lado', answer: 'direito' }],
  }), {
    raw_input: 'Achados observados e ditados pelo médico.',
    category_hint: 'LIVRE',
    resume_from_report_id: reportId,
    clarify_answers: [{ question_id: 'lado', answer: 'direito' }],
  })
  assert.throws(() => validateWriterRequest({ raw_input: 'a', category_hint: 'LIVRE' }), /Pedido de geração inválido/)
  assert.throws(() => validateWriterRequest({ raw_input: 'Achados válidos', category_hint: 'LIVRE', auto_push_to_sala: true }), /Pedido de geração inválido/)
})

test('retomada carregada valida versão/perguntas persistidas antes de reabrir clarify', () => {
  const questions = [{ id: 'lado', question: 'Qual lado foi avaliado?', expects: 'choice', choices: ['direito', 'esquerdo'] }]
  assert.deepEqual(questionsFromPendingClarify({ pending_clarify: { contractVersion: 1, questions }, unrelated: true }), questions)
  assert.equal(questionsFromPendingClarify({ pending_clarify: { contractVersion: 2, questions } }), null)
  assert.equal(questionsFromPendingClarify({ pending_clarify: { contractVersion: 1, questions: [] } }), null)
  const resumed = writerFlowReducer(initialWriterFlow, { type: 'resumePending', reportId, questions })
  assert.equal(resumed.kind, 'clarifying')
  assert.equal(resumed.kind === 'clarifying' && resumed.reportId, reportId)
})

test('leitor SSE aceita fragmentação CRLF, fim sem separador e ignora payload inválido', async () => {
  const events: GenerateSSEEvent[] = [
    { type: 'open', ts: '2026-09-30T12:00:00.000Z', report_id: reportId },
    { type: 'clarify', ts: '2026-09-30T12:00:01.000Z', questions: [{ id: 'q1', question: 'Informe o lado avaliado.', expects: 'choice', choices: ['direito', 'esquerdo'] }] },
    { type: 'done', ts: '2026-09-30T12:00:02.000Z', report_id: reportId, final_text: 'Laudo final.' },
  ]
  const encoder = new TextEncoder()
  const wire = `event: open\r\ndata: ${JSON.stringify(events[0])}\r\n\r\ndata: lixo\r\n\r\ndata: ${JSON.stringify(events[1])}\r\n\r\ndata: ${JSON.stringify(events[2])}`
  const bytes = encoder.encode(wire)
  const stream = new ReadableStream<Uint8Array>({ start(controller) {
    controller.enqueue(bytes.slice(0, 37)); controller.enqueue(bytes.slice(37, 141)); controller.enqueue(bytes.slice(141)); controller.close()
  } })
  const received: GenerateSSEEvent[] = []
  for await (const event of readGenerateEvents(stream)) received.push(event)
  assert.deepEqual(received, events)
})

test('máquina de estados cobre clarify, retomada same-id, blocked, sanity, done e scheme recebido', () => {
  const question = { id: 'q1', question: 'Informe o lado avaliado.', expects: 'choice' as const, choices: ['direito', 'esquerdo'] }
  let flow = writerFlowReducer(initialWriterFlow, { type: 'start' })
  flow = writerFlowReducer(flow, { type: 'event', event: { type: 'open', ts: '2026-09-30T12:00:00.000Z', report_id: reportId } })
  flow = writerFlowReducer(flow, { type: 'event', event: { type: 'clarify', ts: '2026-09-30T12:00:01.000Z', questions: [question] } })
  assert.equal(flow.kind, 'clarifying')
  if (flow.kind !== 'clarifying') return
  assert.equal(clarifyIsAnswered(flow), false)
  flow = writerFlowReducer(flow, { type: 'answer', id: question.id, value: 'direito' })
  assert.equal(flow.kind === 'clarifying' && clarifyIsAnswered(flow), true)
  const sameId = flow.kind === 'clarifying' ? flow.reportId : ''
  assert.equal(sameId, reportId)
  const resumed = writerFlowReducer(flow, { type: 'start', expectedReportId: reportId })
  assert.equal(writerFlowReducer(resumed, { type: 'event', event: { type: 'open', ts: '2026-09-30T12:00:01.500Z', report_id: reportId } }).kind, 'generating')
  assert.equal(writerFlowReducer(resumed, { type: 'event', event: { type: 'open', ts: '2026-09-30T12:00:01.500Z', report_id: '22222222-2222-4222-8222-222222222222' } }).kind, 'error')

  let done = writerFlowReducer(initialWriterFlow, { type: 'start' })
  done = writerFlowReducer(done, { type: 'event', event: { type: 'done', ts: '2026-09-30T12:00:02.000Z', report_id: reportId, final_text: 'Laudo final.' } })
  done = writerFlowReducer(done, { type: 'event', event: { type: 'sanity', ts: '2026-09-30T12:00:03.000Z', result: { verdict: 'warning', summary: 'Revisar.', issues: [] } } })
  const map = { lados: { direito: { avaliado: true, segmentos: {} }, esquerdo: { avaliado: false, segmentos: {} } }, lesoes: [], perfurantes: [], tvp_presente: false }
  done = writerFlowReducer(done, { type: 'event', event: { type: 'scheme', ts: '2026-09-30T12:00:04.000Z', exam_type: 'VENOSO_MMII', asset_version: 'venous-4view-1', map } })
  assert.equal(done.kind, 'done')
  if (done.kind === 'done') {
    assert.equal(done.reportId, reportId)
    assert.deepEqual(done.venousMap, map)
    assert.equal(done.sanity?.verdict, 'warning')
  }
  const oldMap = writerFlowReducer(done, { type: 'event', event: { type: 'scheme', ts: '2026-09-30T12:00:04.500Z', exam_type: 'VENOSO_MMII', asset_version: 'venoso-anterior-1', map } })
  assert.deepEqual(oldMap, done, 'Web não deve renderizar versão que seu atlas não suporta')
  const blocked = writerFlowReducer({ kind: 'generating', partial: '' }, { type: 'event', event: {
    type: 'blocked', ts: '2026-09-30T12:00:05.000Z', report_id: reportId, reason: 'Revisão necessária.',
    sanity: { verdict: 'critical', summary: 'Bloqueado.', issues: [] },
  } })
  assert.equal(blocked.kind, 'blocked')
  assert.equal(writerFlowReducer({ kind: 'generating', partial: '' }, { type: 'event', event: {
    type: 'scheme', ts: '2026-09-30T12:00:06.000Z', exam_type: 'VENOSO_MMII', asset_version: 'venous-4view-1', map,
  } }).kind, 'generating', 'mapa sem evento done não abre painel')
})
