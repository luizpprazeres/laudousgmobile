/**
 * Fixtures puros (sem side effects) para os testes da MAMARIA — usados pelo
 * boletim (geração de HTML) e pelo golden (asserções). Helpers que preenchem
 * os campos com null por padrão, reduzindo a verbosidade dos casos.
 */
import type { MamariaAchado, MamariaFindings } from "../categories/MAMARIA";

export const A = (p: Partial<MamariaAchado>): MamariaAchado => ({
  tipo: "nodulo_solido",
  lado: "direita",
  ecogenicidade: null,
  forma: null,
  orientacao: null,
  margem: null,
  posterior: null,
  calcificacoes: null,
  elasticidade: null,
  descritores: null,
  medidas_cm: null,
  medida_invalida: null,
  localizacao: null,
  horario: null,
  dist_pele_cm: null,
  dist_mamilo_cm: null,
  descricao_nao_nodular: null,
  birads_ditado: null,
  ...p,
});

export const F = (p: Partial<MamariaFindings>): MamariaFindings => ({
  titulo_com_axilas: true,
  mama_masculina: false,
  com_protese: false,
  texto_fundo: null,
  achados: [],
  axilas_alteradas: false,
  axilas_descricao: null,
  correlacao: null,
  achados_adicionais: null,
  ...p,
});
