import assert from 'node:assert/strict'
import { renderizarSelecao } from '../alteracoes'
import {
  abdomeSuperior,
  prostataSuprapubica,
  viasUrinarias,
  type ExamCategory,
} from '../../../../../../web/src/lib/deterministic'
import { adaptarAbdomeSuperior } from '../../../../../../web/src/lib/catalog/abdomeSuperiorParaCatalogo'
import { adaptarProstataSuprapubica } from '../../../../../../web/src/lib/catalog/prostataParaCatalogo'
import { adaptarViasUrinarias } from '../../../../../../web/src/lib/catalog/viasUrinariasParaCatalogo'

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
  const estado = inicial(abdomeSuperior)
  estado.figado = { ...(estado.figado as object), ecotextura: 'esteatose_leve', porta: 'dilatada' }
  estado.vesicula = {
    ...(estado.vesicula as object),
    conteudo: ['colelitiase'],
    'conteudo.colelitiase.dimensao': '1,2',
    'conteudo.colelitiase.quantidade': 'unico',
  }
  const adaptado = adaptarAbdomeSuperior(estado)
  assert.deepEqual(adaptado.pendencias, [])
  const textos = renderizar('ABDOMEN_SUPERIOR', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /Esteatose hepática.*leve/)
    assert.match(texto, /Litíase (?:da vesícula biliar|biliar)/)
    assert.match(texto, /Veia porta de calibre aumentado/)
    assert.doesNotMatch(texto, /Veia porta (?:de calibre normal|pérvia, de calibre preservado)/)
    assert.doesNotMatch(texto, /Rim direito|Bexiga/)
  }
}

{
  const estado = inicial(viasUrinarias)
  estado.rim_direito = {
    ...(estado.rim_direito as object),
    medidas: '102 x 48 x 51 mm',
    espessura: '1,6',
    achados: ['litiase'],
    'achados.litiase.medida': '7 mm',
    'achados.litiase.local': 'cálices inferiores',
  }
  estado.bexiga = {
    ...(estado.bexiga as object),
    parede: ['espessada'],
    volume_pre: '280',
    residuo: '35',
  }
  const adaptado = adaptarViasUrinarias(estado)
  assert.deepEqual(adaptado.pendencias, [])
  assert.deepEqual((adaptado.dados.rim_direito as { medidas_cm: number[] }).medidas_cm, [10.2, 4.8, 5.1])
  const textos = renderizar('VIAS_URINARIAS', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /0,7 cm/)
    assert.match(texto, /Litíase no rim direito/)
    assert.match(texto, /Resíduo pós-miccional de 35,0 cm³/)
    assert.match(texto, /Bexiga de paredes espessadas/)
  }
}

{
  const estado = inicial(prostataSuprapubica)
  estado.prostata = {
    ...(estado.prostata as object),
    d1: '5,1', d2: '4,4', d3: '3,9', volume: 'aumentada',
    'volume.aumentada.ipp': '0,8', extra: ['calcificacoes'],
  }
  estado.bexiga = {
    ...(estado.bexiga as object),
    achados: ['trabeculacao'], volume_pre: '280', residuo: 'valor', 'residuo.valor.ml': '80',
  }
  const adaptado = adaptarProstataSuprapubica(estado)
  const textos = renderizar('PROSTATA_SUPRAPUBICA', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /peso aproximado de 48,1 gramas/)
    assert.match(texto, /Protrusão prostática intravesical de 0,8 cm \(Grau 2\)/)
    assert.match(texto, /Resíduo pós-miccional de 80 mL/)
    assert.match(texto, /Calcificações prostáticas/)
  }
}

console.log('sprint 16A: três categorias preservam os mesmos achados nos estilos Clássico e Objetivo')
