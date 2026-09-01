import assert from 'node:assert/strict'
import { renderizarSelecao } from '../alteracoes'
import { cervical, cervicometria, type ExamCategory } from '../../../../../../web/src/lib/deterministic'
import { adaptarCervical } from '../../../../../../web/src/lib/catalog/cervicalParaCatalogo'
import { adaptarCervicometria } from '../../../../../../web/src/lib/catalog/cervicometriaParaCatalogo'

function inicial(categoria: ExamCategory): Record<string, unknown> {
  return Object.fromEntries(
    categoria.sections
      .filter((section) => section.module)
      .map((section) => [section.id, section.module!.initialState()]),
  )
}

function renderizar(categoria: string, dados: Record<string, unknown>) {
  const classico = renderizarSelecao(categoria, 'CLASSICO_COMPLETO', [], dados)
  const objetivo = renderizarSelecao(categoria, 'OBJETIVO', [], dados)
  assert.equal(classico.ok, true, `${categoria} clássico não renderizou`)
  assert.equal(objetivo.ok, true, `${categoria} objetivo não renderizou`)
  if (!classico.ok || !objetivo.ok) throw new Error(`${categoria} não renderizou`)
  assert.match(classico.texto, /COMENTÁRIOS:/)
  assert.match(classico.texto, /CONCLUSÃO:/)
  assert.match(objetivo.texto, /TÉCNICA:/)
  assert.match(objetivo.texto, /ACHADOS:/)
  assert.match(objetivo.texto, /IMPRESSÃO:/)
  assert.notEqual(classico.texto, objetivo.texto)
  return { classico: classico.texto, objetivo: objetivo.texto }
}

{
  const estado = inicial(cervical)
  estado.cervical = {
    ...(estado.cervical as object),
    linfonodo: 'alterado',
    'linfonodo.alterado.nivel': 'IIB',
    'linfonodo.alterado.medidas': '18 x 12 x 9 mm',
    'linfonodo.alterado.forma': 'arredondada',
    'linfonodo.alterado.hilo': 'ausente',
    'linfonodo.alterado.vasc': 'periferica',
    'linfonodo.alterado.suspeito': ['sim'],
  }
  const adaptado = adaptarCervical(estado)
  assert.deepEqual((adaptado.dados.linfonodos_alterados as Array<{ medidas_cm: number[] }>)[0]?.medidas_cm, [1.8, 1.2, 0.9])
  const textos = renderizar('CERVICAL', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /nível IIB/)
    assert.match(texto, /1,8 x 1,2 x 0,9 cm/)
    assert.match(texto, /sem hilo ecogênico/)
    assert.match(texto, /vascularização periférica/)
    assert.match(texto, /Linfonodo de aspecto suspeito/)
    assert.doesNotMatch(texto, /Ausência de alterações detectáveis pelo método/)
  }
}

{
  const estado = inicial(cervicometria)
  estado.cervicometria = {
    ...(estado.cervicometria as object),
    colo_cm: '18 mm',
    orificio: 'fechado',
    placenta_cm: '42 mm',
    placenta_distante: 'nao',
    ig_semanas: '33',
    cerclagem: 'sim',
    observacoes: 'Canal endocervical sem conteúdo.',
  }
  const adaptado = adaptarCervicometria(estado)
  assert.equal(adaptado.dados.colo_oi_oe_cm, 1.8)
  assert.equal(adaptado.dados.placenta_distancia_cm, 4.2)
  const textos = renderizar('CERVICOMETRIA', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /colo uterino de 1,8 cm/)
    assert.match(texto, /placenta distando cerca de 4,2 cm/)
    assert.match(texto, /Colo uterino curto.*alto risco/)
    assert.match(texto, /Pontos de cerclagem uterina/)
    assert.match(texto, /Não há sinais de placenta prévia/)
    assert.match(texto, /Canal endocervical sem conteúdo/)
  }
}

{
  const estado = inicial(cervicometria)
  estado.cervicometria = { ...(estado.cervicometria as object), colo_cm: '3,2', orificio: 'aberto' }
  const adaptado = adaptarCervicometria(estado)
  const textos = renderizar('CERVICOMETRIA', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /Orifício interno do colo uterino aberto/)
    assert.match(texto, /risco para trabalho de parto prematuro/)
    assert.doesNotMatch(texto, /Colo uterino ecograficamente normal/)
  }
}

console.log('sprint 16B: Cervical e Cervicometria preservam achados nos estilos Clássico e Objetivo')
