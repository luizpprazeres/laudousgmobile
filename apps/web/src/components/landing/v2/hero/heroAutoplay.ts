import { HERO_CASES, baselineValues, composeCase, type CaseValues, type HeroCase } from './heroCases'

/**
 * Estado e roteiro da vitrine do hero, sem React e sem DOM: tudo aqui roda em
 * teste com relógio falso.
 *
 * Regras que este módulo garante:
 * - a autoplay só DESPACHA ações de estado; nunca toca a área de transferência.
 *   "Copiado" automático é o status `copiado-demo`, rotulado como simulação;
 * - qualquer ação humana (`takeOver`) para a autoplay de vez e mantém o que
 *   já estava nos campos, inclusive o que a pessoa digitou;
 * - a autoplay reinicia o caso ao entrar nele; a pessoa nunca é reiniciada.
 */

export type HeroStatus = 'editando' | 'pronto' | 'copiado-demo' | 'copiado' | 'copia-falhou'

export type HeroState = {
  caseIndex: number
  values: Record<string, CaseValues>
  status: HeroStatus
  mode: 'auto' | 'manual'
  /** Última estrutura alterada: destaca a frase no laudo. */
  changed: string | null
  /** Aumenta a cada escolha de opção; a UI usa para redigir a frase de novo. */
  revision: number
  /** Campo de medida que a autoplay está "digitando" (cursor visual). */
  autoTyping: string | null
}

export type HeroAction =
  | { type: 'enterCase'; caseIndex: number; reset: boolean }
  | { type: 'choose'; field: string; option: string }
  | { type: 'input'; field: string; input: string }
  | { type: 'autoType'; field: string | null }
  | { type: 'status'; status: HeroStatus }
  | { type: 'takeOver' }
  | { type: 'showcase'; state: HeroState }

export function initialHeroState(cases: HeroCase[] = HERO_CASES): HeroState {
  return {
    caseIndex: 0,
    values: Object.fromEntries(cases.map((c) => [c.id, baselineValues(c)])),
    status: 'editando',
    mode: 'auto',
    changed: null,
    revision: 0,
    autoTyping: null,
  }
}

export function createHeroReducer(cases: HeroCase[] = HERO_CASES) {
  return function heroReducer(state: HeroState, action: HeroAction): HeroState {
    const current = cases[state.caseIndex]
    const patchField = (field: string, patch: Partial<{ option: string; input: string }>) => ({
      ...state.values,
      [current.id]: {
        ...state.values[current.id],
        [field]: { ...state.values[current.id][field], ...patch },
      },
    })
    switch (action.type) {
      case 'enterCase': {
        const next = cases[action.caseIndex]
        if (!next) return state
        return {
          ...state,
          caseIndex: action.caseIndex,
          values: action.reset ? { ...state.values, [next.id]: baselineValues(next) } : state.values,
          status: 'editando',
          changed: null,
          autoTyping: null,
        }
      }
      case 'choose': {
        const prev = state.values[current.id][action.field]
        if (!prev) return state
        // Trocar de opção zera a medida: 1,2 cm de cálculo não vira 1,2 cm de outra coisa.
        const input = prev.option === action.option ? prev.input : ''
        return {
          ...state,
          values: patchField(action.field, { option: action.option, input }),
          changed: action.field,
          revision: state.revision + 1,
          status: 'editando',
        }
      }
      case 'input':
        if (!state.values[current.id][action.field]) return state
        return { ...state, values: patchField(action.field, { input: action.input }), changed: action.field, status: 'editando' }
      case 'autoType':
        return { ...state, autoTyping: action.field }
      case 'status':
        // Nunca anunciar "pronto" com medida pendente.
        if ((action.status === 'pronto' || action.status === 'copiado-demo') && !composeCase(current, state.values[current.id]).complete) {
          return state
        }
        return { ...state, status: action.status }
      case 'showcase':
        return action.state
      case 'takeOver':
        return {
          ...state,
          mode: 'manual',
          autoTyping: null,
          // Simulação não pode sobreviver à mão humana: vira estado real de edição.
          status: state.status === 'copiado-demo' ? 'pronto' : state.status,
        }
    }
  }
}

export type TimelineStep = { at: number; action: HeroAction }

export const TIMING = { firstChoice: 900, betweenChoices: 800, keystroke: 170, afterTyping: 650, readyToCopy: 1150, copyToNext: 1000 }

/**
 * Roteiro de UM caso, em ms desde a entrada. Com os tempos padrão cada caso
 * dura entre 5 e 6 s (conferido em teste).
 */
export function caseTimeline(heroCase: HeroCase, caseIndex: number, t = TIMING): TimelineStep[] {
  const steps: TimelineStep[] = [{ at: 0, action: { type: 'enterCase', caseIndex, reset: true } }]
  let at = t.firstChoice
  heroCase.script.forEach((item, i) => {
    if (i > 0) at += t.betweenChoices
    steps.push({ at, action: { type: 'choose', field: item.field, option: item.option } })
    if (item.type) {
      steps.push({ at: at + 1, action: { type: 'autoType', field: item.field } })
      for (let k = 1; k <= item.type.length; k += 1) {
        at += t.keystroke
        steps.push({ at, action: { type: 'input', field: item.field, input: item.type.slice(0, k) } })
      }
      steps.push({ at: at + 1, action: { type: 'autoType', field: null } })
    }
  })
  at += t.afterTyping
  steps.push({ at, action: { type: 'status', status: 'pronto' } })
  at += t.readyToCopy
  steps.push({ at, action: { type: 'status', status: 'copiado-demo' } })
  at += t.copyToNext
  // Passo final vazio: marca a duração do caso antes de ir ao próximo.
  steps.push({ at, action: { type: 'autoType', field: null } })
  return steps
}

export function caseDuration(heroCase: HeroCase, t = TIMING) {
  const steps = caseTimeline(heroCase, 0, t)
  return steps[steps.length - 1].at
}

/** Estado final de um caso, aplicado de uma vez (movimento reduzido). */
export function showcaseState(cases: HeroCase[] = HERO_CASES, caseIndex = 0): HeroState {
  const reducer = createHeroReducer(cases)
  const steps = caseTimeline(cases[caseIndex], caseIndex).filter(
    (s) => s.action.type !== 'status' || s.action.status === 'pronto',
  )
  const state = steps.reduce((acc, s) => reducer(acc, s.action), initialHeroState(cases))
  return { ...state, mode: 'manual', autoTyping: null, revision: 0 }
}

export type Timers = {
  set: (fn: () => void, ms: number) => unknown
  clear: (handle: unknown) => void
}

export type AutoplayPhase = 'idle' | 'running' | 'paused' | 'stopped'

/**
 * Relógio da autoplay. Um único timeout pendente por vez; pausar (fora da tela,
 * aba oculta) guarda o passo; `stop` é definitivo e limpa tudo.
 */
export function createAutoplay(opts: { cases?: HeroCase[]; dispatch: (a: HeroAction) => void; timers: Timers; timing?: typeof TIMING }) {
  const cases = opts.cases ?? HERO_CASES
  let phase: AutoplayPhase = 'idle'
  let caseIndex = 0
  let steps = caseTimeline(cases[0], 0, opts.timing)
  let stepIndex = 0
  let handle: unknown = null

  const clear = () => {
    if (handle !== null) opts.timers.clear(handle)
    handle = null
  }

  const schedule = () => {
    clear()
    if (phase !== 'running') return
    if (stepIndex >= steps.length) {
      caseIndex = (caseIndex + 1) % cases.length
      steps = caseTimeline(cases[caseIndex], caseIndex, opts.timing)
      stepIndex = 0
    }
    const prevAt = stepIndex === 0 ? 0 : steps[stepIndex - 1].at
    const delay = Math.max(0, steps[stepIndex].at - prevAt)
    handle = opts.timers.set(() => {
      handle = null
      if (phase !== 'running') return
      opts.dispatch(steps[stepIndex].action)
      stepIndex += 1
      schedule()
    }, delay)
  }

  return {
    get phase() {
      return phase
    },
    get caseIndex() {
      return caseIndex
    },
    start() {
      if (phase !== 'idle') return
      phase = 'running'
      schedule()
    },
    pause() {
      if (phase !== 'running') return
      phase = 'paused'
      clear()
    },
    resume() {
      if (phase !== 'paused') return
      phase = 'running'
      schedule()
    },
    stop() {
      phase = 'stopped'
      clear()
    },
  }
}

export type HeroAutoplay = ReturnType<typeof createAutoplay>
