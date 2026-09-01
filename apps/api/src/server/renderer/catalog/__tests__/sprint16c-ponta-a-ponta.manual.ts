import assert from 'node:assert/strict'
import { renderizarSelecao } from '../alteracoes'
import { musculoesqueletico, partesMoles, type ExamCategory } from '../../../../../../web/src/lib/deterministic'
import { adaptarMusculoesqueletico } from '../../../../../../web/src/lib/catalog/musculoesqueleticoParaCatalogo'
import { adaptarPartesMoles } from '../../../../../../web/src/lib/catalog/partesMolesParaCatalogo'

function inicial(categoria: ExamCategory): Record<string, unknown> {
  const estado: Record<string, unknown> = Object.fromEntries(
    categoria.sections
      .filter((section) => section.module)
      .map((section) => [section.id, section.module!.initialState()]),
  )
  const opcoes = Object.fromEntries(
    (categoria.controls ?? []).flatMap((controle) => {
      const padrao = controle.options?.find((opcao) => opcao.isDefault)
      return padrao ? [[controle.key, padrao.value]] : []
    }),
  )
  if (Object.keys(opcoes).length > 0) estado.__opts = opcoes
  return estado
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
  const estado = inicial(partesMoles)
  estado.partes_moles = {
    lesao: 'nodulo_solido',
    'lesao.nodulo_solido.medidas': '18 x 12 x 9 mm',
    'lesao.nodulo_solido.eco': 'hipoecoica',
    'lesao.nodulo_solido.contornos': 'irregulares',
    'lesao.nodulo_solido.plano': 'muscular',
    'lesao.nodulo_solido.doppler': 'com_fluxo',
    'lesao.nodulo_solido.local': 'na região posterior da coxa direita',
  }
  const adaptado = adaptarPartesMoles(estado)
  const lesao = (adaptado.dados.lesoes as Array<{ medidas_cm: number[] }>)[0]
  assert.deepEqual(lesao?.medidas_cm, [1.8, 1.2, 0.9])
  const textos = renderizar('PARTES_MOLES', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /1,8 x 1,2 x 0,9 cm/)
    assert.match(texto, /contornos irregulares/)
    assert.match(texto, /plano muscular/)
    assert.match(texto, /com fluxo ao Doppler colorido/)
    assert.match(texto, /na região posterior da coxa direita/)
    assert.doesNotMatch(texto, /Ausência de alterações detectáveis pelo método|Exame sem alterações significativas/)
  }
}

{
  const estado = inicial(partesMoles)
  estado.partes_moles = {
    lesao: 'hernia',
    'lesao.hernia.medidas': '1,8',
    'lesao.hernia.parede': 'aponeurose',
    'lesao.hernia.conteudo_h': 'gordura',
    'lesao.hernia.reducao': 'redutível à compressão',
    'lesao.hernia.tipo_h': 'incisional',
    'lesao.hernia.local': 'na linha média infraumbilical',
  }
  const textos = renderizar('PARTES_MOLES', adaptarPartesMoles(estado).dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /Solução de continuidade da aponeurose/)
    assert.match(texto, /herniação de gordura/)
    assert.match(texto, /Hérnia incisional na linha média infraumbilical/)
  }
}

{
  const estado = inicial(musculoesqueletico)
  estado.__opts = { segmento: 'ombro', lado: 'esquerdo' }
  estado.ombro__supraespinhal = {
    estado: 'alterado',
    'estado.alterado.corpo': 'Tendão supraespinhal com espessamento focal e perda do padrão fibrilar, sem rotura',
    'estado.alterado.diag': 'Tendinopatia focal do supraespinhal esquerdo',
  }
  const adaptado = adaptarMusculoesqueletico(estado)
  assert.deepEqual(adaptado.pendencias, [])
  const textos = renderizar('MUSCULOESQUELETICO', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /ULTRASSONOGRAFIA DO OMBRO ESQUERDO/)
    assert.match(texto, /espessamento focal e perda do padrão fibrilar, sem rotura/)
    assert.match(texto, /Tendinopatia focal do supraespinhal esquerdo/)
    assert.doesNotMatch(texto, /Ombro esquerdo sem alterações ecográficas relevantes/)
  }
}

{
  const estado = inicial(musculoesqueletico)
  estado.__opts = { segmento: 'joelho', lado: 'direito' }
  estado.joelho__pata_de_ganso = {
    estado: 'alterado',
    'estado.alterado.corpo': '',
    'estado.alterado.diag': 'Tendinopatia da pata de ganso à direita.',
  }
  const adaptado = adaptarMusculoesqueletico(estado)
  const textos = renderizar('MUSCULOESQUELETICO', adaptado.dados)
  for (const texto of Object.values(textos)) {
    assert.match(texto, /Alteração ecográfica na topografia avaliada, detalhada na conclusão/)
    assert.match(texto, /Tendinopatia da pata de ganso à direita/)
    assert.doesNotMatch(texto, /grácil, sartório e semitendíneo/)
  }
}

{
  const estado = inicial(musculoesqueletico)
  estado.ombro__bursa = {
    estado: 'alterado',
    'estado.alterado.corpo': 'Bursa com pequena quantidade de líquido',
    'estado.alterado.diag': '',
  }
  const adaptado = adaptarMusculoesqueletico(estado)
  assert.equal(adaptado.pendencias.length, 1)
  assert.equal(adaptado.pendencias[0]?.bloqueia, true)
  assert.match(adaptado.pendencias[0]?.motivo ?? '', /falta o diagnóstico/)
}

console.log('sprint 16C: Partes moles e Musculoesquelético preservam achados nos estilos Clássico e Objetivo')
