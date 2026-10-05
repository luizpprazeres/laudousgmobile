/**
 * Categoria PAREDE_ABDOMINAL — formulário estruturado Web (composição local).
 * Fonte: laudos-base em tmp-review/golden-bootstrap-2026-07-23/PAREDE_ABDOMINAL.md
 * (normal, hérnia umbilical, diástase dos retos).
 *
 * MVP: um achado principal por exame (defeito herniário, diástase ou coleção).
 * Sem dado essencial, o corpo mostra `____` e a conclusão fica pendente.
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganComposition, OrganModule, OrganState } from '../types'
import {
  CONDUTA_NAO_REDUTIVEL, CONTEUDO_HERNIA_OPTIONS, FALTANDO, REDUTIBILIDADE_OPTIONS,
  complementoHernia, conclusaoPendente, corpoHernia, faltandoHernia, medida, medidas, texto,
  type HerniaDados,
} from './superficialShared'

const PELE = 'Pele e tecido celular subcutâneo com espessura e ecogenicidade normais.'
const PLANOS_NORMAIS =
  'Planos musculoaponeuróticos da parede abdominal preservados, sem soluções de continuidade ou abaulamentos, mesmo à manobra de Valsalva.'
const RETOS_NORMAIS = 'A distância entre os músculos retos abdominais encontra-se dentro dos limites da normalidade.'
const SEM_COLECOES = 'Ausência de coleções ou imagens nodulares na parede abdominal.'
const CONCLUSAO_NORMAL = 'Parede abdominal sem evidência de defeitos herniários à manobra de Valsalva.'

type Local = 'umbilical' | 'epigastrica' | 'incisional' | 'spiegel'
const LOCAL_CORPO: Record<Local, string> = {
  umbilical: 'da parede abdominal anterior na projeção da cicatriz umbilical',
  epigastrica: 'da linha alba na região epigástrica',
  incisional: 'da parede abdominal na topografia da cicatriz cirúrgica',
  spiegel: 'da aponeurose na linha semilunar (de Spiegel)',
}
const LOCAL_CONCLUSAO: Record<Local, string> = {
  umbilical: 'Hérnia umbilical',
  epigastrica: 'Hérnia epigástrica',
  incisional: 'Hérnia incisional',
  spiegel: 'Hérnia de Spiegel',
}
/** Linha média dispensa lado; incisional e Spiegel exigem lado ou linha média explícita. */
const LOCAL_LINHA_MEDIA: Local[] = ['umbilical', 'epigastrica']
const LADO_TEXTO: Record<string, string> = { linha_media: 'na linha média', direita: 'à direita', esquerda: 'à esquerda' }

function hernia(st: OrganState): OrganComposition {
  const p = 'achado.hernia.'
  const local = texto(st, `${p}local`) as Local
  const lado = texto(st, `${p}lado`)
  const dados: HerniaDados = {
    ondeCorpo: LOCAL_CORPO[local] ?? `da parede abdominal ${FALTANDO}`,
    conteudo: texto(st, `${p}conteudo`),
    redutibilidade: texto(st, `${p}redutibilidade`),
    colo: medida(st[`${p}colo`]),
    saco: medidas(st[`${p}saco`]),
  }
  const precisaLado = !LOCAL_LINHA_MEDIA.includes(local)
  const ladoTexto = precisaLado ? LADO_TEXTO[lado] : undefined
  if (ladoTexto) dados.ondeCorpo = `${dados.ondeCorpo} ${ladoTexto}`
  const body = [PELE, ...corpoHernia(dados), 'Demais planos musculoaponeuróticos preservados, sem outras soluções de continuidade.', 'Ausência de coleções.'].join('\n')

  const faltando = faltandoHernia(dados)
  if (!LOCAL_CONCLUSAO[local]) faltando.unshift('localização')
  else if (precisaLado && !ladoTexto) faltando.unshift('lado')
  if (faltando.length) {
    return { body, conclusion: [conclusaoPendente('defeito da parede abdominal', faltando)], isNormal: false }
  }
  let item = `${LOCAL_CONCLUSAO[local]}${ladoTexto ? ` ${ladoTexto}` : ''}, ${complementoHernia(dados)}.`
  if (dados.redutibilidade === 'nao_redutivel') item += ` ${CONDUTA_NAO_REDUTIVEL}`
  return { body, conclusion: [item], isNormal: false }
}

function diastase(st: OrganState): OrganComposition {
  const supra = medida(st['achado.diastase.supra'])
  const infra = medida(st['achado.diastase.infra'])
  const niveis = [supra && `${supra} na região supraumbilical`, infra && `${infra} na região infraumbilical`].filter(Boolean)
  const body = [
    PELE,
    'Afastamento dos músculos retos abdominais na linha média, sem solução de continuidade aponeurótica.',
    `A distância entre os músculos retos abdominais é de ${niveis.length ? niveis.join(' e de ') : FALTANDO}.`,
    SEM_COLECOES,
  ].join('\n')
  if (!niveis.length) {
    return { body, conclusion: [conclusaoPendente('afastamento dos retos', ['ao menos uma distância inter-retos'])], isNormal: false }
  }
  return { body, conclusion: [`Diástase dos músculos retos abdominais, com distância intermuscular de ${niveis.join(' e de ')}.`], isNormal: false }
}

function colecao(st: OrganState): OrganComposition {
  const local = texto(st, 'achado.colecao.local').trim()
  const dims = medidas(st['achado.colecao.medidas'])
  const body = [
    PELE,
    `Coleção líquida na parede abdominal${local ? `, ${local}` : ''}, medindo ${dims ?? FALTANDO}.`,
    PLANOS_NORMAIS,
  ].join('\n')
  const faltando = [!local && 'localização', !dims && 'medidas'].filter(Boolean) as string[]
  if (faltando.length) return { body, conclusion: [conclusaoPendente('coleção na parede abdominal', faltando)], isNormal: false }
  return { body, conclusion: [`Coleção na parede abdominal, ${local}, medindo ${dims}.`], isNormal: false }
}

const paredeModule: OrganModule = {
  schema: {
    id: 'parede_abdominal',
    name: 'Parede abdominal',
    category: 'PAREDE_ABDOMINAL',
    fields: [
      {
        key: 'achado',
        label: 'Achado principal',
        kind: 'segmented',
        hint: 'default: sem alterações',
        options: [
          { value: 'normal', label: 'Sem alterações', isDefault: true },
          {
            value: 'hernia',
            label: 'Defeito herniário',
            subFields: [
              { key: 'local', label: 'Localização', kind: 'mini-segmented', options: [
                { value: 'umbilical', label: 'Umbilical', isDefault: true },
                { value: 'epigastrica', label: 'Epigástrica (linha alba)' },
                { value: 'incisional', label: 'Incisional' },
                { value: 'spiegel', label: 'Spiegel' },
              ] },
              { key: 'lado', label: 'Lado (incisional/Spiegel)', kind: 'mini-segmented', options: [
                { value: 'nao_informado', label: 'Não informado', isDefault: true },
                { value: 'linha_media', label: 'Linha média' },
                { value: 'direita', label: 'Direita' },
                { value: 'esquerda', label: 'Esquerda' },
              ] },
              { key: 'colo', label: 'Colo (cm)', kind: 'text', placeholder: '1,2', halfWidth: true },
              { key: 'saco', label: 'Saco herniário (cm)', kind: 'text', placeholder: '2,1 x 1,4', halfWidth: true },
              { key: 'conteudo', label: 'Conteúdo', kind: 'mini-segmented', options: CONTEUDO_HERNIA_OPTIONS },
              { key: 'redutibilidade', label: 'Redutibilidade', kind: 'mini-segmented', options: REDUTIBILIDADE_OPTIONS },
            ],
          },
          {
            value: 'diastase',
            label: 'Diástase dos retos',
            subFields: [
              { key: 'supra', label: 'Distância supraumbilical (cm)', kind: 'text', placeholder: '3,8', halfWidth: true },
              { key: 'infra', label: 'Distância infraumbilical (cm)', kind: 'text', placeholder: '2,2', halfWidth: true },
            ],
          },
          {
            value: 'colecao',
            label: 'Coleção',
            subFields: [
              { key: 'local', label: 'Localização', kind: 'text', placeholder: 'no flanco direito, no plano subcutâneo' },
              { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '3,0 x 1,5 x 2,0' },
            ],
          },
        ],
      },
    ],
  },
  initialState: (): OrganState => ({
    achado: 'normal',
    'achado.hernia.local': 'umbilical',
    'achado.hernia.lado': 'nao_informado',
    'achado.hernia.colo': '',
    'achado.hernia.saco': '',
    'achado.hernia.conteudo': 'nao_informado',
    'achado.hernia.redutibilidade': 'nao_informada',
    'achado.diastase.supra': '',
    'achado.diastase.infra': '',
    'achado.colecao.local': '',
    'achado.colecao.medidas': '',
  }),
  compose: (st): OrganComposition => {
    const achado = texto(st, 'achado')
    if (achado === 'hernia') return hernia(st)
    if (achado === 'diastase') return diastase(st)
    if (achado === 'colecao') return colecao(st)
    return { body: [PELE, PLANOS_NORMAIS, RETOS_NORMAIS, SEM_COLECOES].join('\n'), conclusion: [], isNormal: true }
  },
}

export const paredeAbdominal: ExamCategory = {
  id: 'PAREDE_ABDOMINAL',
  name: 'Parede abdominal',
  title: 'ULTRASSONOGRAFIA DA PAREDE ABDOMINAL',
  tecnica:
    'Exame realizado com transdutor linear multifrequencial de alta resolução, com avaliação dinâmica da parede abdominal em repouso e à manobra de Valsalva.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [{ id: 'parede_abdominal', label: 'Parede abdominal', group: 'orgaos', module: paredeModule }],
  conclusionNormal: CONCLUSAO_NORMAL,
}
