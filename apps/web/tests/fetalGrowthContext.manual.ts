import assert from 'node:assert/strict'
import { initialExamState, obstetrica, morfologico, dopplerObstetrico, type ExamState } from '../src/lib/deterministic'
import { adaptarObstetrica } from '../src/lib/catalog/obstetricaParaCatalogo'
import { adaptarMorfologico } from '../src/lib/catalog/morfologicoParaCatalogo'
import { adaptarDopplerWeb } from '../src/lib/catalog/dopplerWebMode'
import { applyCompanionStructured, type CompanionStructuredPayload } from '../src/lib/companionStructured'
import { companionReenviaPercentil, contextoPercentilMudou, invalidarPercentilManual } from '../src/components/laudar/fetalGrowthContext'

let cases = 0
const PERCENTIL = 'avaliar.sim.percentil'
const ONDE = 'Percentil do peso fetal'

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const inner of Object.values(value)) deepFreeze(inner)
    Object.freeze(value)
  }
  return value
}

function withField(state: ExamState, section: string, key: string, value: string): ExamState {
  return deepFreeze({ ...state, [section]: { ...(state[section] ?? {}), [key]: value } })
}

const scenarios = [
  {
    name: 'OBST', category: obstetrica, dopplerKey: 'realizado.sim.ip_umb',
    adapt: (s: ExamState) => adaptarObstetrica(s),
  },
  {
    name: 'MORFO', category: morfologico, dopplerKey: 'realizado.sim.ip_umb',
    adapt: (s: ExamState) => adaptarMorfologico(s, s.__opts ?? {}),
  },
  {
    name: 'combined', category: dopplerObstetrico, dopplerKey: 'ip_umb',
    adapt: (s: ExamState) => adaptarDopplerWeb(s),
  },
] as const

function base(category: typeof scenarios[number]['category'], percentil = '8,5', avaliar = 'sim'): ExamState {
  const initial = initialExamState(category)
  return deepFreeze({
    ...initial,
    ig: { ...(initial.ig ?? {}), bio_sem: '32', bio_dias: '1' },
    biometria: { ...(initial.biometria ?? {}), dbp: '79', peso: '1850' },
    crescimento_fetal: {
      ...(initial.crescimento_fetal ?? {}),
      avaliar,
      [PERCENTIL]: percentil,
      'avaliar.sim.fonte': 'Hadlock 1991',
      'avaliar.sim.ctg': 'normal',
    },
  })
}

const growthPendencies = (result: { pendencias: { onde: string }[] }) =>
  result.pendencias.filter((p) => p.onde === ONDE)

for (const { name, category, dopplerKey, adapt } of scenarios) {
  const before = base(category)
  const snapshot = JSON.stringify(before)
  assert.deepEqual(growthPendencies(adapt(before)), [], `${name}: base sem pendência`)

  // Peso/IG semanticamente alterados: limpa só o percentil e bloqueia.
  for (const [section, key, value] of [['biometria', 'peso', '1900'], ['ig', 'bio_sem', '33'], ['ig', 'bio_dias', '2'], ['ig', 'bio_sem', '']] as const) {
    const next = withField(before, section, key, value)
    const out = invalidarPercentilManual(before, next)
    assert.notEqual(out, next, `${name} ${key}: nova referência`)
    assert.equal(out.crescimento_fetal?.[PERCENTIL], '')
    assert.deepEqual({ ...out.crescimento_fetal, [PERCENTIL]: '8,5' }, before.crescimento_fetal)
    assert.equal(out.crescimento_fetal?.avaliar, 'sim')
    for (const other of Object.keys(next).filter((id) => id !== 'crescimento_fetal')) {
      assert.equal(out[other], next[other], `${name} ${key}: seção ${other} preservada`)
    }
    assert.equal(next.crescimento_fetal?.[PERCENTIL], '8,5')
    assert.equal(JSON.stringify(before), snapshot)
    assert.deepEqual(growthPendencies(adapt(out)), [{
      onde: ONDE, valor: '', motivo: 'Informe um número entre 0 e 100, sem %.', bloqueia: true,
    }], `${name} ${key}: bloqueio herdado`)
    cases++
  }

  // Formatação equivalente e campos não relacionados: mesmo objeto.
  for (const [section, key, value] of [
    ['biometria', 'peso', '1850.0'], ['biometria', 'peso', ' 1850 '], ['ig', 'bio_sem', '32,0'], ['ig', 'bio_dias', ' 1 '],
    ['biometria', 'dbp', '81'], ['ig', 'referencia', 'dum'], ['crescimento_fetal', 'avaliar.sim.fonte', 'Intergrowth-21st'],
    ['doppler', dopplerKey, '1,1'], ['feto', 'bcf', '140'],
  ] as const) {
    const next = withField(before, section, key, value)
    assert.equal(invalidarPercentilManual(before, next), next, `${name} ${key}=${value}: não invalida`)
    assert.equal(contextoPercentilMudou(before, next), false)
    cases++
  }

  // Sem percentil preenchido: nada a invalidar.
  for (const empty of ['', '   ']) {
    const noPercentile = base(category, empty)
    const next = withField(noPercentile, 'biometria', 'peso', '2000')
    assert.equal(invalidarPercentilManual(noPercentile, next), next)
    cases++
  }
  const withoutGrowth = deepFreeze({ ig: { bio_sem: '32' } }) as ExamState
  const withoutGrowthNext = withField(withoutGrowth, 'ig', 'bio_sem', '33')
  assert.equal(invalidarPercentilManual(withoutGrowth, withoutGrowthNext), withoutGrowthNext)
  cases++

  // Rascunho oculto com avaliar=nao também é limpo; avaliar não muda.
  const off = base(category, '8,5', 'nao')
  const offOut = invalidarPercentilManual(off, withField(off, 'ig', 'bio_dias', '3'))
  assert.equal(offOut.crescimento_fetal?.[PERCENTIL], '')
  assert.equal(offOut.crescimento_fetal?.avaliar, 'nao')
  assert.deepEqual(growthPendencies(adapt(offOut)), [])
  cases++

  // Percentil reescrito na mesma atualização é o valor novo.
  const rewritten = deepFreeze({
    ...before,
    biometria: { ...before.biometria, peso: '1900' },
    crescimento_fetal: { ...before.crescimento_fetal, [PERCENTIL]: '12' },
  })
  assert.equal(invalidarPercentilManual(before, rewritten), rewritten)
  cases++

  // Reset isolado da IG invalida; reset agrupado já zera o percentil.
  const igReset = deepFreeze({ ...before, ig: { bio_sem: '', bio_dias: '', referencia: 'nenhuma' } })
  assert.equal(invalidarPercentilManual(before, igReset).crescimento_fetal?.[PERCENTIL], '')
  const initial = initialExamState(category)
  const groupedReset = deepFreeze({ ...before, biometria: initial.biometria!, crescimento_fetal: initial.crescimento_fetal! })
  assert.equal(invalidarPercentilManual(before, groupedReset), groupedReset)
  cases += 2
}

// Companion: OBST/MORFO.
for (const { name, category, adapt } of scenarios.filter((s) => s.name !== 'combined')) {
  const before = base(category)
  const cat = category.id as 'OBSTETRICA' | 'MORFOLOGICO'
  const applyTo = (state: ExamState, data: CompanionStructuredPayload['data']) => {
    const payload: CompanionStructuredPayload = { category: cat, data }
    const applied = applyCompanionStructured(state, payload)
    return invalidarPercentilManual(state, applied, companionReenviaPercentil(payload, applied))
  }
  const apply = (data: CompanionStructuredPayload['data']) => applyTo(before, data)

  // O formulário já preenchido vence o Companion; divergências ficam para revisão.
  const changed = apply({ weight: '1,95 kg', gestAgeBiometry: '33s 2d' })
  assert.equal(changed.biometria?.peso, '1850')
  assert.equal(changed.ig?.bio_sem, '32')
  assert.equal(changed.crescimento_fetal?.[PERCENTIL], '8,5')
  assert.equal(changed.crescimento_fetal?.['avaliar.sim.fonte'], 'Hadlock 1991')
  assert.equal(changed.biometria?.companion_conflitos.length, 1)
  assert.equal(changed.ig?.companion_conflitos.length, 2)
  assert.equal(growthPendencies(adapt(changed)).length, 0, `${name}: dados digitados seguem válidos`)

  assert.equal(apply({ weight: '1850 g', gestAgeBiometry: '32s 1d' }).crescimento_fetal?.[PERCENTIL], '8,5')
  assert.equal(apply({ dbp: '8,1 cm' }).crescimento_fetal?.[PERCENTIL], '8,5')
  assert.equal(apply({ weight: '1950 g', percentile: '12' }).crescimento_fetal?.[PERCENTIL], '8,5')
  assert.equal(apply({ weight: '1950 g', percentile: '8,5' }).crescimento_fetal?.[PERCENTIL], '8,5')
  assert.equal(apply({ weight: '1950 g', percentile: 'n/d' }).crescimento_fetal?.[PERCENTIL], '8,5')

  // Se peso/IG estavam vazios, eles podem ser preenchidos. Um percentil antigo
  // conflitante não ganha passe livre só porque também veio no payload.
  const emptyContext = deepFreeze({
    ...before,
    biometria: { ...before.biometria, peso: '' },
    ig: { ...before.ig, bio_sem: '', bio_dias: '' },
  })
  const contextOnly = applyTo(emptyContext, { weight: '1950 g', gestAgeBiometry: '33s2d' })
  assert.equal(contextOnly.biometria?.peso, '1950')
  assert.equal(contextOnly.ig?.bio_sem, '33')
  assert.equal(contextOnly.crescimento_fetal?.[PERCENTIL], '')
  const conflictingPercentile = applyTo(emptyContext, { weight: '1950 g', gestAgeBiometry: '33s2d', percentile: '12' })
  assert.equal(companionReenviaPercentil(
    { category: cat, data: { percentile: '12' } },
    conflictingPercentile,
  ), false)
  assert.equal(conflictingPercentile.crescimento_fetal?.[PERCENTIL], '')
  cases += 8
}

// Companion Doppler combinado não grava percentil: IG nova invalida mesmo com percentile no payload.
{
  const filled = base(dopplerObstetrico)
  const before = deepFreeze({ ...filled, ig: { ...filled.ig, bio_sem: '', bio_dias: '' } })
  const payload: CompanionStructuredPayload = { category: 'DOPPLER_OBSTETRICO', data: { gestAge: '33 semanas', percentile: '50' } }
  assert.equal(companionReenviaPercentil(payload), false)
  const applied = applyCompanionStructured(before, payload)
  const out = invalidarPercentilManual(before, applied, companionReenviaPercentil(payload, applied))
  assert.equal(out.ig?.bio_sem, '33')
  assert.equal(out.crescimento_fetal?.[PERCENTIL], '')
  assert.equal(growthPendencies(adaptarDopplerWeb(out)).length, 1)
  cases++
}

// Doppler isolado: percentil oculto é limpo, mas o modo segue sem pendência de crescimento.
{
  const combined = base(dopplerObstetrico)
  const isolated = deepFreeze({ ...combined, __opts: { ...(combined.__opts ?? {}), somente_doppler: 'sim' } })
  const out = invalidarPercentilManual(isolated, withField(isolated, 'ig', 'bio_sem', '34'))
  assert.equal(out.crescimento_fetal?.[PERCENTIL], '')
  assert.deepEqual(growthPendencies(adaptarDopplerWeb(out)), [])
  assert.equal(out.__opts?.somente_doppler, 'sim')
  cases++
}

console.log(`${cases} fetal growth context cases passed: OBST/MORFO/combined, IG/peso, equivalentes, companion, isolado`)
