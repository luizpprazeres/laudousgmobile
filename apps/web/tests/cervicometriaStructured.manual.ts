/**
 * CERVICOMETRIA isolada — formulário Web → adaptador → renderer de produção.
 * Unidade cm/mm estrita, faixas plausíveis, campos obrigatórios e conclusões
 * condicionais (colo, orifício, cerclagem, placenta prévia ≥ 32 semanas).
 */
import assert from 'node:assert/strict'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { adaptarCervicometria } from '../src/lib/catalog/cervicometriaParaCatalogo'
import { initialExamState } from '../src/lib/deterministic/compose'
import { cervicometria } from '../src/lib/deterministic/organs/cervicometria'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

type Estado = Record<string, Record<string, unknown>>
const estado = (campos: Record<string, string>): Estado => {
  const s = initialExamState(cervicometria) as Estado
  return { ...s, cervicometria: { ...s.cervicometria, ...campos } }
}
const normal = (extra: Record<string, string> = {}) => estado({ colo_cm: '3,4', orificio: 'fechado', ...extra })
const bloqueios = (s: Estado) => adaptarCervicometria(s).pendencias.filter((p) => p.bloqueia).map((p) => `${p.onde}: ${p.motivo}`)
function render(s: Estado): string {
  const a = adaptarCervicometria(s)
  assert.deepEqual(a.pendencias, [], 'render só sem pendência')
  const r = renderizarSelecao('CERVICOMETRIA', 'CLASSICO_COMPLETO', [], a.dados as never)
  assert.ok(r.ok, `renderer recusou: ${JSON.stringify(r)}`)
  return (r as { texto: string }).texto
}
const conclusao = (t: string) => t.split('CONCLUSÃO:\n')[1] ?? ''

test('estado vazio não inventa normalidade: comprimento e orifício obrigatórios, sem padrão', () => {
  const inicial = initialExamState(cervicometria) as Estado
  assert.equal(inicial.cervicometria!.orificio, '')
  const orificio = cervicometria.sections[0]!.module!.schema.fields.find((f) => f.key === 'orificio')!
  assert.ok(orificio.options!.every((o) => !o.isDefault))
  const b = bloqueios(inicial)
  assert.ok(b.some((x) => /colo uterino: informe o comprimento/.test(x)), b.join(' | '))
  assert.ok(b.some((x) => /orifício interno: informe se/.test(x)))
})

test('normal: medida em cm, orifício fechado, conclusão de normalidade sem placeholder', () => {
  const t = render(normal())
  assert.match(t, /Distância do orifício interno ao orifício externo do colo uterino de 3,4 cm\./)
  assert.match(t, /Orifício interno do colo uterino fechado\./)
  assert.equal(conclusao(t), 'Colo uterino ecograficamente normal.')
  assert.doesNotMatch(t, /____|REVISAR/)
})

test('unidade: "34 mm" vira 3,4 cm de forma explícita; sem unidade vale cm', () => {
  assert.equal(render(normal({ colo_cm: '34 mm' })), render(normal()))
  assert.equal(render(normal({ colo_cm: '3.4 cm' })), render(normal()))
  assert.equal(adaptarCervicometria(normal({ colo_cm: '25mm' })).dados.colo_oi_oe_cm, 2.5)
})

test('faixa plausível: valor que parece mm sem unidade, fora da faixa ou ilegível bloqueia (sem dividir em silêncio)', () => {
  assert.ok(bloqueios(normal({ colo_cm: '34' })).some((x) => /se a medida foi em milímetros, digite "34 mm"/.test(x)))
  assert.ok(bloqueios(normal({ colo_cm: '6,5' })).some((x) => /fora da faixa plausível/.test(x)))
  assert.ok(bloqueios(normal({ colo_cm: '0' })).some((x) => /fora da faixa plausível/.test(x)))
  assert.ok(bloqueios(normal({ colo_cm: '3,4abc' })).some((x) => /medida ilegível/.test(x)))
  assert.ok(bloqueios(normal({ colo_cm: '80 mm' })).some((x) => /fora da faixa plausível/.test(x)))
  assert.ok(bloqueios(normal({ placenta_cm: '35' })).some((x) => /placenta: .*fora da faixa plausível/.test(x)))
  assert.ok(bloqueios(normal({ ig_semanas: '50' })).some((x) => /idade gestacional fora da faixa/.test(x)))
  assert.ok(bloqueios(normal({ ig_semanas: '33 sem' })).length === 0)
})

test('alterado: comprimento reduzido, acentuadamente reduzido e orifício aberto', () => {
  assert.equal(conclusao(render(normal({ colo_cm: '2,2' }))), 'Comprimento cervical reduzido (medindo 2,2 cm).')
  assert.equal(conclusao(render(normal({ colo_cm: '15 mm' }))), 'Comprimento cervical acentuadamente reduzido (medindo 1,5 cm).')
  const aberto = render(normal({ orificio: 'aberto' }))
  assert.match(aberto, /Orifício interno do colo uterino aberto\./)
  assert.equal(conclusao(aberto), 'Orifício interno do colo uterino aberto (colo medindo 3,4 cm).')
  assert.doesNotMatch(aberto, /ecograficamente normal/)
})

test('conclusões condicionais da placenta e da cerclagem', () => {
  let t = render(normal({ ig_semanas: '33', placenta_cm: '4,2' }))
  assert.match(t, /Extremidade inferior da placenta distando cerca de 4,2 cm do orifício interno do colo\./)
  assert.match(conclusao(t), /Não há sinais de placenta prévia\./)
  t = render(normal({ ig_semanas: '30', placenta_cm: '4,2' }))
  assert.doesNotMatch(t, /placenta prévia/)
  t = render(normal({ ig_semanas: '34' }))
  assert.doesNotMatch(t, /placenta prévia/, 'sem placenta avaliada não conclui prévia')
  t = render(normal({ ig_semanas: '34', placenta_distante: 'sim' }))
  assert.match(t, /placenta distante do orifício interno/)
  assert.match(conclusao(t), /Não há sinais de placenta prévia\./)
  t = render(normal({ cerclagem: 'sim' }))
  assert.match(conclusao(t), /Pontos de cerclagem uterina em topografia habitual\./)
})

test('pendências da placenta: baixa com IG ≥ 32 e medida + "distante" ao mesmo tempo', () => {
  assert.ok(bloqueios(normal({ ig_semanas: '33', placenta_cm: '1,5' })).some((x) => /menos de 2,0 cm.*não há sinais de placenta prévia/.test(x)))
  assert.deepEqual(bloqueios(normal({ ig_semanas: '28', placenta_cm: '1,5' })), [])
  assert.ok(bloqueios(normal({ placenta_cm: '4,2', placenta_distante: 'sim' })).some((x) => /OU "placenta distante/.test(x)))
})

test('reversão: voltar à medida normal devolve o laudo normal sem resíduo', () => {
  const basal = render(normal())
  const s = normal({ colo_cm: '1,5', orificio: 'aberto', cerclagem: 'sim' })
  assert.notEqual(render(s), basal)
  assert.equal(render({ ...s, cervicometria: { ...s.cervicometria, colo_cm: '3,4', orificio: 'fechado', cerclagem: 'nao' } }), basal)
})

test('persistência: o estado salvo (JSON) recompõe o mesmo laudo', () => {
  const s = normal({ colo_cm: '22 mm', ig_semanas: '33', placenta_cm: '4,2' })
  assert.equal(render(JSON.parse(JSON.stringify(s)) as Estado), render(s))
})

console.log(`${cases} cervicometria Web cases passed`)
