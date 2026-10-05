/**
 * Categoria GLÂNDULAS SALIVARES — geração determinística local (MVP Web).
 *
 * Fonte clínica: `packages/knowledge/snippets/GLANDULAS_SALIVARES/` (modelo,
 * medidas, exame normal, cálculo, sialoadenite, nódulo e abscesso).
 *
 * Regras que este módulo garante:
 *  - uma seção por glândula (parótidas e submandibulares, D/E), com o lado no
 *    texto e as medidas em mm como digitadas;
 *  - dimensões só aparecem quando medidas; nenhum limiar de referência vira
 *    "aumentada" ou "dilatado" sozinho (são referências, não gates);
 *  - nódulo: nunca nomeia tipo histológico; caracterização (predominantemente
 *    benigno × suspeito) só com as três medidas; sem elas, pendência;
 *  - cálculo e coleção exigem medida; cálculo sem sombra acústica sai como
 *    "imagem hiperecogênica sugestiva de cálculo";
 *  - recomendações só as sustentadas pela base, sem conduta específica.
 *
 * Ainda não migrada para o renderer canônico: compõe localmente.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, OrganComposition, OrganModule, OrganState } from '../types'
import { formatarEixos, lerEixos, lerMedida, ptBr1 } from './medidasLocais'

const CATEGORIA = 'GLANDULAS_SALIVARES'
const str = (v: unknown) => (typeof v === 'string' ? v : '')
const marcados = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

type Glandula = 'parotida' | 'submandibular'
type Lado = 'direita' | 'esquerda'

const NOME: Record<Glandula, string> = { parotida: 'parótida', submandibular: 'submandibular' }
const DUCTO: Record<Glandula, string> = { parotida: 'Stensen', submandibular: 'Wharton' }

const PARENQUIMA = ['normal', 'aguda', 'cronica']
const ACHADOS = ['calculo', 'nodulo', 'colecao']

const nomeGlandula = (g: Glandula, l: Lado) => `glândula ${NOME[g]} ${l}`

function fields(glandula: Glandula): Field[] {
  const noduloSub: Field[] = [
    { key: 'medidas', label: 'Medidas (mm)', kind: 'text', placeholder: '18 x 12 x 10' },
    ...(glandula === 'parotida'
      ? [{ key: 'lobo', label: 'Lobo', kind: 'mini-segmented' as const, options: [
          { value: 'superficial', label: 'Superficial', isDefault: true },
          { value: 'profundo', label: 'Profundo' },
        ] }]
      : []),
    { key: 'contornos', label: 'Contornos', kind: 'mini-segmented', options: [
      { value: 'regulares', label: 'Regulares', isDefault: true },
      { value: 'irregulares', label: 'Irregulares/mal definidos' },
    ] },
    { key: 'ecotextura', label: 'Ecotextura', kind: 'mini-segmented', options: [
      { value: 'homogenea', label: 'Hipoecoica homogênea', isDefault: true },
      { value: 'cistica', label: 'Heterogênea com áreas císticas' },
    ] },
    { key: 'vasc', label: 'Doppler', kind: 'mini-segmented', options: [
      { value: 'periferica', label: 'Periférica', isDefault: true },
      { value: 'interna', label: 'Interna' },
      { value: 'aumentada', label: 'Aumentada/caótica' },
    ] },
  ]
  return [
    { key: 'medidas', label: 'Dimensões AP x longitudinal (mm)', kind: 'text', placeholder: glandula === 'parotida' ? '32 x 58' : '20 x 38', hint: 'opcional' },
    { key: 'parenquima', label: 'Parênquima', kind: 'segmented', presentation: 'select', options: [
      { value: 'normal', label: 'Preservado', isDefault: true },
      { value: 'aguda', label: 'Aumentado, hipoecoico e hipervascularizado' },
      { value: 'cronica', label: 'Heterogêneo com áreas hipoecoicas difusas' },
    ] },
    { key: 'ducto', label: `Ducto de ${DUCTO[glandula]}`, kind: 'segmented', options: [
      { value: 'nao_visivel', label: 'Não visível', isDefault: true },
      { value: 'visivel', label: 'Visível', subFields: [
        { key: 'calibre', label: 'Calibre (mm)', kind: 'text', placeholder: '2,5', halfWidth: true },
      ] },
    ] },
    { key: 'achados', label: 'Achados', kind: 'checklist', hint: 'marque somente o observado', options: [
      { value: 'calculo', label: 'Cálculo', subFields: [
        { key: 'tamanho', label: 'Tamanho (mm)', kind: 'text', placeholder: '5', halfWidth: true },
        { key: 'local', label: 'Local', kind: 'mini-segmented', options: [
          { value: 'ducto', label: 'Ducto', isDefault: true },
          { value: 'parenquima', label: 'Parênquima' },
        ] },
        { key: 'sombra', label: 'Sombra acústica', kind: 'mini-segmented', options: [
          { value: 'sim', label: 'Presente', isDefault: true },
          { value: 'nao', label: 'Ausente' },
        ] },
      ] },
      { value: 'nodulo', label: 'Nódulo', subFields: noduloSub },
      { value: 'colecao', label: 'Coleção com debris', subFields: [
        { key: 'medidas', label: 'Medidas (mm)', kind: 'text', placeholder: '25 x 18 x 15' },
      ] },
    ] },
  ]
}

function initialState(glandula: Glandula): OrganState {
  return {
    medidas: '', parenquima: 'normal', ducto: 'nao_visivel', 'ducto.visivel.calibre': '', achados: [],
    'achados.calculo.tamanho': '', 'achados.calculo.local': 'ducto', 'achados.calculo.sombra': 'sim',
    'achados.nodulo.medidas': '', ...(glandula === 'parotida' ? { 'achados.nodulo.lobo': 'superficial' } : {}),
    'achados.nodulo.contornos': 'regulares', 'achados.nodulo.ecotextura': 'homogenea', 'achados.nodulo.vasc': 'periferica',
    'achados.colecao.medidas': '',
  }
}

export function glandulaIssues(glandula: Glandula, lado: Lado, state: OrganState): string[] {
  const rotulo = `${NOME[glandula].charAt(0).toUpperCase()}${NOME[glandula].slice(1)} ${lado}`
  const issues: string[] = []
  if (lerEixos(state.medidas, 2, 'mm') === 'invalida') issues.push(`${rotulo}: dimensões com formato inválido (ex.: 32 x 58).`)
  if (!PARENQUIMA.includes(str(state.parenquima) || 'normal')) issues.push(`${rotulo}: parênquima com opção inválida.`)
  if (str(state.ducto) === 'visivel' && lerMedida(state['ducto.visivel.calibre'], 'mm') === 'invalida') {
    issues.push(`${rotulo}: calibre do ducto com formato inválido.`)
  }
  const achados = state.achados
  if (achados !== undefined && (!Array.isArray(achados) || achados.some((a) => !ACHADOS.includes(a)))) {
    issues.push(`${rotulo}: achado com opção inválida.`)
  }
  const lista = marcados(achados)
  if (lista.includes('calculo')) {
    const t = lerMedida(state['achados.calculo.tamanho'], 'mm')
    if (t === null) issues.push(`${rotulo}: informe o tamanho do cálculo.`)
    if (t === 'invalida') issues.push(`${rotulo}: tamanho do cálculo com formato inválido.`)
  }
  for (const [achado, nome] of [['nodulo', 'do nódulo'], ['colecao', 'da coleção']] as const) {
    if (!lista.includes(achado)) continue
    const m = lerEixos(state[`achados.${achado}.medidas`], 3, 'mm')
    if (m === null) issues.push(`${rotulo}: informe as três medidas ${nome}.`)
    if (m === 'invalida') issues.push(`${rotulo}: medidas ${nome} com formato inválido (ex.: 18 x 12 x 10).`)
  }
  return issues
}

function compose(glandula: Glandula, lado: Lado, state: OrganState): OrganComposition {
  const nome = nomeGlandula(glandula, lado)
  const Nome = `Glândula ${NOME[glandula]} ${lado}`
  const ducto = DUCTO[glandula]
  const medidas = lerEixos(state.medidas, 2, 'mm')
  const parenquima = str(state.parenquima) || 'normal'
  const calibre = str(state.ducto) === 'visivel' ? lerMedida(state['ducto.visivel.calibre'], 'mm') : null
  const achados = marcados(state.achados)

  const normal = parenquima === 'normal' && str(state.ducto) !== 'visivel' && achados.length === 0
  const body: string[] = []
  const conclusion: string[] = []

  // Frase-base da glândula: dimensões só quando medidas.
  const dimensoes = Array.isArray(medidas) ? ` com dimensões de ${formatarEixos(medidas, 'mm')} (eixos anteroposterior x longitudinal)` : ''
  if (parenquima === 'aguda') {
    body.push(`${Nome}${dimensoes}, aumentada, com ecotextura difusamente hipoecoica e hipervascularização ao Doppler colorido.`)
    conclusion.push(`Sinais ecográficos de sialoadenite aguda em ${nome}, caracterizada por aumento volumétrico, ecotextura difusamente hipoecoica e hipervascularização ao Doppler. Convém, a critério clínico, complementar com avaliação clínica dirigida para definição da etiologia.`)
  } else if (parenquima === 'cronica') {
    body.push(`${Nome}${dimensoes}, com ecotextura heterogênea, apresentando múltiplas áreas hipoecoicas difusamente distribuídas.`)
    conclusion.push(`${Nome} com ecotextura heterogênea e múltiplas áreas hipoecoicas difusas. Achados ecográficos compatíveis com sialoadenite crônica. Convém, a critério clínico, complementar com correlação clínica para definição etiológica.`)
  } else if (normal) {
    body.push(`${Nome}${dimensoes}${dimensoes ? ', de' : ' de'} ${dimensoes ? 'ecotextura homogênea' : 'dimensões e ecotextura preservadas'}, sem nódulos, cálculos ou dilatação ductal.`)
  } else {
    body.push(`${Nome}${dimensoes}${dimensoes ? ', de' : ' de'} ${dimensoes ? 'ecotextura homogênea' : 'dimensões e ecotextura preservadas'}.`)
  }

  if (typeof calibre === 'number') {
    body.push(`Ducto de ${ducto} visível, com calibre de ${ptBr1(calibre)} mm.`)
  } else if (str(state.ducto) === 'visivel') {
    body.push(`Ducto de ${ducto} visível, com calibre de ____ mm.`)
  }

  if (achados.includes('calculo')) {
    const tamanho = lerMedida(state['achados.calculo.tamanho'], 'mm')
    const t = typeof tamanho === 'number' ? `${ptBr1(tamanho)} mm` : '____ mm'
    const sede = str(state['achados.calculo.local']) === 'parenquima' ? `no parênquima da ${nome}` : `no ducto de ${ducto} da ${nome}`
    const dilatacao = typeof calibre === 'number' ? `, com ducto a montante de calibre máximo de ${ptBr1(calibre)} mm` : ''
    if (str(state['achados.calculo.sombra']) === 'nao') {
      body.push(`Imagem hiperecogênica ${sede}, medindo ${t}, sem sombra acústica posterior definida.`)
      conclusion.push(typeof tamanho === 'number'
        ? `Imagem hiperecogênica ${sede}, medindo ${t}, sem sombra acústica posterior definida, sugestiva de cálculo de pequenas dimensões. Convém, a critério clínico, complementar com sialotomografia ou sialorressonância para confirmação e melhor caracterização.`
        : `Imagem hiperecogênica ${sede}, medida pendente.`)
    } else {
      body.push(`Cálculo ${sede}, medindo ${t}, com sombra acústica posterior${dilatacao}.`)
      conclusion.push(typeof tamanho === 'number'
        ? `Cálculo ${sede}, medindo ${t}${dilatacao}.${parenquima === 'aguda' ? ` Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço ou cirurgião buco-maxilo-facial para definição da conduta sobre o cálculo e o processo obstrutivo associado.` : ''}`
        : `Cálculo ${sede}, medida pendente.`)
    }
  } else if (typeof calibre === 'number') {
    conclusion.push(`Ducto de ${ducto} da ${nome} visível, com calibre de ${ptBr1(calibre)} mm. Convém, a critério clínico, correlação clínica.`)
  }

  if (achados.includes('nodulo')) {
    const m = lerEixos(state['achados.nodulo.medidas'], 3, 'mm')
    const lobo = glandula === 'parotida' ? `no lobo ${str(state['achados.nodulo.lobo']) === 'profundo' ? 'profundo' : 'superficial'} da` : 'na'
    const irregular = str(state['achados.nodulo.contornos']) === 'irregulares'
    const cistica = str(state['achados.nodulo.ecotextura']) === 'cistica'
    const vasc = str(state['achados.nodulo.vasc'])
    const textoMedidas = Array.isArray(m) ? formatarEixos(m, 'mm') : '____ x ____ x ____ mm'
    const contornos = irregular ? 'contornos irregulares e/ou mal definidos' : 'contornos regulares e bem definidos'
    const ecotextura = cistica ? 'ecotextura heterogênea com áreas císticas internas' : 'ecotextura hipoecoica homogênea'
    const doppler = vasc === 'aumentada' ? 'vascularização aumentada ao Doppler' : vasc === 'interna' ? 'vascularização interna ao Doppler' : 'vascularização periférica ao Doppler'
    body.push(`Nódulo ${lobo} ${nome}, medindo ${textoMedidas}, com ${contornos}, ${ecotextura} e ${doppler}.`)
    if (!Array.isArray(m)) {
      conclusion.push(`Nódulo ${lobo} ${nome}, medidas pendentes.`)
    } else if (irregular || vasc === 'aumentada') {
      conclusion.push(`Nódulo ${lobo} ${nome}, medindo ${textoMedidas}, com características ecográficas suspeitas de atipia, sem permitir definição diagnóstica por imagem isoladamente. Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica, dado o padrão ecográfico suspeito. O diagnóstico histológico definitivo requer avaliação por especialista e, quando indicado, citologia/biópsia.`)
    } else {
      conclusion.push(`Nódulo ${lobo} ${nome}, medindo ${textoMedidas}, com características ecográficas predominantemente benignas. Convém, a critério clínico, prosseguir a avaliação com especialista em cabeça/pescoço para definição diagnóstica e etiológica. O diagnóstico histológico definitivo requer avaliação por especialista e, quando indicado, citologia/biópsia.`)
    }
  }

  if (achados.includes('colecao')) {
    const m = lerEixos(state['achados.colecao.medidas'], 3, 'mm')
    const textoMedidas = Array.isArray(m) ? formatarEixos(m, 'mm') : '____ x ____ x ____ mm'
    body.push(`Coleção líquida com debris na ${nome}, medindo ${textoMedidas}.`)
    conclusion.push(Array.isArray(m)
      ? `Coleção líquida com debris na ${nome}, medindo ${textoMedidas}${parenquima === 'aguda' ? ', em glândula com sinais de sialoadenite aguda' : ''}. Achados ecográficos compatíveis com abscesso glandular. Convém, com caráter de urgência, avaliação clínica dirigida para definição de conduta.`
      : `Coleção líquida na ${nome}, medidas pendentes.`)
  }

  return { body: body.join('\n'), conclusion, isNormal: normal }
}

function glandulaModule(glandula: Glandula, lado: Lado): OrganModule {
  return {
    schema: { id: `${glandula}_${lado}`, name: `${NOME[glandula].charAt(0).toUpperCase()}${NOME[glandula].slice(1)} ${lado}`, category: CATEGORIA, fields: fields(glandula) },
    initialState: () => initialState(glandula),
    compose: (state) => compose(glandula, lado, state),
  }
}

const GLANDULAS: [Glandula, Lado][] = [
  ['parotida', 'direita'], ['parotida', 'esquerda'], ['submandibular', 'direita'], ['submandibular', 'esquerda'],
]

export function glandulasSalivaresIssuesDoExame(state: Record<string, OrganState>): string[] {
  return GLANDULAS.flatMap(([g, l]) => glandulaIssues(g, l, state[`${g}_${l}`] ?? {}))
}

const sections: ExamSection[] = GLANDULAS.map(([g, l]) => ({
  id: `${g}_${l}`,
  label: `${NOME[g].charAt(0).toUpperCase()}${NOME[g].slice(1)} ${l}`,
  group: 'orgaos',
  module: glandulaModule(g, l),
}))


export const glandulasSalivares: ExamCategory = {
  id: CATEGORIA,
  name: 'Glândulas salivares',
  title: 'ULTRASSONOGRAFIA DAS GLÂNDULAS SALIVARES',
  tecnica:
    'Exame realizado com transdutor linear de alta frequência em modos B e Doppler colorido. Avaliadas as glândulas parótidas e submandibulares bilateralmente, com análise de tamanho, ecotextura parenquimatosa, ductos principais (Stensen para parótida; Wharton para submandibular), presença de cálculos, nódulos ou áreas de alteração focal, e padrão vascular.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections,
  conclusionNormal: 'Glândulas parótidas e submandibulares com dimensões e ecotextura preservadas bilateralmente, sem evidência de nódulos, cálculos ou dilatação ductal.',
  conclusionClosing: 'Demais glândulas salivares maiores avaliadas sem alterações ecográficas.',
}
