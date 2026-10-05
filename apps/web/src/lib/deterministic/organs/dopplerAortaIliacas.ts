/**
 * DOPPLER_AORTA_ILIACAS — MVP determinístico local (Web) para revisão clínica.
 *
 * Preflight: docs/competitor-research/laudario/audits/preflight-doppler-aorta-iliacas-2026-10-03.md
 * Frases de aorta: renderer da casa (`apps/api/src/server/renderer/phrases/ABDOMEN_TOTAL.ts`).
 * Critérios de velocidade: `packages/knowledge/snippets/DOPPLER_ARTERIAL_MMII/modelo/template-padrao.md`.
 *
 * Regras conservadoras:
 * - nenhum diagnóstico nasce de um limiar oculto: ectasia, aneurisma, estenose,
 *   oclusão e dissecção são escolhidos pelo médico e exigem confirmação;
 * - o diagnóstico que depende de medida exige a medida (diâmetro, VPS, razão);
 *   faltando dado ou confirmação, o laudo inteiro bloqueia com o motivo, nunca
 *   com '____' ou conclusão provisória;
 * - graduação percentual só com VPS na lesão e de referência que a sustentem;
 * - medida que contradiz "sem alterações" (aorta ≥ 3,0 cm, VPS > 200 cm/s)
 *   bloqueia para revisão — não reclassifica sozinha;
 * - segmento não avaliado ou limitado nunca é declarado normal.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { initialFromFields, mini, opt, ptBr, segmented, sub, text } from './neuroOcularShared'
import { lerMedida } from './medidasLocais'

export const CATEGORIA = 'DOPPLER_AORTA_ILIACAS'

/** Aviso da casa para aorta (sanity do Abdome Total: ≥ 30 mm sem menção a aneurisma). */
export const AORTA_DIAMETRO_REVISAR_CM = 3.0
/** Critérios de velocidade do template arterial da casa. */
export const VPS_REVISAR_CMS = 200
const GRAU_50 = { vps: 200, razao: 2 }
const GRAU_70 = { vps: 400, razao: 4 }

const CONFIRMACAO = [opt('pendente', 'Pendente de confirmação', { isDefault: true }), opt('confirmado', 'Confirmado pelo médico')]

/** VPS em cm/s: número positivo, com ou sem a unidade. */
export function lerVelocidade(raw: unknown): number | null | 'invalida' {
  const s = String(raw ?? '').trim().toLowerCase().replace(',', '.')
  if (!s) return null
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(cm\/s)?$/)
  if (!m) return 'invalida'
  const n = Number(m[1])
  return n > 0 && n < 1000 ? n : 'invalida'
}

type Segmento = {
  id: string
  /** Nome no corpo: "Aorta abdominal", "Artéria ilíaca comum direita". */
  nome: string
  aorta: boolean
}

function campos(seg: Segmento): Field[] {
  const dilatacao = opt('dilatacao', 'Dilatação', {
    subFields: [
      mini('tipo', 'Classificação', [opt('ectasia', 'Ectasia'), opt('aneurisma', 'Aneurisma')], true),
      ...(seg.aorta ? [mini('extensao', 'Topografia', [
        opt('infrarrenal', 'Infrarrenal'), opt('justarrenal', 'Justarrenal'), opt('suprarrenal', 'Suprarrenal'),
      ], true)] : []),
      mini('trombo', 'Trombo mural', [opt('nao', 'Não', { isDefault: true }), opt('sim', 'Sim')], true),
      mini('confirmacao', 'Confirmação médica', CONFIRMACAO, true),
    ],
  })
  const alteracoes = seg.aorta
    ? [
        opt('nenhuma', 'Nenhuma', { isDefault: true }),
        dilatacao,
        opt('disseccao', 'Flap intimal (dissecção)', {
          subFields: [
            text('extensao', 'Extensão (opcional)', 'da aorta infrarrenal à bifurcação', false),
            mini('confirmacao', 'Confirmação médica', CONFIRMACAO),
          ],
        }),
      ]
    : [
        opt('nenhuma', 'Nenhuma', { isDefault: true }),
        opt('estenose', 'Aceleração focal (estenose)', {
          subFields: [
            text('vps_lesao', 'VPS na lesão (cm/s)', '320'),
            text('vps_referencia', 'VPS de referência proximal (cm/s)', '110'),
            mini('grau', 'Graduação', [
              opt('nao_graduar', 'Não graduar', { isDefault: true }), opt('ge50', '50% ou mais'), opt('ge70', '70% ou mais'),
            ]),
            mini('confirmacao', 'Confirmação médica', CONFIRMACAO),
          ],
        }),
        opt('sem_fluxo', 'Fluxo não detectado', {
          subFields: [
            mini('colaterais', 'Circulação colateral', [
              opt('nao_informada', 'Não informada', { isDefault: true }), opt('presente', 'Presente'), opt('ausente', 'Ausente'),
            ], true),
            mini('confirmacao', 'Oclusão', CONFIRMACAO, true),
          ],
        }),
        dilatacao,
      ]
  return [
    segmented('avaliacao', 'Avaliação', [
      opt('avaliada', 'Avaliada', { isDefault: true }),
      opt('limitada', 'Limitada', { subFields: [text('motivo', 'Motivo (opcional)', 'interposição gasosa', false)] }),
      opt('nao_avaliada', 'Não avaliada'),
    ]),
    text('diametro_cm', seg.aorta ? 'Maior diâmetro AP externo (cm)' : 'Diâmetro (cm)', seg.aorta ? '2,0' : '0,9'),
    text('vps_cms', 'VPS (cm/s)', seg.aorta ? '80' : '110'),
    ...(seg.aorta ? [] : [segmented('padrao', 'Padrão espectral', [
      opt('nao_informado', 'Não informado', { isDefault: true }), opt('trifasico', 'Trifásico'), opt('bifasico', 'Bifásico'), opt('monofasico', 'Monofásico'),
    ])]),
    segmented('placas', 'Placas ateromatosas', [opt('ausentes', 'Ausentes', { isDefault: true }), opt('presentes', 'Presentes')]),
    segmented('alteracao', 'Alteração', alteracoes),
  ]
}

const PADRAO: Record<string, string> = { trifasico: 'trifásico', bifasico: 'bifásico', monofasico: 'monofásico' }
const TOPOGRAFIA: Record<string, string> = { infrarrenal: ' infrarrenal', justarrenal: ' justarrenal', suprarrenal: ' suprarrenal' }

function minuscula(nome: string) {
  return nome.charAt(0).toLowerCase() + nome.slice(1)
}

function segmentoModule(seg: Segmento): OrganModule {
  const fields = campos(seg)
  const alvo = minuscula(seg.nome)
  return {
    schema: { id: seg.id, name: seg.nome, category: CATEGORIA, fields },
    initialState: () => initialFromFields(fields),
    compose: (st: OrganState): OrganComposition => {
      const pendencias: PendenciaLocal[] = []
      const falta = (motivo: string) => pendencias.push({ onde: seg.nome, motivo })
      const lines: string[] = []
      const conclusion: string[] = []
      const avaliacao = String(st.avaliacao || 'avaliada')
      const alteracao = String(st.alteracao || 'nenhuma')

      const diametro = lerMedida(st.diametro_cm, 'cm')
      if (diametro === 'invalida') falta('diâmetro inválido (use cm ou mm)')
      const vps = lerVelocidade(st.vps_cms)
      if (vps === 'invalida') falta('VPS inválida (use cm/s)')
      const diametroCm = typeof diametro === 'number' ? diametro : null
      const vpsCms = typeof vps === 'number' ? vps : null

      if (avaliacao === 'nao_avaliada') {
        if (alteracao !== 'nenhuma' || st.placas === 'presentes' || diametroCm !== null || vpsCms !== null) {
          falta('segmento marcado como não avaliado tem achados ou medidas preenchidos')
        }
        const frase = `${seg.nome} não avaliada.`
        return { body: frase, conclusion: [frase], isNormal: false, pendencias }
      }

      // Descrição de base: só afirma normalidade em segmento avaliado sem alteração.
      const medidas: string[] = []
      // Na dilatação o diâmetro sai na frase do achado, não na abertura.
      if (diametroCm !== null && alteracao !== 'dilatacao') medidas.push(`${seg.aorta ? 'maior diâmetro anteroposterior' : 'diâmetro'} de ${ptBr(diametroCm)} cm`)
      if (vpsCms !== null) medidas.push(`VPS de ${ptBr(vpsCms)} cm/s`)
      const padrao = PADRAO[String(st.padrao)]
      const complemento = [padrao ? `padrão espectral ${padrao}` : '', ...medidas].filter(Boolean)
      const complementoTxt = complemento.length ? `, com ${complemento.join(' e ')}` : ''

      if (avaliacao === 'limitada') {
        const motivo = sub(st, 'avaliacao', 'limitada', 'motivo')
        lines.push(`${seg.nome} com avaliação limitada${motivo ? ` (${motivo})` : ''}${complementoTxt}.`)
        conclusion.push(`Avaliação limitada da ${alvo}.`)
      } else if (alteracao === 'nenhuma') {
        lines.push(seg.aorta
          ? `${seg.nome} com trajeto, calibre e contornos preservados, com fluxo ao Doppler colorido${complementoTxt}.`
          : `${seg.nome} pérvia, de calibre preservado, com fluxo ao Doppler colorido${complementoTxt}.`)
        if (seg.aorta && diametroCm !== null && diametroCm >= AORTA_DIAMETRO_REVISAR_CM) {
          falta(`diâmetro de ${ptBr(diametroCm)} cm com calibre descrito como preservado: classifique a dilatação ou revise a medida`)
        }
        if (vpsCms !== null && vpsCms > VPS_REVISAR_CMS) {
          falta(`VPS de ${ptBr(vpsCms)} cm/s com segmento descrito sem alteração: registre a aceleração focal ou revise a medida`)
        }
      } else {
        lines.push(complementoTxt ? `${seg.nome}${complementoTxt}.` : `${seg.nome}:`)
      }

      if (alteracao === 'dilatacao') {
        const tipo = sub(st, 'alteracao', 'dilatacao', 'tipo')
        if (diametroCm === null) falta('informe o diâmetro para descrever a dilatação')
        if (!tipo) falta('escolha a classificação da dilatação (ectasia ou aneurisma)')
        if (sub(st, 'alteracao', 'dilatacao', 'confirmacao') !== 'confirmado') falta('confirme a classificação da dilatação')
        const topografia = seg.aorta ? TOPOGRAFIA[sub(st, 'alteracao', 'dilatacao', 'extensao')] ?? '' : ''
        const trombo = sub(st, 'alteracao', 'dilatacao', 'trombo') === 'sim' ? ', com trombo mural' : ''
        const medida = diametroCm !== null ? `, medindo até ${ptBr(diametroCm)} cm` : ''
        if (tipo === 'aneurisma') {
          lines.push(`Dilatação aneurismática${topografia ? ` do segmento${topografia}` : ''}${medida}${trombo}.`)
          conclusion.push(`Dilatação aneurismática da ${alvo}${topografia}${medida}${trombo}.`)
        } else if (tipo === 'ectasia') {
          lines.push(`Calibre ectasiado${topografia ? ` no segmento${topografia}` : ''}${medida}${trombo}.`)
          conclusion.push(`Ectasia da ${alvo}${topografia}${medida}${trombo}.`)
        }
      }

      if (alteracao === 'disseccao') {
        if (sub(st, 'alteracao', 'disseccao', 'confirmacao') !== 'confirmado') falta('confirme o flap intimal antes de concluir dissecção')
        const extensao = sub(st, 'alteracao', 'disseccao', 'extensao')
        lines.push(`Imagem linear ecogênica na luz, compatível com flap intimal${extensao ? `, estendendo-se ${extensao}` : ''}.`)
        conclusion.push(`Achados compatíveis com dissecção da ${alvo}${extensao ? `, estendendo-se ${extensao}` : ''}.`)
      }

      if (alteracao === 'estenose') {
        const lesao = lerVelocidade(sub(st, 'alteracao', 'estenose', 'vps_lesao'))
        const referencia = lerVelocidade(sub(st, 'alteracao', 'estenose', 'vps_referencia'))
        const grau = sub(st, 'alteracao', 'estenose', 'grau') || 'nao_graduar'
        if (lesao === null) falta('informe a VPS na lesão')
        if (lesao === 'invalida') falta('VPS na lesão inválida (use cm/s)')
        if (referencia === 'invalida') falta('VPS de referência inválida (use cm/s)')
        if (sub(st, 'alteracao', 'estenose', 'confirmacao') !== 'confirmado') falta('confirme a estenose')
        const razao = typeof lesao === 'number' && typeof referencia === 'number' ? lesao / referencia : null
        if (grau !== 'nao_graduar') {
          const criterio = grau === 'ge70' ? GRAU_70 : GRAU_50
          if (razao === null) falta('graduação exige VPS na lesão e VPS de referência')
          else if (!(typeof lesao === 'number' && lesao > criterio.vps && razao > criterio.razao)) {
            falta(`valores não sustentam a graduação escolhida (exige VPS > ${criterio.vps} cm/s e razão > ${criterio.razao})`)
          }
        }
        const valores = [
          typeof lesao === 'number' ? `VPS de ${ptBr(lesao)} cm/s na lesão` : '',
          razao !== null ? `razão de velocidades de ${ptBr(razao)}` : '',
        ].filter(Boolean).join(' e ')
        lines.push(`Aceleração focal do fluxo${valores ? `, com ${valores}` : ''}.`)
        const grauTxt = grau === 'ge70' ? ' de 70% ou mais' : grau === 'ge50' ? ' de 50% ou mais' : ''
        conclusion.push(`Estenose${grauTxt} da ${alvo}${valores ? ` (${valores})` : ''}.`)
      }

      if (alteracao === 'sem_fluxo') {
        if (sub(st, 'alteracao', 'sem_fluxo', 'confirmacao') !== 'confirmado') falta('confirme a oclusão (diferenciar de fluxo filiforme)')
        if (vpsCms !== null) falta('VPS preenchida em segmento sem fluxo detectado: apague a velocidade')
        const colaterais = sub(st, 'alteracao', 'sem_fluxo', 'colaterais')
        lines.push(`Ausência de fluxo ao Doppler colorido e espectral${colaterais === 'presente' ? ', com circulação colateral' : colaterais === 'ausente' ? ', sem circulação colateral identificada' : ''}.`)
        conclusion.push(`Oclusão da ${alvo}.`)
      }

      if (st.placas === 'presentes') {
        lines.push('Placas ateromatosas parietais.')
        conclusion.push(`Placas de ateromas na ${alvo}.`)
      }

      return { body: lines.join('\n'), conclusion, isNormal: conclusion.length === 0, pendencias }
    },
  }
}

const SEGMENTOS: Array<Segmento & { lado?: 'direito' | 'esquerdo' }> = [
  { id: 'aorta', nome: 'Aorta abdominal', aorta: true },
  { id: 'iliaca_comum_direita', nome: 'Artéria ilíaca comum direita', aorta: false, lado: 'direito' },
  { id: 'iliaca_externa_direita', nome: 'Artéria ilíaca externa direita', aorta: false, lado: 'direito' },
  { id: 'iliaca_comum_esquerda', nome: 'Artéria ilíaca comum esquerda', aorta: false, lado: 'esquerdo' },
  { id: 'iliaca_externa_esquerda', nome: 'Artéria ilíaca externa esquerda', aorta: false, lado: 'esquerdo' },
]

const SECOES: Array<ExamSection & { lado?: 'direito' | 'esquerdo' }> = SEGMENTOS.map((seg) => ({
  id: seg.id,
  label: seg.nome,
  group: 'orgaos',
  module: segmentoModule(seg),
  lado: seg.lado,
}))

const ILIACAS: Record<string, string> = {
  bilateral: 'as artérias ilíacas comuns e externas bilateralmente',
  direito: 'as artérias ilíacas comum e externa direitas',
  esquerdo: 'as artérias ilíacas comum e externa esquerdas',
}

function lateralidade(opts: OrganState) {
  const lado = String(opts.lateralidade || 'bilateral')
  return ILIACAS[lado] ? lado : 'bilateral'
}

export const dopplerAortaIliacas: ExamCategory = {
  id: CATEGORIA,
  name: 'Doppler de aorta e ilíacas',
  title: 'ULTRASSONOGRAFIA COM DOPPLER COLORIDO DA AORTA ABDOMINAL E ARTÉRIAS ILÍACAS',
  tecnica: '',
  resolveTecnica: (opts) =>
    'Exame realizado com transdutor convexo, em modo B, Doppler colorido e espectral, com ângulo de insonação de até 60° nas aferições de velocidade. ' +
    `Foram estudados a aorta abdominal e ${ILIACAS[lateralidade(opts)]}; segmentos limitados ou não avaliados estão indicados nos achados.`,
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    segmented('lateralidade', 'Ilíacas estudadas', [
      opt('bilateral', 'Bilateral', { isDefault: true }), opt('direito', 'Somente direita'), opt('esquerdo', 'Somente esquerda'),
    ]),
  ],
  resolveSections: (opts) => {
    const lado = lateralidade(opts)
    return SECOES.filter((secao) => !secao.lado || lado === 'bilateral' || secao.lado === lado)
  },
  sections: SECOES,
  conclusionNormal: 'Aorta abdominal e artérias ilíacas estudadas sem alterações ecográficas ou hemodinâmicas significativas.',
  conclusionClosing: 'Demais segmentos avaliados sem alterações ecográficas ou hemodinâmicas significativas.',
}
