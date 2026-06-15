/**
 * GOLDEN do render OBSTETRICA estilo OBJETIVO (Sprint 2). Determinístico (sem
 * LLM): renderObstetrica(f, null, { objetivo: true }) → asserções de estrutura
 * (TÉCNICA/ACHADOS/IMPRESSÃO), 1 casa decimal, ausência de "feto A" em feto único,
 * e cálculos corretos (peso médio/divergência, DSM, líquido). Falha = regressão.
 * Rodar: tsx src/server/renderer/__tests__/obstetrica-objetivo-golden.manual.ts
 */
import {
  renderObstetrica,
  type ObstetricaFindings,
} from "../categories/OBSTETRICA";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}`);
  } else {
    fail += 1;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
}

type Feto = ObstetricaFindings["fetos"][number];
const feto = (p: Partial<Feto>): Feto => ({
  rotulo: null, posicao_relativa: null, apresentacao: null, dorso: null,
  polo_cefalico: null, bcf_bpm: 140, dbp_mm: null, cc_mm: null, ca_mm: null,
  cf_mm: null, ccn_mm: null, peso_g: null, peso_variacao_g: null, percentil: null,
  ...p,
});
const F = (p: Partial<ObstetricaFindings>): ObstetricaFindings => ({
  numero_fetos: 1, corionicidade: null, gestacao_inicial: false,
  fetos: [feto({})], ig_semanas: 30, ig_dias: 0, dum: null,
  saco_gestacional_mm: null, saco_gestacional_medidas_mm: null,
  placenta_quantidade: null, placenta_localizacao: null,
  placenta_ecotextura: null, placenta_grau: null, liquido_tipo: null,
  liquido_ila_cm: null, liquido_mbv_por_feto_cm: null, liquido_classe: null,
  achados_adicionais: null,
  ...p,
});
const render = (f: ObstetricaFindings) => renderObstetrica(f, null, { objetivo: true });

// ── Estrutura objetivo (cabeçalhos) ──
{
  const l = render(F({ fetos: [feto({ dbp_mm: 60.4, cc_mm: 220.1, ca_mm: 190.7, cf_mm: 42.3, peso_g: 680 })] }));
  check("estrutura: título 'ULTRASSONOGRAFIA OBSTÉTRICA'", /^ULTRASSONOGRAFIA OBSTÉTRICA/.test(l), l);
  check("estrutura: cabeçalho 'TÉCNICA:'", /\nTÉCNICA:\n/.test(l), l);
  check("estrutura: cabeçalho 'ACHADOS:'", /\nACHADOS:\n/.test(l), l);
  check("estrutura: cabeçalho 'IMPRESSÃO:'", /\nIMPRESSÃO:\n/.test(l), l);
  check("estrutura: NÃO usa cabeçalhos do clássico", !/COMENTÁRIOS:|OS SEGUINTES ASPECTOS|CONCLUSÃO:/.test(l), l);
  check("1 casa decimal: 'DBP: 60,4 mm.'", /Diâmetro biparietal \(DBP\): 60,4 mm\./.test(l), l);
  check("1 casa decimal: 'CC: 220,1 mm.'", /Circunferência cefálica \(CC\): 220,1 mm\./.test(l), l);
}

// ── Feto único: SEM alucinação gemelar ──
{
  const l = render(
    F({
      numero_fetos: 1,
      fetos: [feto({ apresentacao: "cefálico", dbp_mm: 85, cc_mm: 316, ca_mm: 300, cf_mm: 67, peso_g: 2350 })],
      liquido_tipo: "mbv", liquido_mbv_por_feto_cm: [4.1],
    }),
  );
  check("único: SEM '(feto A)'", !/\(feto\s/i.test(l), l);
  check("único: SEM 'ambos os fetos'", !/ambos os fetos/i.test(l), l);
  check("único: 'Maior bolsão vertical de 4,1 cm.'", /Maior bolsão vertical de 4,1 cm\./.test(l), l);
  check("único: apresentação cefálica (concordância)", /Feto único, em apresentação cefálica/.test(l), l);
  check("único: NÃO é título gemelar", !/GEMELAR/.test(l), l);
}

// ── Gemelar: peso médio + divergência (cálculo reusado) ──
{
  const l = render(
    F({
      numero_fetos: 2, corionicidade: "dicoriônica e diamniótica",
      ig_semanas: 28,
      fetos: [
        feto({ rotulo: "A", apresentacao: "cefálico", peso_g: 1200 }),
        feto({ rotulo: "B", apresentacao: "pélvico", peso_g: 1050 }),
      ],
      liquido_tipo: "normal",
    }),
  );
  check("gemelar: título GEMELAR", /ULTRASSONOGRAFIA OBSTÉTRICA GEMELAR/.test(l), l);
  check("gemelar: 'Dois fetos'", /Dois fetos:/.test(l), l);
  check("gemelar: blocos 'Feto A' e 'Feto B'", /Feto A:/.test(l) && /Feto B:/.test(l), l);
  // pesoMedio = (1200+1050)/2 = 1125; divergencia = 150; pct = 150/1200 = 12,5
  check("gemelar: peso médio 1125 g", /Peso fetal médio: 1125 g/.test(l), l);
  check("gemelar: divergência 150 g (12,5%)", /Divergência ponderal: 150 g \(12,5%\)/.test(l), l);
  check("gemelar: impressão concordantes (<20%)", /pesos concordantes/.test(l), l);
  check("gemelar: corionicidade na impressão", /Gestação gemelar dicoriônica e diamniótica/.test(l), l);
  check("gemelar: pélvica concordância", /em apresentação pélvica/.test(l), l);
}

// ── Gemelar: divergência significativa (>=20%) ──
{
  const l = render(
    F({
      numero_fetos: 2,
      fetos: [feto({ rotulo: "A", peso_g: 1500 }), feto({ rotulo: "B", peso_g: 1100 })],
      liquido_tipo: "normal",
    }),
  );
  // divergencia = 400; pct = 400/1500 = 26,7 → significativa
  check("gemelar sig.: divergência 400 g (26,7%)", /Divergência ponderal: 400 g \(26,7%\)/.test(l), l);
  check("gemelar sig.: impressão 'significativa'", /Divergência ponderal significativa entre os fetos \(26,7%\)/.test(l), l);
}

// ── Gestação inicial: DSM calculado das medidas ──
{
  const l = render(
    F({
      numero_fetos: 1, gestacao_inicial: true, ig_semanas: 8, ig_dias: 2,
      fetos: [feto({ bcf_bpm: 165, ccn_mm: 16.4 })],
      saco_gestacional_medidas_mm: [20.3, 10.4, 15.4],
      liquido_tipo: "normal",
    }),
  );
  // DSM = (20.3+10.4+15.4)/3 = 15.366... → 15.4
  check("inicial: DSM calculado 15,4 mm", /diâmetro médio \(DSM\): 15,4 mm\./.test(l), l);
  check("inicial: 'Embrião único'", /Embrião único/.test(l), l);
  check("inicial: CCN 16,4 mm", /Comprimento crânio-nádegas \(CCN\): 16,4 mm\./.test(l), l);
  check("inicial: vesícula vitelina", /Vesícula vitelina/.test(l), l);
  check("inicial: IG na impressão", /Gestação em torno de 8 semanas e 2 dias/.test(l), l);
}

// ── Gestação inicial: DSM ditado direto vence medidas ──
{
  const l = render(
    F({
      numero_fetos: 1, gestacao_inicial: true,
      fetos: [feto({ bcf_bpm: 158, ccn_mm: 11.2 })],
      saco_gestacional_mm: 15.3,
    }),
  );
  check("inicial: DSM ditado 15,3 mm", /diâmetro médio \(DSM\): 15,3 mm\./.test(l), l);
}

// ── Percentil reproduzido, nunca cruzado com IG ──
{
  const l = render(F({ fetos: [feto({ peso_g: 680, percentil: 50 })] }));
  check("percentil: reproduzido (percentil 50)", /percentil 50/.test(l), l);
}

// ── DUM opcional ──
{
  const l = render(F({ dum: "01/01/2026", fetos: [feto({ peso_g: 680 })] }));
  check("DUM: aparece quando ditado", /DUM: 01\/01\/2026\./.test(l), l);
  const l2 = render(F({ fetos: [feto({ peso_g: 680 })] }));
  check("DUM: ausente quando não ditado", !/DUM:/.test(l2), l2);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
