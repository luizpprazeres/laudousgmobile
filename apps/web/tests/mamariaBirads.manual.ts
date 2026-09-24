/** Sugestão de BI-RADS por achado — contrato com o adaptador e o renderer reais.
 *
 * Rodar da raiz do repositório:
 *   pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaBirads.manual.ts
 *
 * Casos sintéticos. Provam os LIMITES da sugestão e que ela não muda o laudo
 * sem confirmação — não provam acerto clínico da categoria.
 */
import assert from 'node:assert/strict'
import { aplicarBiradsAchado, sugestoesBiradsMamaria, temAchadoLegado } from '../src/lib/calculators/mamariaBiradsSugestao'
import { adaptarMamaria } from '../src/lib/catalog/mamariaParaCatalogo'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import type { OrganState } from '../src/lib/deterministic'

type Campos = Record<string, string | string[]>

function estado(achados: Array<[string, Campos]>): OrganState {
  const s: OrganState = { fundo: 'heterogeneo', achados_ids: achados.map(([id]) => id) }
  for (const [id, campos] of achados) {
    for (const [k, v] of Object.entries(campos)) s[`achados.${id}.${k}`] = v
  }
  return s
}

const TRIPE = { lado: 'direita', tipo: 'nodulo', eco: 'hipoecoico', forma: 'oval', margem_tipo: 'circunscrita', margem: 'circunscrita', orientacao: 'paralela', posterior: 'nenhuma' }
const um = (campos: Campos) => sugestoesBiradsMamaria(estado([['a', campos]]))[0]

let n = 0
const caso = (nome: string, fn: () => void) => { fn(); n++; console.log(`ok ${nome}`) }

// --- sugestões com critério citado --------------------------------------------
caso('cisto simples → 2', () => {
  const r = um({ lado: 'esquerda', tipo: 'cisto_simples' })
  assert.equal(r.status, 'sugerida'); assert.equal(r.categoria, '2')
})
caso('cistos múltiplos → 2', () => assert.equal(um({ lado: 'direita', tipo: 'multiplos_cistos' }).categoria, '2'))
caso('linfonodo intramamário → 2', () => assert.equal(um({ lado: 'direita', tipo: 'linfonodo_intramamario' }).categoria, '2'))
caso('nódulo oval, circunscrito, paralelo → 3', () => {
  const r = um(TRIPE)
  assert.equal(r.status, 'sugerida'); assert.equal(r.categoria, '3')
})

// --- suspeita só com descritor suspeito marcado, sem subcategoria ----------------
for (const [nome, extra, termo] of [
  ['margem espiculada', { margem_tipo: 'nao_circunscrita', margem: 'espiculada' }, 'margem espiculada'],
  ['margem indistinta', { margem_tipo: 'nao_circunscrita', margem: 'indistinta' }, 'margem indistinta'],
  ['forma irregular', { forma: 'irregular' }, 'forma irregular'],
  ['orientação não paralela', { orientacao: 'nao_paralela' }, 'orientação não paralela'],
  ['sombra posterior', { posterior: 'sombra' }, 'sombra acústica posterior'],
  ['microcalcificações de permeio', { calc: ['microcalc'] }, 'microcalcificações'],
] as const) {
  caso(`nódulo com ${nome} → suspeita, sem categoria`, () => {
    const r = um({ ...TRIPE, ...extra })
    assert.equal(r.status, 'suspeita'); assert.equal(r.categoria, null)
    assert.match(r.motivo, new RegExp(termo))
  })
}
caso('nenhuma sugestão expõe 4A/4B/4C/5', () => {
  const pior = um({ ...TRIPE, forma: 'irregular', margem_tipo: 'nao_circunscrita', margem: 'espiculada', orientacao: 'nao_paralela', posterior: 'sombra', calc: ['microcalc'] })
  assert.equal(pior.categoria, null)
  assert.doesNotMatch(pior.motivo, /4A|4B|4C/)
})

// --- fora da tríade sem descritor suspeito: sem sugestão, não "suspeita" ------
for (const [nome, extra] of [
  ['redondo, circunscrito, paralelo', { forma: 'redonda' }],
  ['anecoico', { eco: 'anecoico' }],
  ['hiperecoico', { eco: 'hiperecoico' }],
  ['padrão posterior combinado', { posterior: 'combinado' }],
] as const) {
  caso(`nódulo ${nome} → revisão, sem categoria`, () => {
    const r = um({ ...TRIPE, ...extra })
    assert.equal(r.status, 'revisao'); assert.equal(r.categoria, null)
  })
}
caso('tríade com calcificação associada (imagem) → revisão, não 3', () => {
  const r = um({ ...TRIPE, calc_sub: 'em_nodulo' })
  assert.equal(r.status, 'revisao'); assert.equal(r.categoria, null)
})
caso('tríade com microcalcificações vindas da imagem → suspeita', () => {
  const r = um({ ...TRIPE, calc_sub: 'microcalcificacoes' })
  assert.equal(r.status, 'suspeita'); assert.equal(r.categoria, null)
})
caso('calcificações gravadas pelo companion (microcalc) → revisão, não incompleta', () => {
  const r = um({ lado: 'direita', tipo: 'calcificacoes', calc: ['microcalc'] })
  assert.equal(r.status, 'revisao'); assert.equal(r.categoria, null)
})
caso('reforço posterior mantém critérios de provável benignidade', () => assert.equal(um({ ...TRIPE, posterior: 'reforco' }).categoria, '3'))
caso('isoecoico mantém critérios de provável benignidade', () => assert.equal(um({ ...TRIPE, eco: 'isoecoico' }).categoria, '3'))

// --- incompletos nunca produzem categoria --------------------------------------
for (const campo of ['eco', 'forma', 'orientacao', 'posterior'] as const) {
  caso(`nódulo sem ${campo} → incompleta`, () => {
    const { [campo]: _omitido, ...resto } = TRIPE
    const r = um(resto)
    assert.equal(r.status, 'incompleta'); assert.equal(r.categoria, null); assert.ok(r.faltando.length === 1)
  })
}
caso('nódulo sem margem → incompleta', () => {
  const { margem: _m, margem_tipo: _t, ...resto } = TRIPE
  const r = um(resto)
  assert.equal(r.status, 'incompleta'); assert.deepEqual(r.faltando, ['Margem'])
})
caso('margem não circunscrita sem subtipo → incompleta', () => {
  const r = um({ ...TRIPE, margem_tipo: 'nao_circunscrita', margem: '' })
  assert.equal(r.status, 'incompleta'); assert.deepEqual(r.faltando, ['Tipo de margem não circunscrita'])
})
for (const [campo, valor] of [['forma', 'lobulada'], ['margem', 'regular'], ['orientacao', 'vertical'], ['posterior', 'atenuacao'], ['eco', 'heterogeneo']] as const) {
  caso(`valor fora do léxico (${campo}=${valor}) → incompleta`, () => {
    const r = um({ ...TRIPE, [campo]: valor })
    assert.equal(r.status, 'incompleta'); assert.equal(r.categoria, null)
  })
}
caso('motivos não citam documentos internos', () => {
  const todos = [TRIPE, { ...TRIPE, forma: 'redonda' }, { ...TRIPE, forma: 'irregular' }, { lado: 'direita', tipo: 'cisto_complicado' }, { lado: 'direita', tipo: 'calcificacoes', calc_sub: 'grosseiras' }]
  for (const c of todos) assert.doesNotMatch(um(c).motivo, /DET-5|pergunta|Atlas|p\. \d/)
})
caso('achado sem mama → incompleta', () => {
  const r = um({ tipo: 'cisto_simples' })
  assert.equal(r.status, 'incompleta'); assert.deepEqual(r.faltando, ['Mama'])
})
caso('achado sem tipo → incompleta', () => assert.equal(um({ lado: 'direita' }).status, 'incompleta'))
caso('calcificações sem padrão → incompleta', () => {
  const r = um({ lado: 'direita', tipo: 'calcificacoes' })
  assert.equal(r.status, 'incompleta'); assert.equal(r.categoria, null)
})

// --- tipos sem sustentação para sugestão automática -------------------------
for (const [tipo, extra] of [
  ['cisto_complicado', {}],
  ['microcistos_agrupados', {}],
  ['achado_nao_nodular', {}],
  ['calcificacoes', { calc_sub: 'grosseiras' }],
  ['calcificacoes', { calc_sub: 'fora_nodulo' }],
  ['calcificacoes', { calc_sub: 'intraductais' }],
] as const) {
  caso(`${tipo} ${JSON.stringify(extra)} → revisão, sem categoria`, () => {
    const r = um({ lado: 'direita', tipo, ...extra })
    assert.equal(r.status, 'revisao'); assert.equal(r.categoria, null)
  })
}
caso('ginecomastia e próteses → não se aplica', () => {
  assert.equal(um({ lado: 'direita', tipo: 'ginecomastia' }).status, 'nao_se_aplica')
  assert.equal(um({ lado: 'direita', tipo: 'proteses' }).status, 'nao_se_aplica')
})

// --- várias lesões, sincronização, manual preservado ---------------------------
caso('várias lesões mantêm ordem, id e status próprios', () => {
  const s = estado([['a', TRIPE], ['b', { lado: 'esquerda', tipo: 'cisto_simples' }], ['c', { ...TRIPE, forma: 'irregular' }]])
  const r = sugestoesBiradsMamaria(s)
  assert.deepEqual(r.map((x) => [x.id, x.indice, x.status, x.categoria]), [['a', 0, 'sugerida', '3'], ['b', 1, 'sugerida', '2'], ['c', 2, 'suspeita', null]])
})
caso('mudar característica atualiza a sugestão', () => {
  const s = estado([['a', TRIPE]])
  assert.equal(sugestoesBiradsMamaria(s)[0].categoria, '3')
  assert.equal(sugestoesBiradsMamaria({ ...s, 'achados.a.forma': 'redonda' })[0].status, 'revisao')
  assert.equal(sugestoesBiradsMamaria({ ...s, 'achados.a.forma': 'irregular' })[0].status, 'suspeita')
})
caso('remover o achado tira a sugestão', () => {
  const s = estado([['a', TRIPE], ['b', { lado: 'esquerda', tipo: 'cisto_simples' }]])
  assert.deepEqual(sugestoesBiradsMamaria({ ...s, achados_ids: ['b'] }).map((x) => x.id), ['b'])
})
caso('rascunho legado sem achados_ids → lista vazia', () => assert.deepEqual(sugestoesBiradsMamaria({ fundo: 'heterogeneo' }), []))
caso('rascunho legado COM achado é reconhecido (painel não diz "nenhum achado")', () => {
  assert.equal(temAchadoLegado({ fundo: 'heterogeneo', md_tipo: 'nodulo' }), true)
  assert.equal(temAchadoLegado({ fundo: 'heterogeneo', md_tipo: 'nenhum', me_tipo: '' }), false)
  assert.equal(temAchadoLegado({ ...estado([['a', TRIPE]]), md_tipo: 'nodulo' }), false)
})
caso('manual diferente da sugestão é preservado e distinto', () => {
  const r = um({ ...TRIPE, birads: '4a' })
  assert.equal(r.categoria, '3'); assert.equal(r.definida, '4A')
})
caso('aplicar grava só a chave birads daquele achado', () => {
  const s = estado([['a', TRIPE], ['b', { lado: 'esquerda', tipo: 'cisto_simples', birads: '2' }]])
  const next = aplicarBiradsAchado(s, 'a', '3')
  const mudou = Object.keys(next).filter((k) => JSON.stringify(next[k]) !== JSON.stringify(s[k]))
  assert.deepEqual(mudou, ['achados.a.birads'])
  assert.equal(next['achados.b.birads'], '2')
  assert.equal(aplicarBiradsAchado(s, 'nao-existe', '3'), s)
  assert.equal(aplicarBiradsAchado(next, 'a', null)['achados.a.birads'], '')
})

// --- contrato real: sugestão não muda o laudo; confirmação muda ----------------
caso('laudo só recebe o BI-RADS depois de aplicado', () => {
  const s = estado([['a', { ...TRIPE, medidas: '1,0 x 0,8 x 0,6' }]])
  const laudo = (st: OrganState) => {
    const { dados } = adaptarMamaria({ mamas: st, __opts: { escopo_exame: 'mamas' } })
    const r = renderizarSelecao('MAMARIA', 'CLASSICO_COMPLETO', [], dados)
    assert.ok(r.ok, JSON.stringify(r))
    return r.texto
  }
  const antes = laudo(s)
  assert.equal(sugestoesBiradsMamaria(s)[0].categoria, '3')
  assert.doesNotMatch(antes, /Categoria BI-RADS® 3/)
  const depois = laudo(aplicarBiradsAchado(s, 'a', '3'))
  assert.match(depois, /Categoria BI-RADS® 3/)
  const limpo = laudo(aplicarBiradsAchado(aplicarBiradsAchado(s, 'a', '3'), 'a', null))
  assert.equal(limpo, antes)
})

console.log(`mamariaBirads: ${n} casos OK`)
