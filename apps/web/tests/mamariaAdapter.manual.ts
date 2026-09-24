/** Adaptador + renderer reais da mama: contraexemplos dos defeitos corrigidos.
 *
 * Rodar da raiz do repositório:
 *   pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/mamariaAdapter.manual.ts
 *
 * Cada caso reproduz um laudo errado que saía antes da correção.
 */
import assert from 'node:assert/strict'
import { adaptarMamaria } from '../src/lib/catalog/mamariaParaCatalogo'
import { renderizarSelecao } from '../../api/src/server/renderer/catalog/alteracoes'
import { renderMamaria } from '../../api/src/server/renderer/categories/MAMARIA'
import type { OrganState } from '../src/lib/deterministic'
import { applyCompanionBreast, type CompanionBreastFinding } from '../src/lib/companionStructured'

type Campos = Record<string, string | string[]>

function mamas(campos: Campos, id = 'a'): OrganState {
  const s: OrganState = { fundo: 'heterogeneo', achados_ids: [id] }
  for (const [k, v] of Object.entries(campos)) s[`achados.${id}.${k}`] = v
  return s
}
const adaptar = (m: OrganState) => adaptarMamaria({ mamas: m, __opts: { escopo_exame: 'mamas' } })
function laudo(m: OrganState): string {
  const { dados, pendencias } = adaptar(m)
  assert.deepEqual(pendencias.filter((p) => p.bloqueia), [], 'não deveria bloquear')
  const r = renderizarSelecao('MAMARIA', 'CLASSICO_COMPLETO', [], dados)
  assert.ok(r.ok, JSON.stringify(r))
  return r.texto
}
const corpo = (texto: string) => texto.split('CONCLUSÃO:')[0]

/** O que `add()` do formulário grava num achado novo. */
const NOVO = { lado: 'direita', tipo: 'nodulo', eco: 'hipoecoico', forma: 'oval', orientacao: 'paralela', posterior: 'nenhuma' }

let n = 0
const caso = (nome: string, fn: () => void) => { fn(); n++; console.log(`ok ${nome}`) }

// --- 1. tipo trocado não herda descritores escondidos ---------------------------
caso('nódulo trocado por cisto simples sai anecoico, sem descritores sólidos', () => {
  const texto = corpo(laudo(mamas({
    ...NOVO, tipo: 'cisto_simples', margem_tipo: 'nao_circunscrita', margem: 'espiculada',
    forma: 'irregular', orientacao: 'nao_paralela', posterior: 'sombra', elasticidade: 'dura', calc: ['microcalc'], medidas: '1,0 x 0,8 x 0,6',
  })))
  assert.match(texto, /Imagem anecoica de mama direita, com margem circunscrita, medindo 1,0 x 0,8 x 0,6 cm\./)
  assert.doesNotMatch(texto, /hipoecoica|espiculada|irregular|não paralelo|sombra|elasticidade|calcificações/)
})
caso('descritores do cisto complicado não vazam para cistos múltiplos', () => {
  const texto = corpo(laudo(mamas({ lado: 'esquerda', tipo: 'multiplos_cistos', descritores: 'finos ecos internos' })))
  assert.doesNotMatch(texto, /finos ecos internos/)
  assert.match(texto, /Imagens anecoicas de mama esquerda/)
})
caso('medida digitada antes não vaza para calcificações', () => {
  const texto = corpo(laudo(mamas({ lado: 'direita', tipo: 'calcificacoes', calc_sub: 'em_nodulo', medidas: '2,3 x 1,1' })))
  assert.doesNotMatch(texto, /2,3/)
})
caso('microcalcificação do nódulo não vaza para o linfonodo', () => {
  const { dados } = adaptar(mamas({ ...NOVO, tipo: 'linfonodo_intramamario', calc: ['microcalc'] }))
  assert.equal((dados.achados as Array<Record<string, unknown>>)[0].calcificacoes, null)
})
caso('o que continua visível atravessa em qualquer tipo', () => {
  const { dados } = adaptar(mamas({ lado: 'direita', tipo: 'cisto_simples', local: 'QSL', horario: '2 horas', dist_pele: '0,4', dist_mamilo: '2,0', birads: '2' }))
  const a = (dados.achados as Array<Record<string, unknown>>)[0]
  assert.deepEqual([a.localizacao, a.horario, a.dist_pele_cm, a.dist_mamilo_cm, a.birads_ditado], ['QSL', '2 horas', 0.4, 2, '2'])
})

// --- 2. forma e orientação suspeitas aparecem no texto --------------------------
caso('forma irregular e orientação não paralela entram no corpo', () => {
  const texto = corpo(laudo(mamas({ ...NOVO, forma: 'irregular', orientacao: 'nao_paralela', margem_tipo: 'nao_circunscrita', margem: 'espiculada' })))
  assert.match(texto, /Imagem hipoecoica de mama direita, de forma irregular, com margem espiculada, maior eixo não paralelo à pele, medindo/)
})
caso('forma redonda entra no corpo', () => {
  assert.match(corpo(laudo(mamas({ ...NOVO, forma: 'redonda', margem: 'circunscrita' }))), /de forma redonda, com margem circunscrita/)
})
caso('oval e paralela: texto idêntico ao de antes (forma oval segue omitida)', () => {
  const comOval = laudo(mamas({ ...NOVO, margem: 'circunscrita' }))
  assert.match(corpo(comOval), /Imagem hipoecoica de mama direita, com margem circunscrita, maior eixo paralelo à pele, medindo/)
  assert.doesNotMatch(comOval, /de forma oval/)
})
caso('renderer direto (contrato do app): forma nula e oval dão o mesmo texto', () => {
  const base = {
    tipo: 'nodulo_solido', lado: 'direita', ecogenicidade: 'hipoecoico', forma: null, orientacao: 'paralela', margem: 'circunscrita',
    posterior: 'nenhuma', calcificacoes: null, elasticidade: null, vascularizacao: null, vascularizacao_descricao: null, descritores: null,
    medidas_cm: [1.2, 0.8, 0.6], medida_invalida: null, localizacao: null, horario: null, dist_pele_cm: null, dist_mamilo_cm: null,
    descricao_nao_nodular: null, birads_ditado: '3', permitir_birads_calculado: false,
  }
  const f = (achado: Record<string, unknown>) => renderMamaria({
    escopo_exame: 'mamas', titulo_com_axilas: false, mama_masculina: false, com_protese: false, doppler_realizado: false,
    texto_fundo: 'Mamas com ecotextura de fundo heterogênea.', achados: [achado], axilas_alteradas: false, axilas_descricao: null,
    achados_adicionais: null, birads_final: null, exames_anteriores: [],
  } as never)
  assert.equal(f({ ...base, forma: 'oval' }), f(base))
  assert.notEqual(f({ ...base, forma: 'irregular' }), f(base))
})

// --- 3. calcificação sem padrão bloqueia em vez de afirmar "grosseiras" ---------
caso('calcificações sem padrão → pendência que bloqueia, nenhum texto de grosseiras', () => {
  const { dados, pendencias } = adaptar(mamas({ lado: 'direita', tipo: 'calcificacoes' }))
  assert.equal((dados.achados as unknown[]).length, 0)
  assert.deepEqual(pendencias.map((p) => [p.motivo, p.bloqueia]), [['escolha o padrão das calcificações', true]])
})
caso('calcificações grosseiras escolhidas → frase de grosseiras', () => {
  assert.match(corpo(laudo(mamas({ lado: 'direita', tipo: 'calcificacoes', calc_sub: 'grosseiras' }))), /ocasionando sombra acústica/)
})

// --- 4. o que o celular (companion) grava não se perde -------------------------
const doCelular = (finding: CompanionBreastFinding): OrganState =>
  applyCompanionBreast({}, { category: 'MAMARIA', data: { breastFindings: [finding] } } as never).mamas as OrganState

caso('companion: calcificações "microcalc" viram microcalcificações, sem travar', () => {
  const m = doCelular({ side: 'direita', type: 'calcificacoes', calcifications: 'microcalc', location: 'QSL' })
  assert.match(corpo(laudo(m)), /Imagens hiperecoicas puntiformes/)
})
caso('companion: calcificação em nódulo lida da imagem chega ao texto', () => {
  const m = doCelular({ side: 'esquerda', type: 'nodulo', c1: '1,1', c2: '0,9', c3: '0,7', echogenicity: 'hipoecoico', shape: 'oval', margin: 'circunscrita', orientation: 'paralela', posterior: 'nenhuma', calcifications: 'em_nodulo' })
  assert.match(corpo(laudo(m)), /com calcificações de permeio/)
})
caso('companion: cisto simples não carrega descritores sólidos da imagem', () => {
  const m = doCelular({ side: 'direita', type: 'cisto_simples', c1: '0,8', c2: '0,6', c3: '0,5', echogenicity: 'hipoecoico', margin: 'espiculada', posterior: 'sombra' })
  const texto = corpo(laudo(m))
  assert.match(texto, /Imagem anecoica de mama direita, com margem circunscrita, medindo 0,8 x 0,6 x 0,5 cm/)
  assert.doesNotMatch(texto, /espiculada|sombra|hipoecoica/)
})

// --- 5. rascunho legado (md/me, sem achados_ids) segue pelo caminho antigo ------
caso('rascunho legado md/me continua adaptado', () => {
  const { dados, pendencias } = adaptarMamaria({ mamas: { fundo: 'heterogeneo' }, __opts: {} })
  assert.deepEqual(pendencias, [])
  assert.deepEqual(dados.achados, [])
})

console.log(`mamariaAdapter: ${n} casos OK`)
