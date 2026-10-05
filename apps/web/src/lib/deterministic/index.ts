/**
 * Motor de geração determinística (Modo Auxiliar Web) — entrypoint público.
 *
 * Gera laudo a partir de cliques estruturados, sem IA. Ver feedback_deterministic_pegada:
 * o que é conhecido por clique não passa pela IA.
 */

import { abdomeTotal } from './organs/abdomeTotal'
import { prostataSuprapubica } from './organs/prostataSuprapubica'
import { viasUrinarias } from './organs/viasUrinarias'
import { mamaria } from './organs/mamaria'
import { pelveFeminina } from './organs/pelveFeminina'
import { pelvicoTransvaginal } from './organs/pelvicoTransvaginal'
import { pelvicoTransabdominal } from './organs/pelvicoTransabdominal'
import { histerossonografia } from './organs/histerossonografia'
import { pesquisaEndometriose } from './organs/pesquisaEndometriose'
import { hycosy } from './organs/hycosy'
import { perfilBiofisicoFetal } from './organs/perfilBiofisicoFetal'
import { ecocardiografiaFetal } from './organs/ecocardiografiaFetal'
import { abdomeSuperior } from './organs/abdomeSuperior'
import { cervical } from './organs/cervical'
import { cervicometria } from './organs/cervicometria'
import { partesMoles } from './organs/partesMoles'
import { musculoesqueletico } from './organs/musculoesqueletico'
import { obstetrica } from './organs/obstetrica'
import { morfologico } from './organs/morfologico'
import { dopplerObstetrico } from './organs/dopplerObstetrico'
import { dopplerCarotidas } from './organs/dopplerCarotidas'
import { dopplerVenosoMmii, dopplerVenosoMmiiMedidas } from './organs/dopplerVenosoMmii'
import { dopplerRenal } from './organs/dopplerRenal'
import { dopplerHepatico } from './organs/dopplerHepatico'
import { paredeAbdominal } from './organs/paredeAbdominal'
import { regiaoInguinal } from './organs/regiaoInguinal'
import { escrotal } from './organs/escrotal'
import { prostataTransretal } from './organs/prostataTransretal'
import { paratireoide } from './organs/paratireoide'
import { glandulasSalivares } from './organs/glandulasSalivares'
import { transfontanela } from './organs/transfontanela'
import { ocular } from './organs/ocular'
import { dopplerArterialMmii } from './organs/dopplerArterialMmii'
import { dopplerFistulaAv } from './organs/dopplerFistulaAv'
import { dopplerMesenterico } from './organs/dopplerMesenterico'
import { dopplerArteriasTemporais } from './organs/dopplerArteriasTemporais'
import { dopplerAortaIliacas } from './organs/dopplerAortaIliacas'
import { dopplerTransplanteRenal } from './organs/dopplerTransplanteRenal'
import { mamaMasculina } from './organs/mamaMasculina'
import { bolsaTesticularDoppler } from './organs/bolsaTesticularDoppler'
import type { ExamCategory } from './organs/abdomeTotal'

export * from './types'
export { abdomeTotal } from './organs/abdomeTotal'
export { prostataSuprapubica } from './organs/prostataSuprapubica'
export { viasUrinarias } from './organs/viasUrinarias'
export { mamaria } from './organs/mamaria'
export { pelveFeminina } from './organs/pelveFeminina'
export { pelvicoTransvaginal } from './organs/pelvicoTransvaginal'
export { pelvicoTransabdominal } from './organs/pelvicoTransabdominal'
export { histerossonografia } from './organs/histerossonografia'
export { pesquisaEndometriose } from './organs/pesquisaEndometriose'
export { hycosy } from './organs/hycosy'
export { perfilBiofisicoFetal } from './organs/perfilBiofisicoFetal'
export { ecocardiografiaFetal } from './organs/ecocardiografiaFetal'
export { abdomeSuperior } from './organs/abdomeSuperior'
export { cervical } from './organs/cervical'
export { cervicometria } from './organs/cervicometria'
export { partesMoles } from './organs/partesMoles'
export { musculoesqueletico } from './organs/musculoesqueletico'
export { obstetrica } from './organs/obstetrica'
export { morfologico } from './organs/morfologico'
export { dopplerObstetrico } from './organs/dopplerObstetrico'
export { dopplerCarotidas } from './organs/dopplerCarotidas'
export { dopplerRenal } from './organs/dopplerRenal'
export { dopplerHepatico } from './organs/dopplerHepatico'
export { paredeAbdominal } from './organs/paredeAbdominal'
export { regiaoInguinal } from './organs/regiaoInguinal'
export { escrotal } from './organs/escrotal'
export { prostataTransretal } from './organs/prostataTransretal'
export { paratireoide } from './organs/paratireoide'
export { glandulasSalivares } from './organs/glandulasSalivares'
export { pendenciasLocais } from './organs/pendenciasLocais'
export { transfontanela } from './organs/transfontanela'
export { ocular } from './organs/ocular'
export { dopplerArterialMmii } from './organs/dopplerArterialMmii'
export { dopplerFistulaAv } from './organs/dopplerFistulaAv'
export { dopplerMesenterico } from './organs/dopplerMesenterico'
export { dopplerArteriasTemporais } from './organs/dopplerArteriasTemporais'
export { dopplerAortaIliacas } from './organs/dopplerAortaIliacas'
export { dopplerTransplanteRenal } from './organs/dopplerTransplanteRenal'
export { mamaMasculina } from './organs/mamaMasculina'
export { bolsaTesticularDoppler } from './organs/bolsaTesticularDoppler'
export type { ExamCategory, ExamSection } from './organs/abdomeTotal'
export { vesiculaModule } from './organs/vesicula'

/**
 * Registro das categorias GENÉRICAS (compostas via composeReport). Adicionar uma
 * categoria nova = criar o módulo em organs/ e incluí-la aqui. A UI
 * (LaudarWebExperience) lê este registro — não precisa mexer no componente.
 * (Tireoide não entra aqui: ela foi a PILOTO da troca de motor e agora sai do
 *  `/render` canônico. Ver a nota em `organs/tireoide.ts`.)
 */
export const GENERIC_CATEGORIES: ExamCategory[] = [
  abdomeTotal, abdomeSuperior, prostataSuprapubica, viasUrinarias, mamaria,
  pelveFeminina, cervical, cervicometria, partesMoles, musculoesqueletico,
  obstetrica, morfologico, dopplerObstetrico, dopplerCarotidas, dopplerRenal, dopplerHepatico, dopplerVenosoMmii, dopplerVenosoMmiiMedidas,
  paredeAbdominal, regiaoInguinal, escrotal,
  prostataTransretal, paratireoide, glandulasSalivares,
  transfontanela, ocular,
  dopplerArterialMmii, dopplerFistulaAv,
  dopplerMesenterico,
  dopplerArteriasTemporais,
  dopplerAortaIliacas,
  dopplerTransplanteRenal,
  mamaMasculina,
  bolsaTesticularDoppler,
  pelvicoTransvaginal,
  pelvicoTransabdominal,
  histerossonografia,
  hycosy,
  perfilBiofisicoFetal,
  ecocardiografiaFetal,
  pesquisaEndometriose,
]
export const CATEGORIES: Record<string, ExamCategory> = Object.fromEntries(
  GENERIC_CATEGORIES.map((c) => [c.id, c])
)
export {
  composeReport,
  initialExamState,
  appendInitials,
  type ExamState,
  type ComposedReport,
} from './compose'
export {
  initialTireoideState,
  volumeLobo,
  tireoideSections,
  ECOGENICIDADES,
  MARGENS,
  NOTAS_DOMINGOS,
  TIRADS_VALUES,
  TIREOIDITES,
  VOLUME_GLANDULAR,
  type TireoideState,
  type LoboState,
  type LoboId,
  type NoduloTireoide,
  type TireoiditeTipo,
} from './organs/tireoide'
