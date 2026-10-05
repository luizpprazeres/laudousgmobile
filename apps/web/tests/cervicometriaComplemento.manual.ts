/**
 * Complemento de CERVICOMETRIA dentro de OBSTETRICA, MORFOLOGICO e
 * DOPPLER_OBSTETRICO: a mesma leitura estrita e os mesmos portões da categoria
 * isolada (cervicometriaLeitura.ts), sem mudar a redação aprovada do renderer.
 */
import assert from 'node:assert/strict'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { renderCervicometriaBloco } from '../../api/src/server/renderer/categories/CERVICOMETRIA'
import { initialExamState, type ExamState } from '../src/lib/deterministic/compose'
import { obstetrica } from '../src/lib/deterministic/organs/obstetrica'
import { morfologico } from '../src/lib/deterministic/organs/morfologico'
import { dopplerObstetrico } from '../src/lib/deterministic/organs/dopplerObstetrico'
import { adaptarObstetrica } from '../src/lib/catalog/obstetricaParaCatalogo'
import { adaptarMorfologico } from '../src/lib/catalog/morfologicoParaCatalogo'
import { adaptarDopplerObstetrico } from '../src/lib/catalog/dopplerParaCatalogo'
import { adaptarDopplerWeb } from '../src/lib/catalog/dopplerWebMode'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

type Adaptacao = { dados: Record<string, unknown>; alteracoes: string[]; pendencias: Array<{ onde: string; motivo: string; bloqueia?: boolean }> }

/** Base sintética com IG e biometria, e o complemento com os campos dados. */
function base(categoria: typeof obstetrica, campos: Record<string, string> | null, igSem = '33'): ExamState {
  const s = initialExamState(categoria)
  s.ig = { ...s.ig, bio_sem: igSem, bio_dias: '0' }
  s.biometria = { ...(s.biometria ?? {}), dbp: '82', cc: '295', ca: '285', cf: '62', peso: '1900' }
  s.cervicometria = campos
    ? { ...s.cervicometria, realizada: 'sim', ...Object.fromEntries(Object.entries(campos).map(([k, v]) => [`realizada.sim.${k}`, v])) }
    : { ...s.cervicometria, realizada: 'nao' }
  return s
}
const ok = { colo_cm: '3,4', orificio: 'fechado' }

const ADAPTADORES: Array<[string, typeof obstetrica, (s: ExamState) => Adaptacao, string]> = [
  ['OBSTETRICA', obstetrica, (s) => adaptarObstetrica(s as never) as Adaptacao, 'OBSTETRICA'],
  ['MORFOLOGICO', morfologico, (s) => adaptarMorfologico(s as never, {}) as Adaptacao, 'MORFOLOGICO'],
  ['DOPPLER_OBSTETRICO (combinado)', dopplerObstetrico, (s) => adaptarDopplerWeb(s) as Adaptacao, 'OBSTETRICA'],
]

const pendCervico = (a: Adaptacao) => a.pendencias.filter((p) => p.bloqueia && p.onde.startsWith('cervicometria')).map((p) => `${p.onde}: ${p.motivo}`)
function render(categoriaRender: string, a: Adaptacao): string {
  assert.deepEqual(pendCervico(a), [], 'render só sem pendência da cervicometria')
  const r = renderizarSelecao(categoriaRender, 'CLASSICO_COMPLETO', [], a.dados as never)
  assert.ok(r.ok, `renderer recusou: ${JSON.stringify(r).slice(0, 300)}`)
  return (r as { texto: string }).texto
}

for (const [nome, categoria, adaptar, renderCat] of ADAPTADORES) {
  test(`${nome}: desligado não gera dado nem pendência`, () => {
    const a = adaptar(base(categoria, null))
    assert.equal(a.dados.cervicometria, null)
    assert.deepEqual(pendCervico(a), [])
  })

  test(`${nome}: ligado e vazio bloqueia (comprimento e orifício sem padrão)`, () => {
    const s = initialExamState(categoria)
    assert.equal((s.cervicometria as Record<string, unknown>)['realizada.sim.orificio'], '')
    const b = pendCervico(adaptar(base(categoria, {})))
    assert.ok(b.some((x) => /cervicometria — colo uterino: informe o comprimento/.test(x)), b.join(' | '))
    assert.ok(b.some((x) => /cervicometria — orifício interno: informe/.test(x)))
  })

  test(`${nome}: unidade estrita — "34 mm" = 3,4 cm; "34" sem unidade, ilegível e fora da faixa bloqueiam`, () => {
    assert.equal((adaptar(base(categoria, { ...ok, colo_cm: '34 mm' })).dados.cervicometria as Record<string, unknown>).colo_oi_oe_cm, 3.4)
    assert.equal(render(renderCat, adaptar(base(categoria, { ...ok, colo_cm: '34 mm' }))), render(renderCat, adaptar(base(categoria, ok))))
    assert.ok(pendCervico(adaptar(base(categoria, { ...ok, colo_cm: '34' }))).some((x) => /digite "34 mm"/.test(x)))
    assert.ok(pendCervico(adaptar(base(categoria, { ...ok, colo_cm: '3,4abc' }))).some((x) => /medida ilegível/.test(x)))
    assert.ok(pendCervico(adaptar(base(categoria, { ...ok, colo_cm: '6,5' }))).some((x) => /fora da faixa plausível/.test(x)))
    assert.ok(pendCervico(adaptar(base(categoria, { ...ok, placenta_cm: '35' }))).some((x) => /placenta: .*fora da faixa/.test(x)))
  })

  test(`${nome}: placenta baixa com IG ≥ 32 (IG do exame) e medida + "distante" bloqueiam`, () => {
    assert.ok(pendCervico(adaptar(base(categoria, { ...ok, placenta_cm: '1,5' }, '33'))).some((x) => /menos de 2,0 cm/.test(x)))
    assert.deepEqual(pendCervico(adaptar(base(categoria, { ...ok, placenta_cm: '1,5' }, '28'))), [])
    assert.ok(pendCervico(adaptar(base(categoria, { ...ok, placenta_cm: '4,2', placenta_distante: 'sim' }))).some((x) => /OU "placenta distante/.test(x)))
  })

  test(`${nome}: redação aprovada inalterada (bloco do renderer) e reversão sem resíduo`, () => {
    const comCervico = render(renderCat, adaptar(base(categoria, { colo_cm: '22 mm', orificio: 'fechado', placenta_cm: '4,2', cerclagem: 'sim' })))
    const bloco = renderCervicometriaBloco(
      { colo_oi_oe_cm: 2.2, orificio_interno_fechado: true, placenta_distancia_cm: 4.2, placenta_distante: false, cerclagem: true, observacoes: null },
      33,
    )
    for (const linha of [...bloco.achados, ...bloco.conclusao]) assert.ok(comCervico.includes(linha), `${nome}: falta "${linha}"`)
    assert.match(comCervico, /Comprimento cervical reduzido \(medindo 2,2 cm\)\./)
    const semCervico = render(renderCat, adaptar(base(categoria, null)))
    const desligado = base(categoria, { colo_cm: '22 mm', orificio: 'fechado' })
    desligado.cervicometria = { ...desligado.cervicometria, realizada: 'nao' }
    assert.equal(render(renderCat, adaptar(desligado)), semCervico)
  })

  test(`${nome}: persistência — o estado salvo (JSON) recompõe o mesmo laudo`, () => {
    const s = base(categoria, { ...ok, colo_cm: '25 mm', placenta_cm: '4,2' })
    assert.equal(render(renderCat, adaptar(JSON.parse(JSON.stringify(s)))), render(renderCat, adaptar(s)))
  })
}

test('DOPPLER_OBSTETRICO isolado: mesma leitura com a IG do Doppler', () => {
  const estado = (campos: Record<string, string>, ig = '33') => ({
    doppler: { ig_sem: ig },
    cervicometria: { realizada: 'sim', ...Object.fromEntries(Object.entries(campos).map(([k, v]) => [`realizada.sim.${k}`, v])) },
  })
  const pend = (e: ReturnType<typeof estado>) => adaptarDopplerObstetrico(e as never).pendencias.map((p) => `${p.onde}: ${p.motivo}`)
  assert.equal((adaptarDopplerObstetrico(estado({ ...ok, colo_cm: '34 mm' }) as never).dados.cervicometria as Record<string, unknown>).colo_oi_oe_cm, 3.4)
  assert.ok(pend(estado({})).some((x) => /cervicometria — colo uterino/.test(x)))
  assert.ok(pend(estado({ ...ok, placenta_cm: '1,5' })).some((x) => /menos de 2,0 cm/.test(x)))
  assert.deepEqual(pend(estado({ ...ok, placenta_cm: '1,5' }, '30')), [])
  assert.deepEqual(adaptarDopplerObstetrico({ doppler: { ig_sem: '33' } } as never).pendencias, [])
})

test('modo "somente Doppler" ignora a cervicometria oculta (sem pendência fantasma)', () => {
  const s = base(dopplerObstetrico, {})
  s.__opts = { somente_doppler: 'sim' }
  assert.deepEqual(pendCervico(adaptarDopplerWeb(s) as Adaptacao), [])
})

console.log(`${cases} cervicometria complemento cases passed`)
