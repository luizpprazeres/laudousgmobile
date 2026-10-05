/**
 * Categoria PRÓSTATA TRANSRETAL — geração determinística local (MVP Web).
 *
 * Fonte clínica: snippets e casos-ouro aprovados de PROSTATA_TRANSRETAL
 * (commit 231c4dc, `packages/knowledge/snippets/PROSTATA_TRANSRETAL/`) e o
 * escopo de `docs/reviews/2026-09-26-clinical-evidence.md` (E1/E2/E4).
 *
 * Regras que este módulo garante:
 *  - volume = D1×D2×D3×0,5233 e peso = volume×1,05 (mesma fórmula da via
 *    suprapúbica); só com as três medidas;
 *  - HPB nunca é deduzida do volume: é uma escolha explícita do médico, e
 *    exige as três medidas (sem elas, a conclusão diagnóstica não sai);
 *  - resíduo pós-miccional sai como valor, sem limiar de "elevado";
 *  - lesão da zona periférica exige lado e medidas; sem eles, sai como
 *    pendência e a conclusão não traz lateralidade inventada;
 *  - bexiga entra só quando avaliada.
 *
 * Ainda não migrada para o renderer canônico: compõe localmente.
 */

import type { ExamCategory } from './abdomeTotal'
import type { OrganComposition, OrganModule, OrganState } from '../types'
import { calcPesoProstatico, ippGrau, lerVesiculasSeminais } from './prostataSuprapubica'
import { formatarEixos, lerEixos, lerMedida, ptBr1, textoLivre } from './medidasLocais'

const CATEGORIA = 'PROSTATA_TRANSRETAL'
const str = (v: unknown) => (typeof v === 'string' ? v : '')

// ── Bexiga ───────────────────────────────────────────────────────────────────
function lerResiduo(raw: unknown): number | null | 'invalida' {
  if (raw === null || raw === undefined) return null
  const s = String(raw).trim().toLowerCase().replace(',', '.').replace(/\s*ml$/, '')
  if (!s) return null
  if (!/^\d+(?:\.\d+)?$/.test(s)) return 'invalida'
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : 'invalida'
}

export function bexigaTransretalIssues(state: OrganState): string[] {
  const issues: string[] = []
  const estado = str(state.estado) || 'normal'
  if (!['normal', 'alterada', 'nao_avaliada'].includes(estado)) issues.push('Bexiga: opção inválida.')
  if (estado === 'alterada' && !textoLivre(state['estado.alterada.descricao'])) {
    issues.push('Bexiga: descreva a alteração observada.')
  }
  if (estado !== 'nao_avaliada' && lerResiduo(state.residuo) === 'invalida') {
    issues.push('Bexiga: resíduo pós-miccional com formato inválido (use mL, ex.: 65).')
  }
  return issues
}

const bexigaModule: OrganModule = {
  schema: {
    id: 'bexiga',
    name: 'Bexiga',
    category: CATEGORIA,
    fields: [
      {
        key: 'estado', label: 'Bexiga', kind: 'segmented', hint: 'default: normal',
        options: [
          { value: 'normal', label: 'Normal', isDefault: true },
          { value: 'alterada', label: 'Alteração observada', subFields: [
            { key: 'descricao', label: 'Descrição observada', kind: 'text', placeholder: 'descrever somente o observado' },
          ] },
          { value: 'nao_avaliada', label: 'Não avaliada' },
        ],
      },
      { key: 'residuo', label: 'Resíduo pós-miccional (mL)', kind: 'text', placeholder: '65', hint: 'opcional', halfWidth: true },
    ],
  },
  initialState: () => ({ estado: 'normal', 'estado.alterada.descricao': '', residuo: '' }),
  compose: (state): OrganComposition => {
    const estado = str(state.estado) || 'normal'
    if (estado === 'nao_avaliada') return { body: '', conclusion: [], isNormal: true }
    const body: string[] = []
    const conclusion: string[] = []
    if (estado === 'alterada') {
      const descricao = textoLivre(state['estado.alterada.descricao']) || '____'
      body.push(`Bexiga: ${descricao}.`)
      conclusion.push(`Bexiga: ${descricao}.`)
    } else {
      body.push('Bexiga de forma, ecotextura e contornos regulares.')
      conclusion.push('Bexiga ecograficamente normal.')
    }
    const residuo = lerResiduo(state.residuo)
    if (typeof residuo === 'number') {
      const valor = Number.isInteger(residuo) ? String(residuo) : ptBr1(residuo)
      body.push(`Resíduo pós-miccional de ${valor} mL.`)
      conclusion.push(`Resíduo pós-miccional de ${valor} mL.`)
    }
    return { body: body.join('\n'), conclusion, isNormal: estado === 'normal' && residuo === null }
  },
}

// ── Próstata ─────────────────────────────────────────────────────────────────
const MEDIDAS = ['d1', 'd2', 'd3'] as const
const PADROES = ['normal', 'aumentada', 'hpb']
const ACHADOS = ['calcificacoes', 'prostatite']

function medidasProstata(state: OrganState): [number, number, number] | null {
  const lidas = MEDIDAS.map((key) => lerMedida(state[key], 'cm'))
  return lidas.every((v): v is number => typeof v === 'number')
    ? [lidas[0]!, lidas[1]!, lidas[2]!]
    : null
}

/** Volume elipsoide (cm³), uma casa. Exige as três medidas. */
export function volumeProstaticoCm3(d: [number, number, number] | null): number | null {
  if (!d) return null
  return Math.round(d[0] * d[1] * d[2] * 0.5233 * 10) / 10
}

export function prostataTransretalIssues(state: OrganState): string[] {
  const issues: string[] = []
  const lidas = MEDIDAS.map((key) => lerMedida(state[key], 'cm'))
  lidas.forEach((v, i) => {
    if (v === 'invalida') issues.push(`Próstata: medida ${i + 1} com formato inválido (use cm ou mm).`)
  })
  const preenchidas = lidas.filter((v) => v !== null).length
  // As três medidas são essenciais em qualquer padrão: sem elas não há laudo
  // de dimensões (nem normais, nem aumentadas).
  if (preenchidas < 3) issues.push('Próstata: informe as três medidas.')
  const padrao = str(state.padrao) || 'normal'
  if (!PADROES.includes(padrao)) issues.push('Próstata: padrão com opção inválida.')
  if (padrao === 'aumentada' || padrao === 'hpb') {
    if (lerMedida(state[`padrao.${padrao}.ipp`], 'cm') === 'invalida') issues.push('Próstata: IPP com formato inválido (use cm ou mm).')
  }
  const achados = state.achados
  if (achados !== undefined && (!Array.isArray(achados) || achados.some((a) => !ACHADOS.includes(a)))) {
    issues.push('Próstata: achado com opção inválida.')
  }
  return issues
}

const prostataModule: OrganModule = {
  schema: {
    id: 'prostata',
    name: 'Próstata',
    category: CATEGORIA,
    fields: [
      { key: 'd1', label: 'Medida 1 (cm)', kind: 'text', placeholder: '4,2', halfWidth: true },
      { key: 'd2', label: 'Medida 2 (cm)', kind: 'text', placeholder: '3,0', halfWidth: true },
      { key: 'd3', label: 'Medida 3 (cm)', kind: 'text', placeholder: '3,8', halfWidth: true },
      {
        key: 'padrao', label: 'Volume e padrão', kind: 'segmented', hint: 'escolha do médico, nunca deduzida do volume',
        options: [
          { value: 'normal', label: 'Dimensões normais', isDefault: true },
          { value: 'aumentada', label: 'Volume aumentado', subFields: [
            { key: 'ipp', label: 'IPP (cm)', kind: 'text', placeholder: '0,8', halfWidth: true },
          ] },
          { value: 'hpb', label: 'Hiperplasia da zona de transição', subFields: [
            { key: 'ipp', label: 'IPP (cm)', kind: 'text', placeholder: '0,8', halfWidth: true },
          ] },
        ],
      },
      {
        key: 'achados', label: 'Achados', kind: 'checklist', hint: 'marque se houver',
        options: [
          { value: 'calcificacoes', label: 'Calcificações', subFields: [
            { key: 'local', label: 'Local', kind: 'mini-segmented', options: [
              { value: 'parenquima', label: 'Parênquima', isDefault: true },
              { value: 'capsula', label: 'Cápsula cirúrgica' },
            ] },
          ] },
          { value: 'prostatite', label: 'Áreas hipoecoicas com hiperemia' },
        ],
      },
    ],
  },
  initialState: () => ({
    d1: '', d2: '', d3: '', padrao: 'normal',
    'padrao.aumentada.ipp': '', 'padrao.hpb.ipp': '',
    achados: [], 'achados.calcificacoes.local': 'parenquima',
  }),
  compose: (state): OrganComposition => {
    const padrao = str(state.padrao) || 'normal'
    const medidas = medidasProstata(state)
    const achados = Array.isArray(state.achados) ? state.achados : []
    const prostatite = achados.includes('prostatite')
    const calcificacoes = achados.includes('calcificacoes')
    const textoMedidas = medidas ? formatarEixos(medidas, 'cm') : ''

    const body: string[] = []
    if (!medidas) {
      // Pendência bloqueante: nada de lacuna "____" nem de dimensões afirmadas.
      body.push('Próstata: medidas pendentes.')
    } else if (padrao === 'hpb') {
      body.push(`Próstata medindo ${textoMedidas}, de contornos regulares, com aumento volumétrico da zona de transição, que apresenta ecotextura heterogênea, comprimindo a zona periférica.`)
    } else if (padrao === 'aumentada') {
      body.push(`Próstata aumentada de volume, medindo ${textoMedidas}, de contornos regulares.`)
    } else if (prostatite) {
      body.push(`Próstata medindo ${textoMedidas}, de contornos regulares.`)
    } else {
      body.push(`Próstata medindo ${textoMedidas}, de contornos regulares e ecotextura homogênea, com diferenciação preservada entre a zona de transição e a zona periférica.`)
    }
    if (prostatite) body.push('Próstata de ecotextura heterogênea, com áreas hipoecoicas e hiperemia ao Doppler.')
    const ipp = padrao === 'normal' ? null : lerMedida(state[`padrao.${padrao}.ipp`], 'cm')
    if (typeof ipp === 'number') body.push(`Protrusão do lobo mediano para o interior da bexiga, medindo ${ptBr1(ipp)} cm.`)
    if (calcificacoes) {
      body.push(str(state['achados.calcificacoes.local']) === 'capsula'
        ? 'Calcificações na região da cápsula cirúrgica.'
        : 'Calcificações no parênquima prostático.')
    }

    const volume = volumeProstaticoCm3(medidas)
    const peso = medidas ? calcPesoProstatico(...medidas) : null
    const medidasConclusao = volume !== null && peso !== null
      ? ` (volume estimado de ${ptBr1(volume)} cm³ e peso aproximado de ${ptBr1(peso)} gramas)`
      : ''
    const conclusion: string[] = []
    if (!medidas) {
      conclusion.push('Próstata: medidas pendentes.')
    } else if (padrao === 'hpb') {
      conclusion.push(`Hiperplasia prostática benigna${medidasConclusao}.`)
    } else if (padrao === 'aumentada') {
      conclusion.push(`Próstata de volume aumentado${medidasConclusao}.`)
    } else {
      conclusion.push(`Próstata de dimensões normais${medidasConclusao}.`)
    }
    if (typeof ipp === 'number') conclusion.push(`Índice de protrusão prostática (IPP) de ${ptBr1(ipp)} cm, ${ippGrau(ipp).toLowerCase()}.`)
    if (calcificacoes) conclusion.push('Calcificações prostáticas.')
    if (prostatite) conclusion.push('Alterações ecográficas que podem corresponder a prostatite, a correlacionar clinicamente.')

    return { body: body.join('\n'), conclusion, isNormal: Boolean(medidas) && padrao === 'normal' && achados.length === 0 }
  },
}

// ── Zona periférica (lesão focal) ────────────────────────────────────────────
const LADOS: Record<string, string> = { direita: 'direita', esquerda: 'esquerda' }
const TERCOS: Record<string, string> = { base: 'na base', medio: 'no terço médio', apice: 'no ápice' }

export function zonaPerifericaIssues(state: OrganState): string[] {
  if (str(state.lesao) !== 'presente') return []
  const issues: string[] = []
  if (!LADOS[str(state['lesao.presente.lado'])]) issues.push('Zona periférica: selecione o lado da imagem.')
  const medidas = lerEixos(state['lesao.presente.medidas'], 3, 'cm')
  if (medidas === null) issues.push('Zona periférica: informe as três medidas da imagem.')
  if (medidas === 'invalida') issues.push('Zona periférica: medidas da imagem com formato inválido (ex.: 1,1 x 0,8 x 0,9).')
  return issues
}

const zonaPerifericaModule: OrganModule = {
  schema: {
    id: 'zona_periferica',
    name: 'Zona periférica',
    category: CATEGORIA,
    fields: [
      {
        key: 'lesao', label: 'Imagem focal', kind: 'segmented', hint: 'default: ausente',
        options: [
          { value: 'ausente', label: 'Ausente', isDefault: true },
          { value: 'presente', label: 'Imagem hipoecoica', subFields: [
            { key: 'lado', label: 'Lado', kind: 'mini-segmented', options: [
              { value: 'direita', label: 'Direita' },
              { value: 'esquerda', label: 'Esquerda' },
            ] },
            { key: 'terco', label: 'Terço', kind: 'mini-segmented', options: [
              { value: 'base', label: 'Base' },
              { value: 'medio', label: 'Médio', isDefault: true },
              { value: 'apice', label: 'Ápice' },
            ] },
            { key: 'medidas', label: 'Medidas (cm)', kind: 'text', placeholder: '1,1 x 0,8 x 0,9' },
            { key: 'contornos', label: 'Contornos', kind: 'mini-segmented', options: [
              { value: 'regulares', label: 'Regulares', isDefault: true },
              { value: 'irregulares', label: 'Irregulares' },
            ] },
            { key: 'doppler', label: 'Doppler', kind: 'mini-segmented', options: [
              { value: 'nao_citar', label: 'Não citar', isDefault: true },
              { value: 'sem_aumento', label: 'Sem aumento do fluxo' },
              { value: 'aumentado', label: 'Fluxo aumentado' },
            ] },
          ] },
        ],
      },
    ],
  },
  initialState: () => ({
    lesao: 'ausente',
    'lesao.presente.lado': '', 'lesao.presente.terco': 'medio', 'lesao.presente.medidas': '',
    'lesao.presente.contornos': 'regulares', 'lesao.presente.doppler': 'nao_citar',
  }),
  compose: (state): OrganComposition => {
    if (str(state.lesao) !== 'presente') return { body: '', conclusion: [], isNormal: true }
    const lado = LADOS[str(state['lesao.presente.lado'])]
    const terco = TERCOS[str(state['lesao.presente.terco'])] ?? TERCOS.medio
    const medidas = lerEixos(state['lesao.presente.medidas'], 3, 'cm')
    const contornos = str(state['lesao.presente.contornos']) === 'irregulares' ? 'irregulares' : 'regulares'
    const doppler = str(state['lesao.presente.doppler'])
    const body = [
      `Imagem hipoecoica na zona periférica, ${lado ? `à ${lado}` : 'à ____'}, ${terco}, medindo ${Array.isArray(medidas) ? formatarEixos(medidas, 'cm') : '____ x ____ x ____ cm'}, de contornos ${contornos}.`,
    ]
    if (doppler === 'aumentado') body.push('Complementamos o estudo com Doppler colorido, que mostrou aumento da vascularização na referida imagem.')
    if (doppler === 'sem_aumento') body.push('Ao Doppler colorido, sem aumento da vascularização na referida imagem.')
    const completa = Boolean(lado) && Array.isArray(medidas)
    const conclusion = completa
      ? [`Imagem hipoecoica na zona periférica ${lado}, a esclarecer. Convém, a critério clínico, correlacionar com a dosagem de PSA e prosseguir com avaliação urológica especializada, com ressonância magnética multiparamétrica e/ou biópsia prostática, com objetivo de prosseguir a investigação.`]
      : ['Imagem hipoecoica na zona periférica, dados pendentes.']
    return { body: body.join('\n'), conclusion, isNormal: false }
  },
}

// ── Vesículas seminais ───────────────────────────────────────────────────────
const LADO_VESICULAS: Record<string, string> = {
  bilateral: 'Vesículas seminais', direita: 'Vesícula seminal direita', esquerda: 'Vesícula seminal esquerda',
}
const ladoVesiculasField = {
  key: 'lado', label: 'Lado', kind: 'mini-segmented' as const,
  options: [
    { value: 'bilateral', label: 'Ambas', isDefault: true },
    { value: 'direita', label: 'Direita' },
    { value: 'esquerda', label: 'Esquerda' },
  ],
}

const vesiculasModule: OrganModule = {
  schema: {
    id: 'vesiculas_seminais',
    name: 'Vesículas seminais',
    category: CATEGORIA,
    fields: [
      {
        key: 'estado', label: 'Estado', kind: 'segmented', hint: 'default: normais',
        options: [
          { value: 'normal', label: 'Normais', isDefault: true },
          { value: 'nao_caracterizadas', label: 'Não caracterizadas adequadamente', subFields: [ladoVesiculasField] },
          { value: 'alteradas', label: 'Alteração observada', subFields: [
            ladoVesiculasField,
            { key: 'descricao', label: 'Descrição observada', kind: 'text', placeholder: 'descrever somente o observado' },
          ] },
        ],
      },
    ],
  },
  initialState: () => ({ estado: 'normal' }),
  compose: (state): OrganComposition => {
    const { contrato, issues } = lerVesiculasSeminais(state)
    if (issues.length > 0) return { body: 'Vesículas seminais: seleção pendente de correção.', conclusion: [], isNormal: false }
    if (!contrato) {
      return {
        body: 'Vesículas seminais de dimensões, ecogenicidade e ecotextura normais.',
        conclusion: ['Vesículas seminais ecograficamente normais.'],
        isNormal: true,
      }
    }
    const sujeito = LADO_VESICULAS[contrato.lateralidade]
    const plural = contrato.lateralidade === 'bilateral'
    if (contrato.estado === 'nao_caracterizadas') {
      const frase = `${sujeito} não ${plural ? 'caracterizadas' : 'caracterizada'} adequadamente neste exame.`
      return { body: frase, conclusion: [frase], isNormal: false }
    }
    const frase = `${sujeito}: ${contrato.descricao}.`
    return { body: frase, conclusion: [frase], isNormal: false }
  },
}

// ── Categoria ────────────────────────────────────────────────────────────────
export function prostataTransretalIssuesDoExame(state: Record<string, OrganState>): string[] {
  return [
    ...bexigaTransretalIssues(state.bexiga ?? {}),
    ...prostataTransretalIssues(state.prostata ?? {}),
    ...zonaPerifericaIssues(state.zona_periferica ?? {}),
    ...lerVesiculasSeminais(state.vesiculas_seminais ?? {}).issues.map((issue) => `Vesículas seminais: ${issue}.`),
  ]
}

export const prostataTransretal: ExamCategory = {
  id: CATEGORIA,
  name: 'Próstata transretal',
  title: 'ULTRASSONOGRAFIA DA PRÓSTATA (TRANSRETAL)',
  tecnica:
    'Exame realizado com transdutor endocavitário multifrequencial, por via transretal, com o paciente em decúbito lateral esquerdo. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections: [
    { id: 'bexiga', label: 'Bexiga', group: 'orgaos', module: bexigaModule },
    { id: 'prostata', label: 'Próstata', group: 'orgaos', module: prostataModule },
    { id: 'zona_periferica', label: 'Zona periférica', group: 'orgaos', module: zonaPerifericaModule },
    { id: 'vesiculas_seminais', label: 'Vesículas seminais', group: 'orgaos', module: vesiculasModule },
  ],
  // A conclusão lista as estruturas avaliadas, inclusive as normais.
  conclusionNormal: 'Próstata sem alterações ecográficas significativas à avaliação transretal.',
}
