/**
 * Fixtures puros (sem side effects) para os testes da TIREOIDE estilo OBJETIVO —
 * usados pelo boletim (HTML) e pelo golden (asserções). Helpers que preenchem os
 * campos com null por padrão, reduzindo a verbosidade dos casos.
 */
import type {
  TireoideFindings,
  TireoideLobo,
  TireoideNodulo,
} from "../categories/TIREOIDE";

/** Nódulo: todos os eixos null por padrão. */
export const N = (p: Partial<TireoideNodulo>): TireoideNodulo => ({
  ecogenicidade: null,
  margem: null,
  halo: null,
  forma: null,
  calcificacoes: null,
  vascularizacao: null,
  medidas_cm: null,
  diametro_transverso_cm: null,
  localizacao: null,
  descricao_raw: null,
  nota_domingos_ditada: null,
  ti_rads_ditado: null,
  ...p,
});

/** Lobo/istmo: sem nódulos por padrão. */
export const L = (p: Partial<TireoideLobo>): TireoideLobo => ({
  medidas_cm: null,
  volume_ml: null,
  ecotextura_alterada: null,
  nodulos: [],
  ...p,
});

/** Findings: glândula normal por padrão (3 estruturas vazias). */
export const F = (p: Partial<TireoideFindings>): TireoideFindings => ({
  com_doppler: false,
  volume_glandular: null,
  // Nulo é o caso de 100% dos laudos reais: o médico descreve o padrão difuso e
  // não nomeia etiologia. Nomear é opção nova, dele, de 21/08.
  tireoidite_tipo: null,
  lobo_direito: L({ medidas_cm: [5.0, 1.8, 1.6], volume_ml: 7.0 }),
  lobo_esquerdo: L({ medidas_cm: [4.8, 1.7, 1.5], volume_ml: 6.0 }),
  istmo: L({ medidas_cm: [1.2, 0.3, 1.0], volume_ml: 0.5 }),
  pico_arteria_direita: null,
  pico_sistolico_direito_cms: null,
  pico_arteria_esquerda: null,
  pico_sistolico_esquerdo_cms: null,
  linfonodos_descritos: false,
  linfonodos_alterados: false,
  linfonodos_descricao: null,
  achados_adicionais: null,
  ...p,
});
