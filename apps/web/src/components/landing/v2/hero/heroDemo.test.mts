/** Gate da vitrine do hero. Rodar: pnpm exec tsx apps/web/src/components/landing/v2/hero/heroDemo.test.mts */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as importedCases from './heroCases.ts'
import * as importedAutoplay from './heroAutoplay.ts'
import type { HeroAction, HeroState } from './heroAutoplay.ts'

// Mesmo contorno dos outros gates web: o runner isolado agrupa exports em `default`.
const casesModule = (importedCases as typeof importedCases & { default?: typeof importedCases }).default ?? importedCases
const autoplayModule = (importedAutoplay as typeof importedAutoplay & { default?: typeof importedAutoplay }).default ?? importedAutoplay
const { HERO_CASES, checkMeasure, composeCase, buildClipboardText, baselineValues } = casesModule
const { createAutoplay, createHeroReducer, initialHeroState, caseDuration, showcaseState } = autoplayModule

let passed = 0
const test = (name: string, fn: () => void) => {
  fn()
  passed += 1
  console.log(`✓ ${name}`)
}

/** Relógio falso: um timeout por vez é o contrato do controlador. */
function fakeClock() {
  let now = 0
  let seq = 0
  const pending = new Map<number, { at: number; fn: () => void }>()
  return {
    timers: {
      set: (fn: () => void, ms: number) => {
        seq += 1
        pending.set(seq, { at: now + ms, fn })
        return seq
      },
      clear: (h: unknown) => void pending.delete(h as number),
    },
    get pending() {
      return pending.size
    },
    get now() {
      return now
    },
    advance(ms: number) {
      const end = now + ms
      for (;;) {
        const next = [...pending.entries()].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        pending.delete(next[0])
        now = next[1].at
        next[1].fn()
      }
      now = end
    },
  }
}

function harness() {
  const reducer = createHeroReducer(HERO_CASES)
  let state: HeroState = initialHeroState(HERO_CASES)
  const log: Array<{ at: number; action: HeroAction }> = []
  const clock = fakeClock()
  const player = createAutoplay({
    cases: HERO_CASES,
    timers: clock.timers,
    dispatch: (action) => {
      log.push({ at: clock.now, action })
      state = reducer(state, action)
    },
  })
  return {
    clock, player, log, reducer,
    get state() { return state },
    act(action: HeroAction) { state = reducer(state, action) },
  }
}

const bodyTexts = (s: HeroState) => {
  const c = HERO_CASES[s.caseIndex]
  return composeCase(c, s.values[c.id]).body.flatMap((l) => (l.kind === 'text' ? [l.text] : []))
}

test('4 casos: 2 abdome, 1 pelve, 1 tireoide; 3 a 5 s cada', () => {
  assert.deepEqual(HERO_CASES.map((c) => c.source), ['ABDOMEN_TOTAL', 'ABDOMEN_SUPERIOR', 'PELVE_FEMININA', 'TIREOIDE'])
  for (const c of HERO_CASES) {
    const d = caseDuration(c)
    assert.ok(d >= 3000 && d <= 5000, `${c.id} dura ${d} ms`)
  }
})

test('ciclo em ordem e em loop, com pronto e copiado-simulação em cada caso', () => {
  const h = harness()
  h.player.start()
  const total = HERO_CASES.reduce((s, c) => s + caseDuration(c), 0)
  h.clock.advance(total + 100)
  const entered = h.log.filter((e) => e.action.type === 'enterCase').map((e) => (e.action as { caseIndex: number }).caseIndex)
  assert.deepEqual(entered, [0, 1, 2, 3, 0])
  const statuses = h.log.filter((e) => e.action.type === 'status').map((e) => (e.action as { status: string }).status)
  assert.deepEqual(statuses, Array(4).fill(['pronto', 'copiado-demo']).flat())
  assert.equal(h.clock.pending, 1, 'um timeout pendente por vez')
})

test('autoplay escolhe litíase e DIGITA 1,2 no campo numérico', () => {
  const h = harness()
  h.player.start()
  const typed = () => h.log.filter((e) => e.action.type === 'input').map((e) => (e.action as { input: string }).input)
  h.clock.advance(caseDuration(HERO_CASES[0]) - 1)
  assert.deepEqual(typed(), ['1', '1,', '1,2'])
  assert.equal(h.state.values['abdome-total'].vesicula.option, 'litiase')
  assert.ok(bodyTexts(h.state).some((t) => t.includes('medindo 1,2 cm no seu maior eixo')))
  assert.ok(!HERO_CASES[0].fields[1].options.some((o) => /\d/.test(o.label)), 'a medida não mora no rótulo do botão')
})

test('nenhum passo da autoplay mostra frase inválida nem pisca erro de medida', () => {
  const h = harness()
  h.player.start()
  for (let t = 0; t < 20000; t += 50) {
    h.clock.advance(50)
    for (const text of bodyTexts(h.state)) assert.ok(!/undefined|NaN|\{|\bX\b|____|,\s*cm/.test(text), text)
    const c = HERO_CASES[h.state.caseIndex]
    for (const f of c.fields) {
      const v = h.state.values[c.id][f.id]
      const spec = f.options.find((o) => o.id === v.option)?.measure
      if (spec) assert.ok(!['invalid', 'out-of-range'].includes(checkMeasure(v.input, spec).kind), `${c.id}/${f.id}="${v.input}"`)
    }
  }
})

test('validação: vazio, parcial, inválido, fora da faixa, decimal com ponto ou vírgula', () => {
  const spec = { unit: 'cm' as const, min: 0.3, max: 5, label: 'Maior eixo' }
  assert.equal(checkMeasure('', spec).kind, 'empty')
  assert.equal(checkMeasure('1,', spec).kind, 'partial')
  assert.equal(checkMeasure('1,2,3', spec).kind, 'invalid')
  assert.equal(checkMeasure('abc', spec).kind, 'invalid')
  assert.equal(checkMeasure('1,234', spec).kind, 'invalid')
  assert.equal(checkMeasure('0', spec).kind, 'partial', '"0" a caminho de "0,9" não pisca erro')
  assert.equal(checkMeasure('0,2', spec).kind, 'out-of-range', '0,2x nunca alcança 0,3')
  assert.equal(checkMeasure('0,1', spec).kind, 'out-of-range')
  assert.equal(checkMeasure('7', spec).kind, 'out-of-range')
  assert.deepEqual(checkMeasure('1.2', spec), { kind: 'ok', value: 1.2, text: '1,2' })
  assert.deepEqual(checkMeasure(' 1,20 ', spec), { kind: 'ok', value: 1.2, text: '1,2' })

  const c = HERO_CASES[1]
  const values = { ...baselineValues(c), coledoco: { option: 'alargado', input: '0,5' } }
  const doc = composeCase(c, values)
  assert.equal(doc.complete, false, 'colédoco de 0,5 cm não pode virar "alargado"')
  assert.ok(!doc.conclusion.some((l) => l.includes('acima dos limites')))
  assert.ok(doc.body.some((l) => l.kind === 'pending'))
})

test('interação humana para a autoplay na hora e não perde o que foi digitado', () => {
  const h = harness()
  h.player.start()
  // No meio da digitação da vesícula ("1," já escrito).
  const firstInput = h.log.length
  h.clock.advance(1450 + 2 * 170 + 10)
  assert.equal(h.state.values['abdome-total'].vesicula.input, '1,')
  assert.ok(h.log.length > firstInput)
  h.player.stop()
  h.act({ type: 'takeOver' })
  h.act({ type: 'input', field: 'vesicula', input: '2,7' })
  const before = h.log.length
  h.clock.advance(60000)
  assert.equal(h.log.length, before, 'nenhuma ação automática depois do gesto humano')
  assert.equal(h.clock.pending, 0)
  assert.equal(h.state.mode, 'manual')
  assert.equal(h.state.values['abdome-total'].vesicula.input, '2,7')
  // Trocar de exame e voltar não reinicia o que a pessoa fez.
  h.act({ type: 'enterCase', caseIndex: 3, reset: false })
  h.act({ type: 'enterCase', caseIndex: 0, reset: false })
  assert.equal(h.state.values['abdome-total'].vesicula.input, '2,7')
})

test('takeOver converte "copiado (simulação)" em estado real', () => {
  const h = harness()
  h.player.start()
  h.clock.advance(caseDuration(HERO_CASES[0]) - 740)
  assert.equal(h.state.status, 'copiado-demo')
  h.player.stop()
  h.act({ type: 'takeOver' })
  assert.equal(h.state.status, 'pronto')
})

test('movimento reduzido: estado final estático, sem relógio', () => {
  const s = showcaseState(HERO_CASES, 0)
  assert.equal(s.mode, 'manual')
  assert.equal(s.status, 'pronto')
  assert.equal(s.autoTyping, null)
  assert.equal(s.values['abdome-total'].vesicula.input, '1,2')
  assert.ok(composeCase(HERO_CASES[0], s.values['abdome-total']).complete)
})

test('limpeza: pausar, retomar e parar deixam zero timers soltos', () => {
  const h = harness()
  h.player.start()
  h.clock.advance(800)
  h.player.pause()
  assert.equal(h.clock.pending, 0)
  const paused = h.log.length
  h.clock.advance(10000)
  assert.equal(h.log.length, paused, 'pausado não despacha')
  h.player.resume()
  assert.equal(h.clock.pending, 1)
  h.player.stop()
  assert.equal(h.clock.pending, 0)
  h.player.resume()
  h.player.start()
  assert.equal(h.clock.pending, 0, 'stop é definitivo')
})

test('status "pronto" nunca aparece com medida pendente', () => {
  const reducer = createHeroReducer(HERO_CASES)
  let s = initialHeroState(HERO_CASES)
  s = reducer(s, { type: 'choose', field: 'vesicula', option: 'litiase' })
  assert.equal(reducer(s, { type: 'status', status: 'pronto' }).status, 'editando')
  assert.equal(reducer(s, { type: 'status', status: 'copiado-demo' }).status, 'editando')
})

test('área de transferência: só o clique grava; autoplay não tem acesso', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const auto = readFileSync(join(here, 'heroAutoplay.ts'), 'utf8')
  assert.ok(!/clipboard/i.test(auto.replace(/^\s*(\*|\/\/).*$/gm, '')), 'heroAutoplay não pode citar clipboard em código')
  const hook = readFileSync(join(here, 'useHeroDemo.ts'), 'utf8')
  assert.equal(hook.match(/navigator\.clipboard/g)?.length, 1, 'uma única escrita, dentro de copy()')
  const copyBody = hook.slice(hook.indexOf('const copy = useCallback'), hook.indexOf('// Handlers de captura'))
  assert.ok(copyBody.includes('navigator.clipboard.writeText'))
  const s = showcaseState(HERO_CASES, 0)
  const text = buildClipboardText(HERO_CASES[0], s.values['abdome-total'])
  assert.ok(text.startsWith('EXEMPLO ILUSTRATIVO PARCIAL'))
  assert.ok(text.includes('1) '))
})

console.log(`${passed} testes do hero aprovados`)
