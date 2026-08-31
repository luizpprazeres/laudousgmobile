import { calcularDopplerParcial } from '@laudousg/shared'

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
  const igSection = estado.ig
  const ig = igSection && typeof igSection === 'object' ? igSection as Estado : {}
  const standalone = options?.standalone === true
  if (!standalone && texto(d, 'realizado') !== 'sim') return null
  const key = (name: string) => standalone ? name : `realizado.sim.${name}`
  const centralizacao = texto(d, key('centralizacao')) || 'ausente'
  const ipUterinaDireita = numero(d, key('ip_ut_dir'))
  const ipUterinaEsquerda = numero(d, key('ip_ut_esq'))
  const ipMedioCalculado = ipUterinaDireita !== null && ipUterinaEsquerda !== null
    ? Math.round(((ipUterinaDireita + ipUterinaEsquerda) / 2) * 1000) / 1000
    : null
  const weeks = standalone ? numero(d, 'ig_sem') : numero(ig, 'bio_sem')
  const days = (standalone ? numero(d, 'ig_dias') : numero(ig, 'bio_dias')) ?? 0
  const somenteIpUterinas = weeks !== null && weeks <= 15
  const ipUmbilical = somenteIpUterinas ? null : numero(d, key('ip_umb'))
  const ipAcm = somenteIpUterinas ? null : numero(d, key('ip_acm'))
  const calculado = weeks !== null
    ? calcularDopplerParcial({
        weeks,
        days,
        ...(ipUmbilical !== null ? { ipUmbilical } : {}),
        ...(ipAcm !== null ? { ipMCA: ipAcm } : {}),
        ...(ipUterinaDireita !== null ? { ipUterinaDireita } : {}),
        ...(ipUterinaEsquerda !== null ? { ipUterinaEsquerda } : {}),
      })
    : {}
  const rcpCalculada = calculado.ratioCerebroplacentario?.ip ?? null
  return {
    ir_uterina_dir: somenteIpUterinas ? null : numero(d, key('ir_ut_dir')),
    ip_uterina_dir: ipUterinaDireita,
    ir_uterina_esq: somenteIpUterinas ? null : numero(d, key('ir_ut_esq')),
    ip_uterina_esq: ipUterinaEsquerda,
    ip_medio_uterinas: ipMedioCalculado ?? numero(d, key('ip_ut_medio')),
    perc_medio_uterinas: calculado.arteriasUterinas?.percentile ?? null,
    ir_umbilical: somenteIpUterinas ? null : numero(d, key('ir_umb')),
    ip_umbilical: ipUmbilical,
    perc_umbilical: calculado.arteriaUmbilical?.percentile ?? null,
    ir_acm: somenteIpUterinas ? null : numero(d, key('ir_acm')),
    ip_acm: ipAcm,
    perc_acm: calculado.arteriaCerebralMedia?.percentile ?? null,
    ir_ducto_venoso: somenteIpUterinas ? null : numero(d, key('ir_dv')),
    ip_ducto_venoso: somenteIpUterinas ? null : numero(d, key('ip_dv')),
    ducto_venoso_qualitativo: null,
    rcp: somenteIpUterinas ? null : numero(d, key('rcp')) ?? rcpCalculada,
    perfil_hemodinamico: somenteIpUterinas ? null : numero(d, key('perfil')),
    umbilical_alterado:
      !somenteIpUterinas && (texto(d, key('umbilical')) === 'alterada' || calculado.arteriaUmbilical?.pathological === true),
    acm_alterado:
      !somenteIpUterinas && (texto(d, key('acm')) === 'alterada' || calculado.arteriaCerebralMedia?.pathological === true),
    incisura: !somenteIpUterinas && texto(d, key('incisura')) === 'presente',
    ectasia: null,
    pre_centralizacao: !somenteIpUterinas && centralizacao === 'pre',
    centralizacao: !somenteIpUterinas && centralizacao === 'presente',
    uterinas_acima_p95: calculado.arteriasUterinas?.pathological ?? null,
  }
}

export function adaptarDopplerObstetrico(estado: EstadoExame) {
  const dRaw = estado.doppler
  const d = dRaw && typeof dRaw === 'object' ? dRaw as Estado : {}
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
      ig_semanas: numero(d, 'ig_sem'),
      cervicometria,
    },
    alteracoes: [] as string[],
    pendencias: [] as Array<{ onde: string; valor: string; motivo: string; bloqueia?: boolean }>,
  }
}
