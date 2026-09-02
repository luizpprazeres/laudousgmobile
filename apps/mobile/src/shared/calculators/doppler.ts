/**
 * Compatibilidade do app React Native.
 *
 * O motor autoritativo fica em @laudousg/shared e é o mesmo consumido pela
 * versão web. Este reexport evita a reintrodução de coeficientes, faixas ou
 * cortes clínicos divergentes entre clientes.
 */
export {
  DOPPLER_BARCELONA_ENGINE_VERSION,
  DOPPLER_BARCELONA_REFERENCE,
  calcularDoppler,
  calcularDopplerParcial,
  extrairIPsDoTexto,
  formatarBlocoDoppler,
  formatarBlocoDopplerParcial,
  zToBarcelonaDopplerPercentile,
} from "@laudousg/shared";

export type {
  DopplerIPExtraction,
  DopplerInput,
  DopplerPartialInput,
  DopplerPartialResult,
  DopplerResult,
  VesselResult,
} from "@laudousg/shared";
