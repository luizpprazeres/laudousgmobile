import assert from 'node:assert/strict'
import { renderDopplerCarotidasWeb } from '@laudousg/shared'
import { adaptarDopplerCarotidas } from './dopplerCarotidasParaCatalogo'
import { initialExamState } from '../deterministic/compose'
import { dopplerCarotidas } from '../deterministic/organs/dopplerCarotidas'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }
type Exam = Record<string, Record<string, unknown>>
const laudo = (exam: Exam) => {
  const a = adaptarDopplerCarotidas(exam)
  assert.deepEqual(a.pendencias, [], JSON.stringify(a.pendencias))
  return renderDopplerCarotidasWeb(a.dados)
}
const motivos = (exam: Exam) => adaptarDopplerCarotidas(exam).pendencias.map(p => `${p.onde}: ${p.motivo}`)
const ladoNormal = { avaliacao: 'avaliado', placas_status: 'ausentes', placas_ids: [] }

test('estado inicial não presume normalidade: avaliação, placas, vertebral e classificação vazios', () => {
  const st = initialExamState(dopplerCarotidas) as Exam
  assert.equal(st.direita!.vertebral_direcao, '')
  assert.equal(st.direita!.avaliacao, '')
  assert.equal(st.conclusao!.classificacao_direita, '')
  const m = motivos(st)
  assert.ok(m.includes('Lado direito: informe se foi avaliado.'))
  assert.ok(m.includes('Lado esquerdo: informe se foi avaliado.'))
})

test('normal explícito bilateral: sem velocidades inventadas; vertebrais só se informadas', () => {
  const base: Exam = { direita: { ...ladoNormal }, esquerda: { ...ladoNormal }, conclusao: { classificacao_direita: 'normal', classificacao_esquerda: 'normal' } }
  let text = laudo(base)
  assert.match(text, /para avaliação bilateral das artérias carótidas\./)
  assert.doesNotMatch(text.split('COMENTÁRIOS:')[1]!, /vertebra|PSV|VDF|IR de|Razão|aspecto habitual|anterógrado/i)
  assert.match(text, /CONCLUSÃO:\nEstudo Doppler das artérias carótidas dentro dos limites da normalidade\.$/)
  base.direita!.vertebral_direcao = 'anterogrado'
  base.esquerda!.vertebral_direcao = 'anterogrado'
  text = laudo(base)
  assert.match(text, /artérias carótidas e vertebrais\./)
  assert.match(text, /Artéria vertebral direita: fluxo anterógrado\./)
  assert.match(text, /CONCLUSÃO:\nEstudo Doppler das artérias carótidas e vertebrais dentro dos limites da normalidade\.$/)
})

test('velocidades, IR e razão ACI/ACC só quando preenchidos', () => {
  const exam: Exam = {
    direita: { ...ladoNormal, comum_vps: '80', interna_vps: '120', interna_vdf: '30', externa_vps: '90' },
    esquerda: { ...ladoNormal, interna_vps: '100' },
    conclusao: { classificacao_direita: 'normal', classificacao_esquerda: 'normal' },
  }
  const text = laudo(exam)
  assert.match(text, /Carótida comum direita: PSV de 80 cm\/s\./)
  assert.match(text, /Carótida interna direita: PSV de 120 cm\/s, VDF de 30 cm\/s, IR de 0,75\./)
  assert.match(text, /Razão PSV carótida interna\/comum à direita: 1,5\./)
  assert.match(text, /Carótida interna esquerda: PSV de 100 cm\/s\./)
  assert.doesNotMatch(text, /Razão PSV carótida interna\/comum à esquerda|Carótida comum esquerda|Carótida externa esquerda/)
})

test('lados separados: classificação própria por lado, placas e vertebral alterada', () => {
  const exam: Exam = {
    direita: {
      avaliacao: 'avaliado', placas_status: 'presentes', placas_ids: ['p1'], interna_vps: '160', interna_vdf: '45',
      'placas.p1.localizacao': 'bulbo carotídeo', 'placas.p1.composicao': 'mista', 'placas.p1.estenose': '55',
    },
    esquerda: { ...ladoNormal, vertebral_direcao: 'retrogrado' },
    conclusao: { classificacao_direita: 'estenose_50_69', classificacao_esquerda: 'normal' },
  }
  const text = laudo(exam)
  assert.match(text, /Placa ateromatosa em bulbo carotídeo, de composição mista, redução luminal informada de 55%\./)
  assert.match(text, /1\) Estenose carotídea de 50 a 69% à direita\.\n2\) Artérias carótidas à esquerda sem alterações ao estudo Doppler\.\n3\) Fluxo retrógrado na artéria vertebral esquerda\./)
  assert.doesNotMatch(text, /Não se observam placas ateromatosas à direita/)
})

test('lado não avaliado e avaliação limitada não viram normal', () => {
  const exam: Exam = {
    direita: { avaliacao: 'limitado', limitacao: 'bifurcação alta', placas_status: 'ausentes' },
    esquerda: { avaliacao: 'nao_avaliado' },
    conclusao: { classificacao_direita: 'normal' },
  }
  const text = laudo(exam)
  assert.match(text, /para avaliação das artérias carótidas à direita\./)
  assert.match(text, /Avaliação limitada: bifurcação alta\./)
  assert.match(text, /Lado esquerdo não avaliado neste exame\./)
  assert.match(text, /1\) Artérias carótidas à direita sem alterações ao estudo Doppler \(avaliação limitada\)\.\n2\) Lado esquerdo não avaliado\./)
  assert.doesNotMatch(text, /dentro dos limites da normalidade/)
})

test('incompleto e conflitos bloqueiam: classificação, placas, VDF > PSV, número inválido', () => {
  const m = motivos({
    direita: { avaliacao: 'avaliado', placas_status: 'presentes', interna_vps: '20', interna_vdf: '30', emi: '0,8 mm' },
    esquerda: { avaliacao: 'nao_avaliado', comum_vps: '80' },
    conclusao: { classificacao_direita: 'normal' },
  })
  for (const esperado of [/registre ao menos uma placa/, /normal conflita com placas presentes/, /VDF não pode superar a PSV/, /espessura médio-intimal direita: valor numérico inválido/, /não avaliado, mas há medidas/]) {
    assert.ok(m.some(x => esperado.test(x)), `${esperado} em ${JSON.stringify(m)}`)
  }
  const semClassificacao = motivos({ direita: { ...ladoNormal }, esquerda: { ...ladoNormal }, conclusao: {} })
  assert.ok(semClassificacao.some(x => /selecione a classificação/.test(x)))
  assert.deepEqual(motivos({ direita: { ...ladoNormal }, esquerda: { ...ladoNormal }, conclusao: { conclusao_livre: 'Texto do médico' } }), [])
})

test('divergência do Companion bloqueia a geração até a revisão manual', () => {
  const exam: Exam = {
    direita: { ...ladoNormal }, esquerda: { ...ladoNormal },
    conclusao: {
      classificacao_direita: 'normal', classificacao_esquerda: 'normal',
      companion_conflitos: ['classificacao_direita::Classificação: digitado normal / recebido estenose_70_99'],
    },
  }
  assert.ok(motivos(exam).includes('Conclusão: há divergências do Companion que precisam ser revisadas nos campos destacados'))
  delete exam.conclusao!.companion_conflitos
  assert.doesNotThrow(() => laudo(exam))
})

// ── Correções do QA de 9edf0ac ───────────────────────────────────────────────
const placa = (pct: string) => ({ avaliacao: 'avaliado', placas_status: 'presentes', placas_ids: ['p1'], 'placas.p1.localizacao': 'bulbo', 'placas.p1.estenose': pct })

test('ateromatose com placas ausentes bloqueia; com placa registrada passa', () => {
  const exam: Exam = { direita: { ...ladoNormal }, esquerda: { ...ladoNormal }, conclusao: { classificacao_direita: 'ateromatose_sem_estenose_significativa', classificacao_esquerda: 'normal' } }
  assert.ok(motivos(exam).includes('Lado direito: ateromatose conflita com "sem placas"; registre as placas ou revise a classificação.'))
  exam.direita = placa('')
  assert.match(laudo(exam), /Ateromatose carotídea à direita/)
})

test('vertebral sem fluxo com PSV bloqueia; sem PSV passa', () => {
  const exam: Exam = { direita: { ...ladoNormal }, esquerda: { ...ladoNormal, vertebral_direcao: 'ausente', vertebral_vps: '40' }, conclusao: { classificacao_direita: 'normal', classificacao_esquerda: 'normal' } }
  assert.ok(motivos(exam).some(m => /vertebral sem fluxo não pode ter PSV/.test(m)))
  exam.esquerda!.vertebral_vps = ''
  const text = laudo(exam)
  assert.match(text, /Artéria vertebral esquerda: fluxo não detectado\./)
  assert.doesNotMatch(text, /PSV de 40/)
})

test('redução da placa incompatível com a classificação bloqueia; maior placa dentro da faixa passa', () => {
  const conclusao = (c: string) => ({ classificacao_direita: c, classificacao_esquerda: 'normal' })
  const casos: Array<[string, string, boolean]> = [
    ['85', 'estenose_menor_50', false], ['85', 'ateromatose_sem_estenose_significativa', false],
    ['85', 'estenose_70_99', true], ['60', 'estenose_50_69', true], ['45', 'estenose_50_69', false],
    ['100', 'estenose_70_99', false], ['100', 'oclusao', true], ['30', 'estenose_menor_50', true],
  ]
  for (const [pct, classe, valido] of casos) {
    const m = motivos({ direita: placa(pct), esquerda: { ...ladoNormal }, conclusao: conclusao(classe) })
    assert.equal(m.some(x => /incompatível com a classificação/.test(x)), !valido, `${pct}% × ${classe}: ${JSON.stringify(m)}`)
  }
  // Várias placas: vale a maior; placa sem percentual não conta.
  const duas = { ...placa('30'), placas_ids: ['p1', 'p2', 'p3'], 'placas.p2.estenose': '60', 'placas.p3.localizacao': 'carótida comum' }
  assert.deepEqual(motivos({ direita: duas, esquerda: { ...ladoNormal }, conclusao: conclusao('estenose_50_69') }), [])
})

console.log(`# ${cases} casos`)
