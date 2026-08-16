/**
 * Cenários de exemplo para a prévia da Biblioteca.
 *
 * São findings sintéticos — nenhum dado de paciente. Servem para o médico ver
 * o efeito de uma personalização em situações diferentes ANTES de publicar,
 * incluindo os cenários patológicos, onde a personalização de normalidade
 * deliberadamente NÃO se aplica.
 */
import type { ObstetricaFindings } from "../categories/OBSTETRICA";

const FETO = {
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null, polo_cefalico: null,
  bcf_bpm: 142, dbp_mm: 85, cc_mm: 310, ca_mm: 295, cf_mm: 62, ccn_mm: null,
  peso_g: 2450, peso_variacao_g: null, percentil: null, bcf_alteracao: null, movimentos_fetais: null, cranio_achado: null, cranio_medida_mm: null, cranio_lateralidade: null, cordao_vasos: null,
};

function f(over: Partial<ObstetricaFindings> = {}): ObstetricaFindings {
  return {
    numero_fetos: 1, corionicidade: null, gestacao_inicial: false, fetos: [{ ...FETO }],
    ig_semanas: 32, ig_dias: 4, dum: null, data_exame: null,
    primeira_us_data: null, primeira_us_ig_semanas: null, primeira_us_ig_dias: null,
    ig_referencia_hoje_semanas: null, ig_referencia_hoje_dias: null,
    referencia_fonte: null, corrigir_ig: null, saco_gestacional_mm: null,
    saco_gestacional_medidas_mm: null, placenta_quantidade: null, placenta_localizacao: null,
    placenta_ecotextura: null, placenta_grau: null, placenta_relacao_orificio: null, placenta_distancia_orificio_mm: null, placenta_achado: null, placenta_achado_medidas: null, liquido_tipo: null, liquido_ila_cm: null,
    liquido_mbv_por_feto_cm: null, liquido_classe: null, achados_adicionais: null,
    itens_conclusao_livres: [], observacoes_corpo_livres: [], ...over,
  };
}

export type Sample = {
  id: string;
  nome: string;
  descricao: string;
  /** Cenário com achado alterado: a personalização de normalidade não se aplica. */
  patologico?: boolean;
  /**
   * Cenário de referência para mostrar O QUE ESTE ACHADO MUDA no modelo.
   * Só faz sentido em variações de achado sobre o mesmo modelo (ILA, oligoâmnio,
   * placenta prévia). Variações estruturais — gestação inicial, gemelar — usam
   * outro modelo e não se comparam com o padrão.
   */
  comparaCom?: string;
  findings: ObstetricaFindings;
};

export const OBSTETRICA_SAMPLES: Sample[] = [
  {
    id: "padrao",
    nome: "Gestação de 32 semanas",
    descricao: "Feto único, biometria completa, exame sem alterações.",
    findings: f(),
  },
  {
    id: "inicial",
    nome: "Gestação inicial (8 semanas)",
    descricao: "Saco gestacional, CCN e vesícula vitelina — o modelo do primeiro trimestre.",
    findings: f({
      gestacao_inicial: true, ig_semanas: 8, ig_dias: 2,
      saco_gestacional_medidas_mm: [20.3, 10.4, 15.4],
      fetos: [{ ...FETO, bcf_bpm: 158, ccn_mm: 16.4, dbp_mm: null, cc_mm: null, ca_mm: null, cf_mm: null, peso_g: null }],
    }),
  },
  {
    id: "gemelar",
    nome: "Gestação gemelar",
    descricao: "Dois fetos, com peso médio e divergência ponderal calculados.",
    findings: f({
      numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
      fetos: [
        { ...FETO, rotulo: "A", bcf_bpm: 140, peso_g: 2100 },
        { ...FETO, rotulo: "B", bcf_bpm: 148, dbp_mm: 83, peso_g: 2380, posicao_relativa: "à direita" },
      ],
    }),
  },
  {
    id: "ila",
    nome: "Com ILA medido",
    descricao: "O médico mediu o índice de líquido amniótico em vez de avaliar subjetivamente.",
    comparaCom: "padrao",
    findings: f({ liquido_tipo: "ila", liquido_ila_cm: 12.4 }),
  },
  {
    id: "mbv",
    nome: "Com maior bolsão vertical",
    descricao: "O médico mediu o maior bolsão vertical em vez de avaliar subjetivamente.",
    comparaCom: "padrao",
    findings: f({ liquido_tipo: "mbv", liquido_mbv_por_feto_cm: [1.3] }),
  },
  {
    id: "placenta-previa",
    nome: "Placenta prévia",
    descricao: "O médico descreveu placenta prévia centro-total, grau II.",
    patologico: true,
    comparaCom: "padrao",
    findings: f({ placenta_localizacao: "prévia centro-total", placenta_grau: "2" }),
  },
  {
    id: "oligoamnio",
    nome: "Oligoâmnio",
    descricao: "O médico constatou oligoâmnio.",
    patologico: true,
    comparaCom: "padrao",
    findings: f({ liquido_tipo: "alterado", liquido_classe: "oligoâmnio" }),
  },
];

export function sampleById(id: string): Sample | undefined {
  return OBSTETRICA_SAMPLES.find((s) => s.id === id);
}
