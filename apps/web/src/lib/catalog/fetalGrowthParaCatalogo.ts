import { calcularDopplerParcial } from '@laudousg/shared'

type Estado = Record<string, unknown>
type EstadoExame = Record<string, Estado | unknown>

function secao(estado: EstadoExame, id: string): Estado {
  const value = estado[id]
  return value && typeof value === 'object' ? value as Estado : {}
}

function texto(s: Estado, key: string): string {
  const value = s[key]
  return typeof value === 'string' ? value.trim() : ''
}

function numero(s: Estado, key: string): number | null {
  const value = Number.parseFloat(texto(s, key).replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

export function fetalGrowthDaTela(estado: EstadoExame): Record<string, unknown> | null {
  const growth = secao(estado, 'crescimento_fetal')
  if (texto(growth, 'avaliar') !== 'sim') return null
  const prefix = 'avaliar.sim.'
  const efwPercentile = numero(growth, `${prefix}percentil`)
  if (efwPercentile === null || efwPercentile < 0 || efwPercentile > 100) return null

  const ig = secao(estado, 'ig')
  const doppler = secao(estado, 'doppler')
  const dopplerPrefix = 'realizado.sim.'
  const weeks = numero(ig, 'bio_sem')
  const days = numero(ig, 'bio_dias') ?? 0
  const ipUmbilical = numero(doppler, `${dopplerPrefix}ip_umb`)
  const ipMCA = numero(doppler, `${dopplerPrefix}ip_acm`)
  const ipUterinaDireita = numero(doppler, `${dopplerPrefix}ip_ut_dir`)
  const ipUterinaEsquerda = numero(doppler, `${dopplerPrefix}ip_ut_esq`)
  const calculado = weeks !== null && texto(doppler, 'realizado') === 'sim'
    ? calcularDopplerParcial({
        weeks,
        days,
        ...(ipUmbilical !== null ? { ipUmbilical } : {}),
        ...(ipMCA !== null ? { ipMCA } : {}),
        ...(ipUterinaDireita !== null ? { ipUterinaDireita } : {}),
        ...(ipUterinaEsquerda !== null ? { ipUterinaEsquerda } : {}),
      })
    : {}

  const flowRaw = texto(doppler, `${dopplerPrefix}umbilical`)
  const umbilicalFlow = flowRaw === 'diastole_ausente'
    ? 'absent'
    : flowRaw === 'diastole_reversa'
      ? 'reversed'
      : 'present'
  const dvRaw = texto(doppler, `${dopplerPrefix}ducto_fluxo`)
  const dvFlow = dvRaw === 'diastole_ausente'
    ? 'absent'
    : dvRaw === 'diastole_reversa'
      ? 'reversed'
      : 'present'
  const confirmationKey = umbilicalFlow === 'absent' || umbilicalFlow === 'reversed'
    ? `${dopplerPrefix}umbilical.${flowRaw}.confirmada`
    : ''
  const dvConfirmationKey = dvRaw && dvRaw !== 'normal'
    ? `${dopplerPrefix}ducto_fluxo.${dvRaw}.confirmada`
    : ''
  const allCalculated = Boolean(
    calculado.arteriaUmbilical &&
    calculado.arteriaCerebralMedia &&
    calculado.arteriasUterinas &&
    calculado.ratioCerebroplacentario,
  )
  const allNormal = allCalculated &&
    !calculado.arteriaUmbilical?.pathological &&
    !calculado.arteriaCerebralMedia?.pathological &&
    !calculado.arteriasUterinas?.pathological &&
    !calculado.ratioCerebroplacentario?.pathological &&
    umbilicalFlow === 'present' && dvFlow === 'present'

  const sourceRaw = texto(growth, `${prefix}fonte`) || 'Intergrowth-21st'
  const source = sourceRaw === 'outra'
    ? texto(growth, `${prefix}fonte_outra`) || 'Outra curva informada pelo médico'
    : sourceRaw

  return {
    efwPercentile,
    efwPercentileSource: source,
    dopplerAssessmentCompleteAndNormal: allNormal,
    cprBelowP5: {
      present: calculado.ratioCerebroplacentario?.pathological === true,
      confirmed: texto(growth, `${prefix}rcp_confirmada`) === 'sim',
    },
    mcaPiBelowP5: {
      present: calculado.arteriaCerebralMedia?.pathological === true,
      confirmed: texto(growth, `${prefix}acm_confirmada`) === 'sim',
    },
    meanUterinePiAboveP95: calculado.arteriasUterinas?.pathological === true,
    umbilicalArteryEndDiastolicFlow: umbilicalFlow,
    umbilicalFlowConfirmedInRequiredInterval:
      confirmationKey !== '' && texto(doppler, confirmationKey) === 'sim',
    ductusVenosus: {
      piAboveP95: dvRaw === 'ip_acima_p95',
      diastolicFlow: dvFlow,
      persistentDicroticVenousPulsations: dvRaw === 'pulsacoes_dicroticas',
      confirmedAfter6To12Hours:
        dvConfirmationKey !== '' && texto(doppler, dvConfirmationKey) === 'sim',
    },
    pathologicalCtg: texto(growth, `${prefix}ctg`) === 'patologica',
  }
}
