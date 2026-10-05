/**
 * AXILAS — card próprio no seletor para o exame isolado das regiões axilares.
 *
 * Reaproveita o formulário axilar da MAMARIA (descritores de forma e hilo, frase
 * normal e título/técnica do escopo "somente axilas"), sem biblioteca nova.
 * Auditoria: laudario/audits/lote3/axilas-2026-10-05.md (X1–X3, X5).
 *
 * Compõe localmente, não pelo renderer da mama: o contrato canônico de MAMARIA
 * só conhece "axilas normais" ou "atípico" e transformaria "não avaliada" ou um
 * lado pós-cirúrgico em axila normal ou atípica. Até o contrato
 * LINFONODO_REGIONAL existir na API, o estado por lado vive aqui.
 *
 * Regras:
 * - cada axila tem estado explícito; o formulário em branco não afirma nada e o
 *   modelo normal é escolha explícita;
 * - "não avaliada" e "pós-cirúrgica" retiram a normalidade daquele lado;
 * - linfonodo alterado exige eixos longo e curto (mm), hilo ou cortical e
 *   classificação confirmada pelo médico; eixo curto maior que o longo bloqueia.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { AXILA_FORMA_OPTIONS, AXILA_HILO_OPTIONS, AXILAR_NORMAL_CONCLUSAO } from './mamaria'
import { texto, valorNumerico } from './superficialShared'

export const AXILAS = 'AXILAS'
type Lado = 'direita' | 'esquerda'
type Estado = 'sem_estado' | 'normal' | 'alterada' | 'nao_avaliada' | 'pos_cirurgica'

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
const mm = (key: string, label: string, placeholder: string): Field => ({ key, label, kind: 'text', placeholder, halfWidth: true })
const frase = (s: string) => s.trim().replace(/[.;,:\s]+$/u, '')
const minusc = (s: string) => s.charAt(0).toLocaleLowerCase('pt-BR') + s.slice(1)
const fmt = (raw: unknown) => String(raw ?? '').trim().replace(/\s*mm$/i, '').replace('.', ',')

function estadoDe(st: OrganState, opts: OrganState): Estado {
  const raw = texto(st, 'estado') || 'modelo'
  if (raw === 'modelo') return texto(opts, 'modelo') === 'normal' ? 'normal' : 'sem_estado'
  return raw as Estado
}

const P = 'estado.alterada.'
const CLASSE: Record<string, (lado: Lado, multiplos: boolean) => string> = {
  reacional: (lado, m) => `${m ? 'Linfonodos axilares proeminentes' : 'Linfonodo axilar proeminente'}, de aspecto reacional, à ${lado}.`,
  atipico: (lado, m) => `${m ? 'Linfonodos axilares atípicos' : 'Linfonodo axilar atípico'} à ${lado}.`,
}

type Lido = { estado: Estado; corpo: string; conclusao: string; pendencias: PendenciaLocal[] }
function lerLado(st: OrganState, opts: OrganState, lado: Lado): Lido {
  const onde = `Axila ${lado}`
  const estado = estadoDe(st, opts)
  const pendencias: PendenciaLocal[] = []
  if (estado === 'sem_estado') return { estado, corpo: '', conclusao: '', pendencias: [{ onde, motivo: 'informe o estado da axila (normal, alterada, não avaliada ou pós-cirúrgica)' }] }
  if (estado === 'normal') {
    return { estado, corpo: `Na axila ${lado}, imagens ovais, com a periferia hipoecoica e o centro hiperecoico, compatíveis com linfonodos de aspecto habitual.`, conclusao: `Linfonodos de aspecto habitual na axila ${lado}.`, pendencias }
  }
  if (estado === 'nao_avaliada') {
    const motivo = frase(texto(st, 'estado.nao_avaliada.motivo'))
    const m = motivo ? ` (${minusc(motivo)})` : ''
    return { estado, corpo: `Axila ${lado} não avaliada${m}.`, conclusao: `Axila ${lado} não avaliada${m}.`, pendencias }
  }
  if (estado === 'pos_cirurgica') {
    const desc = frase(texto(st, 'estado.pos_cirurgica.descricao'))
    if (!desc) return { estado, corpo: '', conclusao: '', pendencias: [{ onde, motivo: 'descreva o procedimento prévio (ex.: esvaziamento axilar)' }] }
    return { estado, corpo: `Axila ${lado} com alterações pós-cirúrgicas (${minusc(desc)}), sem linfonodos identificáveis ao método.`, conclusao: `Alterações pós-cirúrgicas na axila ${lado} (${minusc(desc)}).`, pendencias }
  }
  // Alterada: dados mínimos + classificação confirmada.
  const longo = valorNumerico(st[`${P}eixo_longo_mm`])
  const curto = valorNumerico(st[`${P}eixo_curto_mm`])
  const hilo = texto(st, `${P}hilo`)
  const cortical = valorNumerico(st[`${P}cortical_mm`])
  const classe = texto(st, `${P}classificacao`)
  const faltando = [
    longo === null && 'eixo longo (mm)', curto === null && 'eixo curto (mm)',
    !hilo && cortical === null && 'hilo gorduroso ou espessura cortical',
    !CLASSE[classe] && 'classificação do linfonodo',
  ].filter(Boolean) as string[]
  if (faltando.length) pendencias.push({ onde, motivo: `informe ${faltando.join(', ')}` })
  if (longo !== null && curto !== null && curto > longo) pendencias.push({ onde, motivo: 'o eixo curto não pode ser maior que o eixo longo' })
  if ((longo !== null && (longo < 2 || longo > 80)) || (curto !== null && curto < 1)) pendencias.push({ onde, motivo: 'confira a unidade dos eixos (mm)' })
  if (cortical !== null && (cortical < 0.5 || cortical > 20)) pendencias.push({ onde, motivo: 'confira a unidade da espessura cortical (mm)' })
  if (CLASSE[classe] && texto(st, `${P}confirmado`) !== 'sim') pendencias.push({ onde, motivo: 'confirme a classificação do linfonodo' })
  if (pendencias.length) return { estado, corpo: '', conclusao: '', pendencias }
  const multiplos = texto(st, `${P}quantidade`) === 'multiplos'
  const forma = texto(st, `${P}forma`)
  const descritores = [
    forma && `de forma ${forma}`,
    hilo && `com hilo gorduroso ${hilo}`,
    cortical !== null && `cortical de ${fmt(st[`${P}cortical_mm`])} mm`,
  ].filter(Boolean).join(', ')
  const sujeito = multiplos ? `Na axila ${lado}, múltiplos linfonodos, o maior` : `Na axila ${lado}, linfonodo`
  return {
    estado,
    corpo: `${sujeito}${descritores ? ` ${descritores},` : ''} medindo ${fmt(st[`${P}eixo_longo_mm`])} mm no eixo longo e ${fmt(st[`${P}eixo_curto_mm`])} mm no eixo curto.`,
    conclusao: CLASSE[classe]!(lado, multiplos),
    pendencias,
  }
}

function axilaModule(lado: Lado): OrganModule {
  const fields: Field[] = [{
    key: 'estado', label: `Axila ${lado}`, kind: 'segmented', presentation: 'select', options: [
      { value: 'modelo', label: 'Conforme modelo', isDefault: true },
      { value: 'normal', label: 'Normal' },
      { value: 'alterada', label: 'Alterada', subFields: [
        select('quantidade', 'Quantidade', [['unico', 'Único'], ['multiplos', 'Múltiplos (medir o maior)']]),
        mm('eixo_longo_mm', 'Eixo longo (mm)', '18'),
        mm('eixo_curto_mm', 'Eixo curto (mm)', '12'),
        { key: 'forma', label: 'Forma', kind: 'mini-segmented', options: AXILA_FORMA_OPTIONS },
        { key: 'hilo', label: 'Hilo gorduroso', kind: 'mini-segmented', options: AXILA_HILO_OPTIONS },
        mm('cortical_mm', 'Espessura cortical (mm)', '3'),
        select('classificacao', 'Classificação', [['nao_classificado', 'Selecione'], ['reacional', 'Proeminente, de aspecto reacional'], ['atipico', 'Atípico']]),
        select('confirmado', 'Confirmação médica da classificação', [['nao', 'Pendente de confirmação'], ['sim', 'Confirmada pelo médico']]),
      ] },
      { value: 'nao_avaliada', label: 'Não avaliada', subFields: [{ key: 'motivo', label: 'Motivo (opcional)', kind: 'text', placeholder: 'Ex.: curativo local' }] },
      { value: 'pos_cirurgica', label: 'Pós-cirúrgica', subFields: [{ key: 'descricao', label: 'Procedimento prévio', kind: 'text', placeholder: 'Ex.: esvaziamento axilar' }] },
    ],
  }]
  return {
    schema: { id: `axila_${lado}`, name: `Axila ${lado}`, category: AXILAS, fields },
    initialState: () => ({
      estado: 'modelo', [`${P}quantidade`]: 'unico', [`${P}eixo_longo_mm`]: '', [`${P}eixo_curto_mm`]: '', [`${P}forma`]: '', [`${P}hilo`]: '',
      [`${P}cortical_mm`]: '', [`${P}classificacao`]: 'nao_classificado', [`${P}confirmado`]: 'nao',
      'estado.nao_avaliada.motivo': '', 'estado.pos_cirurgica.descricao': '',
    }),
    compose: (st, opts = {}): OrganComposition => {
      const l = lerLado(st, opts, lado)
      return { body: l.corpo, conclusion: l.conclusao ? [l.conclusao] : [], pendencias: l.pendencias, isNormal: l.estado === 'normal' }
    },
  }
}

const sections: ExamSection[] = [
  { id: 'axila_direita', label: 'Axila direita', group: 'orgaos', module: axilaModule('direita') },
  { id: 'axila_esquerda', label: 'Axila esquerda', group: 'orgaos', module: axilaModule('esquerda') },
]

export const axilas: ExamCategory = {
  id: AXILAS,
  name: 'Axilas',
  // Mesmo título e técnica do escopo "somente axilas" do renderer da mama.
  title: 'ULTRASSONOGRAFIA DAS REGIÕES AXILARES',
  tecnica: 'Exame realizado com transdutor linear de alta frequência, abrangendo as regiões axilares.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections,
  controls: [select('modelo', 'Modelo de partida', [['em_branco', 'Em branco'], ['normal', 'Normal — as duas axilas avaliadas sem alterações']])],
  /**
   * As duas axilas normais saem com as frases da mama (bilateral). Qualquer outro
   * estado mantém a redação por lado, e nada é afirmado sobre o lado não avaliado.
   */
  resolveConclusionItems: (items, state) => {
    const opts = state.__opts ?? {}
    const ambosNormais = (['direita', 'esquerda'] as const).every(lado => estadoDe(state[`axila_${lado}`] ?? {}, opts) === 'normal')
    return ambosNormais ? [AXILAR_NORMAL_CONCLUSAO] : items
  },
  conclusionNormal: AXILAR_NORMAL_CONCLUSAO,
}
