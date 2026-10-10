/**
 * W15 — técnica (COMENTÁRIOS) na web: constantes vindas da tabela única (`@laudousg/schemes`), frase de
 * técnica preferida por usuário e categoria (preferência da conta) aplicada sobre o laudo montado.
 */
import assert from 'node:assert/strict'
import { aplicarTecnicaPreferida, comentariosPadrao } from '@laudousg/schemes'
import { CATEGORIES, composeReport, initialExamState } from '../src/lib/deterministic'
import { codigoDaPreferencia, tecnicasDoCorpo } from '../src/lib/preferencias/tecnicaPreferida'

let cases = 0
function test(name: string, run: () => void) { run(); console.log(`ok ${++cases} - ${name}`) }

test('constantes da web = tabela única', () => {
  for (const id of ['OBSTETRICA', 'MORFOLOGICO', 'PELVE_FEMININA', 'ABDOMEN_TOTAL', 'ABDOMEN_SUPERIOR', 'VIAS_URINARIAS',
    'ESCROTAL', 'CERVICAL', 'PAREDE_ABDOMINAL', 'MAMARIA', 'PROSTATA_SUPRAPUBICA', 'MUSCULOESQUELETICO']) {
    const cat = CATEGORIES[id]
    assert.ok(cat, id)
    assert.equal(cat.tecnica, comentariosPadrao(id), id)
  }
})

test('pelve: a via escolhida troca a frase pela da tabela', () => {
  const pelve = CATEGORIES.PELVE_FEMININA!
  for (const via of ['ta_tv', 'tv', 'ta'] as const) assert.equal(pelve.resolveTecnica!({ via }), comentariosPadrao('PELVE_FEMININA', { via }))
})

test('parede (local): sempre linear + Valsalva; escrotal com ortostase/Valsalva', () => {
  assert.match(composeReport(CATEGORIES.PAREDE_ABDOMINAL!, initialExamState(CATEGORIES.PAREDE_ABDOMINAL!)).text, /COMENTÁRIOS:\nExame realizado com transdutor linear de alta frequência, com avaliação dinâmica da parede abdominal e manobra de Valsalva\. A documentação/)
  assert.match(composeReport(CATEGORIES.ESCROTAL!, initialExamState(CATEGORIES.ESCROTAL!)).text, /metodologias\. Exame realizado com o paciente em ortostase e com manobra de Valsalva\./)
})

test('preferência: corpo da API → mapa por categoria; vazias ignoradas', () => {
  const m = tecnicasDoCorpo({ preferences: [
    { category_code: 'ABDOMEN_TOTAL', renderer_preferences: { tecnica_padrao: 'Minha frase.' } },
    { category_code: 'TIREOIDE', renderer_preferences: { show_domingos_score: true } },
    { category_code: 'MAMARIA', renderer_preferences: { tecnica_padrao: '  ' } },
  ] })
  assert.deepEqual(m, { ABDOMEN_TOTAL: 'Minha frase.' })
  assert.deepEqual(tecnicasDoCorpo(null), {})
  assert.equal(codigoDaPreferencia('MUSCULOESQUELETICO'), 'MUSCULOESQUELETICO_V2')
})

test('preferência aplicada no laudo montado, documentação preservada', () => {
  const r = composeReport(CATEGORIES.PAREDE_ABDOMINAL!, initialExamState(CATEGORIES.PAREDE_ABDOMINAL!))
  const t = aplicarTecnicaPreferida(r.text, 'PAREDE_ABDOMINAL', 'Exame realizado com transdutor linear de 15 MHz')
  assert.match(t, /COMENTÁRIOS:\nExame realizado com transdutor linear de 15 MHz\. A documentação fotográfica/)
  assert.equal(aplicarTecnicaPreferida(r.text, 'PAREDE_ABDOMINAL', ''), r.text)
})

console.log(`w15Tecnica: ${cases} casos ok`)
