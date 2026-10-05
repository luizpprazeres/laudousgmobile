/**
 * Categoria ECOCARDIOGRAFIA_FETAL — formulário estruturado Web (composição local, MVP).
 *
 * Cobertura mapeada em docs/competitor-research/laudario/crosswalk-ecocardiografia-fetal-2026-10-03.md;
 * a redação é própria. Gestação única.
 *
 * Regras:
 * - cada bloco anatômico tem estado explícito (não avaliado / parcial / normal /
 *   alterado); o formulário em branco não afirma normalidade — só o modelo normal;
 * - alteração substitui a normalidade do próprio bloco e exige os dados mínimos e
 *   confirmação médica; qualificadores não informados (origem, condução, padrão
 *   da arritmia) nunca são preenchidos por padrão;
 * - limitação técnica exige identificar os blocos com avaliação parcial ou não
 *   realizada, e a conclusão fica restrita ao que foi avaliado;
 * - medidas são descritas, nunca classificadas por escore;
 * - recomendação é opt-in e confirmada.
 */

import type { ExamCategory, ExamSection } from './abdomeTotal'
import type { Field, FieldOption, OrganComposition, OrganModule, OrganState, PendenciaLocal } from '../types'
import { texto, valorNumerico } from './superficialShared'

const CATEGORIA = 'ECOCARDIOGRAFIA_FETAL'
type Exame = Record<string, OrganState>

const select = (key: string, label: string, options: ReadonlyArray<readonly [string, string]>, initial = options[0]?.[0] ?? ''): Field => ({
  key, label, kind: 'segmented', presentation: 'select',
  options: options.map(([value, name]) => ({ value, label: name, isDefault: value === initial })),
})
const campo = (key: string, label: string, placeholder: string, halfWidth = false): Field => ({ key, label, kind: 'text', placeholder, ...(halfWidth ? { halfWidth } : {}) })
const CONFIRMA = [['nao', 'Pendente de confirmação'], ['sim', 'Confirmado pelo médico']] as const
const frase = (s: string) => s.trim().replace(/[.;,:\s]+$/u, '')
const minusc = (s: string) => s.charAt(0).toLocaleLowerCase('pt-BR') + s.slice(1)
const num = (raw: unknown) => {
  const t = String(raw ?? '').trim().replace(/\s*(mm|bpm)$/i, '')
  return t && valorNumerico(t) !== null ? t.replace('.', ',') : null
}

/** Estado de partida: 'modelo' herda do controle "Modelo de partida". */
const ehNormal = (opts: OrganState) => texto(opts, 'modelo') === 'normal'
const estadoDe = (st: OrganState, opts: OrganState, key = 'estado') => {
  const raw = texto(st, key) || 'modelo'
  return raw === 'modelo' ? (ehNormal(opts) ? 'normal' : 'nao_informado') : raw
}

// ── Blocos anatômicos ─────────────────────────────────────────────────────────
type Achado = {
  value: string
  label: string
  fields: Field[]
  /** Dados mínimos ausentes (vazio = suficiente). */
  faltando: (st: OrganState, p: string) => string[]
  corpo: (st: OrganState, p: string) => string
  conclusao: (st: OrganState, p: string) => string
}
type Bloco = { id: string; nome: string; normal: (st: OrganState) => string; extras?: Field[]; achados: Achado[] }

const outra = (rotulo: string): Achado => ({
  value: 'outra', label: 'Outra alteração (descrever)',
  fields: [campo('descricao', 'Descrição (se outra alteração)', 'Descreva o que foi observado')],
  faltando: (st, p) => (texto(st, `${p}descricao`).trim().length >= 5 ? [] : ['descrição do achado']),
  corpo: (st, p) => `${rotulo}: ${minusc(frase(texto(st, `${p}descricao`)))}.`,
  conclusao: (st, p) => `${frase(texto(st, `${p}descricao`)).replace(/^./u, c => c.toLocaleUpperCase('pt-BR'))}.`,
})

const BLOCOS: Bloco[] = [
  {
    id: 'situs', nome: 'situs e posição cardíaca',
    normal: () => 'Situs solitus, com coração em levoposição e ápice voltado para a esquerda.',
    achados: [
      { value: 'dextrocardia', label: 'Coração à direita (dextrocardia)', fields: [], faltando: () => [],
        corpo: () => 'Coração situado no hemitórax direito, com ápice voltado para a direita.', conclusao: () => 'Dextrocardia.' },
      { value: 'mesocardia', label: 'Coração na linha média (mesocardia)', fields: [], faltando: () => [],
        corpo: () => 'Coração situado na linha média, com ápice voltado anteriormente.', conclusao: () => 'Mesocardia.' },
      { value: 'situs_inversus', label: 'Situs inversus', fields: [], faltando: () => [],
        corpo: () => 'Disposição invertida das vísceras abdominais e do coração.', conclusao: () => 'Situs inversus.' },
      outra('Situs e posição cardíaca'),
    ],
  },
  {
    id: 'ritmo', nome: 'ritmo cardíaco',
    extras: [campo('fc_bpm', 'Frequência cardíaca fetal (bpm)', '145', true)],
    normal: st => `Ritmo cardíaco regular${num(st.fc_bpm) ? `, com frequência cardíaca fetal de ${num(st.fc_bpm)} bpm` : ''}.`,
    achados: [
      { value: 'extrassistoles', label: 'Extrassístoles', fields: [
        select('origem', 'Origem das extrassístoles', [['nao_definida', 'Não definida'], ['atrial', 'Atrial'], ['ventricular', 'Ventricular']]),
        select('conducao', 'Condução das extrassístoles', [['nao_avaliada', 'Não avaliada'], ['conduzidas', 'Conduzidas aos ventrículos'], ['bloqueadas', 'Bloqueadas']]),
        select('padrao', 'Padrão das extrassístoles', [['nao_definido', 'Não definido'], ['isoladas', 'Isoladas'], ['bigeminismo', 'Bigeminismo']]),
      ], faltando: st => (num(st.fc_bpm) ? [] : ['frequência cardíaca fetal']),
        corpo: (st, p) => {
          const origem = texto(st, `${p}origem`)
          const quals = [
            texto(st, `${p}padrao`) === 'isoladas' ? 'isoladas' : texto(st, `${p}padrao`) === 'bigeminismo' ? 'em bigeminismo' : '',
            origem === 'atrial' ? 'de origem atrial' : origem === 'ventricular' ? 'de origem ventricular' : '',
            texto(st, `${p}conducao`) === 'conduzidas' ? 'conduzidas aos ventrículos' : texto(st, `${p}conducao`) === 'bloqueadas' ? 'não conduzidas aos ventrículos' : '',
          ].filter(Boolean)
          return `Ritmo cardíaco irregular, com extrassístoles${quals.length ? ` ${quals.join(', ')}` : ''}, e frequência cardíaca fetal de ${num(st.fc_bpm)} bpm.`
        },
        conclusao: (st, p) => {
          const origem = texto(st, `${p}origem`)
          return `Extrassístoles${origem === 'atrial' ? ' atriais' : origem === 'ventricular' ? ' ventriculares' : ''}, com frequência cardíaca fetal de ${num(st.fc_bpm)} bpm.`
        } },
      { value: 'taquicardia', label: 'Frequência elevada (taquicardia)', fields: [], faltando: st => (num(st.fc_bpm) ? [] : ['frequência cardíaca fetal']),
        corpo: st => `Frequência cardíaca fetal elevada, de ${num(st.fc_bpm)} bpm.`, conclusao: st => `Taquicardia fetal (${num(st.fc_bpm)} bpm).` },
      { value: 'bradicardia', label: 'Frequência reduzida (bradicardia)', fields: [], faltando: st => (num(st.fc_bpm) ? [] : ['frequência cardíaca fetal']),
        corpo: st => `Frequência cardíaca fetal reduzida, de ${num(st.fc_bpm)} bpm.`, conclusao: st => `Bradicardia fetal (${num(st.fc_bpm)} bpm).` },
      outra('Ritmo cardíaco'),
    ],
  },
  {
    id: 'veias', nome: 'conexões venosas',
    normal: () => 'Veias cavas conectadas ao átrio direito e veias pulmonares conectadas ao átrio esquerdo.',
    achados: [outra('Conexões venosas')],
  },
  {
    id: 'quatro_camaras', nome: 'corte de quatro câmaras e septos',
    normal: () => 'Corte de quatro câmaras com átrios e ventrículos de dimensões proporcionais, septo interventricular íntegro, forame oval com fluxo da direita para a esquerda e valvas atrioventriculares com implantação escalonada preservada.',
    achados: [
      { value: 'civ', label: 'Comunicação interventricular', fields: [
        select('tipo', 'Localização da CIV', [['nao_informada', 'Não informada'], ['muscular', 'Muscular'], ['perimembranosa', 'Perimembranosa']]),
        campo('medida_mm', 'Medida da CIV (mm)', '2,5', true),
      ], faltando: (st, p) => [texto(st, `${p}tipo`) === 'nao_informada' || !texto(st, `${p}tipo`) ? 'localização' : '', num(st[`${p}medida_mm`]) ? '' : 'medida'].filter(Boolean),
        corpo: (st, p) => `Septo interventricular com descontinuidade ${texto(st, `${p}tipo`) === 'muscular' ? 'na porção muscular' : 'na porção perimembranosa'}, medindo ${num(st[`${p}medida_mm`])} mm. Átrios e ventrículos de dimensões proporcionais.`,
        conclusao: (st, p) => `Comunicação interventricular ${texto(st, `${p}tipo`)}, medindo ${num(st[`${p}medida_mm`])} mm.` },
      { value: 'dsavt', label: 'Defeito do septo atrioventricular', fields: [], faltando: () => [],
        corpo: () => 'Ausência da implantação escalonada das valvas atrioventriculares, com defeito na região central do coração (crux cordis).',
        conclusao: () => 'Defeito do septo atrioventricular.' },
      { value: 'desproporcao', label: 'Desproporção ventricular', fields: [
        select('menor', 'Ventrículo menor (desproporção)', [['nao_informado', 'Não informado'], ['direito', 'Direito'], ['esquerdo', 'Esquerdo']]),
      ], faltando: (st, p) => (['direito', 'esquerdo'].includes(texto(st, `${p}menor`)) ? [] : ['ventrículo de menor dimensão']),
        corpo: (st, p) => `Desproporção entre as câmaras ventriculares, com ventrículo ${texto(st, `${p}menor`)} de dimensões reduzidas.`,
        conclusao: (st, p) => `Desproporção ventricular, com ventrículo ${texto(st, `${p}menor`)} de menores dimensões.` },
      outra('Corte de quatro câmaras'),
    ],
  },
  {
    id: 'vias_saida', nome: 'vias de saída',
    normal: () => 'Aorta emergindo do ventrículo esquerdo e artéria pulmonar do ventrículo direito, com cruzamento habitual das vias de saída e valvas semilunares de aspecto habitual.',
    achados: [
      { value: 'paralelas', label: 'Vias de saída paralelas', fields: [], faltando: () => [],
        corpo: () => 'Vias de saída de trajeto paralelo, sem o cruzamento habitual, com a aorta emergindo do ventrículo direito e a artéria pulmonar do ventrículo esquerdo.',
        conclusao: () => 'Transposição das grandes artérias.' },
      { value: 'cavalgamento', label: 'Cavalgamento aórtico', fields: [], faltando: () => [],
        corpo: () => 'Aorta cavalgando o septo interventricular, associada a descontinuidade septal subaórtica.',
        conclusao: () => 'Cavalgamento aórtico sobre defeito septal subaórtico.' },
      outra('Vias de saída'),
    ],
  },
  {
    id: 'tres_vasos', nome: 'corte de três vasos e traqueia e arcos',
    normal: () => 'Corte de três vasos e traqueia com disposição e calibres habituais; arcos aórtico e ductal à esquerda da traqueia, sem alterações.',
    achados: [
      { value: 'arco_direito', label: 'Arco aórtico à direita', fields: [], faltando: () => [],
        corpo: () => 'Arco aórtico situado à direita da traqueia.', conclusao: () => 'Arco aórtico à direita.' },
      { value: 'calibres', label: 'Desproporção entre aorta e pulmonar', fields: [
        select('menor', 'Vaso de menor calibre (desproporção)', [['nao_informado', 'Não informado'], ['aorta', 'Aorta'], ['pulmonar', 'Artéria pulmonar']]),
      ], faltando: (st, p) => (['aorta', 'pulmonar'].includes(texto(st, `${p}menor`)) ? [] : ['vaso de menor calibre']),
        corpo: (st, p) => `Desproporção de calibres no corte de três vasos e traqueia, com ${texto(st, `${p}menor`) === 'aorta' ? 'aorta' : 'artéria pulmonar'} de calibre reduzido.`,
        conclusao: (st, p) => `Desproporção entre os grandes vasos, com ${texto(st, `${p}menor`) === 'aorta' ? 'aorta' : 'artéria pulmonar'} de menor calibre.` },
      outra('Corte de três vasos e traqueia'),
    ],
  },
  {
    id: 'funcao', nome: 'função e pericárdio',
    normal: () => 'Contratilidade biventricular preservada à avaliação subjetiva, sem derrame pericárdico.',
    achados: [
      { value: 'derrame', label: 'Derrame pericárdico', fields: [campo('medida_mm', 'Espessura do derrame (mm)', '2,5', true)],
        faltando: (st, p) => (num(st[`${p}medida_mm`]) ? [] : ['espessura do derrame']),
        corpo: (st, p) => `Contratilidade biventricular preservada à avaliação subjetiva. Lâmina de derrame pericárdico medindo ${num(st[`${p}medida_mm`])} mm.`,
        conclusao: (st, p) => `Derrame pericárdico de ${num(st[`${p}medida_mm`])} mm.` },
      { value: 'disfuncao', label: 'Contratilidade reduzida', fields: [
        select('ventriculo', 'Ventrículo com contratilidade reduzida', [['nao_informado', 'Não informado'], ['direito', 'Direito'], ['esquerdo', 'Esquerdo'], ['ambos', 'Ambos']]),
      ], faltando: (st, p) => (['direito', 'esquerdo', 'ambos'].includes(texto(st, `${p}ventriculo`)) ? [] : ['ventrículo acometido']),
        corpo: (st, p) => `Contratilidade ${texto(st, `${p}ventriculo`) === 'ambos' ? 'biventricular' : `do ventrículo ${texto(st, `${p}ventriculo`)}`} reduzida à avaliação subjetiva, sem derrame pericárdico.`,
        conclusao: (st, p) => `Redução da contratilidade ${texto(st, `${p}ventriculo`) === 'ambos' ? 'biventricular' : `do ventrículo ${texto(st, `${p}ventriculo`)}`} à avaliação subjetiva.` },
      outra('Função e pericárdio'),
    ],
  },
]

const capital = (s: string) => s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1)

function blocoModule(b: Bloco): OrganModule {
  // A UI renderiza um só nível de subcampos: os campos de cada achado ficam
  // lado a lado sob "Alterado", e só os do achado selecionado entram no laudo.
  const especificos = b.achados.flatMap(a => a.fields)
  const alteradoSub: Field[] = [
    { key: 'achado', label: 'Achado', kind: 'segmented', presentation: 'select', options: [
      { value: 'nao_informado', label: 'Selecione o achado', isDefault: true },
      ...b.achados.map((a): FieldOption => ({ value: a.value, label: a.label })),
    ] },
    ...especificos,
    select('confirmado', 'Confirmação médica do achado', CONFIRMA),
  ]
  const fields: Field[] = [
    { key: 'estado', label: capital(b.nome), kind: 'segmented', presentation: 'select', options: [
      { value: 'modelo', label: 'Conforme modelo', isDefault: true },
      { value: 'nao_avaliado', label: 'Não avaliado' },
      { value: 'parcial', label: 'Avaliação parcial', subFields: [campo('motivo', 'Motivo', 'Ex.: posição fetal desfavorável')] },
      { value: 'normal', label: 'Sem alterações' },
      { value: 'alterado', label: 'Alterado', subFields: alteradoSub },
    ] },
    ...(b.extras ?? []),
  ]
  return {
    schema: { id: b.id, name: capital(b.nome), category: CATEGORIA, fields },
    initialState: () => ({
      estado: 'modelo', 'estado.parcial.motivo': '', 'estado.alterado.achado': 'nao_informado', 'estado.alterado.confirmado': 'nao',
      ...Object.fromEntries(especificos.map(f => [`estado.alterado.${f.key}`, f.options?.find(o => o.isDefault)?.value ?? ''])),
      ...Object.fromEntries((b.extras ?? []).map(f => [f.key, ''])),
    }),
    compose: (st, opts = {}): OrganComposition => {
      const linhas: string[] = []
      const conclusion: string[] = []
      const pendencias: PendenciaLocal[] = []
      const onde = capital(b.nome)
      const estado = estadoDe(st, opts)
      if (estado === 'nao_informado') pendencias.push({ onde, motivo: 'informe o estado da avaliação' })
      if (estado === 'nao_avaliado') linhas.push(`${capital(b.nome)}: não avaliado.`)
      if (estado === 'normal') linhas.push(b.normal(st))
      if (estado === 'parcial') {
        const motivo = frase(texto(st, 'estado.parcial.motivo'))
        if (!motivo) pendencias.push({ onde, motivo: 'descreva o motivo da avaliação parcial' })
        else linhas.push(`${capital(b.nome)}: avaliação parcial (${minusc(motivo)}).`)
      }
      if (estado === 'alterado') {
        const achado = b.achados.find(a => a.value === texto(st, 'estado.alterado.achado'))
        const p = 'estado.alterado.'
        if (!achado) pendencias.push({ onde, motivo: 'selecione o achado' })
        else {
          const faltando = achado.faltando(st, p)
          if (faltando.length) pendencias.push({ onde, motivo: `informe ${faltando.join(' e ')}` })
          if (texto(st, 'estado.alterado.confirmado') !== 'sim') pendencias.push({ onde, motivo: 'confirme o achado alterado' })
          if (!pendencias.length) {
            linhas.push(achado.corpo(st, p))
            conclusion.push(achado.conclusao(st, p))
          }
        }
      }
      return { body: linhas.join('\n'), conclusion, pendencias, isNormal: estado === 'normal' && pendencias.length === 0 }
    },
  }
}

// ── Exame (identificação e qualidade) ─────────────────────────────────────────
const INDICACAO: Record<string, string> = {
  rotina: 'rastreamento', historia_familiar: 'história familiar de cardiopatia congênita', diabetes: 'diabetes materno',
  suspeita: 'suspeita de alteração cardíaca em exame prévio', arritmia: 'alteração do ritmo cardíaco fetal',
}
const exameModule: OrganModule = (() => {
  const fields: Field[] = [
    campo('ig', 'Idade gestacional', '24 semanas e 3 dias', true),
    select('indicacao', 'Indicação', [['nao_informada', 'Não informada'], ['rotina', 'Rastreamento'], ['historia_familiar', 'História familiar'], ['diabetes', 'Diabetes materno'], ['suspeita', 'Suspeita em exame prévio'], ['arritmia', 'Alteração do ritmo']]),
    { key: 'qualidade', label: 'Condições técnicas', kind: 'segmented', presentation: 'select', options: [
      { value: 'modelo', label: 'Conforme modelo', isDefault: true },
      { value: 'adequada', label: 'Adequadas' },
      { value: 'limitada', label: 'Limitadas', subFields: [campo('motivo', 'Motivo', 'Ex.: posição fetal desfavorável')] },
    ] },
  ]
  return {
    schema: { id: 'exame', name: 'Exame e condições técnicas', category: CATEGORIA, fields },
    initialState: () => ({ ig: '', indicacao: 'nao_informada', qualidade: 'modelo', 'qualidade.limitada.motivo': '' }),
    compose: (st, opts = {}): OrganComposition => {
      const linhas: string[] = []
      const pendencias: PendenciaLocal[] = []
      const ig = frase(texto(st, 'ig'))
      const indicacao = INDICACAO[texto(st, 'indicacao')]
      linhas.push(`Gestação única${ig ? `, com idade gestacional de ${ig}` : ''}.${indicacao ? ` Indicação: ${indicacao}.` : ''}`)
      const qualidade = estadoDe(st, opts, 'qualidade') === 'normal' ? 'adequada' : estadoDe(st, opts, 'qualidade')
      if (qualidade === 'nao_informado') pendencias.push({ onde: 'Condições técnicas', motivo: 'informe as condições técnicas' })
      if (qualidade === 'adequada') linhas.push('Condições técnicas adequadas.')
      if (qualidade === 'limitada') {
        const motivo = frase(texto(st, 'qualidade.limitada.motivo'))
        if (!motivo) pendencias.push({ onde: 'Condições técnicas', motivo: 'descreva o motivo da limitação técnica' })
        else linhas.push(`Condições técnicas limitadas (${minusc(motivo)}).`)
      }
      return { body: linhas.join('\n'), conclusion: [], pendencias, isNormal: true }
    },
  }
})()

// ── Recomendação (opt-in) ─────────────────────────────────────────────────────
const RECOMENDACAO: Record<string, string> = {
  controle: 'Convém, a critério clínico, controle ecocardiográfico fetal evolutivo.',
  cardiopediatria: 'Convém, a critério clínico, avaliação com cardiologia pediátrica.',
  posnatal: 'Convém, a critério clínico, ecocardiograma pós-natal.',
}
const recomendacaoModule: OrganModule = {
  schema: { id: 'recomendacao', name: 'Recomendação', category: CATEGORIA, fields: [
    select('opcao', 'Recomendação', [['nenhuma', 'Nenhuma'], ['controle', 'Controle evolutivo'], ['cardiopediatria', 'Cardiologia pediátrica'], ['posnatal', 'Ecocardiograma pós-natal']]),
    select('confirmada', 'Confirmação médica da recomendação', CONFIRMA),
  ] },
  initialState: () => ({ opcao: 'nenhuma', confirmada: 'nao' }),
  compose: (st): OrganComposition => {
    const opcao = texto(st, 'opcao')
    const confirmada = texto(st, 'confirmada') === 'sim'
    if (!RECOMENDACAO[opcao]) return { body: '', conclusion: [], pendencias: confirmada ? [{ onde: 'Recomendação', motivo: 'a confirmação exige uma recomendação selecionada' }] : [], isNormal: true }
    if (!confirmada) return { body: '', conclusion: [], pendencias: [{ onde: 'Recomendação', motivo: 'confirme a recomendação ou selecione "Nenhuma"' }], isNormal: true }
    return { body: '', conclusion: [], pendencias: [], isNormal: true }
  },
}

/** Pendências que dependem de mais de uma seção (lista e bloqueio de salvamento). */
export function ecocardiografiaFetalIssuesDoExame(state: Exame): string[] {
  const opts = state.__opts ?? {}
  const issues: string[] = []
  const exame = state.exame ?? {}
  const qualidade = estadoDe(exame, opts, 'qualidade')
  const estados = BLOCOS.map(b => estadoDe(state[b.id] ?? {}, opts))
  if (qualidade === 'limitada' && !estados.some(e => e === 'parcial' || e === 'nao_avaliado')) {
    issues.push('Condições técnicas: com limitação técnica, indique os blocos com avaliação parcial ou não realizada')
  }
  if (texto(state.recomendacao ?? {}, 'opcao') === 'cardiopediatria' && !estados.includes('alterado')) {
    issues.push('Recomendação: avaliação com cardiologia pediátrica exige achado alterado registrado')
  }
  return issues
}

const sections: ExamSection[] = [
  { id: 'exame', label: 'Exame e condições técnicas', group: 'orgaos', module: exameModule },
  ...BLOCOS.map((b): ExamSection => ({ id: b.id, label: capital(b.nome), group: 'orgaos', module: blocoModule(b) })),
  { id: 'recomendacao', label: 'Recomendação', group: 'orgaos', module: recomendacaoModule },
]

export const ecocardiografiaFetal: ExamCategory = {
  id: CATEGORIA,
  name: 'Ecocardiografia fetal',
  title: 'ECOCARDIOGRAFIA FETAL',
  tecnica: 'Exame realizado por via abdominal, com transdutor convexo multifrequencial, em modo B, Doppler colorido e pulsado, com avaliação sequencial do coração fetal.',
  achadosHeader: 'OS SEGUINTES ASPECTOS FORAM OBSERVADOS:',
  sections,
  controls: [
    select('modelo', 'Modelo de partida', [['em_branco', 'Em branco'], ['normal', 'Normal — todos os blocos avaliados sem alterações']]),
  ],
  /**
   * Com o estado inteiro: a normalidade só cobre os blocos avaliados como normais,
   * e a limitação de escopo vira item próprio. Recomendação confirmada fecha a lista.
   */
  resolveConclusionItems: (items, state) => {
    const opts = state.__opts ?? {}
    const estados = BLOCOS.map(b => ({ b, estado: estadoDe(state[b.id] ?? {}, opts) }))
    const incompletos = estados.filter(e => e.estado === 'parcial' || e.estado === 'nao_avaliado').map(e => e.b.nome)
    const normais = estados.filter(e => e.estado === 'normal')
    const lista = (xs: string[]) => xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`
    const out = [...items]
    if (!items.length && !incompletos.length) out.push('Ecocardiografia fetal sem alterações estruturais ou funcionais identificáveis ao método.')
    else if (normais.length) out.push(items.length ? 'Demais estruturas avaliadas sem alterações identificáveis.' : 'Sem alterações identificáveis nas estruturas avaliadas.')
    if (incompletos.length) out.push(`Avaliação parcial ou não realizada de: ${lista(incompletos)}.`)
    const rec = state.recomendacao ?? {}
    const recTexto = RECOMENDACAO[texto(rec, 'opcao')]
    if (recTexto && texto(rec, 'confirmada') === 'sim') out.push(recTexto)
    return out
  },
  conclusionNormal: 'Ecocardiografia fetal sem alterações estruturais ou funcionais identificáveis ao método.',
  footer: 'A ecocardiografia fetal não afasta todas as cardiopatias congênitas; algumas alterações podem se tornar evidentes apenas no decorrer da gestação ou após o nascimento.',
}
