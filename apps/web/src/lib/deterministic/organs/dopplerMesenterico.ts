/**
 * Categoria DOPPLER_MESENTERICO — MVP Web estruturado (composição local).
 *
 * Preflight: docs/competitor-research/laudario/audits/preflight-doppler-arterias-mesentericas-2026-10-05.md
 * (worktree laudario). O repositório não tinha conteúdo mesentérico; a redação
 * segue o contrato do Doppler arterial MMII (`packages/shared/.../dopplerArterialMmii.ts`):
 * avaliação por vaso, VPS em cm/s, estenose e oclusão só com confirmação médica.
 *
 * Salvaguardas do preflight:
 *  - vaso não avaliado nunca vira normal (a AMI fica "não avaliada" até no modelo normal);
 *  - nenhuma graduação por limiar — não há fonte clínica própria para VPS/VDF;
 *  - estenose exige VPS na lesão + confirmação; sem confirmação, o achado é descritivo;
 *  - aorta de referência só descrita quando medida (razão com a aorta fica fora do MVP);
 *  - compressão pelo ligamento arqueado só com as duas fases respiratórias + confirmação;
 *  - a conclusão restringe o escopo aos vasos avaliados e nunca "exclui isquemia".
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'

const CATEGORIA = 'DOPPLER_MESENTERICO'

type VasoId = 'tronco_celiaco' | 'ams' | 'ami'
interface Vaso {
  id: VasoId
  nome: string
  /** "do tronco celíaco" / "da artéria mesentérica superior". */
  de: string
  /** "no tronco celíaco" / "na artéria ...". */
  em: string
  pervio: string
  avaliado: string
  /** Avaliado no modelo normal. A AMI fica fora: não avaliada nunca vira normal. */
  noModeloNormal: boolean
}

const VASOS: Record<VasoId, Vaso> = {
  tronco_celiaco: { id: 'tronco_celiaco', nome: 'Tronco celíaco', de: 'do tronco celíaco', em: 'no tronco celíaco', pervio: 'pérvio', avaliado: 'avaliado', noModeloNormal: true },
  ams: { id: 'ams', nome: 'Artéria mesentérica superior', de: 'da artéria mesentérica superior', em: 'na artéria mesentérica superior', pervio: 'pérvia', avaliado: 'avaliada', noModeloNormal: true },
  ami: { id: 'ami', nome: 'Artéria mesentérica inferior', de: 'da artéria mesentérica inferior', em: 'na artéria mesentérica inferior', pervio: 'pérvia', avaliado: 'avaliada', noModeloNormal: false },
}

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
const numero = (key: string, label: string, placeholder: string): Field => ({ key, label, kind: 'text', placeholder, halfWidth: true })
const CONFIRMACAO = [['no', 'Pendente de confirmação'], ['yes', 'Confirmado pelo médico']] as const

/** Velocidade em cm/s: vazio = não medido; texto que não é número positivo = inválido. */
function velocidade(raw: unknown): number | null | 'invalida' {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase().replace(/\s*cm\/s$/, '').replace(',', '.') : ''
  if (!s) return null
  if (!/^\d+(\.\d+)?$/.test(s)) return 'invalida'
  const n = Number(s)
  return n > 0 ? n : 'invalida'
}
const pt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))
const texto = (st: OrganState, key: string) => (typeof st[key] === 'string' ? (st[key] as string).trim() : '')
const textoLivre = (raw: string) => raw.replace(/\s+/g, ' ').replace(/\.+$/, '')

export type Avaliacao = 'not_assessed' | 'evaluated' | 'limited'
export function avaliacaoDe(vaso: VasoId, st: OrganState | undefined, opts: OrganState | undefined): Avaliacao {
  const raw = texto(st ?? {}, 'assessment') || 'model'
  if (raw === 'evaluated' || raw === 'limited' || raw === 'not_assessed') return raw
  return opts?.model === 'normal' && VASOS[vaso].noModeloNormal ? 'evaluated' : 'not_assessed'
}

const ALTERACAO: Field = {
  key: 'alteration', label: 'Alteração', kind: 'segmented', presentation: 'select', options: [
    { value: 'none', label: 'Nenhuma', isDefault: true },
    { value: 'stenosis', label: 'Aceleração focal / estenose', subFields: [
      numero('lesion_psv_cms', 'VPS na lesão (cm/s)', '300'),
      numero('lesion_edv_cms', 'VDF na lesão (cm/s)', '50'),
      select('confirmed', 'Estenose — confirmação médica', CONFIRMACAO),
    ] },
    { value: 'no_flow', label: 'Fluxo não detectado', subFields: [
      select('occlusion_confirmed', 'Oclusão — confirmação médica', CONFIRMACAO),
    ] },
  ],
}

function campos(vaso: VasoId): Field[] {
  const base: Field[] = [
    select('assessment', 'Avaliação', [['model', 'Conforme modelo'], ['not_assessed', 'Não avaliado'], ['evaluated', 'Avaliado'], ['limited', 'Avaliação limitada']]),
    { key: 'limitation', label: 'Limitação (obrigatória se limitada)', kind: 'text', placeholder: 'Ex.: interposição gasosa' },
    numero('psv_cms', 'VPS (cm/s)', '120'),
    numero('edv_cms', 'VDF (cm/s)', '20'),
    select('plaque', 'Placas', [['not_informed', 'Não informado'], ['absent', 'Ausentes'], ['present', 'Presentes']]),
    ALTERACAO,
  ]
  if (vaso !== 'tronco_celiaco') return base
  return [
    ...base,
    numero('insp_psv_cms', 'VPS na inspiração (cm/s)', '150'),
    numero('exp_psv_cms', 'VPS na expiração (cm/s)', '280'),
    select('arcuate_confirmed', 'Compressão pelo ligamento arqueado — confirmação médica', CONFIRMACAO),
  ]
}

function compor(vasoId: VasoId, st: OrganState, opts: OrganState): OrganComposition {
  const vaso = VASOS[vasoId]
  const pendencias: PendenciaLocal[] = []
  const falta = (motivo: string) => pendencias.push({ onde: vaso.nome, motivo })
  const linhas: string[] = []
  const conclusion: string[] = []

  // O preparo é controle do exame; quem o valida é o primeiro vaso, para a
  // pendência aparecer uma vez só.
  if (vasoId === 'tronco_celiaco' && !['confirmado', 'nao_confirmado'].includes(String(opts.jejum ?? ''))) {
    pendencias.push({ onde: 'Preparo', motivo: 'informe se o jejum foi confirmado' })
  }

  const avaliacao = avaliacaoDe(vasoId, st, opts)
  const alteracao = texto(st, 'alteration') || 'none'
  const limitacao = textoLivre(texto(st, 'limitation'))
  const psv = velocidade(st.psv_cms)
  const edv = velocidade(st.edv_cms)
  const plaque = texto(st, 'plaque')
  if (psv === 'invalida') falta('VPS inválida — informe um número em cm/s')
  if (edv === 'invalida') falta('VDF inválida — informe um número em cm/s')

  if (avaliacao === 'not_assessed') {
    const preenchido = alteracao !== 'none' || psv !== null || edv !== null || plaque === 'present' || limitacao
    if (preenchido) falta('há dados preenchidos em vaso marcado como não avaliado — selecione a avaliação')
    linhas.push(`${vaso.nome} não ${vaso.avaliado}.`)
    conclusion.push(`${vaso.nome} não ${vaso.avaliado}.`)
    return { body: linhas.join('\n'), conclusion, pendencias, isNormal: false }
  }
  if (avaliacao === 'limited' && !limitacao) falta('descreva a limitação da avaliação')

  const medidas = [psv !== null && psv !== 'invalida' && `VPS de ${pt(psv)} cm/s`, edv !== null && edv !== 'invalida' && `VDF de ${pt(edv)} cm/s`].filter(Boolean).join(' e ')
  let alterado = false

  if (alteracao === 'no_flow') {
    if (psv !== null || edv !== null) falta('fluxo não detectado não admite VPS ou VDF no mesmo vaso')
    const confirmada = texto(st, 'alteration.no_flow.occlusion_confirmed') === 'yes'
    if (confirmada && avaliacao === 'limited') falta('oclusão confirmada exige vaso avaliado sem limitação')
    linhas.push(`${vaso.nome}: fluxo não detectado ao Doppler colorido e espectral.`)
    conclusion.push(confirmada
      ? `Ausência de fluxo ${vaso.em}, compatível com oclusão, conforme confirmação médica.`
      : `Fluxo não detectado ${vaso.em}, sem confirmação de oclusão.`)
    alterado = true
  } else if (alteracao === 'stenosis') {
    const lesao = velocidade(st['alteration.stenosis.lesion_psv_cms'])
    const lesaoEdv = velocidade(st['alteration.stenosis.lesion_edv_cms'])
    if (lesao === null) falta('informe a VPS na lesão para descrever a aceleração focal')
    if (lesao === 'invalida') falta('VPS na lesão inválida — informe um número em cm/s')
    if (lesaoEdv === 'invalida') falta('VDF na lesão inválida — informe um número em cm/s')
    if (typeof lesao === 'number') {
      const partes = [`VPS de ${pt(lesao)} cm/s`]
      if (typeof lesaoEdv === 'number') partes.push(`VDF de ${pt(lesaoEdv)} cm/s`)
      linhas.push(`${vaso.nome} com aceleração focal do fluxo, ${partes.join(', ')}${plaque === 'present' ? ', associada a placas ateromatosas parietais' : ''}.`)
      conclusion.push(texto(st, 'alteration.stenosis.confirmed') === 'yes'
        ? `Estenose hemodinamicamente significativa ${vaso.de} (VPS de ${pt(lesao)} cm/s), conforme confirmação médica.`
        : `Aumento focal da velocidade de pico sistólico ${vaso.em} (VPS de ${pt(lesao)} cm/s), sem estenose confirmada.`)
    }
    alterado = true
  } else {
    const placas = plaque === 'present' ? ', com placas ateromatosas parietais' : plaque === 'absent' ? ', sem placas ateromatosas' : ''
    linhas.push(avaliacao === 'limited'
      ? `${vaso.nome} com fluxo detectável nos segmentos visualizados${medidas ? ` (${medidas})` : ''}${placas}.`
      : `${vaso.nome} ${vaso.pervio}, com fluxo de padrão habitual ao Doppler colorido e espectral${medidas ? ` (${medidas})` : ''}${placas}.`)
    if (plaque === 'present') {
      conclusion.push(`Placas ateromatosas ${vaso.em}, sem aceleração focal do fluxo documentada.`)
      alterado = true
    } else if (avaliacao === 'evaluated') {
      conclusion.push(`${vaso.nome} ${vaso.pervio}, sem sinais ecográficos de estenose hemodinamicamente significativa.`)
    }
  }

  if (avaliacao === 'limited' && limitacao) {
    linhas.push(`Avaliação limitada ${vaso.de}: ${limitacao}.`)
    conclusion.push(`Avaliação limitada ${vaso.de} (${limitacao}).`)
  }

  if (vasoId === 'tronco_celiaco') {
    const insp = velocidade(st.insp_psv_cms)
    const exp = velocidade(st.exp_psv_cms)
    const confirmada = texto(st, 'arcuate_confirmed') === 'yes'
    if (insp === 'invalida' || exp === 'invalida') falta('VPS respiratória inválida — informe um número em cm/s')
    const ambas = typeof insp === 'number' && typeof exp === 'number'
    if ((insp !== null) !== (exp !== null)) falta('informe a VPS na inspiração e na expiração')
    if (confirmada && !ambas) falta('a compressão pelo ligamento arqueado exige VPS na inspiração e na expiração')
    if (ambas) {
      linhas.push(`Variação respiratória da velocidade no tronco celíaco: VPS de ${pt(insp)} cm/s na inspiração e de ${pt(exp)} cm/s na expiração.`)
      if (confirmada) {
        conclusion.push('Variação respiratória da velocidade no tronco celíaco, achado que pode corresponder a compressão extrínseca pelo ligamento arqueado mediano, conforme interpretação médica.')
        alterado = true
      }
    }
  }

  return { body: linhas.join('\n'), conclusion, pendencias, isNormal: !alterado && avaliacao === 'evaluated' }
}

function modulo(vaso: VasoId): OrganModule {
  const fields = campos(vaso)
  const initialState = (): OrganState => {
    const st: OrganState = {}
    for (const field of fields) {
      st[field.key] = field.options?.find((o) => o.isDefault)?.value ?? ''
      for (const option of field.options ?? []) for (const sub of option.subFields ?? []) {
        st[`${field.key}.${option.value}.${sub.key}`] = sub.options?.find((o) => o.isDefault)?.value ?? ''
      }
    }
    return st
  }
  return {
    schema: { id: vaso, name: VASOS[vaso].nome, category: CATEGORIA, fields },
    initialState,
    compose: (st, opts) => compor(vaso, st, opts ?? {}),
  }
}

const VASO_SECOES: ExamSection[] = (['tronco_celiaco', 'ams', 'ami'] as const).map((id) => ({
  id, label: VASOS[id].nome, group: 'orgaos', module: modulo(id),
}))

/** Aorta de referência: opcional, só entra no corpo quando medida. */
const aortaModule: OrganModule = {
  schema: { id: 'aorta', name: 'Aorta de referência', category: CATEGORIA, fields: [numero('psv_cms', 'VPS da aorta (cm/s, opcional)', '90')] },
  initialState: () => ({ psv_cms: '' }),
  compose: (st): OrganComposition => {
    const aorta = velocidade(st.psv_cms)
    if (aorta === 'invalida') return { body: '', conclusion: [], pendencias: [{ onde: 'Aorta de referência', motivo: 'VPS inválida — informe um número em cm/s' }], isNormal: true }
    return { body: aorta === null ? '' : `Aorta abdominal de referência com velocidade de pico sistólico (VPS) de ${pt(aorta)} cm/s.`, conclusion: [], isNormal: true }
  },
}

const SECOES: ExamSection[] = [{ id: 'aorta', label: 'Aorta de referência', group: 'orgaos', module: aortaModule }, ...VASO_SECOES]

/** Pendência do exame inteiro (o compositor só enxerga um vaso por vez). */
export function dopplerMesentericoIssuesDoExame(state: Record<string, OrganState>): string[] {
  const opts = state.__opts ?? {}
  const algum = VASO_SECOES.some((s) => avaliacaoDe(s.id as VasoId, state[s.id], opts) !== 'not_assessed')
  return algum ? [] : ['Exame: registre ao menos um vaso avaliado ou com avaliação limitada.']
}

const TECNICA = 'Exame realizado com transdutor convexo multifrequencial, com avaliação em modo B, Doppler colorido e espectral, ângulo de insonação igual ou inferior a 60°'

export const dopplerMesenterico: ExamCategory = {
  id: CATEGORIA,
  name: 'Doppler de artérias mesentéricas',
  title: 'ULTRASSONOGRAFIA COM DOPPLER DAS ARTÉRIAS MESENTÉRICAS',
  tecnica: `${TECNICA}, em jejum.`,
  resolveTecnica: (opts) => {
    const fase = opts.fase === 'jejum_pos_prandial' ? ', em jejum e após refeição (fase pós-prandial)' : ', em jejum'
    const preparo = opts.jejum === 'nao_confirmado' ? ' Jejum não confirmado, o que pode limitar a avaliação.' : ''
    return `${TECNICA}${fase}.${preparo}`
  },
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    select('model', 'Modelo de partida', [['blank', 'Em branco'], ['normal', 'Normal — tronco celíaco e AMS avaliados sem alterações']]),
    select('jejum', 'Jejum', [['nao_informado', 'Não informado'], ['confirmado', 'Confirmado'], ['nao_confirmado', 'Não confirmado']]),
    select('fase', 'Fases', [['jejum', 'Jejum'], ['jejum_pos_prandial', 'Jejum e pós-prandial']]),
  ],
  sections: SECOES,
  // Cada vaso já leva a própria conclusão (normal, limitada ou não avaliada).
  conclusionNormal: '',
}
