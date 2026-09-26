/**
 * Categoria PRÓSTATA (via transabdominal / suprapúbica) — geração determinística.
 *
 * Fonte de verdade: apps/api/src/server/renderer/categories/PROSTATA_SUPRAPUBICA.ts
 * (curadoria A10 do Luiz + revisão dex1) e docs/catalogo-clinico-exames.md.
 *
 * Estruturas (ordem do corpo): bexiga · próstata · vesículas seminais.
 * Conclusão SEMPRE lista todas as estruturas (inclusive normais).
 * Peso prostático = D1×D2×D3×0,5233×1,05 (só com 3 medidas ≥ 1 cm).
 * IPP só aparece quando a próstata está aumentada; graduado em cm (1/2/3).
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganSchema, OrganState, OrganComposition } from '../types'
import { createSharedBladderModule } from './urinaryShared'

// ── helpers (espelham o renderer) ────────────────────────────────────────────
/**
 * Lê uma medida linear da próstata em cm. O campo inteiro precisa ser um número
 * positivo, opcionalmente seguido de `cm` ou `mm` (mm → cm). Vazio = `null`
 * (não medido); qualquer outra coisa = `'invalida'`, nunca um número adivinhado.
 */
/** Menor medida imprimível com 1 casa decimal em cm (espelha o renderer). */
export const MENOR_MEDIDA_CM = 0.05

export function lerMedidaProstataCm(raw: unknown): number | null | 'invalida' {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string' && typeof raw !== 'number') return 'invalida'
  const s = String(raw).trim().toLowerCase().replace(',', '.')
  if (!s) return null
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(cm|mm)?$/)
  if (!m) return 'invalida'
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return 'invalida'
  const cm = m[2] === 'mm' ? n / 10 : n
  // Abaixo de 0,05 cm o laudo (1 casa) imprimiria "0,0": precisão de exibição.
  return cm < MENOR_MEDIDA_CM ? 'invalida' : cm
}

const MEDIDAS_PROSTATA = ['d1', 'd2', 'd3'] as const
const VOLUMES_PROSTATA = ['normal', 'aumentada']
const EXTRAS_PROSTATA = ['calcificacoes']

/**
 * Pendências bloqueantes da seção próstata. Campo visível inválido, medida
 * parcial ou opção desconhecida impedem o laudo; o IPP só é lido quando a opção
 * "Aumentada" está ativa (subcampo oculto é ignorado, não bloqueia).
 */
export function prostataInputIssues(state: Record<string, unknown>): string[] {
  const issues: string[] = []
  const lidas = MEDIDAS_PROSTATA.map((key) => lerMedidaProstataCm(state[key]))
  MEDIDAS_PROSTATA.forEach((key, i) => {
    if (lidas[i] === 'invalida') issues.push(`medida ${i + 1} da próstata tem formato inválido (use valor em cm ou mm, a partir de 0,05 cm)`)
  })
  const preenchidas = lidas.filter((v) => v !== null).length
  if (preenchidas > 0 && preenchidas < 3) issues.push('medidas da próstata incompletas: informe as três dimensões ou nenhuma')
  const volume = state.volume
  if (volume !== undefined && (typeof volume !== 'string' || !VOLUMES_PROSTATA.includes(volume))) {
    issues.push('volume da próstata tem opção inválida')
  }
  if (volume === 'aumentada' && lerMedidaProstataCm(state['volume.aumentada.ipp']) === 'invalida') {
    issues.push('IPP tem formato inválido (use valor em cm ou mm, a partir de 0,05 cm)')
  }
  const extra = state.extra
  if (extra !== undefined && !Array.isArray(extra)) issues.push('achados da próstata têm formato inválido')
  if (Array.isArray(extra)) {
    const invalidos = extra.filter((v) => typeof v !== 'string' || !EXTRAS_PROSTATA.includes(v))
    if (invalidos.length > 0) issues.push(`achados da próstata têm opção inválida: ${invalidos.map(String).join(', ')}`)
  }
  return issues
}

function parseCm(v: unknown): number | null {
  const lida = lerMedidaProstataCm(v)
  return lida === 'invalida' ? null : lida
}
function ptBr1(n: number): string {
  return n.toFixed(1).replace('.', ',')
}
function intStr(v: unknown): string | null {
  const s = String(v ?? '').trim().replace(',', '.')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? String(Math.round(n)) : null
}

/** Peso prostático (elipsoide). Exige 3 medidas em cm, cada uma ≥ 1 cm. */
export function calcPesoProstatico(
  d1: number | null,
  d2: number | null,
  d3: number | null
): number | null {
  if (d1 === null || d2 === null || d3 === null) return null
  if (d1 < 1 || d2 < 1 || d3 < 1) return null
  const peso = d1 * d2 * d3 * 0.5233 * 1.05
  return Math.round(peso * 10) / 10
}

/** Grau do IPP (cm): Grau 1 ≤0,5; Grau 2 >0,5–1,0; Grau 3 >1,0–1,5; acima = acentuada. */
export function ippGrau(cm: number): string {
  if (cm <= 0.5) return 'Grau 1'
  if (cm <= 1.0) return 'Grau 2'
  if (cm <= 1.5) return 'Grau 3'
  return 'protrusão acentuada'
}

const bexigaModule = createSharedBladderModule('PROSTATA_SUPRAPUBICA')

// ── Próstata ─────────────────────────────────────────────────────────────────
const prostataSchema: OrganSchema = {
  id: 'prostata',
  name: 'Próstata',
  category: 'PROSTATA_SUPRAPUBICA',
  fields: [
    { key: 'd1', label: 'Medida 1 (cm)', kind: 'text', placeholder: '5,1' },
    { key: 'd2', label: 'Medida 2 (cm)', kind: 'text', placeholder: '4,4' },
    { key: 'd3', label: 'Medida 3 (cm)', kind: 'text', placeholder: '3,9' },
    {
      key: 'volume',
      label: 'Volume',
      kind: 'segmented',
      hint: 'default: normal',
      options: [
        { value: 'normal', label: 'Normal', isDefault: true },
        {
          value: 'aumentada',
          label: 'Aumentada',
          subFields: [{ key: 'ipp', label: 'IPP (cm)', kind: 'text', placeholder: '0,8' }],
        },
      ],
    },
    {
      key: 'extra',
      label: 'Achados',
      kind: 'checklist',
      hint: 'marque se houver',
      options: [{ value: 'calcificacoes', label: 'Calcificações' }],
    },
  ],
}

function prostataInitial(): OrganState {
  return { d1: '', d2: '', d3: '', volume: 'normal', extra: [], 'volume.aumentada.ipp': '' }
}

function prostataCompose(state: OrganState): OrganComposition {
  const d1 = parseCm(state.d1)
  const d2 = parseCm(state.d2)
  const d3 = parseCm(state.d3)
  const aumentada = (state.volume as string) === 'aumentada'
  const calcificacoes = ((state.extra as string[]) || []).includes('calcificacoes')
  const ipp = parseCm(state['volume.aumentada.ipp'])

  const medidas =
    d1 !== null && d2 !== null && d3 !== null
      ? `${ptBr1(d1)} x ${ptBr1(d2)} x ${ptBr1(d3)} cm`
      : '____ cm'

  const body: string[] = []
  body.push(
    aumentada
      ? `Próstata aumentada de volume, medindo ${medidas}.`
      : `Próstata medindo ${medidas}.`
  )
  if (calcificacoes) body.push('Calcificações prostáticas.')
  if (aumentada && ipp !== null) {
    body.push(`Índice de protrusão prostática (IPP) mede ${ptBr1(ipp)} cm.`)
  }

  const conclusion: string[] = []
  const peso = calcPesoProstatico(d1, d2, d3)
  const pesoSuffix = peso ? ` (peso aproximado de ${ptBr1(peso)} gramas)` : ''
  conclusion.push(
    aumentada
      ? `Próstata de volume aumentado${pesoSuffix}.`
      : `Próstata de dimensões normais${pesoSuffix}.`
  )
  if (aumentada && ipp !== null) {
    conclusion.push(`Protrusão prostática intravesical de ${ptBr1(ipp)} cm (${ippGrau(ipp)}).`)
  }
  if (calcificacoes) conclusion.push('Calcificações prostáticas.')

  return { body: body.join('\n'), conclusion, isNormal: !aumentada && !calcificacoes }
}

const prostataModule: OrganModule = {
  schema: prostataSchema,
  initialState: prostataInitial,
  compose: prostataCompose,
}

// ── Vesículas seminais ───────────────────────────────────────────────────────
// Padrão histórico: descritas como normais (fidelidade ao renderer). O médico
// pode registrar, como fato do exame, que não foram caracterizadas adequadamente
// pela via, ou descrever uma alteração com o lado. Não há frase diagnóstica
// automática: a alteração sai com as palavras do médico.
export const VESICULAS_ESTADOS = ['normal', 'nao_caracterizadas', 'alteradas'] as const
export const VESICULAS_LADOS = ['bilateral', 'direita', 'esquerda'] as const

const ladoVesiculas = (key: string): OrganSchema['fields'][number] => ({
  key,
  label: 'Lado',
  kind: 'mini-segmented',
  options: [
    { value: 'bilateral', label: 'Ambas', isDefault: true },
    { value: 'direita', label: 'Direita' },
    { value: 'esquerda', label: 'Esquerda' },
  ],
})

const vesiculasSchema: OrganSchema = {
  id: 'vesiculas_seminais',
  name: 'Vesículas seminais',
  category: 'PROSTATA_SUPRAPUBICA',
  fields: [
    {
      key: 'estado',
      label: 'Estado',
      kind: 'segmented',
      hint: 'default: normais',
      options: [
        { value: 'normal', label: 'Normais', isDefault: true },
        {
          value: 'nao_caracterizadas',
          label: 'Não caracterizadas adequadamente',
          subFields: [ladoVesiculas('lado')],
        },
        {
          value: 'alteradas',
          label: 'Alteração observada',
          subFields: [
            ladoVesiculas('lado'),
            { key: 'descricao', label: 'Descrição observada', kind: 'text', placeholder: 'descrever somente o observado' },
          ],
        },
      ],
    },
  ],
}

function vesiculasInitial(): OrganState {
  return { estado: 'normal' }
}

export type VesiculasSeminaisContrato = {
  estado: 'nao_caracterizadas' | 'alteradas'
  lateralidade: 'bilateral' | 'direita' | 'esquerda'
  descricao: string | null
}

/**
 * Lê a seção vesículas seminais. `contrato` é `null` no estado normal (o
 * renderer mantém a frase histórica e o payload fica igual ao antigo). Opção ou
 * lado desconhecido, e alteração sem descrição, viram pendência bloqueante.
 * Subcampos da opção não selecionada são ignorados.
 */
export function lerVesiculasSeminais(state: Record<string, unknown>): {
  contrato: VesiculasSeminaisContrato | null
  issues: string[]
} {
  const estado = state.estado === undefined ? 'normal' : state.estado
  if (typeof estado !== 'string' || !(VESICULAS_ESTADOS as readonly string[]).includes(estado)) {
    return { contrato: null, issues: ['vesículas seminais têm opção inválida'] }
  }
  if (estado === 'normal') return { contrato: null, issues: [] }
  const issues: string[] = []
  const ladoRaw = state[`estado.${estado}.lado`]
  const lado = ladoRaw === undefined || ladoRaw === '' ? 'bilateral' : ladoRaw
  if (typeof lado !== 'string' || !(VESICULAS_LADOS as readonly string[]).includes(lado)) {
    issues.push('vesículas seminais têm lado inválido')
  }
  const descricaoRaw = state[`estado.${estado}.descricao`]
  // Uma linha só: quebra de linha no texto livre não pode virar cabeçalho no laudo.
  const descricao = typeof descricaoRaw === 'string' ? descricaoRaw.replace(/\s+/g, ' ').trim().replace(/\.+$/, '') : ''
  if (estado === 'alteradas' && descricaoRaw !== undefined && typeof descricaoRaw !== 'string') {
    issues.push('descrição das vesículas seminais tem formato inválido')
  } else if (estado === 'alteradas' && !descricao) {
    issues.push('alteração das vesículas seminais exige descrição do observado')
  }
  if (issues.length > 0) return { contrato: null, issues }
  return {
    contrato: {
      estado,
      lateralidade: lado as VesiculasSeminaisContrato['lateralidade'],
      descricao: estado === 'alteradas' ? descricao : null,
    } as VesiculasSeminaisContrato,
    issues: [],
  }
}

function vesiculasCompose(state: OrganState): OrganComposition {
  const { contrato, issues } = lerVesiculasSeminais(state)
  if (issues.length > 0) {
    return { body: 'Vesículas seminais: seleção pendente de correção.', conclusion: [], isNormal: false }
  }
  if (!contrato) {
    return {
      body: 'Vesículas seminais de dimensões, ecogenicidade e contornos normais.',
      conclusion: ['Vesículas seminais ecograficamente normais.'],
      isNormal: true,
    }
  }
  return { body: 'Vesículas seminais com seleção detalhada no renderer canônico.', conclusion: [], isNormal: false }
}

const vesiculasSeminaisModule: OrganModule = {
  schema: vesiculasSchema,
  initialState: vesiculasInitial,
  compose: vesiculasCompose,
}

// ── Categoria ────────────────────────────────────────────────────────────────
export const prostataSuprapubica: ExamCategory = {
  id: 'PROSTATA_SUPRAPUBICA',
  name: 'Próstata',
  title: 'ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)',
  tecnica:
    'Exame realizado com transdutor de 4.0 MHz, pela técnica transabdominal com a bexiga repleta com o paciente em decúbito dorsal. Foram realizados múltiplos cortes transversais, longitudinais, oblíquos e coronais abrangendo toda a pelve.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: bexigaModule },
    { id: 'prostata', label: 'Próstata', group: 'orgaos', module: prostataModule },
    { id: 'vesiculas_seminais', label: 'Vesículas seminais', group: 'orgaos', module: vesiculasSeminaisModule },
  ],
  // A próstata lista todas as estruturas na conclusão; sem frase de fechamento genérica.
  conclusionNormal: 'Exame ultrassonográfico da próstata dentro dos limites da normalidade.',
  footer:
    'Observação: a avaliação por via transabdominal não detalha adequadamente lesões focais do parênquima prostático; havendo suspeita clínica, recomenda-se correlação com PSA e avaliação urológica (complementação por via transretal ou ressonância multiparamétrica).',
}
