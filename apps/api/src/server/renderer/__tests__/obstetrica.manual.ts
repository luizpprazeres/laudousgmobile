/**
 * Teste manual do render OBSTETRICA (DET-5) — bugs de prod 2026-06-14:
 *  A1 — saco gestacional obrigatório no inicial (nunca some; placeholder se null).
 *  A3 — feto único NUNCA recebe "(feto A)" nem "ambos os fetos" (sem alucinação).
 * Rodar: tsx src/server/renderer/__tests__/obstetrica.manual.ts
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
  data_exame: null, primeira_us_data: null, primeira_us_ig_semanas: null,
  primeira_us_ig_dias: null, ig_referencia_hoje_semanas: null,
  ig_referencia_hoje_dias: null, referencia_fonte: null, corrigir_ig: null,
  achados_adicionais: null,
  ...p,
});

// ── A3: feto único com MBV — sem rótulo de feto, sem "ambos os fetos" ──
{
  const laudo = renderObstetrica(
    F({
      numero_fetos: 1,
      fetos: [feto({ dbp_mm: 85, cc_mm: 316, ca_mm: 280, cf_mm: 67, peso_g: 2167 })],
      liquido_tipo: "mbv",
      liquido_mbv_por_feto_cm: [4.1],
    }),
  );
  check("A3: feto único MBV sem '(feto A)'", !/\(feto\s/i.test(laudo), laudo);
  check("A3: feto único sem 'ambos os fetos'", !/ambos os fetos/i.test(laudo), laudo);
  check(
    "A3: corpo 'Maior bolsão vertical de 4,1 cm.'",
    /Maior bolsão vertical de 4,1 cm\./.test(laudo),
    laudo,
  );
  check(
    "A3: conclusão líquido sem feto",
    /Líquido amniótico em quantidade normal \(maior bolsão vertical de 4,1 cm\)\./.test(laudo),
    laudo,
  );
}

// ── A3 (controle): gemelar MANTÉM individualização por feto ──
{
  const laudo = renderObstetrica(
    F({
      numero_fetos: 2,
      corionicidade: "dicoriônica e diamniótica",
      fetos: [
        feto({ rotulo: "A", dbp_mm: 80, cc_mm: 300, ca_mm: 270, cf_mm: 60, peso_g: 2000 }),
        feto({ rotulo: "B", dbp_mm: 81, cc_mm: 305, ca_mm: 272, cf_mm: 61, peso_g: 2100 }),
      ],
      liquido_tipo: "mbv",
      liquido_mbv_por_feto_cm: [4.1, 3.8],
    }),
  );
  check(
    "A3 controle: gemelar mantém '(feto A)' e '(feto B)'",
    /\(feto A\)/.test(laudo) && /\(feto B\)/.test(laudo),
    laudo,
  );
  check("A3 controle: gemelar mantém 'ambos os fetos'", /ambos os fetos/i.test(laudo), laudo);
}

// ── A1: obstétrico inicial — linha do saco gestacional SEMPRE presente ──
{
  const laudo = renderObstetrica(
    F({ gestacao_inicial: true, ig_semanas: 8, fetos: [feto({ ccn_mm: 15 })], saco_gestacional_mm: null }),
  );
  check(
    "A1: saco gestacional presente com placeholder quando null",
    /Saco gestacional de forma normal, com diâmetro médio de ____ mm\./.test(laudo),
    laudo,
  );
}
{
  const laudo = renderObstetrica(
    F({ gestacao_inicial: true, ig_semanas: 8, fetos: [feto({ ccn_mm: 15 })], saco_gestacional_mm: 25 }),
  );
  check(
    "A1: saco gestacional com valor quando ditado",
    /Saco gestacional de forma normal, com diâmetro médio de 25 mm\./.test(laudo),
    laudo,
  );
}
// ── DSM calculado das 3 medidas: (20,3+10,4+15,4)/3 = 15,4 ──
{
  const laudo = renderObstetrica(
    F({ gestacao_inicial: true, ig_semanas: 8, fetos: [feto({ ccn_mm: 12 })], saco_gestacional_medidas_mm: [20.3, 10.4, 15.4] }),
  );
  check(
    "DSM: média das 3 medidas → 15,4 mm",
    /com diâmetro médio de 15,4 mm\./.test(laudo),
    laudo,
  );
}
// ── DSM ditado direto vence ──
{
  const laudo = renderObstetrica(
    F({ gestacao_inicial: true, ig_semanas: 8, fetos: [feto({ ccn_mm: 12 })], saco_gestacional_mm: 15.3 }),
  );
  check(
    "DSM: ditado direto '15,3' usado verbatim",
    /com diâmetro médio de 15,3 mm\./.test(laudo),
    laudo,
  );
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
