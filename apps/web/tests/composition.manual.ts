/**
 * Composição de exames associados na Web — do estado da tela ao renderer REAL.
 *
 * Nada aqui simula o renderer: o corpo montado pela Web passa pelo schema
 * compartilhado e por `renderClinicalComposition` do `apps/api` (estilo
 * OBJETIVO, que não consulta máscara no banco). Salvar/reabrir é exercitado
 * pelo envelope; o banco não é tocado.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { CATEGORIES, initialExamState, type ExamState } from '../src/lib/deterministic'
import {
  associationByCode,
  associationsFor,
  adapterStateOf,
  hiddenSharedSections,
  removeComponent,
  startAssociation,
  updateComponentState,
  type CompositionSession,
} from '../src/lib/composition/associations'
import { buildCompositionBody } from '../src/lib/composition/buildRequest'
import { ClinicalCompositionRequestV1Schema, ClinicalCompositionResponseV1Schema, type CompositionCategoryCode } from '../src/lib/composition/contract'
import { validarResposta } from '../src/lib/composition/useComposicaoCanonica'
import { buildEnvelope, parseEnvelope, CompositionEnvelopeV1Schema } from '../src/lib/composition/envelope'
import { renderClinicalComposition as renderReal } from '../../api/src/server/renderer/composition/renderClinicalComposition'

/**
 * O estilo OBJETIVO não usa máscara do banco: o contexto vazio é o que a
 * produção resolveria para ele. Nenhum texto clínico vem deste arquivo.
 */
const renderClinicalComposition = (request: Parameters<typeof renderReal>[0]) =>
  renderReal(request, { resolveContext: async () => ({}) })

let count = 0
const failures: string[] = []
async function test(name: string, run: () => void | Promise<void>) {
  try {
    await run()
    console.log(`PASS ${++count}: ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`FAIL: ${name}\n  ${error instanceof Error ? error.message.slice(0, 400) : String(error)}`)
  }
}

const initialOf = (category: CompositionCategoryCode) => initialExamState(CATEGORIES[category])
const abdomeProstata = associationByCode('ABDOMEN_TOTAL__PROSTATA_SUPRAPUBICA')
const mamaPelve = associationByCode('MAMARIA__PELVE_FEMININA')

function fullRequest(session: CompositionSession, revision = 1) {
  const built = buildCompositionBody(session)
  assert.equal(built.ok, true, built.ok ? '' : JSON.stringify(built.pendencias))
  if (!built.ok) throw new Error('unreachable')
  const parsed = ClinicalCompositionRequestV1Schema.safeParse({ ...built.body, requestId: randomUUID(), revision, writingStyle: 'OBJETIVO' })
  assert.equal(parsed.success, true, parsed.success ? '' : JSON.stringify(parsed.error.issues))
  return parsed.data!
}

function bladderState(session: CompositionSession) {
  const abd = session.components.find((c) => c.categoryCode === 'ABDOMEN_TOTAL')!
  return session.states[abd.componentId].bexiga
}

async function main() {
  await test('só pares suportados aparecem, e nada para tireoide ou obstetrícia', () => {
    assert.deepEqual(associationsFor('ABDOMEN_TOTAL').map((a) => a.add), ['PROSTATA_SUPRAPUBICA'])
    assert.deepEqual(associationsFor('PROSTATA_SUPRAPUBICA').map((a) => a.add), ['ABDOMEN_TOTAL'])
    assert.deepEqual(associationsFor('MAMARIA').map((a) => a.add), ['PELVE_FEMININA'])
    assert.deepEqual(associationsFor('PELVE_FEMININA').map((a) => a.add), ['MAMARIA'])
    for (const other of ['TIREOIDE', 'OBSTETRICA', 'MUSCULOESQUELETICO', 'ABDOMEN_SUPERIOR', 'VIAS_URINARIAS']) {
      assert.deepEqual(associationsFor(other), [])
    }
  })

  await test('associar preserva o exame aberto e começa o outro do estado INICIAL', () => {
    const primary = initialOf('ABDOMEN_TOTAL')
    primary.figado = { ...(primary.figado as object), achados: ['esteatose'] } as never
    const session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', primary, initialOf, randomUUID)
    const [a, p] = session.components
    assert.equal(a.categoryCode, 'ABDOMEN_TOTAL')
    assert.deepEqual(session.states[a.componentId].figado, primary.figado)
    assert.notEqual(session.states[a.componentId], primary, 'estado copiado, não compartilhado por referência')
    assert.deepEqual(session.states[p.componentId], initialOf('PROSTATA_SUPRAPUBICA'))
    assert.equal(a.acquisitionContextId, p.acquisitionContextId, 'abdome + próstata: mesmo contexto transabdominal')
    assert.ok(session.sharedBladderId)
  })

  await test('uma bexiga só: some do grupo da próstata e é projetada idêntica no adaptador dela', () => {
    let session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
    const [a, p] = session.components
    assert.deepEqual([...hiddenSharedSections(session, p.componentId)], ['bexiga'])
    assert.deepEqual([...hiddenSharedSections(session, a.componentId)], [])
    session = updateComponentState(session, a.componentId, (s) => ({ ...s, bexiga: { ...(s.bexiga as object), volume_pre: '320' } as never }))
    assert.deepEqual(adapterStateOf(session, p.componentId).bexiga, session.states[a.componentId].bexiga)
    assert.notDeepEqual(session.states[p.componentId].bexiga, session.states[a.componentId].bexiga, 'o estado próprio da próstata não é reescrito')
  })

  await test('associar a partir da próstata leva a bexiga preenchida para a origem abdome', () => {
    const prost = initialOf('PROSTATA_SUPRAPUBICA')
    prost.bexiga = { ...(prost.bexiga as object), volume_pre: '410' } as never
    const session = startAssociation(abdomeProstata, 'PROSTATA_SUPRAPUBICA', prost, initialOf, randomUUID)
    assert.equal((bladderState(session) as Record<string, unknown>).volume_pre, '410')
    const [first] = session.components
    assert.equal(first.categoryCode, 'PROSTATA_SUPRAPUBICA')
    assert.equal(session.primaryComponentId, first.componentId)
  })

  await test('mamas + pelve: contextos distintos e nenhuma estrutura compartilhada', () => {
    const session = startAssociation(mamaPelve, 'MAMARIA', initialOf('MAMARIA'), initialOf, randomUUID)
    const [m, p] = session.components
    assert.notEqual(m.acquisitionContextId, p.acquisitionContextId)
    assert.equal(session.sharedBladderId, null)
    assert.deepEqual([...hiddenSharedSections(session, p.componentId)], [])
    const request = fullRequest(session)
    assert.deepEqual(request.sharedStructures, [])
  })

  await test('pedido abdome + próstata: bexiga compartilhada com origem abdome, aceito pelo schema compartilhado', () => {
    const session = startAssociation(abdomeProstata, 'PROSTATA_SUPRAPUBICA', initialOf('PROSTATA_SUPRAPUBICA'), initialOf, randomUUID)
    const request = fullRequest(session)
    assert.equal(request.sharedStructures.length, 1)
    const abd = session.components.find((c) => c.categoryCode === 'ABDOMEN_TOTAL')!
    assert.equal(request.sharedStructures[0].sourceComponentId, abd.componentId)
    const [c1, c2] = request.components
    assert.deepEqual((c1.data.dados as Record<string, unknown>).bexiga_detalhada, (c2.data.dados as Record<string, unknown>).bexiga_detalhada)
  })

  await test('pendência bloqueante em UM componente impede o pedido inteiro', () => {
    let session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
    const [a] = session.components
    session = updateComponentState(session, a.componentId, (s) => ({ ...s, bexiga: { ...(s.bexiga as object), replecao: 'vazia', volume_pre: '300' } as never }))
    const built = buildCompositionBody(session)
    assert.equal(built.ok, false)
    if (!built.ok) assert.ok(built.pendencias.every((p) => p.onde === 'bexiga'))
  })

  await test('remover componente descarta o estado dele; reassociar não o ressuscita', () => {
    let session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
    const [a, p] = session.components
    session = updateComponentState(session, p.componentId, (s) => ({ ...s, prostata: { ...(s.prostata as object), volume: 'aumentada' } as never }))
    session = updateComponentState(session, a.componentId, (s) => ({ ...s, bexiga: { ...(s.bexiga as object), volume_pre: '280' } as never }))
    const remaining = removeComponent(session, p.componentId)
    assert.equal(remaining.category, 'ABDOMEN_TOTAL')
    assert.equal((remaining.state.bexiga as Record<string, unknown>).volume_pre, '280')
    const again = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', remaining.state, initialOf, randomUUID)
    const prost = again.components.find((c) => c.categoryCode === 'PROSTATA_SUPRAPUBICA')!
    assert.notEqual(prost.componentId, p.componentId)
    assert.deepEqual(again.states[prost.componentId], initialOf('PROSTATA_SUPRAPUBICA'))

    const keepProstate = removeComponent(session, a.componentId)
    assert.equal(keepProstate.category, 'PROSTATA_SUPRAPUBICA')
    assert.equal((keepProstate.state.bexiga as Record<string, unknown>).volume_pre, '280', 'a bexiga deste exame fica com a próstata')
    assert.equal(keepProstate.state.figado, undefined)
  })

  await test('RENDERER REAL: abdome + próstata compõe com uma bexiga, e a resposta passa na validação da tela', async () => {
    const session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
    const request = fullRequest(session)
    const response = await renderClinicalComposition(request)
    assert.equal(ClinicalCompositionResponseV1Schema.safeParse(response).success, true)
    assert.equal(response.status, 'complete', JSON.stringify(response).slice(0, 600))
    const v = validarResposta(request, response, true)
    assert.equal(v.ok, true)
    if (response.status === 'complete') {
      assert.equal((response.document.fullText.match(/bexiga/gi) ?? []).length > 0, true)
      const bladderBlocks = response.blocks.filter((b) => b.structureCode === 'URINARY_BLADDER')
      assert.ok(bladderBlocks.length <= 2, 'bexiga não duplicada em blocos')
    }
  })

  await test('RENDERER REAL: mamas + pelve compõe sem estrutura compartilhada', async () => {
    const session = startAssociation(mamaPelve, 'PELVE_FEMININA', initialOf('PELVE_FEMININA'), initialOf, randomUUID)
    const request = fullRequest(session)
    const response = await renderClinicalComposition(request)
    assert.equal(response.status, 'complete', JSON.stringify(response).slice(0, 600))
    assert.equal(validarResposta(request, response, true).ok, true)
  })

  await test('resposta antiga não vence: requestId/revision de outro pedido são recusados', async () => {
    const session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
    const old = fullRequest(session, 1)
    const response = await renderClinicalComposition(old)
    const current = { ...old, requestId: randomUUID(), revision: 2 }
    const v = validarResposta(current, response, true)
    assert.equal(v.ok, false)
    const otherComposition = { ...old, compositionId: randomUUID() }
    assert.equal(validarResposta(otherComposition, response, true).ok, false)
  })

  await test('defesa na fronteira: componente duplicado, categoria trocada ou bloco de origem alheia são recusados', async () => {
    const session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
    const request = fullRequest(session)
    const response = await renderClinicalComposition(request)
    assert.equal(response.status, 'complete')
    if (response.status !== 'complete') return
    const [a, b] = response.components
    const clone = () => JSON.parse(JSON.stringify(response))
    const duplicated = { ...clone(), components: [a, { ...a }] }
    assert.equal(validarResposta(request, duplicated, true).ok, false, '[A, A] sem B')
    const swapped = { ...clone(), components: [{ ...a, categoryCode: b.categoryCode }, { ...b, categoryCode: a.categoryCode }] }
    assert.equal(validarResposta(request, swapped, true).ok, false, 'categoria trocada entre componentes')
    const foreign = clone()
    foreign.blocks[0] = { ...foreign.blocks[0], componentIds: [randomUUID()] }
    assert.equal(validarResposta(request, foreign, true).ok, false, 'bloco apontando para componente de fora')
    const wrongCategory = clone()
    const idx = wrongCategory.blocks.findIndex((bl: { componentIds: string[] }) => bl.componentIds.length === 1)
    wrongCategory.blocks[idx] = { ...wrongCategory.blocks[idx], categoryCodes: ['MAMARIA'] }
    assert.equal(validarResposta(request, wrongCategory, true).ok, false, 'bloco com categoria que não é do componente')
    assert.equal(validarResposta(request, clone(), true).ok, true, 'o original continua aceito')
  })

  await test('falha parcial é falha: componente com erro/bloqueado não vira laudo', () => {
    const session = startAssociation(mamaPelve, 'MAMARIA', initialOf('MAMARIA'), initialOf, randomUUID)
    const req = fullRequest(session)
    const [m, p] = req.components
    const error = {
      contractVersion: req.contractVersion, requestId: req.requestId, compositionId: req.compositionId, revision: req.revision,
      associationCode: req.associationCode, status: 'error',
      error: { code: 'COMPONENT_RENDER_FAILED', message: 'Pelve não montou.' },
      components: [
        { componentId: m.componentId, categoryCode: m.categoryCode, status: 'rendered' },
        { componentId: p.componentId, categoryCode: p.categoryCode, status: 'error', message: 'x' },
      ],
    }
    const v = validarResposta(req, error, false)
    assert.equal(v.ok, false)
    if (!v.ok) {
      assert.equal(v.erro, 'Pelve não montou.')
      assert.deepEqual(v.value?.components?.filter((c) => c.status !== 'rendered').map((c) => c.componentId), [p.componentId])
    }
    assert.equal(validarResposta(req, { error: 'não autorizado' }, false).ok, false)
    assert.equal(validarResposta(req, { ...error, contractVersion: 'clinical-composition/v2' }, false).ok, false)
  })

  await test('salvar → reabrir: envelope devolve sessão, estados, texto e rascunho idênticos', async () => {
    let session = startAssociation(abdomeProstata, 'ABDOMEN_TOTAL', initialOf('ABDOMEN_TOTAL'), initialOf, randomUUID)
    const [a] = session.components
    session = updateComponentState(session, a.componentId, (s) => ({ ...s, bexiga: { ...(s.bexiga as object), volume_pre: '250' } as never }))
    const request = fullRequest(session, 7)
    const response = await renderClinicalComposition(request)
    assert.equal(response.status, 'complete')
    if (response.status !== 'complete') return
    const draft = { text: `${response.document.fullText}\n\nTexto do médico.`, html: '<p>x</p>', sourceText: response.document.fullText, sourceHtml: '<p>y</p>', dirty: true }
    const envelope = buildEnvelope({
      session,
      rendered: { requestId: request.requestId, revision: request.revision, fullText: response.document.fullText, blocks: response.blocks },
      extras: { calculatorBlocks: { 'bi-rads': 'BLOCO' }, companionNotes: ['nota'] },
      draft,
      initials: 'ab',
    })
    // O que vai ao banco é JSON: simula a ida e a volta.
    const stored = JSON.parse(JSON.stringify({ ...envelope, __presentation: { format: 'x', html: '<p>x</p>' } }))
    const parsed = parseEnvelope(stored)
    assert.equal(parsed.kind, 'composition')
    if (parsed.kind !== 'composition') return
    assert.deepEqual(parsed.session, session)
    assert.deepEqual(parsed.envelope.draft, draft)
    assert.equal(parsed.envelope.revision, 7)
    assert.deepEqual(parsed.envelope.extras.companionNotes, ['nota'])
    // Reabrir e pedir de novo, com o mesmo estado, devolve o mesmo texto.
    const again = await renderClinicalComposition(fullRequest(parsed.session, 8))
    assert.equal(again.status === 'complete' && again.document.fullText, response.document.fullText)
  })

  await test('reabertura: legado continua só texto; versão desconhecida ou forma adulterada é recusada', () => {
    assert.equal(parseEnvelope({ figado: {}, __presentation: {} }).kind, 'legacy')
    assert.equal(parseEnvelope(null).kind, 'legacy')
    const session = startAssociation(mamaPelve, 'MAMARIA', initialOf('MAMARIA'), initialOf, randomUUID)
    const base = buildEnvelope({
      session,
      rendered: { requestId: randomUUID(), revision: 1, fullText: 'x', blocks: [] },
      extras: { calculatorBlocks: {}, companionNotes: [] },
      draft: { text: 'x', html: 'x', sourceText: 'x', sourceHtml: 'x', dirty: false },
      initials: '',
    })
    assert.equal(parseEnvelope({ ...base, envelopeVersion: 2 }).kind, 'composition-unsupported')
    assert.equal(parseEnvelope({ ...base, contractVersion: 'clinical-composition/v2' }).kind, 'composition-unsupported')
    assert.equal(parseEnvelope({ ...base, sharedBladderId: randomUUID() }).kind, 'composition-unsupported', 'mama+pelve não compartilha bexiga')
    assert.equal(parseEnvelope({ ...base, primaryComponentId: randomUUID() }).kind, 'composition-unsupported')
    assert.equal(parseEnvelope({ ...base, extra: 1 }).kind, 'composition-unsupported')
    assert.equal(parseEnvelope({ ...base, revision: 2 }).kind, 'composition-unsupported', 'revision diferente do texto aceito')
    assert.equal(parseEnvelope({ ...base, components: [base.components[0], { ...base.components[1], acquisitionContextId: base.components[0].acquisitionContextId }] }).kind, 'composition-unsupported', 'mama+pelve com contexto igual')
    assert.equal(parseEnvelope({ ...base, components: [base.components[0], { ...base.components[1], categoryCode: base.components[0].categoryCode }] }).kind, 'composition-unsupported', 'categoria duplicada')
    assert.equal(parseEnvelope({ ...base, compositionId: base.components[0].componentId }).kind, 'composition-unsupported', 'id reaproveitado em dois papéis')
    assert.equal(parseEnvelope({ ...base, draft: { ...base.draft, text: 'outro' } }).kind, 'composition-unsupported', 'rascunho não editado diferente do modelo')
    assert.equal(parseEnvelope({ ...base, rendered: { ...base.rendered, blocks: [{ blockId: 'x', section: 'title', componentIds: [randomUUID()], categoryCodes: ['MAMARIA'], text: 'x' }] } }).kind, 'composition-unsupported', 'bloco de origem alheia')
    assert.equal(parseEnvelope({ ...base, initials: 'A1B' }).kind, 'composition-unsupported', 'iniciais cruas divergiriam entre texto e HTML')
    assert.equal(parseEnvelope({ ...base, initials: 'ab' }).kind, 'composition')
    assert.equal(CompositionEnvelopeV1Schema.safeParse(base).success, true)
  })

  const unused: ExamState = {}
  void unused
  if (failures.length) {
    console.error(`${failures.length} composition checks FAILED: ${failures.join(' | ')}`)
    process.exit(1)
  }
  console.log(`${count} composition checks passed`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
