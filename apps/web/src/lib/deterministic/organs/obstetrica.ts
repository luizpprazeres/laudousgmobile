/**
 * Categoria OBSTETRICA — geração determinística (feto único, gestação padrão >14s).
 *
 * Fonte: apps/api/src/server/renderer/categories/OBSTETRICA.ts (renderObstetricaClassico)
 * + fundação de IG ([[epico-ig-deterministica]], lib/ig/computeIG) + lógica MBV/ILA
 * do boletim ([[boletim-engine-p0]]): MBV 2–8 cm normal; ILA 5–25 cm normal.
 *
 * Escopo v1: feto único, padrão. PENDENTE (incrementos): gemelar, gestação inicial
 * (saco/CCN), percentil de peso (curvas).
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganModule, OrganState, OrganComposition } from '../types'
import { criarCervicometriaAddonModule } from './cervicometriaAddon'
import { criarFetalGrowthModule } from './fetalGrowth'
import { computeIG, dataBRParaISO, formatBR, hojeBR, lerDatacaoDaTela, type Referencia } from '../../ig/computeIG'
import { preEclampsiaFmfSpec, trisomyFmfSpec } from '../../calculators/specs'

const TECNICA =
  'Exame realizado com transdutor de 4.0 MHz. Foram realizados múltiplos cortes, abrangendo todo o abdome da gestante. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

// ── helpers (compartilhados com morfológico) ─────────────────────────────────
/** Parse ESTRITO (review dex2): rejeita lixo após número ("5abc" → null). */
export function numOrNull(v: unknown): number | null {
  const s = String(v ?? '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  return parseFloat(s)
}
export function ptBr(n: number): string {
  return (Number.isInteger(n) ? String(n) : n.toFixed(1)).replace('.', ',')
}
export function mm(v: number | null): string {
  return v === null ? '____' : ptBr(v)
}
/** "DD/MM/AAAA" → "AAAA-MM-DD" (ISO). Parse ESTRITO: rejeita data inexistente
 *  (31/02) — review dex2; espelha o parse estrito da engine (renderer/ig.ts). */
const brToISO = dataBRParaISO

// ── IG e datas (âncora = biometria atual; referência só corrige se >5 dias) ───
/**
 * Datação com SELETOR de referência — formato antigo, mantido para o MORFOLÓGICO
 * (que importa este módulo) e para documentar as chaves `referencia.*` que os
 * estados antigos da obstétrica ainda carregam. A obstétrica usa
 * `datacaoObstetricaModule`, logo abaixo.
 */
export const igModule: OrganModule = {
  schema: {
    id: 'ig',
    name: 'Idade gestacional',
    category: 'OBSTETRICA',
    fields: [
      { key: 'bio_sem', label: 'Biometria atual · semanas', kind: 'text', placeholder: '20' },
      { key: 'bio_dias', label: 'Dias', kind: 'text', placeholder: '3' },
      {
        key: 'referencia',
        label: 'Datação de referência',
        kind: 'segmented',
        hint: 'corrige a IG só se divergir > 5 dias',
        options: [
          { value: 'nenhuma', label: 'Nenhuma', isDefault: true },
          {
            value: 'usg',
            label: 'US precoce',
            subFields: [
              { key: 'us_data', label: 'Data da 1ª US (DD/MM/AAAA)', kind: 'text', placeholder: '12/01/2026' },
              { key: 'us_ig_sem', label: 'IG na 1ª US — semanas', kind: 'text', placeholder: '8' },
              { key: 'us_ig_dias', label: 'IG na 1ª US — dias', kind: 'text', placeholder: '2' },
              { key: 'exame_data', label: 'Data do exame (DD/MM/AAAA)', kind: 'text', placeholder: '20/06/2026' },
              { key: 'corrigir', label: 'Sinalizar correção (se divergir > 5 dias)', kind: 'segmented', options: [{ value: 'sim', label: 'Sim', isDefault: true }, { value: 'nao', label: 'Não' }] },
            ],
          },
          {
            value: 'dum',
            label: 'DUM',
            subFields: [
              { key: 'dum_data', label: 'DUM (DD/MM/AAAA)', kind: 'text', placeholder: '01/01/2026' },
              { key: 'exame_data', label: 'Data do exame (DD/MM/AAAA)', kind: 'text', placeholder: '20/06/2026' },
              { key: 'corrigir', label: 'Sinalizar correção (se divergir > 5 dias)', kind: 'segmented', options: [{ value: 'sim', label: 'Sim', isDefault: true }, { value: 'nao', label: 'Não' }] },
            ],
          },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({ bio_sem: '', bio_dias: '', referencia: 'nenhuma' }),
  compose: (st): OrganComposition => {
    const sem = numOrNull(st.bio_sem)
    if (sem === null) {
      return { body: '', conclusion: ['Gestação em torno de ____ semanas.'], isNormal: true }
    }
    const dias = numOrNull(st.bio_dias) ?? 0
    const tipo = String(st.referencia ?? 'nenhuma')

    let referencia: Referencia | undefined
    let hojeISO = ''
    let corrigir = false
    if (tipo === 'usg') {
      const usData = brToISO(st['referencia.usg.us_data'])
      const exame = brToISO(st['referencia.usg.exame_data'])
      const usSem = numOrNull(st['referencia.usg.us_ig_sem'])
      const usDias = numOrNull(st['referencia.usg.us_ig_dias']) ?? 0
      // Default ON (espelha prod: default true; médico pode optar por "Não").
      corrigir = String(st['referencia.usg.corrigir'] ?? 'sim') !== 'nao'
      if (usData && exame && usSem !== null) {
        referencia = { tipo: 'us', dataISO: usData, ig: { semanas: usSem, dias: usDias } }
        hojeISO = exame
      }
    } else if (tipo === 'dum') {
      const dumData = brToISO(st['referencia.dum.dum_data'])
      const exame = brToISO(st['referencia.dum.exame_data'])
      corrigir = String(st['referencia.dum.corrigir'] ?? 'sim') !== 'nao'
      if (dumData && exame) {
        referencia = { tipo: 'dum', dataISO: dumData }
        hojeISO = exame
      }
    }

    const r = computeIG({ biometria: { semanas: sem, dias }, hojeISO, referencia, corrigir })
    return { body: r.frase1aUS ?? '', conclusion: [r.igConclusao], isNormal: true }
  },
}

/**
 * Datação OBSTÉTRICA: DUM e primeira US visíveis ao mesmo tempo, ambas
 * opcionais. Sem seletor: qualquer referência completa entra no laudo, e a
 * primeira US completa vence a DUM (docs/epico-ig-deterministica-design.md, §6).
 * A data do exame é hoje, gravada no estado inicial e fora da tela; a composição
 * nunca consulta o relógio. Estados antigos (`referencia.usg.*`/`referencia.dum.*`)
 * são lidos por `lerDatacaoDaTela`.
 */
export const datacaoObstetricaModule: OrganModule = {
  schema: {
    id: 'ig',
    name: 'Idade gestacional',
    category: 'OBSTETRICA',
    fields: [
      { key: 'bio_sem', label: 'Biometria atual · semanas', kind: 'text', placeholder: '20' },
      { key: 'bio_dias', label: 'Dias', kind: 'text', placeholder: '3' },
      { key: 'dum_data', label: 'DUM (opcional)', kind: 'text', placeholder: 'DD/MM/AAAA' },
      { key: 'us_data', label: '1ª US · data (opcional)', kind: 'text', placeholder: 'DD/MM/AAAA' },
      { key: 'us_ig_sem', label: 'IG na 1ª US · semanas', kind: 'text', placeholder: '8', halfWidth: true },
      { key: 'us_ig_dias', label: 'Dias', kind: 'text', placeholder: '2', halfWidth: true },
    ],
  },
  initialState: (): OrganState => ({
    bio_sem: '',
    bio_dias: '',
    dum_data: '',
    us_data: '',
    us_ig_sem: '',
    us_ig_dias: '',
    exame_data: hojeBR(),
  }),
  compose: (st): OrganComposition => {
    const datacao = lerDatacaoDaTela(st)
    const pendencias = datacao.pendencias.map((p) => ({
      onde: p.campo === 'dum' ? 'DUM' : 'Primeira ultrassonografia',
      motivo: p.motivo,
    }))
    const sem = numOrNull(st.bio_sem)
    if (sem === null) {
      return { body: '', conclusion: ['Gestação em torno de ____ semanas.'], isNormal: true, pendencias }
    }
    const dias = numOrNull(st.bio_dias) ?? 0
    const usavel = datacao.referencia !== null && datacao.hojeISO !== null
    const r = computeIG({
      biometria: { semanas: sem, dias },
      hojeISO: datacao.hojeISO ?? '',
      referencia: usavel ? datacao.referencia ?? undefined : undefined,
      corrigir: datacao.corrigir,
    })
    // A DUM continua impressa quando a primeira US vence (mesmo cabeçalho do renderer canônico).
    const dumLinha = usavel && datacao.referencia?.tipo === 'us' && datacao.dum_data
      ? `DUM: ${formatBR(dataBRParaISO(datacao.dum_data) ?? datacao.dum_data)}.`
      : null
    const body = [dumLinha, r.frase1aUS ?? null].filter(Boolean).join('\n')
    return { body, conclusion: [r.igConclusao], isNormal: true, pendencias }
  },
}

// ── Feto: BCF + vitalidade + situação/apresentação + anatomia padrão ─────────
/**
 * Limites da frequência cardíaca fetal (ISUOG Practice Guidelines 2023):
 * bradicardia persistente ≤ 110 bpm, taquicardia persistente ≥ 180 bpm.
 * No modo Automático a BCF numérica decide; o médico pode sobrescrever.
 */
export const FCF_BRADICARDIA_MAX_BPM = 110
export const FCF_TAQUICARDIA_MIN_BPM = 180
/** Trava de digitação, não limite diagnóstico. Acima disso a automação não classifica. */
export const FCF_INPUT_MAX_BPM = 300

export type ClasseFcf = 'normal' | 'bradicardia' | 'taquicardia'

export function classificarFcf(bpm: number): ClasseFcf {
  if (bpm <= FCF_BRADICARDIA_MAX_BPM) return 'bradicardia'
  if (bpm >= FCF_TAQUICARDIA_MIN_BPM) return 'taquicardia'
  return 'normal'
}

export type VitalidadeFetal = {
  /** 'auto' segue a BCF; os demais são escolha explícita do médico. */
  modo: 'auto' | 'ausente' | 'bradicardia' | 'taquicardia'
  /** Alteração que vai ao laudo; null = atividade cardíaca presente e normal. */
  alteracao: 'ausente' | 'bradicardia' | 'taquicardia' | null
  /** BCF válida (nunca com atividade ausente). */
  bcf: number | null
  /** Classe sugerida pela BCF, para a tela mostrar no modo Automático. */
  sugestao: ClasseFcf | null
  /** Número impossível para classificação automática; exige correção do campo. */
  entradaInvalida: boolean
}

/**
 * A vitalidade efetiva do feto. `vitalidade: 'normal'` é o "Presente" dos estados
 * antigos e equivale ao Automático. BCF vazia nunca vira ausência: no Automático
 * ela fica pendente.
 */
export function resolverVitalidadeFetal(st: Readonly<Record<string, unknown>>): VitalidadeFetal {
  const bruto = String(st.vitalidade ?? '').trim()
  const modo = bruto === 'ausente' || bruto === 'bradicardia' || bruto === 'taquicardia' ? bruto : 'auto'
  const lida = numOrNull(st.bcf)
  const bcf = modo === 'ausente' ? null : lida
  const entradaInvalida = bcf !== null && (bcf <= 0 || bcf > FCF_INPUT_MAX_BPM)
  const sugestao = bcf === null || entradaInvalida ? null : classificarFcf(bcf)
  const alteracao = modo !== 'auto' ? modo : sugestao === 'bradicardia' || sugestao === 'taquicardia' ? sugestao : null
  return { modo, alteracao, bcf, sugestao, entradaInvalida }
}

export const DORSO_FETAL_OPCOES = ['à esquerda', 'à direita', 'anterior', 'posterior'] as const

const fetoModule: OrganModule = {
  schema: {
    id: 'feto',
    name: 'Feto',
    category: 'OBSTETRICA',
    fields: [
      { key: 'bcf', label: 'BCF (bpm)', kind: 'text', placeholder: '145' },
      {
        key: 'vitalidade', label: 'Atividade cardíaca fetal', kind: 'segmented',
        hint: `Automático: ≤ ${FCF_BRADICARDIA_MAX_BPM} bradicardia · ≥ ${FCF_TAQUICARDIA_MIN_BPM} taquicardia`,
        options: [
          { value: 'auto', label: 'Automático', isDefault: true },
          { value: 'ausente', label: 'Ausente' },
          { value: 'bradicardia', label: 'Bradicardia' },
          { value: 'taquicardia', label: 'Taquicardia' },
        ],
      },
      {
        key: 'situacao',
        label: 'Situação fetal',
        kind: 'segmented',
        options: [
          {
            value: 'longitudinal',
            label: 'Longitudinal',
            isDefault: true,
            subFields: [{
              key: 'apresentacao',
              label: 'Apresentação',
              kind: 'mini-segmented',
              options: [
                { value: 'cefálica', label: 'Cefálica', isDefault: true },
                { value: 'pélvica', label: 'Pélvica' },
              ],
            }],
          },
          {
            value: 'transversa',
            label: 'Transversa/córmica',
            subFields: [{
              key: 'polo_cefalico',
              label: 'Posição do polo cefálico',
              kind: 'mini-segmented',
              options: [
                { value: 'à direita', label: 'À direita', isDefault: true },
                { value: 'à esquerda', label: 'À esquerda' },
              ],
            }],
          },
        ],
      },
      {
        key: 'dorso', label: 'Dorso (opcional)', kind: 'segmented', presentation: 'select',
        options: [
          { value: '', label: 'Selecionar', isDefault: true },
          { value: 'à esquerda', label: 'À esquerda' },
          { value: 'à direita', label: 'À direita' },
          { value: 'anterior', label: 'Anterior' },
          { value: 'posterior', label: 'Posterior' },
        ],
      },
      {
        key: 'movimentos', label: 'Movimentos fetais', kind: 'segmented',
        options: [
          { value: 'normais', label: 'Ativos', isDefault: true },
          { value: 'reduzidos', label: 'Reduzidos' },
          { value: 'ausentes', label: 'Ausentes' },
        ],
      },
      {
        key: 'cordao_vasos', label: 'Vasos do cordão umbilical', kind: 'segmented',
        options: [
          { value: 'tres', label: '2 artérias + 1 veia', isDefault: true },
          { value: 'dois', label: 'Artéria umbilical única' },
          // Estados antigos começavam aqui; segue escolhível para não afirmar o que não foi visto.
          { value: 'nao_avaliado', label: 'Não avaliado' },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({
    bcf: '',
    vitalidade: 'auto',
    situacao: 'longitudinal',
    'situacao.longitudinal.apresentacao': 'cefálica',
    'situacao.transversa.polo_cefalico': 'à direita',
    dorso: '',
    movimentos: 'normais',
    cordao_vasos: 'tres',
  }),
  compose: (st): OrganComposition => {
    const situacao = String(st.situacao || 'longitudinal')
    const apres = String(st['situacao.longitudinal.apresentacao'] || 'cefálica')
    const polo = String(st['situacao.transversa.polo_cefalico'] || 'à direita')
    const dorso = String(st.dorso || '').trim()
    const { alteracao, bcf } = resolverVitalidadeFetal(st)
    const movimentos = String(st.movimentos || 'normais')
    const cordao = String(st.cordao_vasos || 'nao_avaliado')
    const bcfLinha = alteracao === 'ausente'
      ? 'Ausência de batimentos cardíacos fetais.'
      : alteracao === 'bradicardia'
        ? bcf === null
          ? 'Batimentos cardíacos presentes, com frequência reduzida.'
          : `Batimentos cardíacos presentes, com frequência de ${ptBr(bcf)} bpm.`
      : alteracao === 'taquicardia'
        ? bcf === null
          ? 'Batimentos cardíacos presentes, com frequência aumentada.'
          : `Batimentos cardíacos presentes, com frequência de ${ptBr(bcf)} bpm.`
        : `Batimentos cardíacos presentes, bem caracterizados pelo modo M e modo Doppler (BCF = ${bcf === null ? '____' : ptBr(bcf)} bpm).`
    const movimentosLinha = alteracao === 'ausente'
      ? null
      : movimentos === 'ausentes'
        ? 'Não foram observados movimentos fetais durante o exame.'
        : movimentos === 'reduzidos' ? 'Movimentos fetais reduzidos.' : 'Os movimentos fetais são ativos.'
    const linhas = [
      situacao === 'transversa'
        ? `Feto único, em situação transversa, com polo cefálico ${polo}${dorso ? `, e dorso ${dorso}` : ''}.`
        : `Feto único, em apresentação ${apres}${dorso ? `, com dorso ${dorso}` : ''}.`,
      bcfLinha,
      movimentosLinha,
      '\nAs considerações sobre a anatomia fetal são as seguintes:',
      'As estruturas cranianas e da coluna vertebral são normais.',
      'O estômago e a bexiga foram bem identificados e com ecotextura homogênea.',
      cordao === 'tres' ? 'O cordão umbilical tem aspecto normal, com duas artérias e uma veia.' : null,
      cordao === 'dois' ? 'O cordão umbilical tem dois vasos, sendo uma artéria e uma veia.' : null,
    ].filter((linha): linha is string => Boolean(linha))
    const conclusion = [
      alteracao === 'ausente' ? 'Óbito fetal.' : null,
      alteracao === 'bradicardia' ? 'Bradicardia fetal.' : null,
      alteracao === 'taquicardia' ? 'Taquicardia fetal.' : null,
      movimentos === 'ausentes' && alteracao !== 'ausente' ? 'Ausência de movimentos fetais durante o exame.' : null,
      movimentos === 'reduzidos' && alteracao !== 'ausente' ? 'Movimentos fetais reduzidos.' : null,
      cordao === 'dois' ? 'Artéria umbilical única.' : null,
    ].filter((item): item is string => Boolean(item))
    return { body: linhas.join('\n'), conclusion, isNormal: conclusion.length === 0 }
  },
}

// ── Biometria fetal ───────────────────────────────────────────────────────────
const biometriaModule: OrganModule = {
  schema: {
    id: 'biometria',
    name: 'Biometria',
    category: 'OBSTETRICA',
    fields: [
      { key: 'dbp', label: 'DBP (mm)', kind: 'text', placeholder: '48' },
      { key: 'cc', label: 'CC (mm)', kind: 'text', placeholder: '175' },
      { key: 'ca', label: 'CA (mm)', kind: 'text', placeholder: '152' },
      { key: 'cf', label: 'CF (mm)', kind: 'text', placeholder: '33' },
      { key: 'peso', label: 'Peso (g)', kind: 'text', placeholder: '320' },
    ],
  },
  initialState: (): OrganState => ({ dbp: '', cc: '', ca: '', cf: '', peso: '' }),
  compose: (st): OrganComposition => {
    const linhas = [
      'A biometria fetal é a seguinte:',
      `Diâmetro biparietal (DBP) de ${mm(numOrNull(st.dbp))} mm.`,
      `Circunferência da cabeça (CC) de ${mm(numOrNull(st.cc))} mm.`,
      `Circunferência abdominal (CA) de ${mm(numOrNull(st.ca))} mm.`,
      `Comprimento do fêmur (CF) de ${mm(numOrNull(st.cf))} mm.`,
      `Peso aproximado de ${mm(numOrNull(st.peso))} gramas.`,
    ]
    return { body: linhas.join('\n'), conclusion: [], isNormal: true }
  },
}

// ── Placenta ──────────────────────────────────────────────────────────────────
/**
 * Localizações oferecidas: uma parede ou a combinação de duas. Lateral só
 * aparece associada a anterior, posterior ou fúndica; combinação tripla não existe.
 */
export const PLACENTA_LOCALIZACOES = [
  { value: 'anterior', label: 'Anterior' },
  { value: 'posterior', label: 'Posterior' },
  { value: 'fúndica', label: 'Fúndica' },
  { value: 'anterior e fúndica', label: 'Anterior/fúndica' },
  { value: 'posterior e fúndica', label: 'Posterior/fúndica' },
  { value: 'anterior e lateral direita', label: 'Anterior/lateral direita' },
  { value: 'anterior e lateral esquerda', label: 'Anterior/lateral esquerda' },
  { value: 'posterior e lateral direita', label: 'Posterior/lateral direita' },
  { value: 'posterior e lateral esquerda', label: 'Posterior/lateral esquerda' },
  { value: 'fúndica e lateral direita', label: 'Fúndica/lateral direita' },
  { value: 'fúndica e lateral esquerda', label: 'Fúndica/lateral esquerda' },
] as const

export type PlacentaDaTela = {
  /** Estado antigo com Normal/Detalhar (`estado`, `estado.detalhar.*`). */
  legado: boolean
  /** Só no legado: "Normal" sem relação com o OI. */
  aspectoNormalLegado: boolean
  localizacao: string
  ecotextura: string
  grau: string
}

/**
 * A placenta da tela, nos dois formatos. Localização escolhida é sempre o
 * formato novo; sem ela, um `estado` (Normal/Detalhar) indica estado antigo.
 */
export function lerPlacentaDaTela(st: Readonly<Record<string, unknown>>): PlacentaDaTela {
  const t = (k: string) => (typeof st[k] === 'string' ? (st[k] as string).trim() : '')
  const semGrau = (g: string) => g.replace(/^grau\s*/i, '')
  if (!t('localizacao') && t('estado')) {
    const detalhar = t('estado') === 'detalhar'
    return {
      legado: true,
      aspectoNormalLegado: !detalhar,
      localizacao: detalhar ? t('estado.detalhar.localizacao') : '',
      ecotextura: detalhar ? t('estado.detalhar.ecotextura') : '',
      grau: detalhar ? semGrau(t('estado.detalhar.grau')) : '',
    }
  }
  return {
    legado: false,
    aspectoNormalLegado: false,
    localizacao: t('localizacao'),
    ecotextura: t('ecotextura'),
    grau: semGrau(t('grau')),
  }
}

/**
 * Leva a placenta antiga às chaves novas na primeira edição. "Normal" do
 * formato antigo não tinha localização: ela fica por escolher, sem default.
 */
export function migrarPlacentaLegada(st: OrganState): OrganState {
  const placenta = lerPlacentaDaTela(st)
  if (!placenta.legado) return st
  const semEstado = { ...st }
  delete semEstado.estado
  return {
    ...semEstado,
    localizacao: placenta.localizacao,
    ecotextura: placenta.aspectoNormalLegado ? 'homogênea' : placenta.ecotextura,
    grau: placenta.grau,
  }
}

const placentaModule: OrganModule = {
  schema: {
    id: 'placenta',
    name: 'Placenta',
    category: 'OBSTETRICA',
    fields: [
      {
        key: 'localizacao', label: 'Localização', kind: 'segmented', presentation: 'select',
        options: [{ value: '', label: 'Selecionar', isDefault: true }, ...PLACENTA_LOCALIZACOES],
      },
      {
        key: 'ecotextura', label: 'Ecotextura', kind: 'segmented',
        options: [
          { value: 'homogênea', label: 'Homogênea', isDefault: true },
          { value: 'heterogênea', label: 'Heterogênea' },
        ],
      },
      {
        key: 'grau', label: 'Grannum (opcional)', kind: 'segmented', presentation: 'select',
        options: [
          { value: '', label: 'Não informar', isDefault: true },
          { value: '0', label: 'Grau 0' },
          { value: 'I', label: 'Grau I' },
          { value: 'II', label: 'Grau II' },
          { value: 'III', label: 'Grau III' },
        ],
      },
      {
        key: 'relacao_orificio',
        label: 'Relação com o orifício interno do colo',
        kind: 'segmented',
        hint: 'eixo independente da localização',
        options: [
          { value: 'nao_informada', label: 'Não informar', isDefault: true },
          {
            value: 'insercao_baixa',
            label: 'Inserção baixa',
            subFields: [{ key: 'distancia_mm', label: 'Distância da borda ao OI (mm, opcional)', kind: 'text', placeholder: '12' }],
          },
          { value: 'marginal', label: 'Prévia marginal' },
          { value: 'previa', label: 'Prévia' },
        ],
      },
      {
        key: 'achado',
        label: 'Achado placentário',
        kind: 'segmented',
        options: [
          { value: 'nenhum', label: 'Sem achado', isDefault: true },
          {
            value: 'descolamento',
            label: 'Coleção retroplacentária',
            subFields: [{ key: 'medidas', label: 'Medidas (opcional)', kind: 'text', placeholder: '3,2 x 1,8 cm' }],
          },
          { value: 'acretismo', label: 'Sinais de acretismo' },
          { value: 'lagos_venosos', label: 'Lagos venosos' },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({
    localizacao: '',
    ecotextura: 'homogênea',
    grau: '',
    relacao_orificio: 'nao_informada',
    achado: 'nenhum',
  }),
  compose: (st): OrganComposition => {
    const relacao = String(st.relacao_orificio || 'nao_informada')
    const achado = String(st.achado || 'nenhum')
    const placenta = lerPlacentaDaTela(st)
    const { localizacao: loc, grau, ecotextura: eco } = placenta
    const corpo: string[] = []
    const conclusion: string[] = []
    const pendencias = placenta.legado || loc
      ? []
      : [{ onde: 'Placenta', motivo: 'Selecione a localização da placenta.' }]
    if (!placenta.aspectoNormalLegado || relacao !== 'nao_informada') {
      let frase = 'Placenta'
      if (loc) frase += ` de localização ${loc}`
      if (grau) frase += `, grau ${grau}`
      if (eco) frase += `, com ecotextura ${eco}`
      if (relacao === 'insercao_baixa') {
        frase += ', estendendo-se ao segmento uterino inferior'
        const distancia = numOrNull(st['relacao_orificio.insercao_baixa.distancia_mm'])
        if (distancia !== null) frase += `. Sua borda inferior dista cerca de ${ptBr(distancia)} mm do orifício interno do colo uterino, sem recobri-lo`
        conclusion.push('Placenta de inserção baixa.')
      } else if (relacao === 'marginal') {
        frase += ', estendendo-se inferiormente e margeando o orifício interno do colo uterino, sem evidência de recobrimento'
        conclusion.push('Placenta prévia marginal.')
      } else if (relacao === 'previa') {
        frase += ', estendendo-se ao segmento uterino inferior e recobrindo amplamente o orifício interno do colo uterino'
        conclusion.push('Placenta prévia.')
      }
      corpo.push(`${frase}.`)
    } else if (achado === 'nenhum') {
      corpo.push('Placenta de aspecto normal.')
    }

    if (achado === 'descolamento') {
      const medidas = String(st['achado.descolamento.medidas'] || '').trim()
      corpo.push(`Imagem hipoecoica e heterogênea${medidas ? `, medindo ${medidas}` : ''}, situada entre a placenta e o miométrio, sem vascularização.`)
      conclusion.push('Coleção retroplacentária, que tem como diagnóstico mais provável descolamento placentário.')
    } else if (achado === 'acretismo') {
      corpo.push('Placenta apresentando perda focal da zona hipoecoica retroplacentária e acentuado adelgaçamento do miométrio subjacente. Ademais, imagens anecoicas intraplacentárias, irregulares, algumas apresentando fluxo turbulento ao estudo Doppler, associadas a aumento da vascularização na interface uterovesical.')
      conclusion.push('Achados ultrassonográficos que aumentam a suspeição para espectro de acretismo placentário (PAS). Convém, a critério clínico, avaliação dirigida em serviço de alto risco e controle ultrassonográfico.')
    } else if (achado === 'lagos_venosos') {
      corpo.push('Placenta apresentando imagens anecoicas intraparenquimatosas, bem delimitadas, de contornos regulares, algumas demonstrando fluxo de baixa velocidade ao estudo Doppler.')
      conclusion.push('Lagos venosos placentários.')
    }
    return { body: corpo.join('\n'), conclusion, isNormal: conclusion.length === 0, pendencias }
  },
}

// ── Líquido amniótico (MBV/ILA com classificação segura — boletim) ────────────
export function classeMBV(v: number): { classe: string; conclusao: string } {
  if (v < 2) return { classe: 'reduzida', conclusao: 'Oligoâmnio' }
  if (v > 8) return { classe: 'aumentada', conclusao: 'Polidrâmnio' }
  return { classe: 'normal', conclusao: 'Líquido amniótico em quantidade normal' }
}
export function classeILA(v: number): { classe: string; conclusao: string } {
  if (v < 5) return { classe: 'reduzida', conclusao: 'Oligoâmnio' }
  if (v > 25) return { classe: 'aumentada', conclusao: 'Polidrâmnio' }
  return { classe: 'normal', conclusao: 'Líquido amniótico em quantidade normal' }
}

export type LiquidoDaTela = {
  metodo: 'subjetivo' | 'mbv' | 'ila'
  /** Texto do valor em cm como a tela mostra (formato novo ou legado). */
  valorTexto: string
  /** Valor numérico válido, ou null. */
  valor: number | null
  /** Motivo de bloqueio: valor que não pode ser usado sem inferir. */
  pendencia: string | null
}

/**
 * O líquido da tela. O valor vive num campo único (`valor_cm`) e só vale com
 * MBV ou ILA; estados antigos guardavam a medida em `tipo.mbv.cm`/`tipo.ila.cm`,
 * lida só para o método escolhido, como antes.
 */
export function lerLiquidoDaTela(st: Readonly<Record<string, unknown>>): LiquidoDaTela {
  const bruto = String(st.tipo ?? '').trim()
  const metodo = bruto === 'mbv' || bruto === 'ila' ? bruto : 'subjetivo'
  const t = (k: string) => (typeof st[k] === 'string' ? (st[k] as string).trim() : '')
  const valorTexto = t('valor_cm') || (metodo === 'subjetivo' ? '' : t(`tipo.${metodo}.cm`))
  const valor = numOrNull(valorTexto)
  let pendencia: string | null = null
  if (valorTexto && metodo === 'subjetivo') {
    pendencia = `Há ${valorTexto} cm informado sem método quantitativo: escolha MBV ou ILA, ou apague o valor.`
  } else if (valorTexto && valor === null) {
    pendencia = `Informe o ${metodo === 'mbv' ? 'maior bolsão vertical' : 'ILA'} em cm (ex.: 5,6) ou apague o valor.`
  }
  return { metodo, valorTexto, valor, pendencia }
}

/** Move a medida antiga (`tipo.mbv.cm`/`tipo.ila.cm`) para o campo único na primeira edição. */
export function migrarLiquidoLegado<T extends Record<string, unknown>>(st: T): T {
  const legado = ['tipo.mbv.cm', 'tipo.ila.cm'].some((k) => typeof st[k] === 'string' && (st[k] as string).trim())
  if (!legado) return st
  return { ...st, valor_cm: lerLiquidoDaTela(st).valorTexto, 'tipo.mbv.cm': '', 'tipo.ila.cm': '' }
}

/** Trocar entre ILA e MBV nunca reaproveita a mesma medida com outro significado. */
export function trocarMetodoLiquido<T extends Record<string, unknown>>(
  st: T,
  proximo: 'subjetivo' | 'mbv' | 'ila',
): T {
  const atual = lerLiquidoDaTela(st)
  const deveLimpar = atual.metodo !== 'subjetivo' && atual.metodo !== proximo
  return {
    ...st,
    tipo: proximo,
    ...(deveLimpar ? { valor_cm: '' } : {}),
  }
}

const liquidoModule: OrganModule = {
  schema: {
    id: 'liquido',
    name: 'Líquido amniótico',
    category: 'OBSTETRICA',
    fields: [
      {
        key: 'tipo',
        label: 'Método',
        kind: 'segmented',
        options: [
          { value: 'subjetivo', label: 'Subjetivo', isDefault: true },
          { value: 'mbv', label: 'MBV' },
          { value: 'ila', label: 'ILA' },
        ],
      },
      { key: 'valor_cm', label: 'Valor (cm)', kind: 'text', placeholder: '5,6' },
    ],
  },
  initialState: (): OrganState => ({ tipo: 'subjetivo', valor_cm: '' }),
  compose: (st): OrganComposition => {
    const liquido = lerLiquidoDaTela(st)
    const pendencias = liquido.pendencia ? [{ onde: 'Líquido amniótico', motivo: liquido.pendencia }] : []
    // Subjetivo normal (também é o fallback quando a medida está em branco — NUNCA
    // afirmar normalidade atrelada a um "____" cm; review dex2).
    const subjetivo: OrganComposition = {
      body: 'Líquido amniótico de quantidade normal pela análise subjetiva.',
      conclusion: ['Líquido amniótico em quantidade normal.'],
      isNormal: true,
      pendencias,
    }
    const v = liquido.valor
    if (liquido.metodo === 'mbv' && v !== null) {
      const c = classeMBV(v)
      return { body: `Maior bolsão vertical de ${ptBr(v)} cm.`, conclusion: [`${c.conclusao} (maior bolsão vertical de ${ptBr(v)} cm).`], isNormal: c.classe === 'normal', pendencias }
    }
    if (liquido.metodo === 'ila' && v !== null) {
      const c = classeILA(v)
      return { body: `Índice de líquido amniótico (ILA) de ${ptBr(v)} cm.`, conclusion: [`${c.conclusao} (ILA de ${ptBr(v)} cm).`], isNormal: c.classe === 'normal', pendencias }
    }
    return subjetivo
  },
}

// ── Achados adicionais (texto livre do médico, vai ao corpo) ──────────────────
const achadosModule: OrganModule = {
  schema: {
    id: 'achados',
    name: 'Achados adicionais',
    category: 'OBSTETRICA',
    fields: [{ key: 'texto', label: 'Achados adicionais (opcional)', kind: 'text', placeholder: 'observação livre — vai ao corpo do laudo' }],
  },
  initialState: (): OrganState => ({ texto: '' }),
  compose: (st): OrganComposition => {
    const t = String(st.texto || '').trim()
    return { body: t || '', conclusion: [], isNormal: true }
  },
}

const cervicometriaModule = criarCervicometriaAddonModule('OBSTETRICA')
const fetalGrowthModule = criarFetalGrowthModule('OBSTETRICA')

export const obstetrica: ExamCategory = {
  id: 'OBSTETRICA',
  name: 'Obstétrica',
  title: 'ULTRASSONOGRAFIA OBSTÉTRICA',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'ig', label: 'Datação', group: 'orgaos', module: datacaoObstetricaModule },
    { id: 'feto', label: 'Feto', group: 'orgaos', module: fetoModule },
    { id: 'biometria', label: 'Biometria', group: 'orgaos', module: biometriaModule },
    { id: 'placenta', label: 'Placenta', group: 'orgaos', module: placentaModule },
    { id: 'liquido', label: 'Líquido', group: 'orgaos', module: liquidoModule },
    { id: 'cervicometria', label: 'Cervicometria', group: 'orgaos', module: cervicometriaModule },
    { id: 'crescimento_fetal', label: 'Crescimento fetal', group: 'orgaos', module: fetalGrowthModule },
    { id: 'achados', label: 'Achados adicionais', group: 'orgaos', module: achadosModule },
  ],
  calculators: [
    preEclampsiaFmfSpec,
    ...(process.env.NEXT_PUBLIC_FMF_TRISOMY_VALIDATION === 'true' ? [trisomyFmfSpec] : []),
  ],
  // A IG sempre gera item de conclusão; este fallback é só defensivo.
  conclusionNormal: 'Gestação em torno de ____ semanas.',
}
