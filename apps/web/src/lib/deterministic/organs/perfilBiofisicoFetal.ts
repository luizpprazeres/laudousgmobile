/**
 * Categoria PERFIL_BIOFISICO_FETAL — MVP Web estruturado (composição local).
 *
 * Base: docs/competitor-research/laudario/crosswalk-perfil-biofisico-fetal-2026-10-03.md
 * e cases/perfil-biofisico-fetal-2026-10-03.md (regras, não redação). Redação
 * original; frases de movimentos fetais e a classificação MBV/ILA vêm de
 * `obstetrica.ts` (mesmos limiares do boletim: MBV 2–8 cm, ILA 5–25 cm).
 *
 * Regras:
 *  - cada componente tem estado explícito: não avaliado | normal | alterado.
 *    Nada é normal por omissão: o modelo de partida é "em branco";
 *  - pontuação 2 (normal) ou 0 (alterado); não avaliado NÃO vale zero — sai
 *    do denominador e aparece escrito como não avaliado;
 *  - a cardiotocografia (teste sem estresse) é opcional;
 *  - o total não substitui os componentes: todo componente alterado entra na
 *    conclusão, e o oligoâmnio aparece qualquer que seja o total;
 *  - a interpretação é escolha médica, separada do escore, com travas de
 *    coerência (nunca "normal" com escore parcial ou líquido reduzido).
 */

import type { ExamCategory } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { classeILA, classeMBV, ptBr } from './obstetrica'
import { lerMedida } from './medidasLocais'

const CATEGORIA = 'PERFIL_BIOFISICO_FETAL'

type Estado = 'nao_avaliado' | 'normal' | 'alterado'
type ComponenteId = 'ctg' | 'respiratorios' | 'corporais' | 'tonus' | 'liquido'

interface Componente {
  id: ComponenteId
  /** Nome curto para listas ("movimentos respiratórios"). */
  nome: string
  label: string
  opcoes: { normal: string; alterado: string; naoAvaliado: string }
  corpo: { normal: string; alterado: string; naoAvaliado: string }
  /** Item de conclusão quando alterado (o líquido monta o seu com a medida). */
  conclusaoAlterado: string
  /** Estado no modelo normal: os quatro ultrassonográficos normais; CTG não realizada. */
  noModeloNormal: Estado
}

const COMPONENTES: Componente[] = [
  {
    id: 'ctg', nome: 'cardiotocografia', label: 'Cardiotocografia (teste sem estresse)',
    opcoes: { normal: 'Reativa', alterado: 'Não reativa', naoAvaliado: 'Não realizada' },
    corpo: {
      normal: 'Cardiotocografia (teste sem estresse) reativa',
      alterado: 'Cardiotocografia (teste sem estresse) não reativa',
      naoAvaliado: 'Cardiotocografia (teste sem estresse) não realizada.',
    },
    conclusaoAlterado: 'Cardiotocografia não reativa.',
    noModeloNormal: 'nao_avaliado',
  },
  {
    id: 'respiratorios', nome: 'movimentos respiratórios', label: 'Movimentos respiratórios',
    opcoes: { normal: 'Presentes', alterado: 'Ausentes', naoAvaliado: 'Não avaliados' },
    corpo: {
      normal: 'Movimentos respiratórios fetais presentes durante o período de observação',
      alterado: 'Movimentos respiratórios fetais não observados durante o período de observação',
      naoAvaliado: 'Movimentos respiratórios fetais não avaliados.',
    },
    conclusaoAlterado: 'Ausência de movimentos respiratórios fetais durante o período de observação.',
    noModeloNormal: 'normal',
  },
  {
    id: 'corporais', nome: 'movimentos corporais', label: 'Movimentos corporais',
    opcoes: { normal: 'Presentes', alterado: 'Ausentes', naoAvaliado: 'Não avaliados' },
    corpo: {
      normal: 'Os movimentos fetais são ativos',
      alterado: 'Não foram observados movimentos fetais durante o período de observação',
      naoAvaliado: 'Movimentos corporais fetais não avaliados.',
    },
    conclusaoAlterado: 'Ausência de movimentos fetais durante o período de observação.',
    noModeloNormal: 'normal',
  },
  {
    id: 'tonus', nome: 'tônus', label: 'Tônus fetal',
    opcoes: { normal: 'Preservado', alterado: 'Ausente', naoAvaliado: 'Não avaliado' },
    corpo: {
      normal: 'Tônus fetal preservado',
      alterado: 'Tônus fetal ausente durante o período de observação',
      naoAvaliado: 'Tônus fetal não avaliado.',
    },
    conclusaoAlterado: 'Tônus fetal ausente durante o período de observação.',
    noModeloNormal: 'normal',
  },
  {
    id: 'liquido', nome: 'líquido amniótico', label: 'Líquido amniótico',
    opcoes: { normal: 'Adequado', alterado: 'Reduzido', naoAvaliado: 'Não avaliado' },
    corpo: {
      normal: 'Líquido amniótico em quantidade adequada',
      alterado: 'Líquido amniótico reduzido',
      naoAvaliado: 'Líquido amniótico não avaliado.',
    },
    conclusaoAlterado: 'Oligoâmnio.',
    noModeloNormal: 'normal',
  },
]
const ULTRASSONOGRAFICOS = COMPONENTES.filter((c) => c.id !== 'ctg')

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})

const INTERPRETACAO: Record<string, string> = {
  normal: 'Perfil biofísico fetal dentro da normalidade, conforme interpretação médica.',
  limitrofe: 'Perfil biofísico fetal com resultado limítrofe, conforme interpretação médica.',
  alterado: 'Perfil biofísico fetal alterado, conforme interpretação médica.',
}

const FIELDS: Field[] = [
  ...COMPONENTES.map((c) => select(c.id, c.label, [
    ['model', 'Conforme modelo'], ['normal', c.opcoes.normal], ['alterado', c.opcoes.alterado], ['nao_avaliado', c.opcoes.naoAvaliado],
  ])),
  select('liquido_medida', 'Medida do líquido', [['nao_medido', 'Não medido (análise subjetiva)'], ['mbv', 'Maior bolsão vertical'], ['ila', 'ILA']]),
  { key: 'liquido_cm', label: 'Valor da medida (cm)', kind: 'text', placeholder: '4,2', halfWidth: true },
  select('interpretacao', 'Interpretação médica', [
    ['nao_informada', 'Não informar'], ['normal', 'Dentro da normalidade'], ['limitrofe', 'Limítrofe'], ['alterado', 'Alterado'],
  ]),
]

export function estadoDe(c: Componente | ComponenteId, st: OrganState, opts: OrganState = {}): Estado {
  const comp = typeof c === 'string' ? COMPONENTES.find((x) => x.id === c)! : c
  const raw = String(st[comp.id] ?? 'model')
  if (raw === 'normal' || raw === 'alterado' || raw === 'nao_avaliado') return raw
  return opts.model === 'normal' ? comp.noModeloNormal : 'nao_avaliado'
}

export interface Escore { pontos: number; maximo: number; naoAvaliados: string[]; alterados: ComponenteId[] }

/** Escore derivado: só componentes avaliados entram, 2 pontos se normal, 0 se alterado. */
export function escorePerfilBiofisico(st: OrganState, opts: OrganState = {}): Escore {
  const e: Escore = { pontos: 0, maximo: 0, naoAvaliados: [], alterados: [] }
  for (const c of COMPONENTES) {
    const estado = estadoDe(c, st, opts)
    if (estado === 'nao_avaliado') { e.naoAvaliados.push(c.nome); continue }
    e.maximo += 2
    if (estado === 'normal') e.pontos += 2
    else e.alterados.push(c.id)
  }
  return e
}

function lista(itens: string[]): string {
  return itens.length <= 1 ? (itens[0] ?? '') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

function compose(st: OrganState, opts: OrganState = {}): OrganComposition {
  const pendencias: PendenciaLocal[] = []
  const falta = (onde: string, motivo: string) => pendencias.push({ onde, motivo })
  const corpo: string[] = []
  const alteracoes: string[] = []
  const escore = escorePerfilBiofisico(st, opts)

  // Líquido: medida, unidade e coerência com o estado escolhido.
  const liquido = estadoDe('liquido', st, opts)
  const tipoMedida = String(st.liquido_medida ?? 'nao_medido')
  const valor = lerMedida(st.liquido_cm, 'cm')
  let medidaTexto = ''
  let medidaConclusao = ''
  let classeMedida: { classe: string; conclusao: string } | null = null
  if (tipoMedida === 'nao_medido') {
    if (valor !== null) falta('Líquido amniótico', 'há valor preenchido sem o tipo de medida (MBV ou ILA)')
  } else {
    if (liquido === 'nao_avaliado') falta('Líquido amniótico', 'há medida preenchida em componente não avaliado')
    if (valor === null) falta('Líquido amniótico', `informe o valor do ${tipoMedida === 'mbv' ? 'maior bolsão vertical' : 'ILA'} em cm`)
    if (valor === 'invalida') falta('Líquido amniótico', 'medida inválida — informe um número em cm')
    if (typeof valor === 'number') {
      classeMedida = tipoMedida === 'mbv' ? classeMBV(valor) : classeILA(valor)
      medidaTexto = tipoMedida === 'mbv' ? `maior bolsão vertical de ${ptBr(valor)} cm` : `índice de líquido amniótico (ILA) de ${ptBr(valor)} cm`
      medidaConclusao = tipoMedida === 'mbv' ? `maior bolsão vertical de ${ptBr(valor)} cm` : `ILA de ${ptBr(valor)} cm`
    }
  }
  if (liquido === 'alterado' && tipoMedida === 'nao_medido') falta('Líquido amniótico', 'líquido reduzido exige a medida (MBV ou ILA)')
  if (classeMedida && liquido === 'alterado' && classeMedida.classe !== 'reduzida') falta('Líquido amniótico', 'a medida informada não caracteriza líquido reduzido')
  if (classeMedida && liquido === 'normal' && classeMedida.classe === 'reduzida') falta('Líquido amniótico', 'a medida informada caracteriza líquido reduzido — revise o componente')

  for (const c of COMPONENTES) {
    const estado = estadoDe(c, st, opts)
    if (estado === 'nao_avaliado') { corpo.push(c.corpo.naoAvaliado); continue }
    const pontos = estado === 'normal' ? 2 : 0
    const medida = c.id === 'liquido' && medidaTexto ? `, com ${medidaTexto}` : ''
    corpo.push(`${estado === 'normal' ? c.corpo.normal : c.corpo.alterado}${medida} (${pontos} pontos).`)
    if (estado === 'alterado') {
      alteracoes.push(c.id === 'liquido' && medidaConclusao ? `Oligoâmnio (${medidaConclusao}).` : c.conclusaoAlterado)
    }
  }
  // Polidrâmnio pela medida não muda a pontuação (líquido adequado ao perfil), mas não some do laudo.
  if (classeMedida?.classe === 'aumentada' && liquido === 'normal') alteracoes.push(`${classeMedida.conclusao} (${medidaConclusao}).`)

  if (!ULTRASSONOGRAFICOS.some((c) => estadoDe(c, st, opts) !== 'nao_avaliado')) {
    falta('Perfil biofísico', 'registre ao menos um componente ultrassonográfico avaliado')
  }

  const naoAval = escore.naoAvaliados.length ? `; não avaliados: ${lista(escore.naoAvaliados)}` : ''
  const conclusao = [`Perfil biofísico fetal com ${escore.pontos}/${escore.maximo} pontos nos componentes avaliados${naoAval}.`, ...alteracoes]

  const interpretacao = String(st.interpretacao ?? 'nao_informada')
  if (interpretacao !== 'nao_informada') {
    if (!INTERPRETACAO[interpretacao]) falta('Interpretação', 'opção inválida')
    const parcial = ULTRASSONOGRAFICOS.some((c) => estadoDe(c, st, opts) === 'nao_avaliado')
    if (interpretacao === 'normal' && parcial) falta('Interpretação', 'normalidade exige os quatro componentes ultrassonográficos avaliados')
    if (interpretacao === 'normal' && liquido === 'alterado') falta('Interpretação', 'normalidade é incompatível com líquido amniótico reduzido')
    if (interpretacao !== 'normal' && escore.alterados.length === 0) falta('Interpretação', 'resultado limítrofe ou alterado exige ao menos um componente alterado')
    if (INTERPRETACAO[interpretacao]) conclusao.push(INTERPRETACAO[interpretacao]!)
  }

  return { body: corpo.join('\n'), conclusion: conclusao, pendencias, isNormal: escore.alterados.length === 0 && alteracoes.length === 0 }
}

const perfilModule: OrganModule = {
  schema: { id: 'perfil', name: 'Perfil biofísico fetal', category: CATEGORIA, fields: FIELDS },
  initialState: (): OrganState => Object.fromEntries(FIELDS.map((f) => [f.key, f.options?.find((o) => o.isDefault)?.value ?? ''])),
  compose,
}

const TECNICA = 'Exame realizado por via abdominal, com observação fetal dinâmica em tempo real para avaliação dos componentes do perfil biofísico fetal.'

export const perfilBiofisicoFetal: ExamCategory = {
  id: CATEGORIA,
  name: 'Perfil biofísico fetal',
  title: 'ULTRASSONOGRAFIA OBSTÉTRICA — PERFIL BIOFÍSICO FETAL',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    { key: 'model', label: 'Modelo de partida', kind: 'segmented', options: [
      { value: 'blank', label: 'Em branco', isDefault: true },
      { value: 'normal', label: 'Normal — quatro componentes ultrassonográficos presentes, sem cardiotocografia' },
    ] },
  ],
  sections: [{ id: 'perfil', label: 'Perfil biofísico fetal', group: 'orgaos', module: perfilModule }],
  // A conclusão sempre traz o escore; esta frase só existiria sem nenhum componente (bloqueado).
  conclusionNormal: '',
}
