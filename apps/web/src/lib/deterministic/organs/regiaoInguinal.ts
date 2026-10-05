/**
 * Categoria REGIAO_INGUINAL — formulário estruturado Web (composição local).
 * Fonte: laudos-base em tmp-review/golden-bootstrap-2026-07-23/REGIAO_INGUINAL.md.
 *
 * Um módulo por lado: a lateralidade vem da seção, nunca de texto livre. O
 * controle "Lados avaliados" filtra as seções e ajusta técnica e conclusão.
 * A classificação direta/indireta sempre cita a relação com a artéria
 * epigástrica inferior; sem classificação, conclui só "hérnia inguinal".
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { OrganComposition, OrganModule, OrganState } from '../types'
import {
  CONDUTA_NAO_REDUTIVEL, CONTEUDO_HERNIA_OPTIONS, FALTANDO, REDUTIBILIDADE_OPTIONS,
  complementoHernia, conclusaoPendente, corpoHernia, faltandoHernia, medida, medidas, texto,
  type HerniaDados,
} from './superficialShared'

type LadoInguinal = 'direita' | 'esquerda'
const MASC: Record<LadoInguinal, string> = { direita: 'direito', esquerda: 'esquerdo' }

type Tipo = 'nao_classificada' | 'indireta' | 'direta' | 'femoral'
function ondeHernia(tipo: Tipo, lado: LadoInguinal): string {
  if (tipo === 'indireta') return `da parede do canal inguinal ${MASC[lado]}, lateral à artéria epigástrica inferior, através do anel inguinal profundo`
  if (tipo === 'direta') return `da parede posterior do canal inguinal ${MASC[lado]}, medial à artéria epigástrica inferior`
  if (tipo === 'femoral') return `na região femoral ${lado}, abaixo do ligamento inguinal e medial à veia femoral`
  return `da parede da região inguinal ${lado}`
}
const NOME_HERNIA: Record<Tipo, string> = {
  nao_classificada: 'Hérnia inguinal',
  indireta: 'Hérnia inguinal indireta',
  direta: 'Hérnia inguinal direta',
  femoral: 'Hérnia femoral',
}

function sideModule(lado: LadoInguinal): OrganModule {
  const h = 'hernia.presente.'
  const l = 'linfonodos.proeminente.'
  return {
    schema: {
      id: `inguinal_${lado}`,
      name: `Região inguinal ${lado}`,
      category: 'REGIAO_INGUINAL',
      fields: [
        {
          key: 'hernia',
          label: 'Defeito herniário',
          kind: 'segmented',
          hint: 'default: ausente',
          options: [
            { value: 'ausente', label: 'Ausente', isDefault: true },
            {
              value: 'presente',
              label: 'Presente',
              subFields: [
                { key: 'tipo', label: 'Tipo (relação com a epigástrica inferior)', kind: 'mini-segmented', options: [
                  { value: 'nao_classificada', label: 'Não classificada', isDefault: true },
                  { value: 'indireta', label: 'Indireta (lateral)' },
                  { value: 'direta', label: 'Direta (medial)' },
                  { value: 'femoral', label: 'Femoral' },
                ] },
                { key: 'colo', label: 'Colo (cm)', kind: 'text', placeholder: '1,2', halfWidth: true },
                { key: 'saco', label: 'Saco herniário (cm)', kind: 'text', placeholder: '3,0 x 1,5', halfWidth: true },
                { key: 'conteudo', label: 'Conteúdo', kind: 'mini-segmented', options: CONTEUDO_HERNIA_OPTIONS },
                { key: 'redutibilidade', label: 'Redutibilidade', kind: 'mini-segmented', options: REDUTIBILIDADE_OPTIONS },
              ],
            },
          ],
        },
        {
          key: 'linfonodos',
          label: 'Linfonodos inguinais',
          kind: 'segmented',
          hint: 'default: preservados',
          options: [
            { value: 'preservados', label: 'Preservados', isDefault: true },
            {
              value: 'proeminente',
              label: 'Proeminente',
              subFields: [
                { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '2,0 x 1,0' },
                { key: 'hilo', label: 'Hilo hiperecoico', kind: 'mini-segmented', options: [
                  { value: 'mantido', label: 'Mantido', isDefault: true },
                  { value: 'ausente', label: 'Não identificado' },
                ] },
              ],
            },
          ],
        },
      ],
    },
    initialState: (): OrganState => ({
      hernia: 'ausente',
      [`${h}tipo`]: 'nao_classificada',
      [`${h}colo`]: '',
      [`${h}saco`]: '',
      [`${h}conteudo`]: 'nao_informado',
      [`${h}redutibilidade`]: 'nao_informada',
      linfonodos: 'preservados',
      [`${l}medidas`]: '',
      [`${l}hilo`]: 'mantido',
    }),
    compose: (st): OrganComposition => {
      const linhas: string[] = []
      const conclusion: string[] = []

      if (texto(st, 'hernia') === 'presente') {
        const tipo = (texto(st, `${h}tipo`) || 'nao_classificada') as Tipo
        const dados: HerniaDados = {
          ondeCorpo: ondeHernia(tipo, lado),
          conteudo: texto(st, `${h}conteudo`),
          redutibilidade: texto(st, `${h}redutibilidade`),
          colo: medida(st[`${h}colo`]),
          saco: medidas(st[`${h}saco`]),
        }
        linhas.push(...corpoHernia(dados))
        const faltando = faltandoHernia(dados)
        if (faltando.length) {
          conclusion.push(conclusaoPendente(`defeito inguinal à ${lado}`, faltando))
        } else {
          let item = `${NOME_HERNIA[tipo] ?? NOME_HERNIA.nao_classificada} à ${lado}, ${complementoHernia(dados)}.`
          if (dados.redutibilidade === 'nao_redutivel') item += ` ${CONDUTA_NAO_REDUTIVEL}`
          conclusion.push(item)
        }
      } else {
        linhas.push(`Região inguinal ${lado} com planos musculoaponeuróticos preservados, sem solução de continuidade da parede ou conteúdo herniário à manobra de Valsalva.`)
      }

      if (texto(st, 'linfonodos') === 'proeminente') {
        const dims = medidas(st[`${l}medidas`])
        const hiloAusente = texto(st, `${l}hilo`) === 'ausente'
        const hilo = hiloAusente ? 'sem hilo hiperecoico identificável' : 'com hilo hiperecoico mantido'
        linhas.push(`Linfonodo inguinal à ${lado} de dimensões aumentadas, medindo ${dims ?? FALTANDO}, ${hilo}.`)
        if (!dims) conclusion.push(conclusaoPendente(`linfonodo inguinal à ${lado}`, ['medidas']))
        else conclusion.push(hiloAusente
          ? `Linfonodo inguinal à ${lado} medindo ${dims}, sem hilo hiperecoico identificável. Correlacionar com dados clínicos.`
          : `Linfonodo inguinal proeminente à ${lado}, medindo ${dims}, com hilo hiperecoico mantido.`)
      } else {
        linhas.push(`Linfonodos inguinais à ${lado} de morfologia preservada, com hilo hiperecoico mantido.`)
      }

      return { body: linhas.join('\n'), conclusion, isNormal: conclusion.length === 0 }
    },
  }
}

const SECOES: ExamSection[] = [
  { id: 'inguinal_direita', label: 'Região inguinal direita', group: 'orgaos', module: sideModule('direita') },
  { id: 'inguinal_esquerda', label: 'Região inguinal esquerda', group: 'orgaos', module: sideModule('esquerda') },
]

const ladosDe = (opts: OrganState) => (typeof opts.lados === 'string' ? opts.lados : 'bilateral')

export const regiaoInguinal: ExamCategory = {
  id: 'REGIAO_INGUINAL',
  name: 'Região inguinal',
  title: 'ULTRASSONOGRAFIA DA REGIÃO INGUINAL',
  tecnica:
    'Exame realizado com transdutor linear de alta frequência, abrangendo a avaliação das regiões inguinais bilateralmente, com avaliação dinâmica dos canais inguinais à manobra de Valsalva e em ortostase.',
  resolveTecnica: (opts) => {
    const lados = ladosDe(opts)
    if (lados === 'bilateral') return regiaoInguinal.tecnica
    return `Exame realizado com transdutor linear de alta frequência, abrangendo a avaliação da região inguinal ${lados}, com avaliação dinâmica do canal inguinal à manobra de Valsalva e em ortostase.`
  },
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    { key: 'lados', label: 'Lados avaliados', kind: 'segmented', options: [
      { value: 'bilateral', label: 'Bilateral', isDefault: true },
      { value: 'direita', label: 'Só direita' },
      { value: 'esquerda', label: 'Só esquerda' },
    ] },
  ],
  sections: SECOES,
  resolveSections: (opts) => {
    const lados = ladosDe(opts)
    return lados === 'bilateral' ? SECOES : SECOES.filter((s) => s.id === `inguinal_${lados}`)
  },
  conclusionNormal: 'Regiões inguinais sem evidência de defeitos herniários à manobra de Valsalva.',
  resolveConclusionNormal: (opts) => {
    const lados = ladosDe(opts)
    return lados === 'bilateral'
      ? 'Regiões inguinais sem evidência de defeitos herniários à manobra de Valsalva.'
      : `Região inguinal ${lados} sem evidência de defeitos herniários à manobra de Valsalva.`
  },
  /** Só fecha com o lado contralateral quando ele foi avaliado e está normal. */
  resolveConclusionClosing: (opts, alteredCount, sectionCount) => {
    if (ladosDe(opts) !== 'bilateral' || alteredCount >= sectionCount) return undefined
    return 'Região inguinal contralateral sem evidência de defeitos herniários à manobra de Valsalva.'
  },
}
