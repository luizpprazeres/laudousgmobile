/**
 * Categoria MAMA_MASCULINA — MVP Web estruturado (composição local).
 *
 * Reaproveita do contrato mamário existente:
 *  - campos e léxico do nódulo/cisto (`noduloSubs`, `cistoSubs`, `ecoTxt`,
 *    `margemTxt`) e as frases de ausência de lesão, axila normal e rodapé
 *    BI-RADS de `mamaria.ts`;
 *  - técnica da mama masculina e frase de ginecomastia do renderer canônico
 *    (`apps/api/.../categories/MAMARIA.ts`) e dos snippets
 *    `packages/knowledge/snippets/MAMARIA/regra/ginecomastia.md`.
 *
 * Diferenças deliberadas em relação a MAMARIA:
 *  - modelo basal masculino (região retroareolar, pele/subcutâneo por mama);
 *  - BI-RADS NUNCA é calculado: só sai a categoria que o médico escolher.
 *    Nódulo sólido sem categoria bloqueia; categoria incoerente com os achados
 *    (1 com achado, 2–6 sem achado) também bloqueia;
 *  - achado sem dado essencial (medidas, margem, localização, lado,
 *    descrição) é pendência bloqueante — o laudo não é montado.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { AUSENCIA_LESAO, AXILAR_NORMAL_CORPO, RODAPE, cistoSubs, ecoTxt, margemTxt, noduloSubs } from './mamaria'
import { formatarEixos, lerEixos, lerMedida, ptBr1, textoLivre } from './medidasLocais'

const CATEGORIA = 'MAMA_MASCULINA'

type Prefixo = 'md' | 'me'
const LADOS: ReadonlyArray<readonly [Prefixo, 'direita' | 'esquerda']> = [['md', 'direita'], ['me', 'esquerda']]

/** Localização fechada: evita concordância errada ("no região") e texto inventado. */
const LOCAIS: Record<string, string> = {
  retroareolar: 'na região retroareolar',
  qsl: 'no quadrante superolateral',
  qsm: 'no quadrante superomedial',
  qil: 'no quadrante inferolateral',
  qim: 'no quadrante inferomedial',
}
const localField: Field = {
  key: 'local', label: 'Localização', kind: 'mini-segmented', options: [
    { value: 'retroareolar', label: 'Retroareolar' }, { value: 'qsl', label: 'QSL' }, { value: 'qsm', label: 'QSM' },
    { value: 'qil', label: 'QIL' }, { value: 'qim', label: 'QIM' },
  ],
}

// Do contrato mamário: medidas + descritores do nódulo; localização e BI-RADS
// saem daqui (localização fechada acima; BI-RADS é controle do exame).
const NODULO_SUBS: Field[] = [...noduloSubs.filter((f) => f.key !== 'local' && f.key !== 'birads'), localField]
const CISTO_SUBS: Field[] = [...cistoSubs.filter((f) => f.key !== 'local'), localField]

const BIRADS = ['0', '1', '2', '3', '4', '4A', '4B', '4C', '5', '6'] as const

function ladoFields(p: Prefixo, lado: string): Field[] {
  const nome = `Mama ${lado}`
  return [
    {
      key: `${p}_retroareolar`, label: `${nome} — região retroareolar`, kind: 'segmented', hint: 'default: sem tecido fibroglandular aumentado',
      options: [
        { value: 'normal', label: 'Sem aumento', isDefault: true },
        { value: 'ginecomastia', label: 'Ginecomastia', subFields: [
          { key: 'espessura', label: 'Espessura do tecido retroareolar (cm, opcional)', kind: 'text', placeholder: '1,8' },
        ] },
      ],
    },
    {
      key: `${p}_achado`, label: `${nome} — nódulo / cisto`, kind: 'segmented', hint: 'default: sem achados',
      options: [
        { value: 'nenhum', label: 'Sem achados', isDefault: true },
        { value: 'cisto', label: 'Cisto simples', subFields: CISTO_SUBS },
        { value: 'nodulo', label: 'Nódulo sólido', subFields: NODULO_SUBS },
      ],
    },
    {
      key: `${p}_pele`, label: `${nome} — pele e subcutâneo`, kind: 'segmented', hint: 'default: preservados',
      options: [
        { value: 'normal', label: 'Preservados', isDefault: true },
        { value: 'espessamento', label: 'Espessamento cutâneo', subFields: [
          { key: 'espessura', label: 'Espessura da pele (cm)', kind: 'text', placeholder: '0,4' },
        ] },
        { value: 'alteracao', label: 'Outra alteração', subFields: [
          { key: 'desc', label: 'Descrição', kind: 'text', placeholder: 'ex.: edema do tecido subcutâneo' },
        ] },
      ],
    },
  ]
}

/** Valor do subcampo; sem toque na UI vale o default declarado no campo. */
function sub(st: OrganState, base: string, field: Field): string | string[] {
  const v = st[`${base}.${field.key}`]
  if (v !== undefined && v !== '') return v
  if (field.kind === 'checklist') return []
  return field.options?.find((o) => o.isDefault)?.value ?? ''
}
const subTexto = (st: OrganState, base: string, fields: Field[], key: string) => {
  const field = fields.find((f) => f.key === key)!
  const v = sub(st, base, field)
  return typeof v === 'string' ? v : ''
}

type Lesao = { tipo: 'cisto' | 'nodulo'; lado: string; corpo: string; conclusao: string }

function lesaoDe(st: OrganState, p: Prefixo, lado: string, falta: (onde: string, motivo: string) => void): Lesao | null {
  const tipo = String(st[`${p}_achado`] ?? 'nenhum')
  if (tipo !== 'cisto' && tipo !== 'nodulo') return null
  const fields = tipo === 'cisto' ? CISTO_SUBS : NODULO_SUBS
  const base = `${p}_achado.${tipo}`
  const onde = `${tipo === 'cisto' ? 'Cisto' : 'Nódulo'} na mama ${lado}`
  const eixos = lerEixos(st[`${base}.medidas`], 3, 'cm')
  if (eixos === null) falta(onde, 'informe as medidas nos três eixos')
  if (eixos === 'invalida') falta(onde, 'medidas inválidas — use três eixos em cm (ex.: 1,2 x 0,8 x 0,6)')
  const local = LOCAIS[subTexto(st, base, fields, 'local')]
  if (!local) falta(onde, 'informe a localização')
  const medidas = Array.isArray(eixos) ? formatarEixos(eixos, 'cm') : ''

  if (tipo === 'cisto') {
    return {
      tipo, lado,
      corpo: `Imagem anecoica na mama ${lado}, com margem circunscrita, medindo ${medidas}, situada ${local}.`,
      conclusao: `Cisto simples na mama ${lado}, situado ${local}.`,
    }
  }
  const margem = subTexto(st, base, fields, 'margem')
  if (!margemTxt[margem]) falta(onde, 'informe a margem')
  const eco = ecoTxt[subTexto(st, base, fields, 'eco')] ?? 'hipoecoica'
  const forma = subTexto(st, base, fields, 'forma')
  const partes = [`Imagem ${eco} na mama ${lado}`]
  if (forma) partes.push(`de forma ${forma}`)
  partes.push(`com margem ${margemTxt[margem]}`)
  if (subTexto(st, base, fields, 'orientacao') === 'paralela') partes.push('maior eixo paralelo à pele')
  partes.push(`medindo ${medidas}`)
  const calc = sub(st, base, fields.find((f) => f.key === 'calc')!)
  if (Array.isArray(calc) && calc.includes('microcalc')) partes.push('com calcificações de permeio')
  const posterior = subTexto(st, base, fields, 'posterior')
  if (posterior === 'sombra') partes.push('com sombra acústica posterior')
  else if (posterior === 'reforco') partes.push('com reforço acústico posterior')
  else if (posterior === 'combinado') partes.push('com padrão acústico posterior combinado')
  return { tipo, lado, corpo: `${partes.join(', ')}, situada ${local}.`, conclusao: `Imagem sólida na mama ${lado}, situada ${local}.` }
}

function composeMamas(st: OrganState, opts: OrganState = {}): OrganComposition {
  const pendencias: PendenciaLocal[] = []
  const falta = (onde: string, motivo: string) => pendencias.push({ onde, motivo })
  const corpo: string[] = []
  const conclusao: string[] = []
  const lesoes: Lesao[] = []
  const ginecomastia: string[] = []
  const pele: string[] = []

  for (const [p, lado] of LADOS) {
    const peleTipo = String(st[`${p}_pele`] ?? 'normal')
    if (peleTipo === 'espessamento') {
      const e = lerMedida(st[`${p}_pele.espessamento.espessura`], 'cm')
      if (e === null) falta(`Pele da mama ${lado}`, 'informe a espessura')
      if (e === 'invalida') falta(`Pele da mama ${lado}`, 'espessura inválida — informe em cm')
      corpo.push(`Espessamento da pele da mama ${lado}${typeof e === 'number' ? `, medindo ${ptBr1(e)} cm` : ''}.`)
      pele.push(`Espessamento cutâneo na mama ${lado}.`)
    } else if (peleTipo === 'alteracao') {
      const desc = textoLivre(st[`${p}_pele.alteracao.desc`])
      if (!desc) falta(`Pele/subcutâneo da mama ${lado}`, 'descreva a alteração')
      corpo.push(`Pele e tecido celular subcutâneo da mama ${lado}: ${desc}.`)
      pele.push(`Alteração da pele/tecido subcutâneo na mama ${lado} (${desc}).`)
    } else {
      corpo.push(`Pele e tecido celular subcutâneo da mama ${lado} com espessura e ecogenicidade preservadas.`)
    }

    if (String(st[`${p}_retroareolar`] ?? 'normal') === 'ginecomastia') {
      const e = lerMedida(st[`${p}_retroareolar.ginecomastia.espessura`], 'cm')
      if (e === 'invalida') falta(`Região retroareolar ${lado}`, 'espessura inválida — informe em cm')
      corpo.push(`Mama ${lado} com aumento do tecido fibroglandular retroareolar${typeof e === 'number' ? `, com espessura de ${ptBr1(e)} cm` : ''}.`)
      ginecomastia.push(lado)
    } else {
      corpo.push(`Região retroareolar ${lado} sem aumento do tecido fibroglandular.`)
    }

    const lesao = lesaoDe(st, p, lado, falta)
    if (lesao) lesoes.push(lesao)
  }

  if (!lesoes.length) corpo.push(AUSENCIA_LESAO)
  for (const l of lesoes) corpo.push(l.corpo)

  if (ginecomastia.length === 2) conclusao.push('Ginecomastia bilateral.')
  else if (ginecomastia.length === 1) conclusao.push(`Ginecomastia à ${ginecomastia[0]}.`)
  for (const l of lesoes) conclusao.push(l.conclusao)
  conclusao.push(...pele)

  const temAchado = conclusao.length > 0
  if (!temAchado) conclusao.push('Mamas ecograficamente normais.')

  // BI-RADS: só o que o médico escolheu; coerência com os achados é bloqueante.
  const birads = String(opts.birads ?? 'nao_informado')
  if (birads === 'nao_informado') {
    if (lesoes.some((l) => l.tipo === 'nodulo')) falta('BI-RADS', 'nódulo sólido exige a categoria BI-RADS definida pelo médico')
  } else if (!(BIRADS as readonly string[]).includes(birads)) {
    falta('BI-RADS', 'categoria inválida')
  } else {
    if (birads === '1' && temAchado) falta('BI-RADS', 'categoria 1 é incompatível com achado descrito')
    if (birads !== '0' && birads !== '1' && !temAchado) falta('BI-RADS', `categoria ${birads} exige achado descrito`)
    conclusao.push(`Categoria BI-RADS® ${birads}.`)
  }

  return { body: corpo.join('\n'), conclusion: conclusao, pendencias, isNormal: !temAchado }
}

function initialMamas(): OrganState {
  const st: OrganState = {}
  for (const [p, lado] of LADOS) {
    for (const field of ladoFields(p, lado)) st[field.key] = field.options?.find((o) => o.isDefault)?.value ?? ''
  }
  return st
}

const mamasModule: OrganModule = {
  schema: { id: 'mamas', name: 'Mamas', category: CATEGORIA, fields: LADOS.flatMap(([p, lado]) => ladoFields(p, lado)) },
  initialState: initialMamas,
  compose: composeMamas,
}

const LADO_AXILA: Record<string, string> = { direita: 'à direita', esquerda: 'à esquerda', bilateral: 'bilateralmente' }
const HILO: Record<string, string> = {
  preservado: 'com hilo gorduroso preservado',
  reduzido: 'com hilo gorduroso reduzido',
  ausente: 'sem hilo gorduroso identificável',
}

const axilasModule: OrganModule = {
  schema: {
    id: 'axilas', name: 'Axilas', category: CATEGORIA,
    fields: [{
      key: 'axilas', label: 'Axilas', kind: 'segmented', hint: 'default: normais',
      options: [
        { value: 'normais', label: 'Normais', isDefault: true },
        { value: 'alteradas', label: 'Linfonodo alterado', subFields: [
          { key: 'lado', label: 'Lado', kind: 'mini-segmented', options: [
            { value: 'direita', label: 'Direita' }, { value: 'esquerda', label: 'Esquerda' }, { value: 'bilateral', label: 'Bilateral' },
          ] },
          { key: 'medidas', label: 'Medidas do maior (cm)', kind: 'text', placeholder: '1,8 x 0,8' },
          { key: 'hilo', label: 'Hilo gorduroso', kind: 'mini-segmented', options: [
            { value: 'preservado', label: 'Preservado' }, { value: 'reduzido', label: 'Reduzido' }, { value: 'ausente', label: 'Ausente' },
          ] },
          { key: 'cortical_cm', label: 'Espessura cortical (cm, opcional)', kind: 'text', placeholder: '0,4' },
        ] },
      ],
    }],
  },
  initialState: (): OrganState => ({ axilas: 'normais' }),
  compose: (st): OrganComposition => {
    if (String(st.axilas ?? 'normais') !== 'alteradas') {
      return { body: AXILAR_NORMAL_CORPO, conclusion: ['Linfonodos axilares normais.'], isNormal: true }
    }
    const pendencias: PendenciaLocal[] = []
    const falta = (motivo: string) => pendencias.push({ onde: 'Axilas', motivo })
    const lado = LADO_AXILA[String(st['axilas.alteradas.lado'] ?? '')]
    if (!lado) falta('informe o lado do linfonodo alterado')
    const eixos = lerEixos(st['axilas.alteradas.medidas'], 2, 'cm')
    if (eixos === null) falta('informe as medidas do maior linfonodo (dois eixos)')
    if (eixos === 'invalida') falta('medidas inválidas — use dois eixos em cm (ex.: 1,8 x 0,8)')
    const hilo = HILO[String(st['axilas.alteradas.hilo'] ?? '')]
    if (!hilo) falta('informe o aspecto do hilo gorduroso')
    const cortical = lerMedida(st['axilas.alteradas.cortical_cm'], 'cm')
    if (cortical === 'invalida') falta('espessura cortical inválida — informe em cm')
    const plural = String(st['axilas.alteradas.lado']) === 'bilateral'
    const medidas = Array.isArray(eixos) ? formatarEixos(eixos, 'cm') : ''
    const cort = typeof cortical === 'number' ? `, com espessura cortical de ${ptBr1(cortical)} cm` : ''
    return {
      body: `${plural ? 'Linfonodos axilares de aspecto alterado' : 'Linfonodo axilar de aspecto alterado'} ${lado}, o maior medindo ${medidas}, ${hilo}${cort}.`,
      conclusion: [`${plural ? 'Linfonodos axilares de aspecto alterado' : 'Linfonodo axilar de aspecto alterado'} ${lado}.`],
      pendencias,
      isNormal: false,
    }
  },
}

const TECNICA_COM_AXILAS =
  'Exame realizado com transdutor de 12 MHz, abrangendo a região retroareolar e todos os quadrantes de ambas as mamas, bem como as regiões axilares.\nA documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possui várias metodologias.'

const SECOES: ExamSection[] = [
  { id: 'mamas', label: 'Mamas', group: 'orgaos', module: mamasModule },
  { id: 'axilas', label: 'Axilas', group: 'orgaos', module: axilasModule },
]
const comAxilas = (opts: OrganState) => String(opts.escopo_exame ?? 'mamas_axilas') !== 'mamas'

export const mamaMasculina: ExamCategory = {
  id: CATEGORIA,
  name: 'Mama masculina',
  title: 'ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES',
  resolveTitle: (opts) => (comAxilas(opts) ? 'ULTRASSONOGRAFIA DAS MAMAS E REGIÕES AXILARES' : 'ULTRASSONOGRAFIA DAS MAMAS'),
  tecnica: TECNICA_COM_AXILAS,
  resolveTecnica: (opts) => (comAxilas(opts) ? TECNICA_COM_AXILAS : TECNICA_COM_AXILAS.replace(', bem como as regiões axilares', '')),
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    { key: 'escopo_exame', label: 'O que será avaliado?', kind: 'segmented', options: [
      { value: 'mamas_axilas', label: 'Mamas e axilas', isDefault: true },
      { value: 'mamas', label: 'Somente mamas' },
    ] },
    { key: 'birads', label: 'Categoria BI-RADS® (definida pelo médico)', kind: 'segmented', options: [
      { value: 'nao_informado', label: 'Não informar', isDefault: true },
      ...BIRADS.map((b) => ({ value: b, label: b })),
    ] },
  ],
  sections: SECOES,
  resolveSections: (opts) => (comAxilas(opts) ? SECOES : SECOES.filter((s) => s.id === 'mamas')),
  conclusionNormal: 'Mamas ecograficamente normais.',
  resolveFooter: (opts) => (String(opts.birads ?? 'nao_informado') === 'nao_informado' ? undefined : RODAPE),
}
