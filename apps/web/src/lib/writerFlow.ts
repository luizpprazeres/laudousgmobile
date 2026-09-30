import type { GenerateSSEEvent } from '@laudousg/shared'
import type { ClarifyQuestion } from '@laudousg/shared'
import type { MapaVenoso } from '@laudousg/schemes'
import { venousMapFromEvent } from './writerVenousMap'

export type WriterFlowState =
  | { kind: 'ready' }
  | { kind: 'generating'; reportId?: string; partial: string; sanity?: Extract<GenerateSSEEvent, { type: 'sanity' }>['result'] }
  | { kind: 'clarifying'; reportId: string; questions: Extract<GenerateSSEEvent, { type: 'clarify' }>['questions']; answers: Record<string, string> }
  | { kind: 'blocked'; reportId: string; reason: string; sanity?: Extract<GenerateSSEEvent, { type: 'blocked' }>['sanity'] }
  | { kind: 'done'; reportId: string; text: string; sanity?: Extract<GenerateSSEEvent, { type: 'sanity' }>['result']; venousMap?: MapaVenoso; assetVersion?: string }
  | { kind: 'error'; message: string }

export type WriterFlowAction =
  | { type: 'start'; expectedReportId?: string }
  | { type: 'error'; message: string }
  | { type: 'event'; event: GenerateSSEEvent }
  | { type: 'answer'; id: string; value: string }
  | { type: 'resumePending'; reportId: string; questions: ClarifyQuestion[] }
  | { type: 'reset' }

export const initialWriterFlow: WriterFlowState = { kind: 'ready' }

export function writerFlowReducer(state: WriterFlowState, action: WriterFlowAction): WriterFlowState {
  if (action.type === 'reset') return initialWriterFlow
  if (action.type === 'start') return { kind: 'generating', partial: '', reportId: action.expectedReportId }
  if (action.type === 'error') return { kind: 'error', message: action.message }
  if (action.type === 'resumePending') return { kind: 'clarifying', reportId: action.reportId, questions: action.questions, answers: {} }
  if (action.type === 'answer') {
    if (state.kind !== 'clarifying') return state
    return { ...state, answers: { ...state.answers, [action.id]: action.value } }
  }
  const event = action.event
  if (state.kind === 'done') {
    if (event.type === 'sanity') return { ...state, sanity: event.result }
    if (event.type === 'scheme' && state.reportId) {
      const map = venousMapFromEvent(event)
      return map ? { ...state, venousMap: map.map, assetVersion: map.assetVersion } : state
    }
    return state
  }
  if (state.kind === 'blocked') {
    return event.type === 'sanity' ? { ...state, sanity: event.result } : state
  }
  if (state.kind !== 'generating') return state
  switch (event.type) {
    case 'open': return state.reportId && state.reportId !== event.report_id
      ? { kind: 'error', message: 'O gerador abriu outro relatório durante a retomada. A resposta foi recusada para evitar duplicação.' }
      : { ...state, reportId: event.report_id }
    case 'token': return { ...state, partial: state.partial + event.delta }
    case 'clarify':
      return state.partial
        ? { kind: 'error', message: 'O gerador pediu esclarecimento após iniciar o texto. Confira o histórico antes de tentar novamente.' }
        : state.reportId
          ? { kind: 'clarifying', reportId: state.reportId, questions: event.questions, answers: {} }
          : { kind: 'error', message: 'O gerador pediu esclarecimento sem informar o ID do relatório. Confira o Histórico antes de tentar novamente.' }
    case 'blocked': return state.reportId && state.reportId !== event.report_id
      ? { kind: 'error', message: 'O bloqueio veio de outro relatório; confira o Histórico antes de continuar.' }
      : { kind: 'blocked', reportId: event.report_id, reason: event.reason, sanity: event.sanity }
    case 'done': return state.reportId && state.reportId !== event.report_id
      ? { kind: 'error', message: 'O resultado veio de outro relatório; foi recusado para evitar duplicação.' }
      : { kind: 'done', reportId: event.report_id, text: event.final_text, sanity: state.sanity }
    case 'sanity': return { ...state, sanity: event.result }
    case 'error': return { kind: 'error', message: event.message }
    default: return state
  }
}

export function clarifyIsAnswered(state: Extract<WriterFlowState, { kind: 'clarifying' }>): boolean {
  return state.questions.every((question) => Boolean(state.answers[question.id]?.trim()))
}
