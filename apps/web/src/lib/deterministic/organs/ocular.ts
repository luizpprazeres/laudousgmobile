/**
 * OCULAR — MVP determinístico local para revisão clínica.
 * Base: modelo da casa em `_extraction/from-laudousg-original/03-models-by-category/OCULAR.md`.
 *
 * Regras conservadoras:
 * - um módulo por olho; a lateralidade do exame filtra os cards e o olho não
 *   examinado é declarado não avaliado na técnica;
 * - descolamento de retina só é sugerido com inserção no disco óptico confirmada;
 * - a bainha do nervo óptico nunca é classificada sozinha: acima de 5,7 mm (limite
 *   do modelo da casa) o texto deixa de afirmar normalidade e pede interpretação;
 * - recomendação só entra quando marcada no achado que a sustenta.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState } from '../types'
import { LACUNA, initialFromFields, mini, mmText, opt, parseMm, ptBr, segmented, sub, text } from './neuroOcularShared'

/** Limite do modelo da casa para a bainha do nervo óptico. */
export const BAINHA_LIMITE_MM = 5.7

type Olho = 'direito' | 'esquerdo'

const olhoFields: Field[] = [
  segmented('segmento_anterior', 'Segmento anterior e cristalino', [
    opt('normal', 'Habitual', { isDefault: true }),
    opt('opacificado', 'Cristalino opacificado'),
    opt('pseudofacia', 'Lente intraocular'),
    opt('nao_avaliado', 'Não avaliado'),
  ]),
  segmented('vitreo', 'Câmara vítrea', [
    opt('normal', 'Anecogênica', { isDefault: true }),
    opt('hemorragia', 'Ecos móveis (hemorragia)'),
    opt('dvp', 'Membrana livre (DVP)'),
    opt('nao_avaliado', 'Não avaliada'),
  ]),
  segmented('retina', 'Retina', [
    opt('aplicada', 'Aplicada', { isDefault: true }),
    opt('descolamento', 'Membrana destacada', {
      subFields: [
        mini('extensao', 'Extensão', [opt('parcial', 'Parcial'), opt('total', 'Total')], true),
        mini('insercao', 'Inserção no disco óptico', [opt('confirmada', 'Confirmada'), opt('nao_caracterizada', 'Não caracterizada')], true),
        mini('avaliacao', 'Recomendar avaliação oftalmológica', [
          opt('nao', 'Não', { isDefault: true }), opt('sim', 'Sim'), opt('urgente', 'Urgente'),
        ]),
      ],
    }),
    opt('nao_avaliada', 'Não avaliada'),
  ]),
  segmented('nervo', 'Nervo óptico', [
    opt('normal', 'Habitual', { isDefault: true }),
    opt('bainha_aumentada', 'Bainha aumentada'),
    opt('nao_avaliado', 'Não avaliado'),
  ]),
  text('bainha_mm', 'Diâmetro da bainha (mm)', '5,0'),
]

function olhoModule(olho: Olho): OrganModule {
  const nome = `olho ${olho}`
  return {
    schema: { id: `olho_${olho}`, name: `Olho ${olho}`, category: 'OCULAR', fields: olhoFields },
    initialState: () => initialFromFields(olhoFields),
    compose: (st: OrganState): OrganComposition => {
      const lines: string[] = [`Olho ${olho}:`]
      const conclusion: string[] = []
      const naoAvaliados: string[] = []

      switch (st.segmento_anterior) {
        case 'opacificado':
          lines.push('Câmara anterior de profundidade normal. Cristalino tópico, com ecogenicidade aumentada.')
          conclusion.push(`Opacificação do cristalino do ${nome}.`)
          break
        case 'pseudofacia':
          lines.push('Câmara anterior de profundidade normal. Lente intraocular tópica.')
          conclusion.push(`Pseudofacia no ${nome}.`)
          break
        case 'nao_avaliado':
          naoAvaliados.push('segmento anterior')
          break
        default:
          lines.push('Câmara anterior de profundidade normal. Cristalino tópico e de ecogenicidade habitual.')
      }

      const descolamento = st.retina === 'descolamento'
      switch (st.vitreo) {
        case 'hemorragia':
          lines.push('Câmara vítrea com múltiplos ecos internos de baixa a média amplitude, móveis à movimentação ocular, sem inserção no disco óptico.')
          conclusion.push(`Aspecto ecográfico sugestivo de hemorragia vítrea no ${nome}.`)
          break
        case 'dvp':
          lines.push('Membrana ecogênica fina na câmara vítrea, livremente móvel, sem inserção no disco óptico.')
          conclusion.push(`Descolamento vítreo posterior no ${nome}.`)
          break
        case 'nao_avaliado':
          naoAvaliados.push('câmara vítrea')
          break
        default:
          lines.push(descolamento ? 'Câmara vítrea sem outros ecos internos.' : 'Câmara vítrea anecogênica, sem ecos internos.')
      }

      if (descolamento) {
        const extensao = sub(st, 'retina', 'descolamento', 'extensao')
        const insercao = sub(st, 'retina', 'descolamento', 'insercao')
        const extensaoTxt = extensao === 'parcial' ? 'parcialmente' : extensao === 'total' ? 'totalmente' : LACUNA
        if (insercao === 'confirmada') {
          lines.push(`Membrana ecogênica na câmara vítrea, com inserção no disco óptico, ${extensaoTxt} destacada da parede posterior.`)
          const avaliacao = sub(st, 'retina', 'descolamento', 'avaliacao')
          const reco = avaliacao === 'urgente' ? ' Avaliação oftalmológica urgente recomendada.'
            : avaliacao === 'sim' ? ' Avaliação oftalmológica recomendada.' : ''
          conclusion.push(`Aspecto ecográfico sugestivo de descolamento de retina no ${nome}.${reco}`)
        } else if (insercao === 'nao_caracterizada') {
          lines.push(`Membrana ecogênica na câmara vítrea, ${extensaoTxt} destacada da parede posterior, sem inserção caracterizada no disco óptico.`)
          conclusion.push(`Membrana ecogênica na câmara vítrea do ${nome}; inserção no disco óptico não caracterizada, sem confirmação ecográfica de descolamento de retina.`)
        } else {
          lines.push(`Membrana ecogênica na câmara vítrea, ${extensaoTxt} destacada da parede posterior (inserção no disco óptico: ${LACUNA}).`)
          conclusion.push(`Membrana ecogênica na câmara vítrea do ${nome} (inserção no disco óptico: ${LACUNA}).`)
        }
      } else if (st.retina === 'nao_avaliada') {
        naoAvaliados.push('retina')
      } else {
        lines.push('Retina aplicada em toda a sua extensão.')
      }

      const bainhaRaw = st.bainha_mm
      const bainhaValor = parseMm(bainhaRaw)
      const bainha = mmText(bainhaRaw)
      if (st.nervo === 'nao_avaliado') {
        naoAvaliados.push('nervo óptico')
      } else if (st.nervo === 'bainha_aumentada') {
        lines.push(`Nervo óptico com diâmetro da bainha aumentado, medindo ${bainha ?? `${LACUNA} mm`}.`)
        conclusion.push(`Aumento do diâmetro da bainha do nervo óptico do ${nome} (${bainha ?? `${LACUNA} mm`}), achado que pode estar associado a hipertensão intracraniana. Correlacionar clinicamente.`)
      } else if (bainhaValor !== null && !Number.isNaN(bainhaValor) && bainhaValor > BAINHA_LIMITE_MM) {
        // Medida acima do limite com "Habitual" marcado: não afirma normalidade nem diagnostica.
        lines.push(`Nervo óptico com diâmetro da bainha de ${ptBr(bainhaValor)} mm.`)
        conclusion.push(`Diâmetro da bainha do nervo óptico do ${nome} de ${ptBr(bainhaValor)} mm, acima do limite de ${ptBr(BAINHA_LIMITE_MM)} mm do modelo; interpretar conforme idade e contexto clínico.`)
      } else {
        lines.push(`Nervo óptico de aspecto ecográfico normal${bainha ? `, com diâmetro da bainha de ${bainha}` : ''}.`)
      }

      if (naoAvaliados.length) {
        const lista = naoAvaliados.length > 1
          ? `${naoAvaliados.slice(0, -1).join(', ')} e ${naoAvaliados[naoAvaliados.length - 1]}`
          : naoAvaliados[0]!
        lines.push(`Não avaliados neste olho: ${lista}.`)
        conclusion.push(`Avaliação incompleta do ${nome} (não avaliados: ${lista}).`)
      }

      return { body: lines.join('\n'), conclusion, isNormal: conclusion.length === 0 }
    },
  }
}

const SECAO_OD: ExamSection = { id: 'olho_direito', label: 'Olho direito', group: 'orgaos', module: olhoModule('direito') }
const SECAO_OE: ExamSection = { id: 'olho_esquerdo', label: 'Olho esquerdo', group: 'orgaos', module: olhoModule('esquerdo') }

const TECNICA = 'Exame realizado com transdutor linear de alta frequência (10–15 MHz), por técnica transpalpebral, com gel acoplante sobre a pálpebra fechada. A documentação fotográfica foi obtida segundo protocolo internacional de Serviços de Imagem, que possuem várias metodologias.'

export const ocular: ExamCategory = {
  id: 'OCULAR',
  name: 'Ocular',
  title: 'ULTRASSONOGRAFIA OCULAR',
  tecnica: TECNICA,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    segmented('lateralidade', 'Olhos examinados', [
      opt('bilateral', 'Ambos', { isDefault: true }),
      opt('direito', 'Somente direito'),
      opt('esquerdo', 'Somente esquerdo'),
    ]),
  ],
  resolveSections: (opts: OrganState) =>
    opts.lateralidade === 'direito' ? [SECAO_OD] : opts.lateralidade === 'esquerdo' ? [SECAO_OE] : [SECAO_OD, SECAO_OE],
  resolveTecnica: (opts: OrganState) =>
    opts.lateralidade === 'direito' ? `${TECNICA}\nExame unilateral do olho direito; olho esquerdo não avaliado.`
      : opts.lateralidade === 'esquerdo' ? `${TECNICA}\nExame unilateral do olho esquerdo; olho direito não avaliado.`
        : TECNICA,
  sections: [SECAO_OD, SECAO_OE],
  conclusionNormal: 'Ultrassonografia ocular sem alterações ecográficas significativas.',
  conclusionClosing: 'Demais estruturas avaliadas sem alterações ecográficas significativas.',
}
