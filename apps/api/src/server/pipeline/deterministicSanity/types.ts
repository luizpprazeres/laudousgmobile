export interface SanityFlag {
  severity: 'warning'
  code: string
  message: string
  suggestion?: string
}

export interface ExtractedValues {
  // ── Obstétrica / Morfológico ────────────────────────────────────────────
  ig_weeks?: number
  ig_dum_days?: number    // IG por DUM em dias totais (W*7+D)
  ig_ccn_days?: number    // IG por CCN/CRL em dias totais (W*7+D) — válido só 1º trimestre
  fetal_weight_g?: number
  bcf_bpm?: number
  ila_cm?: number
  mbv_cm?: number
  colo_mm?: number
  nt_mm?: number
  // Descritores qualitativos obstétricos
  ila_qual?: 'normal' | 'aumentado' | 'reduzido'
  bcf_qual?: 'normal' | 'bradicardia' | 'taquicardia'
  // Doppler obstétrico
  ip_umbilical?: number
  ip_acm?: number
  ip_uterina?: number
  doppler_qual?: 'normal' | 'elevado' | 'reduzido' | 'ausente' | 'reverso'
  // Mamária
  birads?: number
  birads_qual?: 'benigno' | 'suspeito' | 'maligno'
  suspicious_descriptors?: string[]

  // ── Pelve Feminina ──────────────────────────────────────────────────────
  endometrio_mm?: number
  utero_vol_ml?: number
  ovario_vol_ml?: number
  cisto_max_mm?: number
  o_rads?: number
  menciona_posmenopause?: boolean
  endometrio_qual?: 'normal' | 'espessado' | 'atrofico'
  menciona_hipotese_endometrio?: boolean
  menciona_hipotese_ovario?: boolean

  // ── Tireoide ────────────────────────────────────────────────────────────
  tirads_cat?: 'TR1' | 'TR2' | 'TR3' | 'TR4' | 'TR5'
  nodulo_max_mm?: number
  tireoide_vol_ml?: number
  tem_paaf_conduta?: boolean
  tem_seguimento?: boolean
  calc_puntiformes?: boolean

  // ── Abdômen Total ───────────────────────────────────────────────────────
  higado_cm?: number
  vbp_mm?: number
  rim_d_cm?: number
  rim_e_cm?: number
  pelve_renal_max_mm?: number
  baco_cm?: number
  aorta_mm?: number
  vesicula_normal?: boolean
  menciona_hepatopatia?: boolean
  menciona_hepatopatia_cronica?: boolean
  menciona_causa_vbp?: boolean
  menciona_causa_aneurisma?: boolean
  menciona_esplenomegalia_causa?: boolean
  menciona_atrofia_renal?: boolean

  // ── Doppler Vascular ────────────────────────────────────────────────────
  psv_cms?: number
  ir_vascular?: number
  edv_cms?: number
  estenose_grau?: number
  menciona_estenose?: boolean
  menciona_trombose?: boolean
  menciona_fluxo_reverso?: boolean

  // ── Musculoesquelético ──────────────────────────────────────────────────
  espessura_tendao_mm?: number
  menciona_rotura?: boolean
  rotura_tipo?: 'parcial' | 'total'
  efusao_articular?: boolean
  menciona_calcificacao_tendao?: boolean
  lateralidade_informada?: boolean
  menciona_hipotese_tendao?: boolean
  menciona_tendinite_calcificante?: boolean

  // ── Vias Urinárias ──────────────────────────────────────────────────────
  volume_residual_ml?: number
  bexiga_parede_mm?: number
  prostata_vol_ml?: number
  ureter_mm?: number
  rim_pelve_mm?: number
  menciona_bexiga_normal?: boolean

  // ── Escrotal ────────────────────────────────────────────────────────────
  testiculo_d_vol_ml?: number
  testiculo_e_vol_ml?: number
  varicocele_mm?: number
  menciona_valsalva?: boolean
  menciona_varicocele?: boolean
  menciona_microlitíase?: boolean
  menciona_medida_testicular?: boolean

  // ── Cervical ────────────────────────────────────────────────────────────
  linfonodo_mm?: number
  menciona_linfonodo?: boolean
  menciona_doppler_linfonodo?: boolean

  // ── Partes Moles ────────────────────────────────────────────────────────
  lesao_max_mm?: number
  lesao_solida?: boolean
  menciona_doppler_lesao?: boolean
  menciona_margem_lesao?: boolean

  // ── Região Inguinal ─────────────────────────────────────────────────────
  menciona_hernia?: boolean
  hernia_tipo?: 'direta' | 'indireta' | 'femoral'
  hernia_conteudo?: string
  hernia_lateralidade?: 'direita' | 'esquerda' | 'bilateral'
  menciona_urgencia_hernia?: boolean

  // ── Parede Abdominal ────────────────────────────────────────────────────
  diastase_cm?: number
  colo_herniario_mm?: number
  menciona_diastase?: boolean
  menciona_hernia_parede?: boolean
  menciona_conteudo_herniario?: boolean

  // ── Genérico (dimensão maior de qualquer estrutura) ────────────────────
  dimensao_maior_cm?: number

  // ── Próstata Transretal ────────────────────────────────────────────────
  volume_prostatico_cm3?: number
  residuo_pos_miccional_ml?: number

  // ── Transfontanela ────────────────────────────────────────────────────
  indice_levene_mm?: number

  // ── Doppler Fístula AV ────────────────────────────────────────────────
  volume_fluxo_ml_min?: number

  // ── Abdômen Total com Doppler ─────────────────────────────────────────
  calibre_porta_cm?: number
  velocidade_porta_cms?: number
  menciona_fluxo_hepatofugal?: boolean

  // ── Doppler Renal ─────────────────────────────────────────────────────
  rar_renal?: number
  psv_renal_cms?: number
  ir_intraparenquimatoso?: number

  // ── Ocular ────────────────────────────────────────────────────────────
  onsd_mm?: number

  // ── Tórax ────────────────────────────────────────────────────────────
  derrame_pleural_mm?: number

  // ── Quadril Infantil ────────────────────────────────────────────────
  alfa_angle_deg?: number
  beta_angle_deg?: number
}

export interface SanityResult {
  flags: SanityFlag[]
  extractedValues: ExtractedValues
}
