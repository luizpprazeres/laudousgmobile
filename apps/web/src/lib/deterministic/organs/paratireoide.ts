/**
 * Categoria PARATIREOIDE — geração determinística local (MVP Web).
 *
 * Fonte clínica: snippets e casos-ouro aprovados de PARATIREOIDE (commit
 * 231c4dc, `packages/knowledge/snippets/PARATIREOIDE/`), com a correção do
 * Luiz: no corpo, "imagem hipoecoica" (não "nódulo"); na conclusão, "que tem
 * como diagnóstico mais provável adenoma" (não "compatível com").
 *
 * Regras que este módulo garante:
 *  - até duas imagens, cada uma com lado, topografia e medidas preservados;
 *  - a hipótese (adenoma provável; múltiplas imagens → hiperplasia) só sai
 *    quando todas as imagens têm lado e medidas; senão, pendência e conclusão
 *    descritiva sem diagnóstico;
 *  - o médico pode manter a imagem "a esclarecer" em vez de adenoma provável;
 *  - tireoide e linfonodos entram como contexto, com o texto do médico quando
 *    alterados.
 *
 * Ainda não migrada para o renderer canônico: compõe localmente.
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState } from '../types'
import { formatarEixos, lerEixos, textoLivre } from './medidasLocais'

const CATEGORIA = 'PARATIREOIDE'
const str = (v: unknown) => (typeof v === 'string' ? v : '')

const LADO: Record<string, string> = { direito: 'direito', esquerdo: 'esquerdo' }
const LOCAL: Record<string, string> = { inferior: 'inferior', superior: 'superior', infratireoidiana: 'infratireoidiana' }

// ── Tireoide e linfonodos (contexto) ─────────────────────────────────────────
function contextoModule(id: string, name: string, normal: string, sujeito: string): OrganModule {
  return {
    schema: {
      id, name, category: CATEGORIA,
      fields: [{
        key: 'estado', label: name, kind: 'segmented', hint: 'default: aspecto habitual',
        options: [
          { value: 'normal', label: 'Aspecto habitual', isDefault: true },
          { value: 'alterada', label: 'Alteração observada', subFields: [
            { key: 'descricao', label: 'Descrição observada', kind: 'text', placeholder: 'descrever somente o observado' },
          ] },
          { value: 'nao_citar', label: 'Não citar' },
        ],
      }],
    },
    initialState: () => ({ estado: 'normal', 'estado.alterada.descricao': '' }),
    compose: (state): OrganComposition => {
      const estado = str(state.estado) || 'normal'
      if (estado === 'nao_citar') return { body: '', conclusion: [], isNormal: true }
      if (estado === 'alterada') {
        const frase = `${sujeito}: ${textoLivre(state['estado.alterada.descricao']) || '____'}.`
        return { body: frase, conclusion: [frase], isNormal: false }
      }
      return { body: normal, conclusion: [], isNormal: true }
    },
  }
}

const tireoideModule = contextoModule('tireoide', 'Tireoide', 'Tireoide de dimensões, ecogenicidade e ecotextura normais.', 'Tireoide')
const linfonodosModule = contextoModule('linfonodos', 'Linfonodos cervicais', 'Linfonodos cervicais de aspecto habitual.', 'Linfonodos cervicais')

function contextoIssues(nome: string, state: OrganState): string[] {
  const estado = str(state.estado) || 'normal'
  if (!['normal', 'alterada', 'nao_citar'].includes(estado)) return [`${nome}: opção inválida.`]
  if (estado === 'alterada' && !textoLivre(state['estado.alterada.descricao'])) return [`${nome}: descreva a alteração observada.`]
  return []
}

// ── Lojas paratireoidianas ───────────────────────────────────────────────────
const IMAGENS = ['imagem_1', 'imagem_2'] as const

function imagemSubFields(): Field[] {
  return [
    { key: 'lado', label: 'Lado', kind: 'mini-segmented', options: [
      { value: 'direito', label: 'Direito' },
      { value: 'esquerdo', label: 'Esquerdo' },
    ] },
    { key: 'local', label: 'Topografia', kind: 'mini-segmented', options: [
      { value: 'inferior', label: 'Polo inferior', isDefault: true },
      { value: 'superior', label: 'Polo superior' },
      { value: 'infratireoidiana', label: 'Infratireoidiana' },
    ] },
    { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '1,0 x 0,6 x 0,5' },
    { key: 'pediculo', label: 'Doppler', kind: 'mini-segmented', options: [
      { value: 'polar', label: 'Pedículo vascular polar', isDefault: true },
      { value: 'sem_fluxo', label: 'Sem fluxo detectável' },
      { value: 'nao_citar', label: 'Não citar' },
    ] },
  ]
}

type Imagem = { lado?: string; local: string; medidas: number[] | null | 'invalida'; pediculo: string }

function lerImagem(state: OrganState, key: string): Imagem | null {
  if (str(state[key]) !== 'presente') return null
  const p = `${key}.presente.`
  return {
    lado: LADO[str(state[`${p}lado`])],
    local: LOCAL[str(state[`${p}local`])] ?? 'inferior',
    medidas: lerEixos(state[`${p}medidas`], 3, 'cm'),
    pediculo: str(state[`${p}pediculo`]) || 'polar',
  }
}

const completa = (img: Imagem) => Boolean(img.lado) && Array.isArray(img.medidas)

function topografia(img: Imagem): string {
  const lado = img.lado ?? '____'
  if (img.local === 'infratireoidiana') return `na região infratireoidiana, à ${lado === 'direito' ? 'direita' : lado === 'esquerdo' ? 'esquerda' : '____'}`
  return `na loja paratireoidiana posterior ao polo ${img.local} do lobo tireoidiano ${lado}`
}

function fraseImagem(img: Imagem): string {
  const medidas = Array.isArray(img.medidas) ? formatarEixos(img.medidas, 'cm') : '____ x ____ x ____ cm'
  const doppler = img.pediculo === 'polar'
    ? ', apresentando pedículo vascular polar ao Doppler colorido'
    : img.pediculo === 'sem_fluxo' ? ', sem fluxo detectável ao Doppler colorido' : ''
  return `Imagem hipoecoica, oval, situada ${topografia(img)}, medindo ${medidas}${doppler}.`
}

export function lojasIssues(state: OrganState): string[] {
  const issues: string[] = []
  IMAGENS.forEach((key, i) => {
    const img = lerImagem(state, key)
    if (!img) return
    if (!img.lado) issues.push(`Imagem ${i + 1}: selecione o lado.`)
    if (img.medidas === null) issues.push(`Imagem ${i + 1}: informe as três medidas.`)
    if (img.medidas === 'invalida') issues.push(`Imagem ${i + 1}: medidas com formato inválido (ex.: 1,0 x 0,6 x 0,5).`)
  })
  return issues
}

const lojasModule: OrganModule = {
  schema: {
    id: 'lojas',
    name: 'Lojas paratireoidianas',
    category: CATEGORIA,
    fields: [
      ...IMAGENS.map((key, i): Field => ({
        key, label: `Imagem ${i + 1}`, kind: 'segmented', hint: i === 0 ? 'default: ausente' : 'segunda imagem, se houver',
        options: [
          { value: 'ausente', label: 'Ausente', isDefault: true },
          { value: 'presente', label: 'Imagem hipoecoica', subFields: imagemSubFields() },
        ],
      })),
      {
        key: 'hipotese', label: 'Hipótese', kind: 'segmented', hint: 'usada quando há imagem com dados completos',
        options: [
          { value: 'provavel', label: 'Diagnóstico mais provável', isDefault: true },
          { value: 'esclarecer', label: 'A esclarecer' },
        ],
      },
    ],
  },
  initialState: () => {
    const state: OrganState = { hipotese: 'provavel' }
    for (const key of IMAGENS) {
      state[key] = 'ausente'
      state[`${key}.presente.lado`] = ''
      state[`${key}.presente.local`] = 'inferior'
      state[`${key}.presente.medidas`] = ''
      state[`${key}.presente.pediculo`] = 'polar'
    }
    return state
  },
  compose: (state): OrganComposition => {
    const imagens = IMAGENS.map((key) => lerImagem(state, key)).filter((img): img is Imagem => img !== null)
    if (imagens.length === 0) {
      return {
        body: 'Não se identificam imagens nodulares nas lojas paratireoidianas habituais, nas faces posteriores dos polos superior e inferior de ambos os lobos tireoidianos.\nRegião infratireoidiana sem imagens nodulares.',
        conclusion: ['Lojas paratireoidianas sem imagens nodulares identificáveis ao método.'],
        isNormal: true,
      }
    }
    const body = imagens.map(fraseImagem)
    if (!imagens.some((img) => img.local === 'infratireoidiana')) body.push('Região infratireoidiana sem imagens nodulares.')

    const todasCompletas = imagens.every(completa)
    const esclarecer = str(state.hipotese) === 'esclarecer'
    let conclusion: string
    if (!todasCompletas) {
      conclusion = imagens.length > 1
        ? 'Imagens hipoecoicas nas lojas paratireoidianas, dados pendentes.'
        : 'Imagem hipoecoica na loja paratireoidiana, dados pendentes.'
    } else if (imagens.length > 1) {
      conclusion = esclarecer
        ? `Imagens hipoecoicas ${imagens.map(topografia).join(' e ')}, a esclarecer. Convém, a critério clínico, correlacionar com as dosagens de cálcio sérico e PTH, com objetivo de prosseguir a investigação.`
        : `Múltiplas imagens nodulares ${imagens.map(topografia).join(' e ')}, a correlacionar com hiperplasia das paratireoides. Convém, a critério clínico, correlacionar com as dosagens de cálcio sérico e PTH, com objetivo de prosseguir a investigação.`
    } else {
      const img = imagens[0]
      conclusion = esclarecer
        ? `Imagem hipoecoica ${topografia(img)}, a esclarecer. Convém, a critério clínico, correlacionar com as dosagens laboratoriais de cálcio e PTH, com objetivo de prosseguir a investigação.`
        : `Imagem hipoecoica ${topografia(img)}, que tem como diagnóstico mais provável adenoma de paratireoide. Convém, a critério clínico, correlacionar com as dosagens laboratoriais de cálcio e PTH, com objetivo de acompanhar a evolução.`
    }
    return { body: body.join('\n'), conclusion: [conclusion], isNormal: false }
  },
}

// ── Categoria ────────────────────────────────────────────────────────────────
export function paratireoideIssuesDoExame(state: Record<string, OrganState>): string[] {
  return [
    ...contextoIssues('Tireoide', state.tireoide ?? {}),
    ...lojasIssues(state.lojas ?? {}),
    ...contextoIssues('Linfonodos cervicais', state.linfonodos ?? {}),
  ]
}

export const paratireoide: ExamCategory = {
  id: CATEGORIA,
  name: 'Paratireoide',
  title: 'ULTRASSONOGRAFIA DAS GLÂNDULAS PARATIREOIDES',
  tecnica:
    'Exame realizado com transdutor linear de alta frequência, em modo B e Doppler colorido, avaliando a região cervical anterior e as lojas paratireoidianas nas faces posteriores dos polos superior e inferior de ambos os lobos tireoidianos.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'tireoide', label: 'Tireoide', group: 'orgaos', module: tireoideModule },
    { id: 'lojas', label: 'Lojas paratireoidianas', group: 'orgaos', module: lojasModule },
    { id: 'linfonodos', label: 'Linfonodos cervicais', group: 'orgaos', module: linfonodosModule },
  ],
  conclusionNormal: 'Lojas paratireoidianas sem imagens nodulares identificáveis ao método.',
}
