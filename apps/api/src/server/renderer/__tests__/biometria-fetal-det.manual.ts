/**
 * Golden — biometria fetal determinística (flag OBST_BIOMETRIA_DET).
 * Caso real do boletim 02/07 (laudo 62f15728): bloco da calculadora com CC/CA/CF
 * ecoados sem o ×10 pela extração LLM + garble "maior vertical média" + CF 5,8 mm
 * não sinalizado com IG de 29 semanas.
 * Rodar: tsx src/server/renderer/__tests__/biometria-fetal-det.manual.ts
 */
import {
  parseBiometriaFetalBlock,
  mergeBiometriaEstruturada,
  reconcileBiometriaUnidade,
  igSemanasPorCf,
} from "../categories/biometriaFetal";
import { renderObstetrica, type ObstetricaFindings } from "../categories/OBSTETRICA";
import { flagImplausibleMeasures } from "../../pipeline/measureSanity";
import { normalizeAsrClinical } from "../../pipeline/asrClinical";

let pass = 0,
  fail = 0;
const ck = (n: boolean, t: string, d?: string) => {
  n ? pass++ : fail++;
  console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`);
};

const feto = (over: Partial<ObstetricaFindings["fetos"][number]> = {}) => ({
  rotulo: null,
  posicao_relativa: null,
  apresentacao: "cefálica",
  dorso: "à esquerda",
  polo_cefalico: null,
  bcf_bpm: 143,
  dbp_mm: null,
  cc_mm: null,
  ca_mm: null,
  cf_mm: null,
  ccn_mm: null,
  peso_g: null,
  peso_variacao_g: null,
  percentil: null,
  ...over,
});

const findings = (
  fetos: ObstetricaFindings["fetos"],
  numero_fetos = fetos.length,
): ObstetricaFindings => ({
  numero_fetos,
  corionicidade: null,
  gestacao_inicial: false,
  fetos,
  ig_semanas: 29,
  ig_dias: 5,
  dum: null,
  data_exame: null,
  primeira_us_data: null,
  primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null,
  ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null,
  referencia_fonte: null,
  corrigir_ig: null,
  saco_gestacional_mm: null,
  saco_gestacional_medidas_mm: null,
  placenta_quantidade: null,
  placenta_localizacao: "anterior",
  placenta_ecotextura: null,
  placenta_grau: null,
  liquido_tipo: null,
  liquido_ila_cm: null,
  liquido_mbv_por_feto_cm: null,
  liquido_classe: null,
  achados_adicionais: null,
  itens_conclusao_livres: [],
});

// ---------------------------------------------------------------------------
// 1. Bloco REAL do caso 62f15728 (calculadora do app iOS)
// ---------------------------------------------------------------------------
const RAW_62F15728 = `Biometria fetal:
DBP: 7.46 cm
CC: 28.13 cm
CA: 25.07 cm
CF: 5.76 cm
Peso fetal estimado: 1451 g
Variação do peso: ±217.71 g
IG pela DUM: 29s6d
IG pela biometria: 29s5d

Obstétrica com em apresentação cefálica com dorso à esquerda, frequência cardíaca de 143, placenta anterior, maior bolsão vertical de 3.9 cm.`;

{
  const b = parseBiometriaFetalBlock(RAW_62F15728);
  ck(b !== null, "bloco real: parseado");
  ck(b?.dbp_mm === 74.6, `bloco real: DBP 74.6 (veio ${b?.dbp_mm})`);
  ck(b?.cc_mm === 281.3, `bloco real: CC 281.3 (veio ${b?.cc_mm})`);
  ck(b?.ca_mm === 250.7, `bloco real: CA 250.7 (veio ${b?.ca_mm})`);
  ck(b?.cf_mm === 57.6, `bloco real: CF 57.6 (veio ${b?.cf_mm})`);
  ck(b?.peso_g === 1451, `bloco real: peso 1451 (veio ${b?.peso_g})`);
  ck(b?.peso_variacao_g === 217.7, `bloco real: variação 217.7 (veio ${b?.peso_variacao_g})`);
}

{
  // Extração DEGRADADA como no caso real: DBP certo, CC/CA/CF sem o ×10.
  const f = findings([feto({ dbp_mm: 74.6, cc_mm: 28.1, ca_mm: 25.1, cf_mm: 5.8, peso_g: 1451, peso_variacao_g: 217.7 })]);
  const m = mergeBiometriaEstruturada(f, RAW_62F15728);
  ck(m.fetos[0]!.cc_mm === 281.3, "merge: CC corrigido 28.1→281.3");
  ck(m.fetos[0]!.ca_mm === 250.7, "merge: CA corrigido 25.1→250.7");
  ck(m.fetos[0]!.cf_mm === 57.6, "merge: CF corrigido 5.8→57.6");
  ck(m.fetos[0]!.dbp_mm === 74.6, "merge: DBP já certo permanece 74.6");
  ck(m.fetos[0]!.bcf_bpm === 143, "merge: campos não-biometria intocados");
}

{
  // Gemelar: bloco ambíguo (de qual feto?) → NÃO tocar.
  const f = findings([feto({ cc_mm: 28.1 }), feto({ rotulo: "B" })], 2);
  const m = mergeBiometriaEstruturada(f, RAW_62F15728);
  ck(m === f, "gemelar: merge não toca");
  ck(reconcileBiometriaUnidade(f, "CC de 28,13 centímetros") === f, "gemelar: reconcile não toca");
}

{
  // Sem o cabeçalho do bloco → parser não ativa (linha solta não é máquina).
  ck(parseBiometriaFetalBlock("DBP: 7.46 cm\nCC: 28.13 cm") === null, "sem cabeçalho: parse null");
  // mm explícito no bloco → não multiplica.
  const b = parseBiometriaFetalBlock("Biometria fetal:\nDBP: 74.6 mm");
  ck(b?.dbp_mm === 74.6, "bloco em mm: não multiplica");
}

// ---------------------------------------------------------------------------
// 2. Reconciliação de VOZ (cm explícito, extração ecoou sem ×10)
// ---------------------------------------------------------------------------
{
  const raw = "feto com DBP de 7,46 centímetros e comprimento do fêmur de 5,76 cm";
  const f = findings([feto({ dbp_mm: 7.46, cf_mm: 5.76 })]);
  const m = reconcileBiometriaUnidade(f, raw);
  ck(m.fetos[0]!.dbp_mm === 74.6, "voz: DBP 7.46→74.6 (cm ecoado)");
  ck(m.fetos[0]!.cf_mm === 57.6, "voz: CF 5.76→57.6 (cm ecoado)");
}
{
  // Já convertido certo → intocado.
  const f = findings([feto({ dbp_mm: 74.6 })]);
  ck(
    reconcileBiometriaUnidade(f, "DBP de 7,46 cm") === f,
    "voz: valor já convertido fica intocado",
  );
}
{
  // Valor divergente (nem cm nem cm×10) → NÃO adivinhar.
  const f = findings([feto({ dbp_mm: 70 })]);
  ck(reconcileBiometriaUnidade(f, "DBP de 7,46 cm") === f, "voz: divergência ≠ eco não é tocada");
}
{
  // Sem unidade explícita no ditado → não mexe (regra do prompt preservada).
  const f = findings([feto({ cf_mm: 5.76 })]);
  ck(reconcileBiometriaUnidade(f, "CF de 5,76") === f, "voz: sem unidade não mexe");
}

// ---------------------------------------------------------------------------
// 3. measureSanity — check IG×CF (opts.cfIgAware)
// ---------------------------------------------------------------------------
const LAUDO_CF_ERRADO = `Comprimento do fêmur (CF) de 5,8 mm.

CONCLUSÃO:
1) Gestação em torno de 29 semanas e 5 dias.`;
{
  const s = flagImplausibleMeasures(LAUDO_CF_ERRADO, { cfIgAware: true });
  ck(/CF\) de 5,8 mm\.? ?\[REVISAR: CF incompatível com a IG\]/.test(s), "IG×CF: CF 5,8mm @29s sinalizado");
  ck(flagImplausibleMeasures(s, { cfIgAware: true }) === s, "IG×CF: idempotente");
}
{
  const ok = flagImplausibleMeasures(
    "Comprimento do fêmur (CF) de 57,6 mm.\nCONCLUSÃO:\n1) Gestação em torno de 29 semanas e 5 dias.",
    { cfIgAware: true },
  );
  ck(!/incompatível/.test(ok), "IG×CF: CF 57,6mm @29s sem flag");
}
{
  // CF de termo (78mm @ 40s) e 2º tri (30mm @ 19s) — fórmula canônica sem falso-positivo.
  for (const [cf, ig] of [["78", "40"], ["30", "19"], ["8", "12"]] as const) {
    const s = flagImplausibleMeasures(
      `Comprimento do fêmur (CF) de ${cf} mm.\nGestação em torno de ${ig} semanas.`,
      { cfIgAware: true },
    );
    ck(!/incompatível/.test(s), `IG×CF: CF ${cf}mm @${ig}s sem flag`);
  }
}
{
  ck(
    !/incompatível/.test(flagImplausibleMeasures(LAUDO_CF_ERRADO)),
    "IG×CF: sem opts (flag OFF) comportamento atual preservado",
  );
  ck(
    !/incompatível/.test(
      flagImplausibleMeasures("Comprimento do fêmur (CF) de ____ mm.\nGestação em torno de 29 semanas.", {
        cfIgAware: true,
      }),
    ),
    "IG×CF: placeholder ____ não sinalizado",
  );
  ck(
    !/incompatível/.test(
      flagImplausibleMeasures("Comprimento do fêmur (CF) de 5,8 mm.", { cfIgAware: true }),
    ),
    "IG×CF: sem IG no laudo não sinaliza",
  );
}
{
  const est = igSemanasPorCf(57.6);
  ck(est !== null && Math.abs(est - 29.9) < 1, `fórmula: CF 57.6mm ≈ 30s (veio ${est?.toFixed(1)})`);
}

// ---------------------------------------------------------------------------
// 4. Garble ASR "maior vertical média" (escopo obstétrico)
// ---------------------------------------------------------------------------
{
  const g = "placenta anterior, maior vertical média de 3.9 cm";
  for (const cat of ["OBSTETRICA", "DOPPLER_OBSTETRICO", "MORFOLOGICO"]) {
    ck(
      normalizeAsrClinical(g, cat).includes("maior bolsão vertical de 3.9"),
      `garble MBV: normalizado em ${cat}`,
    );
  }
  ck(normalizeAsrClinical(g, "TIREOIDE") === g, "garble MBV: fora de escopo não toca");
  ck(normalizeAsrClinical(g) === g, "garble MBV: sem categoria não toca");
}

// ---------------------------------------------------------------------------
// 5. Smoke fim-a-fim determinístico: extração degradada + bloco → laudo correto
// ---------------------------------------------------------------------------
{
  const degradada = findings([
    feto({ dbp_mm: 74.6, cc_mm: 28.1, ca_mm: 25.1, cf_mm: 5.8, peso_g: 1451, peso_variacao_g: 217.7 }),
  ]);
  const laudo = renderObstetrica(
    reconcileBiometriaUnidade(mergeBiometriaEstruturada(degradada, RAW_62F15728), RAW_62F15728),
    null,
  );
  ck(laudo.includes("Circunferência da cabeça (CC) de 281,3 mm."), "smoke: CC 281,3 mm no laudo");
  ck(laudo.includes("Circunferência abdominal (CA) de 250,7 mm."), "smoke: CA 250,7 mm no laudo");
  ck(laudo.includes("Comprimento do fêmur (CF) de 57,6 mm."), "smoke: CF 57,6 mm no laudo");
  ck(laudo.includes("Diâmetro biparietal (DBP) de 74,6 mm."), "smoke: DBP 74,6 mm no laudo");
  ck(!/28,1 mm|25,1 mm|5,8 mm/.test(laudo), "smoke: nenhum valor sem ×10 sobrou");
  const flagged = flagImplausibleMeasures(laudo, { cfIgAware: true });
  ck(!/REVISAR/.test(flagged), "smoke: laudo corrigido não gera [REVISAR]");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
