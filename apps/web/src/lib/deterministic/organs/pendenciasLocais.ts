/**
 * Pendências bloqueantes do compositor local, por categoria NÃO migrada.
 *
 * Nas categorias migradas o renderer canônico devolve as pendências; aqui o
 * texto é composto no navegador, então quem decide que falta dado essencial
 * (lado, medidas, descrição do observado) é este registro. Com pendência, a
 * tela lista o que falta e não salva o texto gerado.
 */

import type { OrganState } from '../types'
import { prostataTransretalIssuesDoExame } from './prostataTransretal'
import { paratireoideIssuesDoExame } from './paratireoide'
import { glandulasSalivaresIssuesDoExame } from './glandulasSalivares'
import { dopplerMesentericoIssuesDoExame } from './dopplerMesenterico'
import { dopplerTransplanteRenalIssuesDoExame } from './dopplerTransplanteRenal'
import { bolsaTesticularDopplerIssuesDoExame } from './bolsaTesticularDoppler'
import { ecocardiografiaFetalIssuesDoExame } from './ecocardiografiaFetal'
import { hycosyIssuesDoExame } from './hycosy'

type Exame = Record<string, OrganState>

const REGISTRO: Record<string, (state: Exame) => string[]> = {
  PROSTATA_TRANSRETAL: prostataTransretalIssuesDoExame,
  PARATIREOIDE: paratireoideIssuesDoExame,
  GLANDULAS_SALIVARES: glandulasSalivaresIssuesDoExame,
  DOPPLER_MESENTERICO: dopplerMesentericoIssuesDoExame,
  DOPPLER_TRANSPLANTE_RENAL: dopplerTransplanteRenalIssuesDoExame,
  BOLSA_TESTICULAR_DOPPLER: bolsaTesticularDopplerIssuesDoExame,
  ECOCARDIOGRAFIA_FETAL: ecocardiografiaFetalIssuesDoExame,
  HYCOSY: hycosyIssuesDoExame,
}

export function pendenciasLocais(categoria: string, state: Exame | undefined): string[] {
  const ler = REGISTRO[categoria]
  return ler ? ler(state ?? {}) : []
}
