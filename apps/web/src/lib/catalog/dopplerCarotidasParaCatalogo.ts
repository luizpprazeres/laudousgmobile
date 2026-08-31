type Section = Record<string, unknown>
type Exam = Record<string, unknown>

const section = (exam: Exam, key: string): Section => {
  const value = exam[key]
  return value && typeof value === 'object' ? value as Section : {}
}

const text = (s: Section, key: string) => typeof s[key] === 'string' ? (s[key] as string).trim() : ''
const number = (s: Section, key: string, allowZero = false): number | null => {
  const parsed = Number.parseFloat(text(s, key).replace(',', '.'))
  return Number.isFinite(parsed) && (allowZero ? parsed >= 0 : parsed > 0) ? parsed : null
}

type Pendencia = { onde: string; valor: string; motivo: string; bloqueia?: boolean }

function sideData(s: Section, side: string, pendencias: Pendencia[]) {
  const ids = Array.isArray(s.placas_ids) ? s.placas_ids.filter((id): id is string => typeof id === 'string') : []
  for (const vessel of ['comum', 'interna', 'externa']) {
    const vps = number(s, `${vessel}_vps`)
    const vdf = number(s, `${vessel}_vdf`, true)
    if (vps !== null && vdf !== null && vdf > vps) pendencias.push({
      onde: `${vessel} ${side}`,
      valor: `VPS ${vps}; VDF ${vdf}`,
      motivo: 'a velocidade diastólica não pode superar a sistólica; revise os campos',
      bloqueia: true,
    })
  }
  for (const id of ids) {
    const percent = number(s, `placas.${id}.estenose`, true)
    if (percent !== null && percent > 100) pendencias.push({
      onde: `placa ${side}`,
      valor: `${percent}%`,
      motivo: 'o percentual informado precisa estar entre 0 e 100',
      bloqueia: true,
    })
  }
  return {
    emi_mm: number(s, 'emi'),
    comum: { vps_cms: number(s, 'comum_vps'), vdf_cms: number(s, 'comum_vdf', true) },
    interna: { vps_cms: number(s, 'interna_vps'), vdf_cms: number(s, 'interna_vdf', true) },
    externa: { vps_cms: number(s, 'externa_vps'), vdf_cms: number(s, 'externa_vdf', true) },
    vertebral: {
      vps_cms: number(s, 'vertebral_vps'),
      direcao: text(s, 'vertebral_direcao') || null,
    },
    placas: ids.map((id) => ({
      localizacao: text(s, `placas.${id}.localizacao`) || null,
      composicao: text(s, `placas.${id}.composicao`) || null,
      superficie: text(s, `placas.${id}.superficie`) || null,
      espessura_mm: number(s, `placas.${id}.espessura`),
      estenose_percentual: number(s, `placas.${id}.estenose`, true),
      descricao_raw: text(s, `placas.${id}.descricao`) || null,
    })),
  }
}

export function adaptarDopplerCarotidas(exam: Exam) {
  const conclusion = section(exam, 'conclusao')
  const pendencias: Pendencia[] = []
  return {
    dados: {
      direita: sideData(section(exam, 'direita'), 'direita', pendencias),
      esquerda: sideData(section(exam, 'esquerda'), 'esquerda', pendencias),
      classificacao_explicita: text(conclusion, 'classificacao') || null,
      lado_classificacao: text(conclusion, 'lado') || null,
      conclusao_livre: text(conclusion, 'conclusao_livre') || null,
      achados_adicionais: text(conclusion, 'achados_adicionais') || null,
    },
    alteracoes: [],
    pendencias,
  }
}
