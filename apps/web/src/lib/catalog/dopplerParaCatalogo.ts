type Estado = Record<string, unknown>
type EstadoExame = Record<string, Estado | unknown>

function texto(s: Estado, key: string): string {
  const value = s[key]
  return typeof value === 'string' ? value.trim() : ''
}

function numero(s: Estado, key: string): number | null {
  const value = Number.parseFloat(texto(s, key).replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** Converte tanto o add-on (`realizado.sim.*`) quanto o exame isolado. */
export function dopplerDaTela(
  estado: EstadoExame,
  options?: { standalone?: boolean },
): Record<string, unknown> | null {
  const section = estado.doppler
  const d = section && typeof section === 'object' ? section as Estado : {}
  const standalone = options?.standalone === true
  if (!standalone && texto(d, 'realizado') !== 'sim') return null
  const key = (name: string) => standalone ? name : `realizado.sim.${name}`
  const centralizacao = texto(d, key('centralizacao')) || 'ausente'
  return {
    ir_uterina_dir: numero(d, key('ir_ut_dir')),
    ip_uterina_dir: numero(d, key('ip_ut_dir')),
    ir_uterina_esq: numero(d, key('ir_ut_esq')),
    ip_uterina_esq: numero(d, key('ip_ut_esq')),
    ip_medio_uterinas: numero(d, key('ip_ut_medio')),
    perc_medio_uterinas: null,
    ir_umbilical: numero(d, key('ir_umb')),
    ip_umbilical: numero(d, key('ip_umb')),
    perc_umbilical: null,
    ir_acm: numero(d, key('ir_acm')),
    ip_acm: numero(d, key('ip_acm')),
    perc_acm: null,
    ir_ducto_venoso: numero(d, key('ir_dv')),
    ip_ducto_venoso: numero(d, key('ip_dv')),
    ducto_venoso_qualitativo: null,
    rcp: numero(d, key('rcp')),
    perfil_hemodinamico: numero(d, key('perfil')),
    umbilical_alterado: texto(d, key('umbilical')) === 'alterada',
    acm_alterado: texto(d, key('acm')) === 'alterada',
    incisura: texto(d, key('incisura')) === 'presente',
    ectasia: null,
    pre_centralizacao: centralizacao === 'pre',
    centralizacao: centralizacao === 'presente',
    uterinas_acima_p95: null,
  }
}

export function adaptarDopplerObstetrico(estado: EstadoExame) {
  const cRaw = estado.cervicometria
  const c = cRaw && typeof cRaw === 'object' ? cRaw as Estado : {}
  const cervicometria = texto(c, 'realizada') === 'sim'
    ? {
        colo_oi_oe_cm: numero(c, 'realizada.sim.colo_cm'),
        orificio_interno_fechado: texto(c, 'realizada.sim.orificio') !== 'aberto',
        placenta_distancia_cm: numero(c, 'realizada.sim.placenta_cm'),
        placenta_distante:
          texto(c, 'realizada.sim.placenta_distante') === 'sim' &&
          numero(c, 'realizada.sim.placenta_cm') === null,
        cerclagem: texto(c, 'realizada.sim.cerclagem') === 'sim',
        observacoes: texto(c, 'realizada.sim.observacoes') || null,
      }
    : null
  return {
    dados: {
      ...(dopplerDaTela(estado, { standalone: true }) ?? {}),
      observacoes_adicionais: null,
      itens_conclusao_livres: [],
      ig_semanas: null,
      cervicometria,
    },
    alteracoes: [] as string[],
    pendencias: [] as Array<{ onde: string; valor: string; motivo: string; bloqueia?: boolean }>,
  }
}
