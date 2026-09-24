/**
 * MSK — descritores tendíneos compartilhados + lados independentes.
 *
 * SELEÇÃO → ADAPTER → RENDERER REAL (`renderizarSelecao`, o mesmo caminho da rota
 * `/api/catalog/MUSCULOESQUELETICO/render`), nos dois estilos. Nada aqui compara
 * texto do adaptador com texto do adaptador: toda asserção lê o laudo renderizado.
 *
 * Rodar: cd apps/api && pnpm exec tsx --env-file=../../.env \
 *   src/server/renderer/catalog/__tests__/msk-descritores-lados.manual.ts
 *
 * Isto NÃO valida a redação clínica dos descritores (proposta a revisar); valida
 * que cada seleção chega ao laudo, no lado certo, e que nada vaza entre lados,
 * segmentos e estados.
 */
import assert from 'node:assert/strict'
import { renderizarSelecao } from '../alteracoes'
import { ACHADOS_CANONICOS } from '../../categories/MUSCULOESQUELETICO'
import { musculoesqueletico } from '../../../../../../web/src/lib/deterministic'
import {
  PADROES_TENDAO_MSK,
  PERFIS_MSK,
  SEGMENTOS,
  idSecaoMsk,
  lerMedidaMsk,
} from '../../../../../../web/src/lib/deterministic/organs/musculoesqueletico'
import {
  adaptarMusculoesqueletico,
  migrateLegacyMskState,
} from '../../../../../../web/src/lib/catalog/musculoesqueleticoParaCatalogo'

type Estado = Record<string, unknown>
type Patch = Record<string, string>

const NEUTRA = 'Alteração ecográfica na topografia avaliada, detalhada na conclusão.'

/**
 * Estado inicial como a tela o monta (`initialExamState`): initialState da UNIÃO de
 * seções + controles padrão. A união usa os ids LEGADOS — as chaves por lado só
 * passam a existir quando o médico toca em uma estrutura (ou pelo Reset dela).
 */
function inicial(opts: Record<string, string>): Estado {
  const estado: Estado = Object.fromEntries(
    musculoesqueletico.sections.filter((s) => s.module).map((s) => [s.id, s.module!.initialState()]),
  )
  estado.__opts = opts
  return estado
}

function com(estado: Estado, secoes: Record<string, Patch>): Estado {
  const novo: Estado = { ...estado }
  for (const [id, patch] of Object.entries(secoes)) novo[id] = { ...(novo[id] as Patch), ...patch }
  return novo
}

const tendinopatia = (extra: Patch = {}): Patch => ({ estado: 'tendinopatia', ...extra })

function renderizar(estado: Estado) {
  const adaptado = adaptarMusculoesqueletico(estado)
  const saida: Record<'CLASSICO_COMPLETO' | 'OBJETIVO', string> = { CLASSICO_COMPLETO: '', OBJETIVO: '' }
  for (const estilo of ['CLASSICO_COMPLETO', 'OBJETIVO'] as const) {
    const r = renderizarSelecao('MUSCULOESQUELETICO', estilo, [], adaptado.dados)
    assert.equal(r.ok, true, `MSK ${estilo} não renderizou`)
    if (r.ok) saida[estilo] = r.texto
  }
  return { adaptado, textos: saida }
}

const blocos = (texto: string) => texto.split(/\n\n(?=ULTRASSONOGRAFIA )/)
const corpoDe = (bloco: string) =>
  bloco.split(/OS SEGUINTES ASPECTOS FORAM OBSERVADOS:|\nACHADOS:/)[1]!.split(/\nCONCLUSÃO:|\nIMPRESSÃO:/)[0]!
const conclusaoDe = (bloco: string) => bloco.split(/\nCONCLUSÃO:|\nIMPRESSÃO:/)[1]!

/** Roda a asserção nos dois estilos. */
function emAmbos(textos: Record<string, string>, fn: (texto: string, estilo: string) => void) {
  for (const [estilo, texto] of Object.entries(textos)) fn(texto, estilo)
}

const NORMAL_EXTENSORES = 'Tendões extensores comuns (epicôndilo lateral) de espessura e ecotextura preservadas.'
const NORMAL_FLEXORES = 'Tendões flexores comuns (epicôndilo medial) de espessura e ecotextura preservadas.'
let casos = 0
const caso = (nome: string, fn: () => void) => { fn(); casos++; void nome }

// ───────────────────────── 1 · padrão sozinho = achado canônico (fonte única) ─────────────────────────

caso('padrão sem descritor usa a biblioteca canônica do renderer', () => {
  const estado = com(inicial({ segmento: 'cotovelo', lado: 'direito' }), {
    [idSecaoMsk('cotovelo', 'direito', 'extensores')]: tendinopatia(),
  })
  const { adaptado, textos } = renderizar(estado)
  assert.deepEqual(adaptado.pendencias, [])
  const alt = (adaptado.dados.laudos[0]!.alteracoes as Array<Record<string, unknown>>)[0]!
  assert.equal(alt.achado_tipo, 'epicondilite_lateral')
  assert.equal(alt.descricao_livre, null)
  emAmbos(textos, (t) => {
    assert.match(t, /ULTRASSONOGRAFIA DO COTOVELO DIREITO/)
    assert.ok(t.includes(ACHADOS_CANONICOS.epicondilite_lateral!.corpo), 'corpo canônico ausente')
    assert.match(t, /Epicondilite lateral/)
    assert.doesNotMatch(t, /ecograficamente normal/)
    assert.doesNotMatch(t, new RegExp(NEUTRA))
    assert.ok(t.includes(NORMAL_FLEXORES), 'estrutura não alterada deve continuar normal')
    assert.ok(!t.includes(NORMAL_EXTENSORES), 'a estrutura alterada não pode repetir a frase normal')
  })
})

// ───────────────────────── 2 · descritores chegam ao laudo, corpo ≠ conclusão ─────────────────────────

caso('todo descritor selecionado aparece no corpo, na ordem, e o diagnóstico só na conclusão', () => {
  const estado = com(inicial({ segmento: 'cotovelo', lado: 'direito' }), {
    [idSecaoMsk('cotovelo', 'direito', 'flexores')]: tendinopatia({
      'estado.tendinopatia.localizacao': 'insercional',
      'estado.tendinopatia.focos_anecoicos': 'sim',
      'estado.tendinopatia.calcificacao': 'sim',
      'estado.tendinopatia.medidas': '1,2 x 0,8',
    }),
  })
  const { adaptado, textos } = renderizar(estado)
  const alt = (adaptado.dados.laudos[0]!.alteracoes as Array<Record<string, unknown>>)[0]!
  assert.equal(alt.achado_tipo, 'outro')
  emAmbos(textos, (t) => {
    const corpo = corpoDe(t)
    const ordem = [
      'com acometimento da porção insercional',
      'com focos anecoicos intrasubstanciais',
      'com focos ecogênicos de calcificação',
      'medindo 1,2 x 0,8 cm',
    ].map((frag) => corpo.indexOf(frag))
    assert.ok(ordem.every((i) => i >= 0), `descritor ausente: ${ordem}`)
    assert.deepEqual([...ordem].sort((a, b) => a - b), ordem, 'ordem dos descritores instável')
    assert.doesNotMatch(corpo, /tendinopatia/i, 'diagnóstico não pode entrar no corpo')
    assert.match(conclusaoDe(t), /Tendinopatia dos tendões flexores comuns \(epicôndilo medial\) à direita\./)
    assert.ok(!corpo.includes(NORMAL_FLEXORES))
  })
})

caso('rotura parcial: canônico sozinho; com medida vira descrição composta', () => {
  const sozinha = renderizar(com(inicial({ segmento: 'ombro', lado: 'esquerdo' }), {
    [idSecaoMsk('ombro', 'esquerdo', 'supraespinhal')]: { estado: 'rotura_parcial' },
  }))
  emAmbos(sozinha.textos, (t) => {
    assert.ok(t.includes(ACHADOS_CANONICOS.ruptura_parcial_supraespinhal!.corpo))
    assert.match(t, /Ruptura parcial do supraespinhal/)
  })
  const medida = renderizar(com(inicial({ segmento: 'ombro', lado: 'esquerdo' }), {
    [idSecaoMsk('ombro', 'esquerdo', 'supraespinhal')]: { estado: 'rotura_parcial', 'estado.rotura_parcial.medidas': '8 x 5 mm' },
  }))
  emAmbos(medida.textos, (t) => {
    assert.match(corpoDe(t), /Tendão supraespinhal com solução de continuidade parcial das fibras, medindo 8 x 5 mm\./)
    assert.match(conclusaoDe(t), /Rotura parcial do supraespinhal à esquerda\./)
  })
})

caso('padrão SEM slug e SEM descritor mantém a morfologia do padrão no corpo (não cai na frase neutra)', () => {
  // rotura completa do Aquiles: não há achado canônico nem descritor selecionado
  const { adaptado, textos } = renderizar(com(inicial({ segmento: 'tornozelo', lado: 'direito' }), {
    [idSecaoMsk('tornozelo', 'direito', 'aquiles')]: { estado: 'rotura_completa' },
  }))
  const alt = (adaptado.dados.laudos[0]!.alteracoes as Array<Record<string, unknown>>)[0]!
  assert.equal(alt.achado_tipo, 'outro')
  assert.equal(alt.descricao_livre, 'Tendão calcâneo (de Aquiles) com solução de continuidade completa das fibras.')
  emAmbos(textos, (t) => {
    assert.ok(corpoDe(t).includes('Tendão calcâneo (de Aquiles) com solução de continuidade completa das fibras.'))
    assert.ok(!corpoDe(t).includes(NEUTRA), 'corpo não pode perder a morfologia enquanto a conclusão diagnostica')
    assert.ok(!corpoDe(t).includes('Tendão calcâneo (de Aquiles) de espessura'), 'a frase normal não pode voltar')
    assert.doesNotMatch(corpoDe(t), /rotura/i, 'diagnóstico não entra no corpo')
    assert.match(conclusaoDe(t), /Rotura completa do tendão calcâneo \(Aquiles\) à direita\./)
  })
})

// ───────────────────────── 3 · texto livre preservado ─────────────────────────

caso('texto livre digitado é preservado; descritores entram numa segunda frase', () => {
  const { textos } = renderizar(com(inicial({ segmento: 'cotovelo', lado: 'direito' }), {
    [idSecaoMsk('cotovelo', 'direito', 'extensores')]: tendinopatia({
      'estado.tendinopatia.corpo': 'Espessamento focal com perda do padrão fibrilar',
      'estado.tendinopatia.medidas': '1',
    }),
  }))
  emAmbos(textos, (t) => {
    assert.match(corpoDe(t), /Espessamento focal com perda do padrão fibrilar\. Tendão extensor comum \(epicôndilo lateral\) medindo 1 cm\./)
  })
  const soDiag = renderizar(com(inicial({ segmento: 'cotovelo', lado: 'direito' }), {
    [idSecaoMsk('cotovelo', 'direito', 'extensores')]: tendinopatia({ 'estado.tendinopatia.diag': 'Epicondilite lateral crônica' }),
  }))
  emAmbos(soDiag.textos, (t) => {
    assert.ok(t.includes(ACHADOS_CANONICOS.epicondilite_lateral!.corpo))
    assert.match(conclusaoDe(t), /Epicondilite lateral crônica/)
  })
})

caso('"Outra alteração" (texto livre legado) continua literal', () => {
  const { adaptado, textos } = renderizar(com(inicial({ segmento: 'cotovelo', lado: 'direito' }), {
    [idSecaoMsk('cotovelo', 'direito', 'derrame')]: {
      estado: 'alterado',
      'estado.alterado.corpo': 'Lâmina líquida no recesso posterior',
      'estado.alterado.diag': 'Derrame articular no cotovelo direito',
    },
  }))
  const alt = (adaptado.dados.laudos[0]!.alteracoes as Array<Record<string, unknown>>)[0]!
  assert.equal(alt.achado_tipo, 'outro')
  emAmbos(textos, (t) => {
    assert.match(t, /Lâmina líquida no recesso posterior/)
    assert.match(t, /Derrame articular no cotovelo direito/)
  })
})

// ───────────────────────── 4 · falha fechada ─────────────────────────

caso('medida ilegível, opção desconhecida e padrão desconhecido bloqueiam', () => {
  const ruim = (patch: Patch, esperado: RegExp, estrutura = 'extensores') => {
    const a = adaptarMusculoesqueletico(com(inicial({ segmento: 'cotovelo', lado: 'direito' }), {
      [idSecaoMsk('cotovelo', 'direito', estrutura)]: patch,
    }))
    assert.equal(a.pendencias.length, 1, JSON.stringify(patch))
    assert.equal(a.pendencias[0]!.bloqueia, true)
    assert.match(`${a.pendencias[0]!.onde} ${a.pendencias[0]!.motivo}`, esperado)
    assert.deepEqual(a.dados.laudos[0]!.alteracoes, [], 'estrutura com pendência não vira laudo normal nem alterado')
  }
  ruim(tendinopatia({ 'estado.tendinopatia.medidas': '12abc' }), /medida ilegível/)
  ruim(tendinopatia({ 'estado.tendinopatia.medidas': '1 x 2 x 3 x 4' }), /medida ilegível/)
  ruim(tendinopatia({ 'estado.tendinopatia.medidas': '0 x 0' }), /medida ilegível/)
  ruim(tendinopatia({ 'estado.tendinopatia.localizacao': 'inventada' }), /opção desconhecida/)
  ruim({ estado: 'bursite' }, /padrão desconhecido/)
  ruim({ estado: 'tendinopatia' }, /padrão desconhecido/, 'derrame') // estrutura sem perfil tendíneo
})

caso('leitura de medida preserva unidade e não converte', () => {
  assert.equal(lerMedidaMsk('1.2 x 0,8', 3), '1,2 x 0,8 cm')
  assert.equal(lerMedidaMsk('8 x 5 mm', 3), '8 x 5 mm')
  assert.equal(lerMedidaMsk('12 MM', 3), '12 mm')
  assert.equal(lerMedidaMsk('', 3), null)
  assert.equal(lerMedidaMsk('1 x 2 x 3 x 4', 3), null)
})

// ───────────────────────── 5 · lados independentes ─────────────────────────

caso('bilateral assimétrico: cada lado só com o que foi marcado nele', () => {
  const estado = com(inicial({ segmento: 'cotovelo', lado: 'ambos' }), {
    [idSecaoMsk('cotovelo', 'direito', 'extensores')]: tendinopatia({ 'estado.tendinopatia.localizacao': 'insercional' }),
    [idSecaoMsk('cotovelo', 'esquerdo', 'flexores')]: { estado: 'rotura_completa', 'estado.rotura_completa.medidas': '2 x 1' },
  })
  const { adaptado, textos } = renderizar(estado)
  assert.deepEqual(adaptado.dados.laudos.map((l) => l.lado), ['direito', 'esquerdo'])
  emAmbos(textos, (t) => {
    const [dir, esq] = blocos(t)
    assert.equal(blocos(t).length, 2)
    assert.match(dir!, /ULTRASSONOGRAFIA DO COTOVELO DIREITO/)
    assert.match(esq!, /ULTRASSONOGRAFIA DO COTOVELO ESQUERDO/)
    // direito: extensores alterado, flexores normal
    assert.match(corpoDe(dir!), /Tendão extensor comum \(epicôndilo lateral\) com espessamento e alteração da ecotextura, com acometimento da porção insercional\./)
    assert.ok(corpoDe(dir!).includes(NORMAL_FLEXORES))
    assert.match(conclusaoDe(dir!), /Tendinopatia dos tendões extensores comuns \(epicôndilo lateral\) à direita\./)
    assert.doesNotMatch(dir!, /Rotura completa|solução de continuidade/)
    // esquerdo: flexores alterado, extensores normal
    assert.match(corpoDe(esq!), /solução de continuidade completa das fibras, medindo 2 x 1 cm\./)
    assert.ok(corpoDe(esq!).includes(NORMAL_EXTENSORES))
    assert.match(conclusaoDe(esq!), /Rotura completa dos tendões flexores comuns \(epicôndilo medial\) à esquerda\./)
    assert.doesNotMatch(esq!, /Tendinopatia|insercional/)
  })
})

caso('bilateral com lado oposto sem marcação = bloco normal completo (examinado)', () => {
  const { textos } = renderizar(com(inicial({ segmento: 'joelho', lado: 'ambos' }), {
    [idSecaoMsk('joelho', 'direito', 'patelar')]: tendinopatia(),
  }))
  emAmbos(textos, (t) => {
    const [dir, esq] = blocos(t)
    assert.match(dir!, /Tendinopatia patelar/)
    assert.match(esq!, /ULTRASSONOGRAFIA DO JOELHO ESQUERDO/)
    assert.match(conclusaoDe(esq!), /Joelho esquerdo ecograficamente normal|ecograficamente normal/)
    assert.doesNotMatch(esq!, /Tendinopatia/)
  })
})

caso('trocar o lado NÃO leva a patologia junto', () => {
  const marcado = com(inicial({ segmento: 'ombro', lado: 'direito' }), {
    [idSecaoMsk('ombro', 'direito', 'supraespinhal')]: tendinopatia(),
  })
  const doDireito = renderizar(marcado)
  emAmbos(doDireito.textos, (t) => assert.match(t, /OMBRO DIREITO[\s\S]*Tendinopatia do supraespinhal/))

  const trocado = renderizar({ ...marcado, __opts: { segmento: 'ombro', lado: 'esquerdo' } })
  emAmbos(trocado.textos, (t) => {
    assert.equal(blocos(t).length, 1)
    assert.match(t, /ULTRASSONOGRAFIA DO OMBRO ESQUERDO/)
    assert.doesNotMatch(t, /DIREITO/)
    assert.doesNotMatch(t, /Tendinopatia|tendinopatia_supraespinhal|espessamento/)
    assert.match(conclusaoDe(t), /Ombro esquerdo sem alterações ecográficas relevantes/)
  })

  // volta: o estado do direito reaparece intacto
  const volta = renderizar({ ...marcado, __opts: { segmento: 'ombro', lado: 'direito' } })
  assert.equal(volta.textos.CLASSICO_COMPLETO, doDireito.textos.CLASSICO_COMPLETO)
})

caso('remover o lado oposto tira o bloco inteiro; adicionar de novo restaura o que estava marcado', () => {
  const ambos = com(inicial({ segmento: 'cotovelo', lado: 'ambos' }), {
    [idSecaoMsk('cotovelo', 'direito', 'extensores')]: tendinopatia(),
    [idSecaoMsk('cotovelo', 'esquerdo', 'flexores')]: tendinopatia(),
  })
  const comAmbos = renderizar(ambos)
  emAmbos(comAmbos.textos, (t) => assert.equal(blocos(t).length, 2))

  const soDireito = renderizar({ ...ambos, __opts: { segmento: 'cotovelo', lado: 'direito' } })
  emAmbos(soDireito.textos, (t) => {
    assert.equal(blocos(t).length, 1)
    assert.doesNotMatch(t, /ESQUERDO/)
    assert.doesNotMatch(t, /Epicondilite medial/)
    assert.match(t, /Epicondilite lateral/)
  })

  const restaurado = renderizar({ ...ambos, __opts: { segmento: 'cotovelo', lado: 'ambos' } })
  assert.equal(restaurado.textos.CLASSICO_COMPLETO, comAmbos.textos.CLASSICO_COMPLETO)
})

caso('trocar de segmento não leva estado nem lado oposto de outro segmento', () => {
  const cotovelo = com(inicial({ segmento: 'cotovelo', lado: 'ambos' }), {
    [idSecaoMsk('cotovelo', 'direito', 'extensores')]: tendinopatia(),
    [idSecaoMsk('cotovelo', 'esquerdo', 'extensores')]: tendinopatia(),
  })
  const ombro = renderizar({ ...cotovelo, __opts: { segmento: 'ombro', lado: 'direito' } })
  emAmbos(ombro.textos, (t) => {
    assert.equal(blocos(t).length, 1)
    assert.match(t, /ULTRASSONOGRAFIA DO OMBRO DIREITO/)
    assert.doesNotMatch(t, /COTOVELO|Epicondilite|ESQUERDO/)
  })
  const volta = renderizar({ ...cotovelo, __opts: { segmento: 'cotovelo', lado: 'ambos' } })
  emAmbos(volta.textos, (t) => assert.equal(blocos(t).length, 2))
})

caso('lado desconhecido cai em direito (nunca em ambos)', () => {
  const a = adaptarMusculoesqueletico(inicial({ segmento: 'cotovelo', lado: 'qualquer' }))
  assert.deepEqual(a.dados.laudos.map((l) => l.lado), ['direito'])
})

// ───────────────────────── 6 · estado legado unilateral ─────────────────────────

const LEGADO = {
  estado: 'alterado',
  'estado.alterado.corpo': 'Tendão supraespinhal com espessamento focal e perda do padrão fibrilar, sem rotura',
  'estado.alterado.diag': 'Tendinopatia focal do supraespinhal esquerdo',
} satisfies Patch
const TEXTO_LEGADO = /espessamento focal e perda do padrão fibrilar, sem rotura/

const moduloDe = (seg: string, l: 'direito' | 'esquerdo', est: string) =>
  musculoesqueletico.resolveSections!({ segmento: seg, lado: l }).find((s) => s.id === idSecaoMsk(seg, l, est))!.module!

caso('estado legado (chave antiga + __opts.lado) continua valendo como unilateral', () => {
  const legado = com(inicial({ segmento: 'ombro', lado: 'esquerdo' }), { ombro__supraespinhal: LEGADO })
  assert.equal(legado[idSecaoMsk('ombro', 'esquerdo', 'supraespinhal')], undefined, 'a união não deve criar chave de lado')
  const { textos } = renderizar(legado)
  emAmbos(textos, (t) => {
    assert.equal(blocos(t).length, 1)
    assert.match(t, /ULTRASSONOGRAFIA DO OMBRO ESQUERDO/)
    assert.match(t, TEXTO_LEGADO)
    assert.match(t, /Tendinopatia focal do supraespinhal esquerdo/)
  })

  // chave nova PRESENTE com conteúdo vence o legado
  const misto = com(legado, { [idSecaoMsk('ombro', 'esquerdo', 'supraespinhal')]: tendinopatia() })
  emAmbos(renderizar(misto).textos, (t) => {
    assert.match(t, /Tendinopatia do supraespinhal/)
    assert.doesNotMatch(t, /Tendinopatia focal/)
  })
})

caso('Reset NÃO ressuscita o legado: chave nova presente e normal é a palavra final', () => {
  const legado = com(inicial({ segmento: 'ombro', lado: 'esquerdo' }), { ombro__supraespinhal: LEGADO })
  // a tela faz Reset gravando `initialState()` na chave do lado
  const resetado: Estado = {
    ...legado,
    [idSecaoMsk('ombro', 'esquerdo', 'supraespinhal')]: moduloDe('ombro', 'esquerdo', 'supraespinhal').initialState(),
  }
  emAmbos(renderizar(resetado).textos, (t) => {
    assert.doesNotMatch(t, TEXTO_LEGADO)
    assert.doesNotMatch(t, /Tendinopatia focal/)
    assert.match(conclusaoDe(t), /Ombro esquerdo sem alterações ecográficas relevantes/)
  })
})

caso('legado + Ambos: nada é descartado em silêncio — pendência bloqueante', () => {
  const bilateral = com(inicial({ segmento: 'ombro', lado: 'ambos' }), { ombro__supraespinhal: LEGADO })
  const a = adaptarMusculoesqueletico(bilateral)
  assert.equal(a.pendencias.length, 1)
  assert.equal(a.pendencias[0]!.bloqueia, true)
  assert.match(a.pendencias[0]!.onde, /Supraespinhal \(estado legado\)/)
  assert.match(a.pendencias[0]!.motivo, /sem lado definido/)
})

caso('migrateLegacyMskState: leva o legado ao lado ANTERIOR; direito → ambos → esquerdo → direito', () => {
  const antes = com(inicial({ segmento: 'ombro', lado: 'direito' }), { ombro__supraespinhal: LEGADO })
  const legadoRef = antes.ombro__supraespinhal
  const migrado = migrateLegacyMskState(antes)
  assert.notEqual(migrado, antes)
  assert.equal(migrado.ombro__supraespinhal, undefined, 'a chave legada deve sair')
  assert.equal((migrado[idSecaoMsk('ombro', 'direito', 'supraespinhal')] as Patch).estado, 'alterado')
  assert.equal(antes.ombro__supraespinhal, legadoRef, 'não pode mutar o estado recebido')
  assert.equal(migrateLegacyMskState(migrado), migrado, 'idempotente: mesmo objeto quando não há o que migrar')

  // direito → ambos: o achado fica no DIREITO; o esquerdo nasce normal
  const ambos = { ...migrado, __opts: { segmento: 'ombro', lado: 'ambos' } }
  assert.deepEqual(adaptarMusculoesqueletico(ambos).pendencias, [])
  emAmbos(renderizar(ambos).textos, (t) => {
    const [dir, esq] = blocos(t)
    assert.equal(blocos(t).length, 2)
    assert.match(dir!, /OMBRO DIREITO/)
    assert.match(dir!, TEXTO_LEGADO)
    assert.match(esq!, /OMBRO ESQUERDO/)
    assert.doesNotMatch(esq!, TEXTO_LEGADO)
    assert.match(conclusaoDe(esq!), /Ombro esquerdo sem alterações ecográficas relevantes/)
  })

  // ambos → esquerdo: só o esquerdo, normal — o legado NÃO foi remapeado
  const esquerdo = { ...migrado, __opts: { segmento: 'ombro', lado: 'esquerdo' } }
  emAmbos(renderizar(esquerdo).textos, (t) => {
    assert.equal(blocos(t).length, 1)
    assert.match(t, /OMBRO ESQUERDO/)
    assert.doesNotMatch(t, TEXTO_LEGADO)
    assert.doesNotMatch(t, /Tendinopatia focal/)
  })

  // esquerdo → direito: o achado volta intacto
  const volta = { ...migrado, __opts: { segmento: 'ombro', lado: 'direito' } }
  emAmbos(renderizar(volta).textos, (t) => assert.match(t, TEXTO_LEGADO))
})

caso('sem migrar, trocar para o outro lado é exatamente o remapeamento que a migração evita', () => {
  // documenta o risco: por isso `migrateLegacyMskState` precisa rodar ANTES da troca
  const antes = com(inicial({ segmento: 'ombro', lado: 'direito' }), { ombro__supraespinhal: LEGADO })
  const semMigrar = { ...antes, __opts: { segmento: 'ombro', lado: 'esquerdo' } }
  assert.match(renderizar(semMigrar).textos.CLASSICO_COMPLETO, TEXTO_LEGADO)
  const comMigracao = { ...migrateLegacyMskState(antes), __opts: { segmento: 'ombro', lado: 'esquerdo' } }
  assert.doesNotMatch(renderizar(comMigracao).textos.CLASSICO_COMPLETO, TEXTO_LEGADO)
})

caso('migrateLegacyMskState: legado do lado esquerdo migra para o esquerdo; segmento anterior é o que vale', () => {
  const antes = com(inicial({ segmento: 'ombro', lado: 'esquerdo' }), { ombro__supraespinhal: LEGADO })
  const migrado = migrateLegacyMskState(antes)
  assert.equal((migrado[idSecaoMsk('ombro', 'esquerdo', 'supraespinhal')] as Patch).estado, 'alterado')
  assert.equal(migrado[idSecaoMsk('ombro', 'direito', 'supraespinhal')], undefined)
  // trocar de segmento e voltar: o achado segue no esquerdo do ombro
  const joelho = renderizar({ ...migrado, __opts: { segmento: 'joelho', lado: 'esquerdo' } })
  emAmbos(joelho.textos, (t) => assert.doesNotMatch(t, TEXTO_LEGADO))
  const ombroDireito = renderizar({ ...migrado, __opts: { segmento: 'ombro', lado: 'direito' } })
  emAmbos(ombroDireito.textos, (t) => assert.doesNotMatch(t, TEXTO_LEGADO))
  const ombroEsquerdo = renderizar({ ...migrado, __opts: { segmento: 'ombro', lado: 'esquerdo' } })
  emAmbos(ombroEsquerdo.textos, (t) => assert.match(t, TEXTO_LEGADO))

  // legado de OUTRO segmento não é tocado
  const outro = com(inicial({ segmento: 'joelho', lado: 'direito' }), { ombro__supraespinhal: LEGADO })
  assert.equal(migrateLegacyMskState(outro), outro)
  // chave nova já presente vence; a legada sai
  const conflito = com(inicial({ segmento: 'ombro', lado: 'direito' }), {
    ombro__supraespinhal: LEGADO,
    [idSecaoMsk('ombro', 'direito', 'supraespinhal')]: tendinopatia(),
  })
  const resolvido = migrateLegacyMskState(conflito)
  assert.equal(resolvido.ombro__supraespinhal, undefined)
  assert.equal((resolvido[idSecaoMsk('ombro', 'direito', 'supraespinhal')] as Patch).estado, 'tendinopatia')
  // 'ambos' no estado anterior: sem lado, devolve o mesmo objeto (o adaptador acusa)
  const deAmbos = { ...antes, __opts: { segmento: 'ombro', lado: 'ambos' } }
  assert.equal(migrateLegacyMskState(deAmbos), deAmbos)
})

// ───────────────────────── 7 · contrato: slugs e cobertura ─────────────────────────

caso('todo slug do perfil existe na biblioteca e é compatível com a estrutura (renderer real)', () => {
  let verificados = 0
  for (const [chave, perfil] of Object.entries(PERFIS_MSK)) {
    const [seg, est] = chave.split('.') as [string, string]
    for (const [padrao, slug] of Object.entries(perfil.slugs)) {
      const canon = ACHADOS_CANONICOS[slug]
      assert.ok(canon, `${chave}/${padrao}: slug ${slug} não existe em ACHADOS_CANONICOS`)
      const { textos } = renderizar(com(inicial({ segmento: seg, lado: 'direito' }), {
        [idSecaoMsk(seg, 'direito', est)]: { estado: padrao },
      }))
      emAmbos(textos, (t) => {
        assert.ok(t.includes(canon.corpo), `${chave}/${padrao}: corpo canônico não chegou ao laudo`)
        assert.ok(!corpoDe(t).includes(NEUTRA), `${chave}/${padrao}: caiu na frase neutra`)
      })
      verificados++
    }
  }
  const esperados = Object.values(PERFIS_MSK).reduce((n, p) => n + Object.keys(p.slugs).length, 0)
  assert.equal(verificados, esperados)
  assert.ok(verificados >= 13, `poucos slugs verificados: ${verificados}`)
})

caso('toda estrutura tendínea × padrão × lado: descritores completos chegam ao laudo do lado certo', () => {
  let combinacoes = 0
  for (const [chave, perfil] of Object.entries(PERFIS_MSK)) {
    const [seg, est] = chave.split('.') as [string, string]
    for (const l of ['direito', 'esquerdo'] as const) {
      for (const padrao of PADROES_TENDAO_MSK) {
        const patch: Patch = { estado: padrao.value }
        const esperados: string[] = []
        for (const d of padrao.descritores) {
          if (d === 'medidas') { patch[`estado.${padrao.value}.medidas`] = '1,5 x 0,5'; esperados.push('medindo 1,5 x 0,5 cm') }
          if (d === 'localizacao') { patch[`estado.${padrao.value}.localizacao`] = 'insercional'; esperados.push('com acometimento da porção insercional') }
          if (d === 'focos_anecoicos') { patch[`estado.${padrao.value}.focos_anecoicos`] = 'sim'; esperados.push('com focos anecoicos intrasubstanciais') }
          if (d === 'calcificacao') { patch[`estado.${padrao.value}.calcificacao`] = 'sim'; esperados.push('com focos ecogênicos de calcificação') }
        }
        const { adaptado, textos } = renderizar(com(inicial({ segmento: seg, lado: l }), {
          [idSecaoMsk(seg, l, est)]: patch,
        }))
        assert.deepEqual(adaptado.pendencias, [], `${chave}/${padrao.value}`)
        emAmbos(textos, (t) => {
          assert.equal(blocos(t).length, 1)
          assert.match(t, new RegExp(`ULTRASSONOGRAFIA ${SEGMENTOS[seg]!.titulo} ${l.toUpperCase()}`))
          const corpo = corpoDe(t)
          for (const e of esperados) assert.ok(corpo.includes(e), `${chave}/${padrao.value}/${l}: faltou "${e}"`)
          assert.ok(corpo.includes(perfil.sujeito), `${chave}: sujeito ausente`)
          assert.doesNotMatch(t, /transfixante/i, `${chave}/${padrao.value}: "transfixante" é do manguito, não do padrão genérico`)
          assert.ok(conclusaoDe(t).includes(padrao.diag), `${chave}/${padrao.value}: diagnóstico ausente`)
          assert.ok(conclusaoDe(t).includes(l === 'direito' ? 'à direita' : 'à esquerda'), `${chave}: lado errado na conclusão`)
        })
        combinacoes++
      }
    }
  }
  assert.ok(combinacoes >= 100, `combinações insuficientes: ${combinacoes}`)
})

caso('toda estrutura tendínea × padrão SEM descritor: corpo tem morfologia (canônica ou do padrão), nunca a frase neutra', () => {
  let n = 0
  for (const [chave, perfil] of Object.entries(PERFIS_MSK)) {
    const [seg, est] = chave.split('.') as [string, string]
    for (const padrao of PADROES_TENDAO_MSK) {
      const { textos } = renderizar(com(inicial({ segmento: seg, lado: 'esquerdo' }), {
        [idSecaoMsk(seg, 'esquerdo', est)]: { estado: padrao.value },
      }))
      const slug = perfil.slugs[padrao.value]
      emAmbos(textos, (t) => {
        const corpo = corpoDe(t)
        assert.ok(!corpo.includes(NEUTRA), `${chave}/${padrao.value}: corpo caiu na frase neutra`)
        if (slug) assert.ok(corpo.includes(ACHADOS_CANONICOS[slug]!.corpo), `${chave}/${padrao.value}: faltou o corpo canônico`)
        else assert.ok(corpo.includes(`${perfil.sujeito} ${padrao.corpo}.`), `${chave}/${padrao.value}: faltou "${perfil.sujeito} ${padrao.corpo}."`)
        assert.ok(conclusaoDe(t).length > 5, `${chave}/${padrao.value}: conclusão vazia`)
      })
      n++
    }
  }
  assert.equal(n, Object.keys(PERFIS_MSK).length * PADROES_TENDAO_MSK.length)
})

// ───────────────────────── 8 · esquema/seções da tela ─────────────────────────

caso('seções: ids independentes por lado, labels desambiguados e contrato de UI preservado', () => {
  const um = musculoesqueletico.resolveSections!({ segmento: 'cotovelo', lado: 'direito' })
  const dois = musculoesqueletico.resolveSections!({ segmento: 'cotovelo', lado: 'ambos' })
  assert.equal(um.length, 4)
  assert.equal(dois.length, 8)
  assert.equal(new Set(dois.map((s) => s.id)).size, 8, 'ids de seção repetidos entre lados')
  assert.deepEqual(um.map((s) => s.label), ['Extensores (epicôndilo lat.)', 'Flexores (epicôndilo med.)', 'Bíceps/tríceps distais', 'Derrame'])
  assert.ok(dois.slice(0, 4).every((s) => s.label.endsWith('· D')) && dois.slice(4).every((s) => s.label.endsWith('· E')))
  assert.ok(um.every((s) => s.id.startsWith('cotovelo__d__')))
  assert.ok(musculoesqueletico.controls!.find((c) => c.key === 'lado')!.options!.some((o) => o.value === 'ambos'))
  assert.match(musculoesqueletico.resolveTitle!({ segmento: 'joelho', lado: 'ambos' }), /JOELHO DIREITO E ESQUERDO/)

  const tendao = um[0]!.module!
  const campo = tendao.schema.fields[0]!
  assert.equal(campo.presentation, 'select')
  assert.deepEqual(campo.options!.map((o) => o.value), ['normal', 'tendinopatia', 'rotura_parcial', 'rotura_completa', 'alterado'])
  const alterado = campo.options!.find((o) => o.value === 'alterado')!
  assert.deepEqual(alterado.subFields!.map((f) => f.key), ['corpo', 'diag'], 'chaves do texto livre legado mudaram')
  const tend = campo.options!.find((o) => o.value === 'tendinopatia')!
  assert.deepEqual(tend.subFields!.map((f) => f.key), ['localizacao', 'focos_anecoicos', 'calcificacao', 'medidas', 'corpo', 'diag'])
  const rotura = campo.options!.find((o) => o.value === 'rotura_parcial')!
  assert.deepEqual(rotura.subFields!.map((f) => f.key), ['localizacao', 'medidas', 'corpo', 'diag'])
  // defaults visíveis para cada mini-seletor (nenhum estado "sem botão marcado")
  const inicialTendao = tendao.initialState()
  assert.equal(inicialTendao.estado, 'normal')
  assert.equal(inicialTendao['estado.tendinopatia.localizacao'], 'nc')

  // estrutura não tendínea segue como antes: Normal/Alterado, sem select
  const derrame = um[3]!.module!.schema.fields[0]!
  assert.equal(derrame.presentation, undefined)
  assert.deepEqual(derrame.options!.map((o) => o.value), ['normal', 'alterado'])
  assert.equal(derrame.options![1]!.label, 'Alterado')
})

caso('estado inicial é normal em todos os segmentos e lados (nada vira alteração por padrão)', () => {
  for (const seg of Object.keys(SEGMENTOS)) {
    for (const l of ['direito', 'esquerdo', 'ambos']) {
      const { adaptado, textos } = renderizar(inicial({ segmento: seg, lado: l }))
      assert.deepEqual(adaptado.pendencias, [])
      assert.ok(adaptado.dados.laudos.every((x) => x.alteracoes.length === 0))
      emAmbos(textos, (t) => assert.equal(blocos(t).length, l === 'ambos' ? 2 : 1))
    }
  }
})

console.log(`MSK descritores + lados independentes: ${casos} casos aprovados (seleção → adapter → renderer real, estilos Clássico e Objetivo)`)
