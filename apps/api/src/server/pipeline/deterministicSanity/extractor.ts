import type { ExtractedValues } from './types'

/** Extrai número de um match de regex, aceitando vírgula como decimal. */
function num(match: RegExpMatchArray | null, group = 1): number | undefined {
  if (!match) return undefined
  const raw = match[group]
  if (!raw) return undefined
  const val = parseFloat(raw.replace(',', '.'))
  return isNaN(val) ? undefined : val
}

/** Testa se o texto contém qualquer um dos padrões. */
function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

export function extractValues(text: string): ExtractedValues {
  const t = text.toLowerCase()
  const v: ExtractedValues = {}

  // ── IG (semanas) ────────────────────────────────────────────────────────
  const igMatch =
    t.match(/\big\s*(?:de\s+)?(\d{1,2})\s*(?:semanas?|sem\b)/i) ??
    t.match(/idade\s+gestacional\s*(?:de\s+)?(\d{1,2})\s*semanas?/i) ??
    t.match(/(?:com|hoje\s+com)\s+(\d{1,2})\s*(?:semanas?|sem\b)/i) ??
    t.match(/(\d{1,2})\s*semanas?\s*(?:e\s+\d\s*dias?)?(?:\s*de\s+gestação)?/i)
  if (igMatch) {
    const w = num(igMatch)
    if (w && w >= 5 && w <= 44) v.ig_weeks = w
  }

  // ── IG por DUM e por CCN/CRL (dias totais) ──────────────────────────────
  // Usados para detectar discordância DUM × CCN no 1º trimestre (ACOG 2022).
  const dumWD =
    t.match(/(?:ig|idade\s+gestacional)\s*(?:por|pela|pelo|\(|:)\s*dum[^\d]{0,30}(\d{1,2})\s*sem(?:anas?)?(?:\s*e\s*(\d)\s*dias?)?/i) ??
    t.match(/dum[^.\n]{0,40}?\b(\d{1,2})\s*sem(?:anas?)?\s*e\s*(\d)\s*dias?/i)
  if (dumWD) {
    const w = parseInt(dumWD[1] ?? '', 10)
    const d = dumWD[2] ? parseInt(dumWD[2], 10) : 0
    if (w >= 5 && w <= 44 && d >= 0 && d <= 6) v.ig_dum_days = w * 7 + d
  }

  const ccnWD =
    t.match(/(?:ig|idade\s+gestacional)\s*(?:por|pela|pelo|\(|:)\s*(?:ccn|crl)[^\d]{0,30}(\d{1,2})\s*sem(?:anas?)?(?:\s*e\s*(\d)\s*dias?)?/i) ??
    t.match(/(?:ccn|crl)[^.\n]{0,60}?(?:compat[íi]vel\s+com|sugere|indica|equivale\s+a|para)\s*(\d{1,2})\s*sem(?:anas?)?(?:\s*e\s*(\d)\s*dias?)?/i)
  if (ccnWD) {
    const w = parseInt(ccnWD[1] ?? '', 10)
    const d = ccnWD[2] ? parseInt(ccnWD[2], 10) : 0
    if (w >= 5 && w <= 14 && d >= 0 && d <= 6) v.ig_ccn_days = w * 7 + d
  }

  // ── Peso fetal (gramas) ─────────────────────────────────────────────────
  const pesoMatch =
    t.match(/peso\s+(?:fetal|estimado)\s*(?:de\s+|[=:]\s*)([0-9]{2,5}(?:[.,]\d+)?)\s*g(?:ramas?)?/i) ??
    t.match(/efw\s*(?:de\s+|[=:]\s*)([0-9]{2,5}(?:[.,]\d+)?)\s*g/i) ??
    t.match(/([0-9]{2,5})\s*g(?:ramas?)?\s*(?:\(peso|peso)/i)
  if (pesoMatch) {
    const w = num(pesoMatch)
    if (w && w >= 5 && w <= 8000) v.fetal_weight_g = w
  }

  // ── BCF (bpm) ───────────────────────────────────────────────────────────
  const bcfMatch =
    t.match(/bcf\s*(?:de\s+|[=:]\s*)?(\d{2,3})\s*bpm/i) ??
    t.match(/batimentos?\s*(?:card[ií]acos?\s*fetais?\s*)?(?:de\s+|[=:]\s*)?(\d{2,3})\s*bpm/i) ??
    t.match(/fcf?\s*(?:de\s+|[=:]\s*)?(\d{2,3})\s*bpm/i) ??
    t.match(/(\d{2,3})\s*bpm/i)
  if (bcfMatch) {
    const w = num(bcfMatch)
    if (w && w >= 50 && w <= 280) v.bcf_bpm = w
  }

  // ── ILA (cm) ────────────────────────────────────────────────────────────
  const ilaMatch =
    t.match(/ila\s*(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)\s*cm/i) ??
    t.match(/[íi]ndice\s+de\s+l[íi]quido\s+amni[óo]tico\s*(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)/i) ??
    t.match(/ila\s*[=:]\s*([0-9]{1,3}(?:[.,]\d+)?)/i)
  if (ilaMatch) {
    const w = num(ilaMatch)
    if (w !== undefined && w >= 0) v.ila_cm = w
  }

  // ── Maior bolsão vertical (cm) ─────────────────────────────────────────
  const mbvMatch =
    t.match(/maior\s+bol[sS][aã]o\s+(?:vertical\s+)?(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)\s*cm/i) ??
    t.match(/mbv\s*(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)/i) ??
    t.match(/bol[sS][aã]o\s+(?:vertical\s+)?(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)\s*cm/i)
  if (mbvMatch) {
    const w = num(mbvMatch)
    if (w !== undefined && w >= 0) v.mbv_cm = w
  }

  // ── Colo uterino (mm) ──────────────────────────────────────────────────
  const coloMatch =
    t.match(/colo\s+uterino\s*(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/comprimento\s+(?:do\s+)?colo\s*(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)/i) ??
    t.match(/colo\s*[=:]\s*([0-9]{1,3}(?:[.,]\d+)?)\s*mm/i)
  if (coloMatch) {
    const w = num(coloMatch)
    if (w && w >= 1) v.colo_mm = w
  }

  // ── NT (nucal translucência, mm) ───────────────────────────────────────
  const ntMatch =
    t.match(/nt\s*(?:de\s+|[=:]\s*)([0-9]{1,2}(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/transluc[êe]ncia\s+nucal\s*(?:de\s+|[=:]\s*)([0-9]{1,2}(?:[.,]\d+)?)/i) ??
    t.match(/transluc[êe]ncia\s+nuccal\s*(?:de\s+|[=:]\s*)([0-9]{1,2}(?:[.,]\d+)?)/i)
  if (ntMatch) {
    const w = num(ntMatch)
    if (w && w >= 0.5) v.nt_mm = w
  }

  // ── IP Umbilical ────────────────────────────────────────────────────────
  const ipUmbMatch =
    t.match(/ip\s+(?:da\s+)?art[eé]ria\s+umbilical\s*(?:de\s+|[=:]\s*)([0-9]{1}(?:[.,]\d+)?)/i) ??
    t.match(/ip\s+umbilical\s*(?:de\s+|[=:]\s*)([0-9]{1}(?:[.,]\d+)?)/i)
  if (ipUmbMatch) {
    const w = num(ipUmbMatch)
    if (w !== undefined) v.ip_umbilical = w
  }

  // ── IP ACM ──────────────────────────────────────────────────────────────
  const ipAcmMatch =
    t.match(/ip\s+(?:da\s+)?art[eé]ria\s+cerebral\s+m[eé]dia\s*(?:de\s+|[=:]\s*)([0-9]{1}(?:[.,]\d+)?)/i) ??
    t.match(/ip\s+acm\s*(?:de\s+|[=:]\s*)([0-9]{1}(?:[.,]\d+)?)/i) ??
    t.match(/acm\s*[=:]\s*([0-9]{1}(?:[.,]\d+)?)/i)
  if (ipAcmMatch) {
    const w = num(ipAcmMatch)
    if (w !== undefined) v.ip_acm = w
  }

  // ── IP Uterinas ─────────────────────────────────────────────────────────
  const ipUtMatch =
    t.match(/ip\s+(?:das?\s+)?art[eé]rias?\s+uterinas?\s*(?:de\s+|[=:]\s*)([0-9]{1}(?:[.,]\d+)?)/i) ??
    t.match(/ip\s+uterinas?\s*(?:de\s+|[=:]\s*)([0-9]{1}(?:[.,]\d+)?)/i)
  if (ipUtMatch) {
    const w = num(ipUtMatch)
    if (w !== undefined) v.ip_uterina = w
  }

  // ── BIRADS ──────────────────────────────────────────────────────────────
  const biradsMatch =
    t.match(/bi[-\s]?rads\s*[=:–-]?\s*(\d)/i) ??
    t.match(/birads\s*[=:–-]?\s*(\d)/i) ??
    t.match(/categoria\s+bi[-\s]?rads\s*[=:–-]?\s*(\d)/i)
  if (biradsMatch) {
    const w = num(biradsMatch)
    if (w !== undefined && w >= 0 && w <= 6) v.birads = w
  }

  // ── Qualitativo ILA ─────────────────────────────────────────────────────
  if (
    hasAny(t, [
      /\bl[íi]quido\s+amni[óo]tico\s+normal/i,
      /ila\s+normal/i,
      /l[íi]quido\s+amni[óo]tico\s+em\s+volume\s+normal/i,
      /volume\s+normal\s+de\s+l[íi]quido/i,
    ])
  ) {
    v.ila_qual = 'normal'
  } else if (
    hasAny(t, [/polid\w+mnio/i, /polihi\w+mnio/i, /l[íi]quido\s+(?:amni[óo]tico\s+)?aumentado/i])
  ) {
    v.ila_qual = 'aumentado'
  } else if (
    hasAny(t, [/oligod\w+mnio/i, /oligohi\w+mnio/i, /l[íi]quido\s+(?:amni[óo]tico\s+)?(?:reduzido|diminu[íi]do|escasso)/i])
  ) {
    v.ila_qual = 'reduzido'
  }

  // ── Qualitativo BCF ─────────────────────────────────────────────────────
  if (hasAny(t, [/bcf\s+normal/i, /ritmo\s+card[íi]aco\s+normal/i, /batimentos\s+(?:card[íi]acos?\s*fetais?\s*)?normais?/i])) {
    v.bcf_qual = 'normal'
  } else if (hasAny(t, [/bradicardia/i])) {
    v.bcf_qual = 'bradicardia'
  } else if (hasAny(t, [/taquicardia/i])) {
    v.bcf_qual = 'taquicardia'
  }

  // ── Qualitativo Doppler ─────────────────────────────────────────────────
  if (hasAny(t, [/fluxo\s+normal/i, /ip\s+normal/i, /dopplervelocimetria\s+normal/i, /velocimetria\s+normal/i])) {
    v.doppler_qual = 'normal'
  } else if (hasAny(t, [/fluxo\s+(?:diastólico\s+)?(?:ausente|zero)/i, /di[aá]stole\s+(?:zero|ausente)/i])) {
    v.doppler_qual = 'ausente'
  } else if (hasAny(t, [/fluxo\s+(?:diastólico\s+)?reverso/i, /di[aá]stole\s+reversa/i])) {
    v.doppler_qual = 'reverso'
  } else if (hasAny(t, [/ip\s+(?:elevado|aumentado)/i, /resist[eê]ncia\s+(?:elevada|aumentada)/i])) {
    v.doppler_qual = 'elevado'
  } else if (hasAny(t, [/ip\s+(?:reduzido|diminu[íi]do)/i])) {
    v.doppler_qual = 'reduzido'
  }

  // ── Qualitativo BIRADS ──────────────────────────────────────────────────
  if (hasAny(t, [/(?:aspecto|caracter[íi]sticas?)\s+(?:tranquilizador|benigno)/i, /benigno/i, /tranquilizador/i])) {
    v.birads_qual = 'benigno'
  } else if (hasAny(t, [/altamente\s+suspeito/i, /altamente\s+sugestiv/i, /maligno/i])) {
    v.birads_qual = 'maligno'
  } else if (hasAny(t, [/suspeito/i, /sugestiv[ao]\s+de\s+malignidade/i])) {
    v.birads_qual = 'suspeito'
  }

  // ── Descritores suspeitos de mama ───────────────────────────────────────
  const suspectDescriptors: Array<[RegExp, string]> = [
    [/espiculad[ao]/i, 'espiculado'],
    [/margens?\s+irregulares?/i, 'margens irregulares'],
    [/hipoecog[eê]nico/i, 'hipoecogênico'],
    [/vasculariza[cç][aã]o\s+aumentada/i, 'vascularização aumentada'],
    [/microc[aá]lcif/i, 'microcalcificações'],
    [/sombra\s+ac[uú]stica/i, 'sombra acústica'],
    [/duc(?:to|tal)s?\s+dilata/i, 'ductos dilatados'],
  ]
  const found = suspectDescriptors.filter(([re]) => re.test(t)).map(([, label]) => label)
  if (found.length > 0) v.suspicious_descriptors = found

  // ── PELVE FEMININA ──────────────────────────────────────────────────────
  const endometrioMatch =
    t.match(/endom[eé]trio\s*(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/espessura\s+(?:do\s+)?endom[eé]trio\s*(?:de\s+|[=:]\s*)([0-9]{1,3}(?:[.,]\d+)?)/i)
  if (endometrioMatch) {
    const w = num(endometrioMatch)
    if (w !== undefined && w >= 1 && w <= 40) v.endometrio_mm = w
  }

  const ovarioVolMatch =
    t.match(/ov[aá]rio\s*(?:direito|esquerdo|d|e)?\s*(?:de\s+|[=:]\s*)?(?:[0-9,.]+ ?[xX×] ?[0-9,.]+ ?[xX×]?\s*[0-9,.]*\s*(?:cm|mm)?[^,\n]*)?(?:volume|vol)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i) ??
    t.match(/volume\s+ov[aá]rico\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i)
  if (ovarioVolMatch) {
    const w = num(ovarioVolMatch)
    if (w !== undefined && w >= 0.5 && w <= 200) v.ovario_vol_ml = w
  }

  const cistoMatch =
    t.match(/cisto\s*(?:[^.]*?)\s*([0-9]+(?:[.,]\d+)?)\s*(cm|mm)/i)
  if (cistoMatch) {
    const raw = num(cistoMatch)
    if (raw !== undefined) {
      const isCm = cistoMatch[0].includes('cm')
      const val = isCm ? raw * 10 : raw
      if (val >= 1 && val <= 300) v.cisto_max_mm = val
    }
  }

  const oradsMatch =
    t.match(/o-?rads\s*[=:–-]?\s*([1-6])/i) ??
    t.match(/o\s*rads\s*(?:categoria\s*)?([1-6])/i)
  if (oradsMatch) {
    const w = num(oradsMatch)
    if (w !== undefined && w >= 1 && w <= 6) v.o_rads = w
  }

  v.menciona_posmenopause = hasAny(t, [
    /p[oó]s.?menop[ao]us/i,
    /p[oó]s.?menop[ao]usa/i,
    /menopausa/i,
    /p[oó]s.?climatér/i,
  ])

  v.menciona_hipotese_endometrio = hasAny(t, [
    /hiperplasia/i,
    /neoplas/i,
    /p[oó]lipo/i,
    /maligno/i,
    /tamoxifeno/i,
    /c[aâ]ncer/i,
    /carcinoma/i,
  ])

  v.menciona_hipotese_ovario = hasAny(t, [
    /pcos/i,
    /policist/i,
    /tor[cç][aã]o/i,
    /endomet/i,
    /neoplas/i,
    /suspeito/i,
    /teratoma/i,
    /dermoid/i,
  ])

  // ── TIREOIDE ─────────────────────────────────────────────────────────────
  const tiradsMatch =
    t.match(/tr\s*([1-5])\b/i) ??
    t.match(/ti-?rads\s*(?:categoria\s*)?([1-5])\b/i) ??
    t.match(/acr\s+ti-?rads\s*([1-5])/i)
  if (tiradsMatch) {
    const cat = tiradsMatch[1] ?? ''
    if (['1', '2', '3', '4', '5'].includes(cat)) {
      v.tirads_cat = `TR${cat}` as 'TR1' | 'TR2' | 'TR3' | 'TR4' | 'TR5'
    }
  }

  const noduloMatch =
    t.match(/n[oó]dulo\s*(?:[^.]*?)\s*([0-9]+(?:[.,]\d+)?)\s*(cm|mm)/i)
  if (noduloMatch) {
    const raw = num(noduloMatch)
    if (raw !== undefined) {
      const isCm = noduloMatch[0].includes('cm')
      const val = isCm ? raw * 10 : raw
      if (val >= 1 && val <= 200) v.nodulo_max_mm = val
    }
  }

  const tireoideVolMatch =
    t.match(/volume\s+(?:total\s+)?(?:da\s+)?tireoide\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i) ??
    t.match(/tireoide.*?volume\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (tireoideVolMatch) {
    const w = num(tireoideVolMatch)
    if (w !== undefined && w >= 1 && w <= 200) v.tireoide_vol_ml = w
  }

  v.tem_paaf_conduta = hasAny(t, [
    /paaf/i,
    /bi[oó]psia/i,
    /pun[cç][aã]o/i,
    /citologia/i,
  ])

  v.tem_seguimento = hasAny(t, [
    /seguimento/i,
    /controle/i,
    /acompanhamento/i,
    /retorno/i,
    /reavalia[cç][aã]o/i,
    /repetir/i,
  ])

  v.calc_puntiformes = hasAny(t, [
    /calcifica[cç][oõ]es?\s+puntiformes?/i,
    /microcalcifica[cç]/i,
    /calc[íi]ficas?\s+puntif/i,
  ])

  // ── ABDÔMEN TOTAL ────────────────────────────────────────────────────────
  const figadoMatch =
    t.match(/f[íi]gado\s*(?:[^.]*?(?:lobo\s+direito\s*)?(?:de\s+|[=:]\s*))?([0-9]+(?:[.,]\d+)?)\s*cm/i) ??
    t.match(/lobo\s+direito\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*cm/i)
  if (figadoMatch) {
    const w = num(figadoMatch)
    if (w !== undefined && w >= 5 && w <= 35) v.higado_cm = w
  }

  const vbpMatch =
    t.match(/via\s+biliar\s+principal\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/\bvbp\b\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/col[eé]doco\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i)
  if (vbpMatch) {
    const w = num(vbpMatch)
    if (w !== undefined && w >= 1 && w <= 30) v.vbp_mm = w
  }

  const rimDMatch =
    t.match(/rim\s+direito\s*(?:[^.]*?(?:de\s+|[=:]\s*))?([0-9]+(?:[.,]\d+)?)\s*cm/i)
  if (rimDMatch) {
    const w = num(rimDMatch)
    if (w !== undefined && w >= 4 && w <= 20) v.rim_d_cm = w
  }

  const rimEMatch =
    t.match(/rim\s+esquerdo\s*(?:[^.]*?(?:de\s+|[=:]\s*))?([0-9]+(?:[.,]\d+)?)\s*cm/i)
  if (rimEMatch) {
    const w = num(rimEMatch)
    if (w !== undefined && w >= 4 && w <= 20) v.rim_e_cm = w
  }

  const pelveRenalMatch =
    t.match(/pielect[aá]sia\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/pelve\s+renal\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/dilata[cç][aã]o\s+(?:da\s+)?pelve\s+renal\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (pelveRenalMatch) {
    const w = num(pelveRenalMatch)
    if (w !== undefined && w >= 1 && w <= 50) {
      v.pelve_renal_max_mm = w
      v.rim_pelve_mm = w  // alias para VIAS_URINARIAS
    }
  }

  const bacoMatch =
    t.match(/ba[cç]o\s*(?:[^.]*?(?:de\s+|[=:]\s*))?([0-9]+(?:[.,]\d+)?)\s*cm/i)
  if (bacoMatch) {
    const w = num(bacoMatch)
    if (w !== undefined && w >= 3 && w <= 30) v.baco_cm = w
  }

  const aortaMatch =
    t.match(/aorta\s*(?:abdominal\s*)?(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/di[aâ]metro\s+(?:da\s+)?aorta\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (aortaMatch) {
    const w = num(aortaMatch)
    if (w !== undefined && w >= 5 && w <= 100) v.aorta_mm = w
  }

  v.vesicula_normal = hasAny(t, [
    /ves[íi]cula\s+biliar\s+(?:de\s+)?aspecto\s+normal/i,
    /ves[íi]cula\s+(?:biliar\s+)?sem\s+altera[cç][oõ]es?/i,
    /ves[íi]cula\s+normal/i,
  ])

  v.menciona_hepatopatia = hasAny(t, [
    /esteatose/i,
    /cirrose/i,
    /hepatit/i,
    /met[aá]stase/i,
    /congest[aã]o/i,
    /hepatomegalia/i,
    /f[íi]gado\s+aumentado/i,
  ])

  v.menciona_hepatopatia_cronica = hasAny(t, [
    /cirrose/i,
    /atrofia\s+hep[aá]tica/i,
    /f[íi]gado\s+(?:pequeno|reduzido)/i,
    /hepatopatia\s+cr[oô]nica/i,
  ])

  v.menciona_causa_vbp = hasAny(t, [
    /lit[íi]ase/i,
    /c[aá]lculo/i,
    /col[eé]doco.*dilat/i,
    /estenose/i,
    /obstru/i,
    /colangite/i,
    /neoplas/i,
  ])

  v.menciona_causa_aneurisma = hasAny(t, [
    /aneurisma/i,
    /ectasia/i,
    /dilata[cç][aã]o\s+(?:da\s+)?aorta/i,
  ])

  v.menciona_esplenomegalia_causa = hasAny(t, [
    /esplenomegalia/i,
    /hipertens[aã]o\s+portal/i,
    /hemat[oó]log/i,
    /linfoma/i,
    /leucemia/i,
    /mononucleose/i,
  ])

  v.menciona_atrofia_renal = hasAny(t, [
    /atrofia\s+renal/i,
    /rim\s+(?:cr[oô]nico|atrófico|pequeno)/i,
    /doen[cç]a\s+renal\s+cr[oô]nica/i,
  ])

  // ── DOPPLER VASCULAR ─────────────────────────────────────────────────────
  const psvMatch =
    t.match(/psv\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:cm\/s|cms)/i) ??
    t.match(/velocidade\s+(?:de\s+pico\s+)?sistólica\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (psvMatch) {
    const w = num(psvMatch)
    if (w !== undefined && w >= 10 && w <= 600) v.psv_cms = w
  }

  const irMatch =
    t.match(/\bir\s*[=:]\s*([0-9](?:[.,]\d+)?)/i) ??
    t.match(/[íi]ndice\s+de\s+resist[eê]ncia\s*(?:de\s+|[=:]\s*)([0-9](?:[.,]\d+)?)/i)
  if (irMatch) {
    const w = num(irMatch)
    if (w !== undefined && w >= 0 && w <= 2) v.ir_vascular = w
  }

  const edvMatch =
    t.match(/edv\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:cm\/s|cms)/i) ??
    t.match(/velocidade\s+(?:de\s+)?diastólica\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (edvMatch) {
    const w = num(edvMatch)
    if (w !== undefined && w >= 0 && w <= 300) v.edv_cms = w
  }

  const estenoseGrauMatch =
    t.match(/estenose\s*(?:de\s+|[=:]\s*)?(\d{2,3})\s*%/i) ??
    t.match(/(\d{2,3})\s*%\s*(?:de\s+)?estenose/i)
  if (estenoseGrauMatch) {
    const w = num(estenoseGrauMatch)
    if (w !== undefined && w >= 1 && w <= 100) v.estenose_grau = w
  }

  v.menciona_estenose = hasAny(t, [/estenose/i, /stenose/i, /estenos/i])
  v.menciona_trombose = hasAny(t, [/trombose/i, /\btvp\b/i, /trombo\b/i])
  v.menciona_fluxo_reverso = hasAny(t, [
    /fluxo\s+reverso/i,
    /di[aá]stole\s+reversa/i,
    /fluxo\s+retrógrado/i,
  ])

  // ── MUSCULOESQUELÉTICO ───────────────────────────────────────────────────
  const tendaoMatch =
    t.match(/esp(?:essura|essamento)\s+(?:do\s+)?tend[aã]o\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/tend[aã]o\s*(?:[^.]*?)\s*([0-9]+(?:[.,]\d+)?)\s*mm/i)
  if (tendaoMatch) {
    const w = num(tendaoMatch)
    if (w !== undefined && w >= 1 && w <= 50) v.espessura_tendao_mm = w
  }

  v.menciona_rotura = hasAny(t, [/rotura/i, /ruptura/i, /lac[ae]ra[cç][aã]o/i])

  if (hasAny(t, [/rotura\s+parcial/i, /ruptura\s+parcial/i, /parcialmente\s+romp/i])) {
    v.rotura_tipo = 'parcial'
  } else if (hasAny(t, [/rotura\s+(?:total|completa)/i, /ruptura\s+(?:total|completa)/i, /completamente\s+romp/i])) {
    v.rotura_tipo = 'total'
  }

  v.efusao_articular = hasAny(t, [
    /ef[uú]s[aã]o\s+articular/i,
    /derrame\s+articular/i,
    /l[íi]quido\s+(?:intra-?articular|articular)/i,
  ])

  v.menciona_calcificacao_tendao = hasAny(t, [
    /calcifica[cç][aã]o\s+tend[íi]nea/i,
    /calcifica[cç][aã]o\s+(?:em|no|no\s+tend[aã]o)/i,
    /dep[oó]sito\s+c[aá]lcico/i,
  ])

  v.lateralidade_informada = hasAny(t, [
    /direito\b/i,
    /esquerdo\b/i,
    /bilateral/i,
    /\bD\b/,
    /\bE\b/,
  ])

  v.menciona_hipotese_tendao = hasAny(t, [
    /tendinit/i,
    /tendinop/i,
    /rotura/i,
    /fibrose/i,
    /calcif/i,
    /cr[oô]nica/i,
  ])

  v.menciona_tendinite_calcificante = hasAny(t, [
    /tendinite\s+calcif/i,
    /calcificante/i,
    /doen[cç]a\s+por\s+dep[oó]sito/i,
  ])

  // ── VIAS URINÁRIAS ───────────────────────────────────────────────────────
  const volResidualMatch =
    t.match(/volume\s+residual\s*(?:p[oó]s.?mic[cç][aã]o\s*)?(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i) ??
    t.match(/residual\s+(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*ml/i) ??
    t.match(/pvr\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (volResidualMatch) {
    const w = num(volResidualMatch)
    if (w !== undefined && w >= 0 && w <= 1000) v.volume_residual_ml = w
  }

  const bexigaParedeMatch =
    t.match(/parede\s+(?:da\s+)?bexiga\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/espessura\s+(?:da\s+)?parede\s+vesical\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (bexigaParedeMatch) {
    const w = num(bexigaParedeMatch)
    if (w !== undefined && w >= 1 && w <= 30) v.bexiga_parede_mm = w
  }

  const prostataMatch =
    t.match(/pr[oó]stata\s*(?:[^.]*?)\s*(?:volume|vol)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i) ??
    t.match(/volume\s+(?:da\s+)?pr[oó]stata\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (prostataMatch) {
    const w = num(prostataMatch)
    if (w !== undefined && w >= 5 && w <= 500) v.prostata_vol_ml = w
  }

  const ureterMatch =
    t.match(/ureter\s*(?:[^.]*?(?:de\s+|[=:]\s*))?([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/dilata[cç][aã]o\s+(?:do\s+)?ureter\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (ureterMatch) {
    const w = num(ureterMatch)
    if (w !== undefined && w >= 1 && w <= 30) v.ureter_mm = w
  }

  v.menciona_bexiga_normal = hasAny(t, [
    /bexiga\s+(?:de\s+)?aspecto\s+normal/i,
    /bexiga\s+sem\s+altera[cç][oõ]es?/i,
    /bexiga\s+normal/i,
    /parede\s+vesical\s+normal/i,
  ])

  // ── ESCROTAL ─────────────────────────────────────────────────────────────
  const testiculoDMatch =
    t.match(/test[íi]culo\s+(?:direito|d)\s*(?:[^.]*?)\s*(?:volume|vol)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i) ??
    t.match(/volume\s+test[íi]culo\s+(?:direito|d)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (testiculoDMatch) {
    const w = num(testiculoDMatch)
    if (w !== undefined && w >= 1 && w <= 100) v.testiculo_d_vol_ml = w
  }

  const testiculoEMatch =
    t.match(/test[íi]culo\s+(?:esquerdo|e)\s*(?:[^.]*?)\s*(?:volume|vol)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i) ??
    t.match(/volume\s+test[íi]culo\s+(?:esquerdo|e)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (testiculoEMatch) {
    const w = num(testiculoEMatch)
    if (w !== undefined && w >= 1 && w <= 100) v.testiculo_e_vol_ml = w
  }

  const varicoceleMatch =
    t.match(/varicocele\s*(?:[^.]*?)\s*(?:calibre|di[aâ]metro)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/veias?\s+(?:do\s+)?plex[ao]\s+pampiniforme\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i)
  if (varicoceleMatch) {
    const w = num(varicoceleMatch)
    if (w !== undefined && w >= 1 && w <= 20) v.varicocele_mm = w
  }

  v.menciona_valsalva = hasAny(t, [/valsalva/i, /manobra\s+de\s+val/i])
  v.menciona_varicocele = hasAny(t, [/varicocele/i, /varico/i])
  v.menciona_microlitíase = hasAny(t, [/microlit[íi]ase/i, /microlit[íi]ase\s+test/i, /microlitíase/i])
  v.menciona_medida_testicular = hasAny(t, [
    /test[íi]culo.*\d+\s*mm/i,
    /test[íi]culo.*\d+\s*(?:ml|cm)/i,
    /\d+\s*(?:ml|cm|mm).*test[íi]culo/i,
  ])

  // ── CERVICAL ─────────────────────────────────────────────────────────────
  const linfonodoMatch =
    t.match(/linfonodo\s*(?:[^.]*?)\s*(?:de\s+|[=:]\s*)?([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/n[oó]dulo\s+linf[aá]tico\s*(?:[^.]*?)\s*([0-9]+(?:[.,]\d+)?)\s*mm/i)
  if (linfonodoMatch) {
    const w = num(linfonodoMatch)
    if (w !== undefined && w >= 1 && w <= 100) v.linfonodo_mm = w
  }

  v.menciona_linfonodo = hasAny(t, [/linfonodo/i, /n[oó]dulo\s+linf/i, /adenopatia/i])
  v.menciona_doppler_linfonodo = hasAny(t, [
    /doppler.*linfonodo/i,
    /linfonodo.*doppler/i,
    /fluxo.*linfonodo/i,
    /vasculariza[cç][aã]o.*linfonodo/i,
  ])

  // ── PARTES MOLES ─────────────────────────────────────────────────────────
  const lesaoMatch =
    t.match(/les[aã]o\s*(?:[^.]*?)\s*(?:de\s+|[=:]\s*)?([0-9]+(?:[.,]\d+)?)\s*(cm|mm)/i)
  if (lesaoMatch) {
    const raw = num(lesaoMatch)
    if (raw !== undefined) {
      const isCm = lesaoMatch[0].includes('cm')
      const val = isCm ? raw * 10 : raw
      if (val >= 1 && val <= 300) v.lesao_max_mm = val
    }
  }

  v.lesao_solida = hasAny(t, [
    /les[aã]o\s+s[oó]lida/i,
    /componente\s+s[oó]lido/i,
    /ecogr[aá]fica\s+s[oó]lida/i,
    /massa\s+s[oó]lida/i,
  ])

  v.menciona_doppler_lesao = hasAny(t, [
    /doppler.*les[aã]o/i,
    /les[aã]o.*doppler/i,
    /fluxo.*les[aã]o/i,
    /vasculariza[cç][aã]o.*les[aã]o/i,
    /vasculariza[cç][aã]o\s+interna/i,
  ])

  v.menciona_margem_lesao = hasAny(t, [
    /margem/i,
    /borda/i,
    /contorno/i,
    /limite/i,
    /delimitad/i,
  ])

  // ── PAREDE ABDOMINAL ─────────────────────────────────────────────────────
  v.menciona_diastase = hasAny(t, [/di[aá]stase/i, /diastase/i])

  const diastaseMatch =
    t.match(/dist[aâ]ncia\s+(?:m[aá]xima\s+)?(?:entre\s+(?:os\s+)?(?:m[uú]sculos?\s+)?retos?\s*(?:abdominais?\s*)?(?:de\s+|[=:]\s*))?([0-9]+(?:[.,]\d+)?)\s*cm/i) ??
    t.match(/di[aá]stase\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*cm/i) ??
    t.match(/di[aá]stase\s*(?:dos\s+retos?\s*)?(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*cm/i)
  if (diastaseMatch) {
    const w = num(diastaseMatch)
    if (w !== undefined && w >= 0.5 && w <= 20) v.diastase_cm = w
  }

  v.menciona_hernia_parede = hasAny(t, [
    /h[eé]rnia\s+umbilical/i,
    /h[eé]rnia\s+epig[aá]strica/i,
    /h[eé]rnia\s+(?:de\s+)?parede/i,
    /h[eé]rnia\s+(?:da\s+)?cicatriz/i,
    /solu[cç][aã]o\s+de\s+continuidade\s+(?:da\s+)?parede/i,
  ])

  const coloHerniarioMatch =
    t.match(/colo\s+herni[aá]rio\s*(?:mede|de|[=:]\s*)?\s*([0-9]+(?:[.,]\d+)?)\s*(cm|mm)/i) ??
    t.match(/colo\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(cm|mm)/i)
  if (coloHerniarioMatch) {
    const raw = num(coloHerniarioMatch)
    if (raw !== undefined) {
      const isCm = coloHerniarioMatch[0].includes('cm')
      const val = isCm ? raw * 10 : raw
      if (val >= 1 && val <= 100) v.colo_herniario_mm = val
    }
  }

  v.menciona_conteudo_herniario = hasAny(t, [
    /passagem\s+de\s+gordura/i,
    /passagem\s+de\s+al[cç]a/i,
    /conte[uú]do\s+gorduroso/i,
    /gordura\s+(?:epiplóica|omental|préperi)/i,
    /al[cç]a\s+intestinal/i,
  ])

  // ── GENÉRICO — dimensão maior (cm) ──────────────────────────────────
  const dimensaoMaiorMatch =
    t.match(/(?:medindo|mede|de)\s+([0-9]+(?:[.,]\d+)?)\s*[xX×]\s*[0-9]+(?:[.,]\d+)?\s*(?:[xX×]\s*[0-9]+(?:[.,]\d+)?\s*)?cm/i) ??
    t.match(/([0-9]+(?:[.,]\d+)?)\s*cm\s*[xX×]/i)
  if (dimensaoMaiorMatch) {
    const w = num(dimensaoMaiorMatch)
    if (w !== undefined && w >= 0.1 && w <= 30) v.dimensao_maior_cm = w
  }

  // ── PRÓSTATA TRANSRETAL ────────────────────────────────────────────────
  const volumeProstaticoMatch =
    t.match(/pr[oó]stata\s*(?:[^.]*?)volume\s*(?:estimado\s*)?(?:de\s+|[=:~]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:cm[³3]|ml|cc)/i) ??
    t.match(/volume\s+(?:prost[aá]tico|da\s+pr[oó]stata)\s*(?:estimado\s*)?(?:de\s+|[=:~]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (volumeProstaticoMatch) {
    const w = num(volumeProstaticoMatch)
    if (w !== undefined && w >= 5 && w <= 500) v.volume_prostatico_cm3 = w
  }

  const residuoPMMatch =
    t.match(/res[íi]duo\s+p[oó]s.?miccional\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*(?:ml|cm[³3])/i) ??
    t.match(/volume\s+(?:p[oó]s.?miccional|residual)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (residuoPMMatch) {
    const w = num(residuoPMMatch)
    if (w !== undefined && w >= 0 && w <= 1000) v.residuo_pos_miccional_ml = w
  }

  // ── TRANSFONTANELA ─────────────────────────────────────────────────────
  const leveneMatch =
    t.match(/[íi]ndice\s+de\s+levene\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/levene\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (leveneMatch) {
    const w = num(leveneMatch)
    if (w !== undefined && w >= 1 && w <= 50) v.indice_levene_mm = w
  }

  // ── DOPPLER FÍSTULA AV ─────────────────────────────────────────────────
  const volumeFluxoMatch =
    t.match(/volume\s+(?:de\s+)?fluxo\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*ml\/min/i) ??
    t.match(/fluxo\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*ml\/min/i)
  if (volumeFluxoMatch) {
    const w = num(volumeFluxoMatch)
    if (w !== undefined && w >= 10 && w <= 5000) v.volume_fluxo_ml_min = w
  }

  // ── ABDÔMEN TOTAL COM DOPPLER ──────────────────────────────────────────
  const calibrePortaMatch =
    t.match(/(?:veia\s+)?porta\s*(?:[^.]*?)(?:calibre|espessura|di[aâ]metro)\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*cm/i) ??
    t.match(/(?:calibre|espessura)\s+(?:da\s+)?(?:veia\s+)?porta\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*cm/i)
  if (calibrePortaMatch) {
    const w = num(calibrePortaMatch)
    if (w !== undefined && w >= 0.3 && w <= 3) v.calibre_porta_cm = w
  }

  const velPortaMatch =
    t.match(/(?:veia\s+)?porta\s*(?:[^.]*?)velocidade\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)\s*cm\/s/i) ??
    t.match(/velocidade\s+(?:da\s+)?(?:veia\s+)?porta\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i)
  if (velPortaMatch) {
    const w = num(velPortaMatch)
    if (w !== undefined && w >= 1 && w <= 100) v.velocidade_porta_cms = w
  }

  v.menciona_fluxo_hepatofugal = hasAny(t, [
    /hepatofugal/i,
    /fluxo\s+(?:portal\s+)?retrógrado/i,
    /fluxo\s+(?:portal\s+)?invertido/i,
  ])

  // ── DOPPLER RENAL ────────────────────────────────────────────────────────
  const rarRenalMatch =
    t.match(/\brar\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i) ??
    t.match(/raz[aã]o\s+aorto.renal\s*(?:de\s+|[=:]\s*)([0-9]+(?:[.,]\d+)?)/i) ??
    t.match(/\brar\s*=\s*([0-9]+(?:[.,]\d+)?)/i)
  if (rarRenalMatch) {
    const w = num(rarRenalMatch)
    if (w !== undefined && w >= 0.5 && w <= 10) v.rar_renal = w
  }

  const psvRenalMatch =
    t.match(/art[eé]ria\s+renal.*?psv.*?([0-9]+(?:[.,]\d+)?)/i) ??
    t.match(/psv.*?renal.*?([0-9]+(?:[.,]\d+)?)/i) ??
    t.match(/psv.*?art.*?renal.*?([0-9]+(?:[.,]\d+)?)/i)
  if (psvRenalMatch) {
    const w = num(psvRenalMatch)
    if (w !== undefined && w >= 10 && w <= 600) v.psv_renal_cms = w
  }

  const irIntraparMatch =
    t.match(/ir\s+intraparenquimatoso\s*(?:de\s+|[=:]\s*)([0-9](?:[.,]\d+)?)/i) ??
    t.match(/ir\s+m[eé]dio\s*(?:de\s+|[=:]\s*)([0-9](?:[.,]\d+)?)/i)
  if (irIntraparMatch) {
    const w = num(irIntraparMatch)
    if (w !== undefined && w >= 0 && w <= 2) v.ir_intraparenquimatoso = w
  }

  const onsdMatch =
    t.match(/onsd\s+(?:de\s+)?([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/bainha\s+do\s+nervo\s+[oó]ptico\s+(?:de\s+)?([0-9]+(?:[.,]\d+)?)\s*mm/i) ??
    t.match(/di[aâ]metro\s+da\s+bainha\s+(?:[^.]*?)?([0-9]+(?:[.,]\d+)?)\s*mm/i)
  if (onsdMatch) {
    const w = num(onsdMatch)
    if (w !== undefined && w >= 1 && w <= 15) v.onsd_mm = w
  }

  // ── REGIÃO INGUINAL ──────────────────────────────────────────────────────
  v.menciona_hernia = hasAny(t, [/h[eé]rnia/i, /hernia/i])

  if (hasAny(t, [/h[eé]rnia\s+direta/i])) {
    v.hernia_tipo = 'direta'
  } else if (hasAny(t, [/h[eé]rnia\s+indireta/i])) {
    v.hernia_tipo = 'indireta'
  } else if (hasAny(t, [/h[eé]rnia\s+femoral/i, /h[eé]rnia\s+crural/i])) {
    v.hernia_tipo = 'femoral'
  }

  if (hasAny(t, [/h[eé]rnia\s+(?:bilateral|dos\s+dois\s+lados)/i])) {
    v.hernia_lateralidade = 'bilateral'
  } else if (hasAny(t, [/h[eé]rnia\s+direita/i, /inguinal\s+direita/i])) {
    v.hernia_lateralidade = 'direita'
  } else if (hasAny(t, [/h[eé]rnia\s+esquerda/i, /inguinal\s+esquerda/i])) {
    v.hernia_lateralidade = 'esquerda'
  }

  v.menciona_urgencia_hernia = hasAny(t, [
    /urg[eê]ncia/i,
    /encaminh/i,
    /cirurgia/i,
    /cirúrg/i,
    /avalia[cç][aã]o\s+cirúrg/i,
    /encarcerada/i,
    /estrangulada/i,
    /irredut[íi]vel/i,
  ])

  // ── Tórax ──────────────────────────────────────────────────────────
  const derrameMatch =
    t.match(/separa[çc][aã]o\s*(?:m[aá]xima\s*)?(?:de\s*|entre\s*(?:as\s*)?pleuras\s*de\s*)?(\d+(?:[.,]\d+)?)\s*mm/i)
  if (derrameMatch) {
    const w = num(derrameMatch)
    if (w !== undefined && w >= 1 && w <= 300) v.derrame_pleural_mm = w
  }

  // ── Quadril Infantil ──────────────────────────────────────────────
  const alfaMatch =
    t.match(/[aâ]ngulo\s*alfa\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*°?/i)
  if (alfaMatch) {
    const w = num(alfaMatch)
    if (w !== undefined && w >= 1 && w <= 90) v.alfa_angle_deg = w
  }

  const betaMatch =
    t.match(/[aâ]ngulo\s*beta\s*(?:de\s*)?(\d+(?:[.,]\d+)?)\s*°?/i)
  if (betaMatch) {
    const w = num(betaMatch)
    if (w !== undefined && w >= 1 && w <= 90) v.beta_angle_deg = w
  }

  return v
}
