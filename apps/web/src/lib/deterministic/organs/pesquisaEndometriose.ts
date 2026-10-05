/**
 * Categoria PESQUISA_ENDOMETRIOSE — MVP Web estruturado (composição local).
 *
 * Mapa de cobertura: docs/competitor-research/laudario/crosswalk-pesquisa-endometriose-2026-10-02.md
 * e cases/pesquisa-endometriose-2026-10-02.md. Redação própria; a descrição do
 * endometrioma segue a da pelve feminina (`pelveFeminina.ts`).
 *
 * Regras do crosswalk aplicadas:
 *  - cada estrutura começa "conforme modelo"; o modelo padrão é EM BRANCO, então
 *    nada é afirmado normal sem escolha explícita (o modelo "normal" existe e é
 *    escolhido pelo médico);
 *  - estrutura não avaliada aparece como tal no corpo e na conclusão;
 *  - endometrioma NÃO vira "endometriose profunda"; O-RADS só quando informado;
 *  - medidas cirurgicamente úteis da lesão intestinal preservadas; volume do
 *    endometrioma calculado só com as três medidas;
 *  - combinações anatomia × avaliação dinâmica incompatíveis bloqueiam o laudo;
 *  - sem recomendações automáticas e sem cartograma (fora do MVP).
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, FieldOption, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { formatarEixos, lerEixos, lerMedida, ptBr1, textoLivre } from './medidasLocais'

const CATEGORIA = 'PESQUISA_ENDOMETRIOSE'

type Sub = (key: string) => unknown
type Render = { corpo: string; conclusao?: string; faltando: string[] }

interface Alteracao {
  value: string
  label: string
  subFields?: Field[]
  render: (sub: Sub) => Render
}

interface Estrutura {
  key: string
  /** Nome para a lista de não avaliados ("bexiga", "ligamento uterossacro direito"). */
  nome: string
  label: string
  normal: string
  naoAvaliado: string
  alteracoes: Alteracao[]
  /** Opção neutra extra, que não é alteração (ex.: ovário não visualizado). */
  neutra?: { value: string; label: string; corpo: string }
}

const mini = (key: string, label: string, opts: ReadonlyArray<readonly [string, string]>): Field => ({
  key, label, kind: 'mini-segmented', options: opts.map(([value, l]) => ({ value, label: l })),
})
const texto = (key: string, label: string, placeholder: string, halfWidth = false): Field => ({ key, label, kind: 'text', placeholder, halfWidth })

/** Três eixos em cm: devolve o texto ou registra o que falta. */
function eixos3(raw: unknown, faltando: string[]): string {
  const e = lerEixos(raw, 3, 'cm')
  if (e === null) faltando.push('medidas nos três eixos')
  if (e === 'invalida') faltando.push('medidas válidas nos três eixos (cm)')
  return Array.isArray(e) ? formatarEixos(e, 'cm') : ''
}

const LADOS = [['direito', 'Direito'], ['esquerdo', 'Esquerdo'], ['bilateral', 'Bilateral']] as const
const LADO_TXT: Record<string, string> = { direito: 'direito', esquerdo: 'esquerdo', bilateral: 'bilateralmente' }

/** Nódulo hipoecoico genérico de endometriose profunda numa estrutura. */
function nodulo(onde: string, conclusaoOnde: string, extra: Field[] = []): Alteracao {
  return {
    value: 'nodulo', label: 'Nódulo / espessamento', subFields: [texto('medidas', 'Medidas (cm)', '1,5 x 0,8 x 0,6'), ...extra],
    render: (sub) => {
      const faltando: string[] = []
      const m = eixos3(sub('medidas'), faltando)
      return {
        corpo: `Imagem nodular hipoecoica, sólida, de contornos irregulares, ${onde}, medindo ${m}.`,
        conclusao: `Lesão sugestiva de endometriose profunda ${conclusaoOnde}.`,
        faltando,
      }
    },
  }
}

// ── Compartimento anterior ───────────────────────────────────────────────────
const LOCAL_BEXIGA: Record<string, string> = { cupula: 'na cúpula vesical', posterior: 'na parede posterior', trigono: 'no trígono' }
const ANTERIOR: Estrutura[] = [
  {
    key: 'bexiga', nome: 'bexiga', label: 'Bexiga',
    normal: 'Bexiga com paredes finas e regulares, sem nódulos parietais.',
    naoAvaliado: 'Bexiga não avaliada.',
    alteracoes: [{
      value: 'nodulo', label: 'Nódulo parietal', subFields: [
        mini('local', 'Localização', [['cupula', 'Cúpula'], ['posterior', 'Parede posterior'], ['trigono', 'Trígono']]),
        texto('medidas', 'Medidas (cm)', '1,2 x 0,9 x 0,7'),
      ],
      render: (sub) => {
        const faltando: string[] = []
        const local = LOCAL_BEXIGA[String(sub('local') ?? '')]
        if (!local) faltando.push('localização')
        const m = eixos3(sub('medidas'), faltando)
        return {
          corpo: `Imagem nodular hipoecoica na parede vesical, ${local}, medindo ${m}.`,
          conclusao: `Lesão sugestiva de endometriose profunda na parede vesical, ${local}.`,
          faltando,
        }
      },
    }],
  },
  {
    key: 'vesicouterino', nome: 'espaço vesicouterino', label: 'Espaço vesicouterino',
    normal: 'Espaço vesicouterino livre, sem nódulos.',
    naoAvaliado: 'Espaço vesicouterino não avaliado.',
    alteracoes: [
      nodulo('no espaço vesicouterino', 'no espaço vesicouterino'),
      { value: 'obliterado', label: 'Obliterado', render: () => ({ corpo: 'Espaço vesicouterino obliterado.', conclusao: 'Obliteração do espaço vesicouterino.', faltando: [] }) },
    ],
  },
  {
    key: 'ureteres', nome: 'ureteres distais', label: 'Ureteres distais',
    normal: 'Ureteres distais de calibre normal, sem lesões extrínsecas identificáveis.',
    naoAvaliado: 'Ureteres distais não avaliados.',
    alteracoes: [{
      value: 'dilatado', label: 'Dilatação', subFields: [mini('lado', 'Lado', LADOS)],
      render: (sub) => {
        const lado = LADO_TXT[String(sub('lado') ?? '')]
        const plural = sub('lado') === 'bilateral'
        return {
          corpo: plural ? 'Dilatação dos ureteres distais bilateralmente.' : `Dilatação do ureter distal ${lado}.`,
          conclusao: plural ? 'Dilatação ureteral distal bilateral.' : `Dilatação ureteral distal à ${lado === 'direito' ? 'direita' : 'esquerda'}.`,
          faltando: lado ? [] : ['lado'],
        }
      },
    }],
  },
]

// ── Útero e ovários ──────────────────────────────────────────────────────────
const ORADS = [['nao_informado', 'Não informar'], ['2', 'O-RADS 2'], ['3', 'O-RADS 3'], ['4', 'O-RADS 4']] as const
function ovario(lado: 'direito' | 'esquerdo'): Estrutura {
  return {
    key: `ovario_${lado}`, nome: `ovário ${lado}`, label: `Ovário ${lado}`,
    normal: `Ovário ${lado} de forma e ecotextura habituais, sem imagens císticas de conteúdo espesso.`,
    naoAvaliado: `Ovário ${lado} não avaliado.`,
    neutra: { value: 'nao_visualizado', label: 'Não visualizado', corpo: `Ovário ${lado} não visualizado.` },
    alteracoes: [{
      value: 'endometrioma', label: 'Endometrioma', subFields: [
        texto('medidas', 'Medidas (cm)', '3,2 x 2,8 x 2,5'),
        { key: 'orads', label: 'O-RADS (definido pelo médico)', kind: 'mini-segmented', options: ORADS.map(([value, label], i) => ({ value, label, isDefault: i === 0 })) },
      ],
      render: (sub) => {
        const faltando: string[] = []
        const e = lerEixos(sub('medidas'), 3, 'cm')
        if (e === null) faltando.push('medidas nos três eixos')
        if (e === 'invalida') faltando.push('medidas válidas nos três eixos (cm)')
        const m = Array.isArray(e) ? formatarEixos(e, 'cm') : ''
        const volume = Array.isArray(e) ? ptBr1(e[0]! * e[1]! * e[2]! * 0.523) : ''
        const orads = String(sub('orads') ?? 'nao_informado')
        return {
          corpo: `Ovário ${lado} contendo imagem de baixa ecogenicidade com aspecto em vidro fosco, sem componente sólido ou septações, medindo ${m}, com volume estimado de ${volume} cm³.`,
          conclusao: `Imagem sugestiva de endometrioma no ovário ${lado}${orads === 'nao_informado' ? '' : ` (O-RADS ${orads})`}.`,
          faltando,
        }
      },
    }],
  }
}
const CENTRAL: Estrutura[] = [
  {
    key: 'utero', nome: 'útero', label: 'Útero / miométrio',
    normal: 'Útero com miométrio de ecotextura homogênea, sem sinais ultrassonográficos de adenomiose.',
    naoAvaliado: 'Útero não avaliado.',
    alteracoes: [{
      value: 'adenomiose', label: 'Sinais de adenomiose', subFields: [texto('desc', 'Sinais observados', 'ex.: assimetria das paredes e cistos miometriais')],
      render: (sub) => {
        const desc = textoLivre(sub('desc'))
        return { corpo: `Miométrio com sinais ultrassonográficos de adenomiose: ${desc}.`, conclusao: 'Sinais ultrassonográficos de adenomiose.', faltando: desc ? [] : ['sinais observados'] }
      },
    }],
  },
  ovario('direito'),
  ovario('esquerdo'),
]

// ── Compartimento posterior ──────────────────────────────────────────────────
const SEGMENTO: Record<string, string> = {
  reto_baixo: 'reto baixo', reto_medio: 'reto médio', reto_alto: 'reto alto', juncao: 'junção retossigmoide', sigmoide: 'sigmoide',
}
const CAMADA: Record<string, string> = { serosa: 'serosa', muscular: 'muscular própria', submucosa: 'submucosa' }
const POSTERIOR: Estrutura[] = [
  ...(['direito', 'esquerdo'] as const).map((lado): Estrutura => ({
    key: `uterossacro_${lado}`, nome: `ligamento uterossacro ${lado}`, label: `Ligamento uterossacro ${lado}`,
    normal: `Ligamento uterossacro ${lado} de espessura habitual, sem nódulos.`,
    naoAvaliado: `Ligamento uterossacro ${lado} não avaliado.`,
    alteracoes: [nodulo(`no ligamento uterossacro ${lado}`, `no ligamento uterossacro ${lado}`)],
  })),
  {
    key: 'torus', nome: 'tórus uterino', label: 'Tórus uterino',
    normal: 'Tórus uterino sem nódulos.',
    naoAvaliado: 'Tórus uterino não avaliado.',
    alteracoes: [nodulo('no tórus uterino', 'no tórus uterino')],
  },
  {
    key: 'septo_retovaginal', nome: 'septo retovaginal e fórnice vaginal posterior', label: 'Septo retovaginal / fórnice posterior',
    normal: 'Septo retovaginal e fórnice vaginal posterior sem nódulos.',
    naoAvaliado: 'Septo retovaginal e fórnice vaginal posterior não avaliados.',
    alteracoes: [nodulo('no septo retovaginal / fórnice vaginal posterior', 'no septo retovaginal / fórnice vaginal posterior')],
  },
  {
    key: 'retossigmoide', nome: 'retossigmoide', label: 'Retossigmoide',
    normal: 'Reto e sigmoide com camadas parietais preservadas, sem lesões infiltrativas.',
    naoAvaliado: 'Retossigmoide não avaliado.',
    alteracoes: [{
      value: 'lesao', label: 'Lesão infiltrativa', subFields: [
        mini('segmento', 'Segmento', [['reto_baixo', 'Reto baixo'], ['reto_medio', 'Reto médio'], ['reto_alto', 'Reto alto'], ['juncao', 'Junção RS'], ['sigmoide', 'Sigmoide']]),
        mini('camada', 'Camada mais profunda', [['serosa', 'Serosa'], ['muscular', 'Muscular própria'], ['submucosa', 'Submucosa']]),
        texto('medidas', 'Medidas (cm)', '2,5 x 0,8 x 1,2'),
        texto('borda_anal_cm', 'Distância da borda anal (cm)', '8', true),
        texto('circunferencia_pct', 'Circunferência envolvida (%)', '25', true),
        texto('estenose_pct', 'Redução estimada da luz (%)', '30', true),
      ],
      render: (sub) => {
        const faltando: string[] = []
        const seg = SEGMENTO[String(sub('segmento') ?? '')]
        const camada = CAMADA[String(sub('camada') ?? '')]
        if (!seg) faltando.push('segmento')
        if (!camada) faltando.push('camada mais profunda')
        const m = eixos3(sub('medidas'), faltando)
        const extras: string[] = []
        const borda = lerMedida(sub('borda_anal_cm'), 'cm')
        if (borda === 'invalida') faltando.push('distância da borda anal válida (cm)')
        else if (borda !== null) extras.push(`distando ${ptBr1(borda)} cm da borda anal`)
        for (const [key, frase] of [['circunferencia_pct', 'envolvendo cerca de X% da circunferência'], ['estenose_pct', 'com redução estimada de X% da luz']] as const) {
          const raw = String(sub(key) ?? '').trim().replace('%', '')
          if (!raw) continue
          const n = Number(raw.replace(',', '.'))
          if (!/^\d+([.,]\d+)?$/.test(raw) || n <= 0 || n > 100) faltando.push(`percentual válido (${key === 'circunferencia_pct' ? 'circunferência' : 'redução da luz'})`)
          else extras.push(frase.replace('X', raw.replace('.', ',')))
        }
        return {
          corpo: `Lesão hipoecoica infiltrativa na parede do ${seg}, acometendo até a camada ${camada}, medindo ${m}${extras.length ? `, ${extras.join(', ')}` : ''}.`,
          conclusao: `Lesão sugestiva de endometriose profunda intestinal no ${seg}, acometendo até a camada ${camada}.`,
          faltando,
        }
      },
    }],
  },
]

// ── Avaliação dinâmica ───────────────────────────────────────────────────────
const DINAMICA: Estrutura[] = [
  {
    key: 'deslizamento_anterior', nome: 'sinal de deslizamento anterior', label: 'Deslizamento útero–bexiga',
    normal: 'Sinal de deslizamento anterior (útero–bexiga) positivo.',
    naoAvaliado: 'Sinal de deslizamento anterior não avaliado.',
    alteracoes: [{ value: 'negativo', label: 'Negativo', render: () => ({ corpo: 'Sinal de deslizamento anterior (útero–bexiga) negativo.', conclusao: 'Sinal de deslizamento anterior negativo.', faltando: [] }) }],
  },
  {
    key: 'deslizamento_posterior', nome: 'sinal de deslizamento posterior', label: 'Deslizamento útero–reto',
    normal: 'Sinal de deslizamento posterior (útero–reto) positivo.',
    naoAvaliado: 'Sinal de deslizamento posterior não avaliado.',
    alteracoes: [{ value: 'negativo', label: 'Negativo', render: () => ({ corpo: 'Sinal de deslizamento posterior (útero–reto) negativo.', conclusao: 'Sinal de deslizamento posterior negativo, sugestivo de obliteração do fundo de saco posterior.', faltando: [] }) }],
  },
  {
    key: 'mobilidade_ovarios', nome: 'mobilidade ovariana', label: 'Mobilidade dos ovários',
    normal: 'Ovários móveis à compressão com o transdutor.',
    naoAvaliado: 'Mobilidade ovariana não avaliada.',
    alteracoes: [{
      value: 'reduzida', label: 'Reduzida', subFields: [mini('lado', 'Lado', LADOS)],
      render: (sub) => {
        const lado = String(sub('lado') ?? '')
        const txt = lado === 'bilateral' ? 'de ambos os ovários' : lado ? `do ovário ${lado}` : ''
        return { corpo: `Mobilidade reduzida ${txt} à compressão com o transdutor.`, conclusao: `Mobilidade reduzida ${txt}.`, faltando: lado ? [] : ['lado'] }
      },
    }],
  },
  {
    key: 'aderencias', nome: 'processo aderencial', label: 'Processo aderencial',
    normal: 'Ausência de sinais de processo aderencial pélvico.',
    naoAvaliado: 'Processo aderencial não avaliado.',
    alteracoes: [{
      value: 'presente', label: 'Presente', subFields: [texto('desc', 'Estruturas envolvidas', 'ex.: fundo uterino aderido ao sigmoide')],
      render: (sub) => {
        const desc = textoLivre(sub('desc'))
        return { corpo: `Sinais de processo aderencial: ${desc}.`, conclusao: `Sinais de processo aderencial pélvico (${desc}).`, faltando: desc ? [] : ['estruturas envolvidas'] }
      },
    }],
  },
]

// ── Rins (complementar) ──────────────────────────────────────────────────────
const RINS: Estrutura[] = [{
  key: 'rins', nome: 'rins', label: 'Rins (avaliação complementar)',
  normal: 'Rins sem dilatação pielocalicinal.',
  naoAvaliado: 'Rins não avaliados.',
  alteracoes: [{
    value: 'hidronefrose', label: 'Dilatação pielocalicinal', subFields: [mini('lado', 'Lado', LADOS)],
    render: (sub) => {
      const lado = String(sub('lado') ?? '')
      const txt = lado === 'bilateral' ? 'bilateral' : lado === 'direito' ? 'à direita' : lado === 'esquerdo' ? 'à esquerda' : ''
      return { corpo: `Dilatação pielocalicinal ${txt}.`, conclusao: `Dilatação pielocalicinal ${txt}.`, faltando: lado ? [] : ['lado'] }
    },
  }],
}]

// ── Motor genérico das estruturas ────────────────────────────────────────────
type Estado = { tipo: 'nao_avaliado' | 'normal' | 'neutra' | 'alterado'; alteracao?: Alteracao }

export function estadoEstrutura(e: Estrutura, st: OrganState | undefined, opts: OrganState | undefined): Estado {
  const raw = String(st?.[e.key] ?? 'model')
  if (raw === 'model') return { tipo: opts?.model === 'normal' ? 'normal' : 'nao_avaliado' }
  if (raw === 'nao_avaliado' || raw === 'normal') return { tipo: raw }
  if (e.neutra && raw === e.neutra.value) return { tipo: 'neutra' }
  const alteracao = e.alteracoes.find((a) => a.value === raw)
  return alteracao ? { tipo: 'alterado', alteracao } : { tipo: 'nao_avaliado' }
}

function campo(e: Estrutura): Field {
  const options: FieldOption[] = [
    { value: 'model', label: 'Conforme modelo', isDefault: true },
    { value: 'nao_avaliado', label: 'Não avaliado' },
    { value: 'normal', label: 'Sem alterações' },
    ...(e.neutra ? [{ value: e.neutra.value, label: e.neutra.label }] : []),
    ...e.alteracoes.map((a) => ({ value: a.value, label: a.label, subFields: a.subFields })),
  ]
  return { key: e.key, label: e.label, kind: 'segmented', presentation: 'select', options }
}

function modulo(id: string, nome: string, estruturas: Estrutura[]): OrganModule {
  const fields = estruturas.map(campo)
  return {
    schema: { id, name: nome, category: CATEGORIA, fields },
    initialState: (): OrganState => Object.fromEntries(estruturas.map((e) => [e.key, 'model'])),
    compose: (st, opts): OrganComposition => {
      const corpo: string[] = []
      const conclusion: string[] = []
      const pendencias: PendenciaLocal[] = []
      for (const e of estruturas) {
        const estado = estadoEstrutura(e, st, opts)
        if (estado.tipo === 'nao_avaliado') { corpo.push(e.naoAvaliado); continue }
        if (estado.tipo === 'normal') { corpo.push(e.normal); continue }
        if (estado.tipo === 'neutra') { corpo.push(e.neutra!.corpo); continue }
        const a = estado.alteracao!
        const r = a.render((key) => st[`${e.key}.${a.value}.${key}`])
        if (r.faltando.length) pendencias.push({ onde: e.label, motivo: `informe ${r.faltando.join(', ')}` })
        corpo.push(r.corpo)
        if (r.conclusao) conclusion.push(r.conclusao)
      }
      return { body: corpo.join('\n'), conclusion, pendencias, isNormal: conclusion.length === 0 }
    },
  }
}

const GRUPOS: Array<[string, string, Estrutura[]]> = [
  ['anterior', 'Compartimento anterior', ANTERIOR],
  ['central', 'Útero e ovários', CENTRAL],
  ['posterior', 'Compartimento posterior', POSTERIOR],
  ['dinamica', 'Avaliação dinâmica', DINAMICA],
  ['rins', 'Rins (complementar)', RINS],
]
const SECOES: ExamSection[] = GRUPOS.map(([id, label, estruturas]) => ({ id, label, group: 'orgaos', module: modulo(id, label, estruturas) }))

function estados(state: Record<string, OrganState>) {
  const opts = state.__opts ?? {}
  return GRUPOS.flatMap(([id, , estruturas]) => estruturas.map((e) => ({ id, e, estado: estadoEstrutura(e, state[id], opts) })))
}
const tipoDe = (state: Record<string, OrganState>, key: string) => estados(state).find((x) => x.e.key === key)?.estado

const CONCLUSAO_NORMAL = 'Ausência de sinais ultrassonográficos de endometriose profunda ou de endometrioma nas estruturas avaliadas.'

export const pesquisaEndometriose: ExamCategory = {
  id: CATEGORIA,
  name: 'Pesquisa de endometriose',
  title: 'ULTRASSONOGRAFIA TRANSVAGINAL PARA PESQUISA DE ENDOMETRIOSE',
  tecnica: 'Exame realizado por via transvaginal, com avaliação sistematizada dos compartimentos pélvicos anterior, central e posterior e avaliação dinâmica (sinal de deslizamento e mobilidade dos ovários).',
  resolveTecnica: (opts) => {
    const base = 'Exame realizado por via transvaginal, com avaliação sistematizada dos compartimentos pélvicos anterior, central e posterior e avaliação dinâmica (sinal de deslizamento e mobilidade dos ovários).'
    if (opts.preparo === 'realizado') return `${base} Paciente com preparo intestinal prévio.`
    if (opts.preparo === 'nao_realizado') return `${base} Exame realizado sem preparo intestinal, o que pode limitar a avaliação do retossigmoide.`
    return base
  },
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  controls: [
    { key: 'model', label: 'Modelo de partida', kind: 'segmented', options: [
      { value: 'blank', label: 'Em branco', isDefault: true },
      { value: 'normal', label: 'Normal — todas as estruturas avaliadas sem alterações' },
    ] },
    { key: 'preparo', label: 'Preparo intestinal', kind: 'segmented', options: [
      { value: 'nao_informado', label: 'Não informar', isDefault: true },
      { value: 'realizado', label: 'Realizado' },
      { value: 'nao_realizado', label: 'Não realizado' },
    ] },
  ],
  sections: SECOES,
  conclusionNormal: CONCLUSAO_NORMAL,
  conclusionClosing: 'Demais estruturas avaliadas sem sinais ultrassonográficos de endometriose.',
  /** Não avaliados entram na conclusão; sem alteração, a normalidade fica restrita ao avaliado. */
  resolveConclusionItems: (items, state) => {
    const naoAvaliados = estados(state).filter((x) => x.estado.tipo === 'nao_avaliado').map((x) => x.e.nome)
    if (!naoAvaliados.length) return items
    const escopo = `Não avaliados neste exame: ${naoAvaliados.join(', ')}.`
    return items.length ? [...items, escopo] : [CONCLUSAO_NORMAL, escopo]
  },
  /** Coerência entre compartimentos e avaliação dinâmica. */
  resolvePendencias: (state) => {
    const pend: PendenciaLocal[] = []
    const lista = estados(state)
    if (!lista.some((x) => x.estado.tipo !== 'nao_avaliado')) {
      pend.push({ onde: 'Exame', motivo: 'registre ao menos uma estrutura avaliada ou escolha o modelo normal' })
    }
    const aderenciasAusentes = tipoDe(state, 'aderencias')?.tipo === 'normal'
    const negativo = (key: string) => tipoDe(state, key)?.tipo === 'alterado'
    if (aderenciasAusentes && (negativo('deslizamento_anterior') || negativo('deslizamento_posterior'))) {
      pend.push({ onde: 'Avaliação dinâmica', motivo: 'sinal de deslizamento negativo é incompatível com "sem processo aderencial"' })
    }
    if (aderenciasAusentes && negativo('mobilidade_ovarios')) {
      pend.push({ onde: 'Avaliação dinâmica', motivo: 'mobilidade ovariana reduzida é incompatível com "sem processo aderencial"' })
    }
    if (tipoDe(state, 'vesicouterino')?.alteracao?.value === 'obliterado' && tipoDe(state, 'deslizamento_anterior')?.tipo === 'normal') {
      pend.push({ onde: 'Compartimento anterior', motivo: 'espaço vesicouterino obliterado é incompatível com deslizamento anterior positivo' })
    }
    return pend
  },
}
