/**
 * Tireoide — categoria com modelo próprio (não segue o padrão "órgãos" do Abdome).
 *
 * Estrutura canônica do LaudoUSG (knowledge RAG TIREOIDE, published):
 *   Lobo direito / Lobo esquerdo / Istmo (medidas A×B×C → volume) → Nódulos (lista,
 *   por lobo, formato Domingos + ACR TI-RADS) → Linfonodos → Doppler (opcional) → rodapé fixo.
 *
 * REGRA TRANCADA: Nota Domingos e TI-RADS NUNCA são calculados — vêm por seleção do
 * médico e são reproduzidos no formato exato. O VOLUME, ao contrário, é fórmula pura
 * (elipsoide) e é calculado pelo sistema.
 */

// Fator do elipsoide (A×B×C×fator, medidas em cm → volume em ml).
// Aprovado com Luiz como 0,52; padrão clínico ACR ~0,523 — ajustável aqui.
const VOLUME_FACTOR = 0.52

export type LoboId = 'lobo_direito' | 'lobo_esquerdo' | 'istmo'

export interface LoboState {
  a: string
  b: string
  c: string
  ecotextura: 'normal' | 'heterogenea'
}

/**
 * Um nódulo, descrito pelos SEIS EIXOS que o escore de Domingos pontua.
 *
 * Antes a tela pedia `notaDomingos` e `tirads` prontos, escolhidos à mão — e o
 * médico precisava saber a tabela de cabeça para converter o que via num
 * número. Pior: aquela escala de 1 a 6 não é a nota de Domingos, e as duas se
 * invertem no meio da faixa (grau 5 = "provavelmente maligna" para a tela,
 * TI-RADS 2 = "provavelmente benigna" para o canônico). Ver
 * `lib/catalog/eixosDoNodulo.ts`.
 *
 * Agora o médico classifica o que VÊ, e quem pontua é o renderer canônico. As
 * chaves são as dele; `null` quer dizer "não classificado" e pontua zero, que é
 * o comportamento dele também.
 */
export interface NoduloTireoide {
  id: string
  lobo: LoboId
  /** Chaves de `lib/catalog/eixosDoNodulo`. `null` = não classificado. */
  ecogenicidade: string | null
  margem: string | null
  halo: string | null
  forma: string | null
  calcificacoes: string | null
  /** Chammas — pontua, mas nunca é escrita no laudo. */
  vascularizacao: string | null
  /** Os três eixos em cm, como digitados. Vazio é lacuna, não zero. */
  c1: string
  c2: string
  c3: string
  /** Onde está, com a preposição: "no terço médio". Opcional. */
  localizacao: string
}

export type TireoiditeTipo = 'nenhuma' | 'hashimoto' | 'linfocitica' | 'granulomatosa' | 'riedel'

/** `null` = o médico ainda não disse. Ver `VOLUME_GLANDULAR`. */
export type VolumeGlandular = 'normal' | 'aumentado' | 'reduzido' | null

export const VOLUME_GLANDULAR: { value: Exclude<VolumeGlandular, null>; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'aumentado', label: 'Aumentado' },
  { value: 'reduzido', label: 'Reduzido' },
]

export interface TireoideState {
  doppler: boolean
  /**
   * O ESTADO DA GLÂNDULA — perguntado, nunca inferido das medidas.
   *
   * A web concluía "volume normal" para QUALQUER volume digitado: um bócio de
   * 40 ml saía com a glândula descrita como normal. O canônico tem o estado
   * explícito e é categórico em não deduzi-lo dos eixos — a faixa de
   * normalidade varia com idade, sexo e constituição, e um número não decide
   * isso sozinho.
   *
   * Nulo é o padrão e o mais honesto: sem resposta, o laudo não afirma nem
   * normalidade nem aumento.
   */
  volumeGlandular: VolumeGlandular
  lobo_direito: LoboState
  lobo_esquerdo: LoboState
  istmo: LoboState
  nodulos: NoduloTireoide[]
  /** Avaliação dos linfonodos cervicais (opcional — nem todo exame inclui). */
  avaliarLinfonodos: boolean
  linfonodos: 'preservados' | 'suspeitos'
  picoDireito: string
  picoEsquerdo: string
  /** Tireoidite difusa selecionada (modifica achados + conclusão). */
  tireoidite: TireoiditeTipo
}

export const TIREOIDITES: { value: TireoiditeTipo; label: string }[] = [
  { value: 'nenhuma', label: 'Nenhuma' },
  { value: 'hashimoto', label: 'Hashimoto (autoimune)' },
  { value: 'linfocitica', label: 'Linfocítica' },
  { value: 'granulomatosa', label: 'Granulomatosa (De Quervain)' },
  { value: 'riedel', label: 'Riedel (fibrosante)' },
]

// Frases clínicas padrão (radiologia) — ponto de partida p/ curadoria do Luiz.
const TIREOIDITE_CORPO: Record<Exclude<TireoiditeTipo, 'nenhuma'>, string> = {
  hashimoto:
    'O parênquima tireoidiano apresenta-se difusamente heterogêneo e hipoecogênico, com micronodulações e traves ecogênicas (septos fibrosos).',
  linfocitica:
    'O parênquima tireoidiano apresenta heterogeneidade difusa, de grau leve a moderado.',
  granulomatosa:
    'Observam-se áreas hipoecogênicas mal definidas e confluentes no parênquima tireoidiano, com redução da vascularização ao estudo Doppler.',
  riedel:
    'A glândula tireoide apresenta-se difusamente hipoecogênica e de aspecto endurecido, com possível extensão fibrosa aos tecidos adjacentes.',
}
const TIREOIDITE_CONCLUSAO: Record<Exclude<TireoiditeTipo, 'nenhuma'>, string> = {
  hashimoto:
    'Aspecto ecográfico sugestivo de tireoidite crônica autoimune (Hashimoto). Sugere-se correlação com a dosagem de anticorpos antitireoidianos (anti-TPO e anti-tireoglobulina)',
  linfocitica:
    'Achados sugestivos de tireoidite linfocítica. Correlacionar com dados clínicos e laboratoriais',
  granulomatosa:
    'Achados que podem corresponder a tireoidite subaguda granulomatosa (De Quervain), sobretudo em contexto de dor cervical. Correlacionar clinicamente',
  riedel:
    'Achados que podem corresponder a tireoidite de Riedel (fibrosante). Correlacionar clinicamente',
}

export const ECOGENICIDADES: { value: string; label: string }[] = [
  { value: 'anecoica', label: 'Anecoica' },
  { value: 'anecoica_finos_ecos', label: 'Anecoica c/ finos ecos' },
  { value: 'hipoecoica', label: 'Hipoecoica' },
  { value: 'isoecoica', label: 'Isoecoica' },
  { value: 'hiperecoica', label: 'Hiperecoica' },
  { value: 'heterogenea', label: 'Heterogênea' },
]

export const MARGENS: { value: string; label: string }[] = [
  { value: 'regulares', label: 'Regulares' },
  { value: 'circunscritas', label: 'Circunscritas' },
  { value: 'lobuladas', label: 'Lobuladas' },
  { value: 'irregulares', label: 'Irregulares' },
]

export const NOTAS_DOMINGOS = ['1', '2', '3', '4', '5', '6']
export const TIRADS_VALUES = ['1', '2', '3', '4a', '4b', '4c', '5']

const ECO_TEXTO: Record<string, string> = {
  anecoica: 'anecoica',
  anecoica_finos_ecos: 'anecoica com finos ecos',
  hipoecoica: 'hipoecoica',
  isoecoica: 'isoecoica',
  hiperecoica: 'hiperecoica',
  heterogenea: 'heterogênea',
}

const LOBO_NOME: Record<LoboId, string> = {
  lobo_direito: 'Lobo direito',
  lobo_esquerdo: 'Lobo esquerdo',
  istmo: 'Istmo',
}

// Nota Domingos → característica clínica (snippet nodulos-com-classificacao).
function caracteristicaDaNota(nota: string): string {
  const n = parseInt(nota, 10)
  if (n <= 2) return 'características benignas'
  if (n === 3) return 'características provavelmente benignas'
  if (n === 4) return 'características intermediárias'
  if (n === 5) return 'características provavelmente malignas'
  return 'características malignas'
}

function loboEmptyState(): LoboState {
  return { a: '', b: '', c: '', ecotextura: 'normal' }
}

export function initialTireoideState(): TireoideState {
  return {
    volumeGlandular: null,
    doppler: false,
    lobo_direito: loboEmptyState(),
    lobo_esquerdo: loboEmptyState(),
    istmo: loboEmptyState(),
    nodulos: [],
    avaliarLinfonodos: true,
    linfonodos: 'preservados',
    picoDireito: '',
    picoEsquerdo: '',
    tireoidite: 'nenhuma',
  }
}

// Sub-nav (mesma estrutura visual das outras categorias).
export const tireoideSections = [
  { id: 'lobo_direito', label: 'Lobo direito', group: 'orgaos' as const },
  { id: 'lobo_esquerdo', label: 'Lobo esquerdo', group: 'orgaos' as const },
  { id: 'istmo', label: 'Istmo', group: 'orgaos' as const },
  { id: 'parenquima', label: 'Parênquima', group: 'orgaos' as const },
  { id: 'nodulos', label: 'Nódulos', group: 'orgaos' as const },
  { id: 'linfonodos', label: 'Linfonodos', group: 'conclusao' as const },
]

// ─── Volume ───

function parseMedida(v: string): number | null {
  const n = parseFloat(v.trim().replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Volume do elipsoide em ml, ou null se alguma medida faltar. */
export function volumeLobo(lobo: LoboState): number | null {
  const a = parseMedida(lobo.a)
  const b = parseMedida(lobo.b)
  const c = parseMedida(lobo.c)
  if (a === null || b === null || c === null) return null
  return a * b * c * VOLUME_FACTOR
}

function fmtVol(v: number): string {
  return v.toFixed(1).replace('.', ',')
}

function fmtMedidas(lobo: LoboState): string | null {
  const a = lobo.a.trim()
  const b = lobo.b.trim()
  const c = lobo.c.trim()
  return a && b && c ? `${a} x ${b} x ${c} cm` : null
}

// ─── Composição: SAIU DAQUI ───
//
// A TIREOIDE foi a categoria PILOTO da troca de motor (§3.2 do plano de 20/08).
// O texto clínico dela não é mais montado no navegador: a tela manda os achados
// para `POST /api/catalog/TIREOIDE/render` e recebe o laudo pronto do renderer
// canônico — a mesma fonte que atende o iOS e o Android.
//
// O que morava aqui foi apagado de propósito, não desativado. Um compositor
// local vivo ao lado do canônico é a definição de segunda fonte de redação
// clínica: um dia alguém chama o errado, e ninguém percebe, porque os dois
// produzem um laudo plausível.
//
// O que SOBRA neste arquivo é estrutura de TELA, não redação: o formato do
// estado, as seções do formulário, e `volumeLobo` — que é fórmula pura e fica
// do lado da web de propósito (regra §1: aqui o médico DIGITA os eixos, o dado
// é confiável, e o canônico recebe o volume pronto, exatamente como a regra
// dele manda).
//
// As demais categorias continuam em `lib/deterministic` até que cada uma faça a
// mesma travessia.
//
// ## Não há laudo antigo para quebrar
//
// O formato do nódulo mudou por inteiro (`margens`/`dimensao`/`notaDomingos`
// deram lugar aos seis eixos), e a pergunta óbvia é o que acontece com o que já
// está gravado. Nada: `web_reports.exam_state` é ESCRITO no salvamento e nunca
// relido — o histórico mostra o TEXTO do laudo, não reidrata o formulário
// (conferido em 21/08). Se um dia alguém abrir um laudo salvo para reeditar, aí
// sim é preciso migrar o formato, e este parágrafo é o aviso.
