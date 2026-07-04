/**
 * SEGURANÇA P0 — guard umbilical do Doppler (boletim 03/07, caso 89ffa1ef).
 * Feto PIG com IP umbilical 2,11 + diástole zero ditada saiu "IP normal na
 * umbilical". NUNCA mais: IP bruto ≥ 1,5 ou diástole zero → alteração forçada.
 * Rodar: tsx src/server/pipeline/__tests__/dopplerUmbilicalSafety.manual.ts
 */
import {
  buildDopplerConclusionItems,
  deriveUmbilicalSafety,
  UMBILICAL_IP_ALERTA,
  type DopplerData,
} from "../dopplerOverlay";

let pass = 0, fail = 0;
const ck = (n: boolean, t: string, d?: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}${!n && d ? `\n   ${d}` : ""}`); };
const ipFrase = (d: DopplerData) => buildDopplerConclusionItems(d).find((i) => /pulsatilidade|diast[óo]lico|di[áa]stole/i.test(i)) ?? "";

// ── CASO REAL 89ffa1ef: IP umbilical 2,11 + diástole zero ditada ──
const RAW = "Ultrassonografia obstétrica com doppler ... maior bolsao vertical mede 5.8 cm . Coloque também uma frase de diastole zero na artéria umbilical";
{
  // ANTES (sem guard): umbilical não verbalizada "alterada", sem percentil → falso-normal.
  const bruto: DopplerData = { ipUmbilical: 2.11, ipACM: 1.02, ipUterinaDir: 1.17, ipUterinaEsq: 1.87, ipMedioUterinas: 1.52 };
  ck(/normal/i.test(ipFrase(bruto)) && /umbilical/i.test(ipFrase(bruto)),
    "reprodução do BUG: sem guard, afirma 'IP normal na umbilical'", ipFrase(bruto));

  // DEPOIS (com guard): diástole zero + IP 2,11 → nunca normal.
  const seguro = deriveUmbilicalSafety(bruto, RAW);
  const f = ipFrase(seguro);
  ck(!/pulsatilidade\s+normal/i.test(f), "guard: NÃO afirma 'IP normal' na umbilical");
  ck(/diast[óo]lico\s+ausente|di[áa]stole\s+zero/i.test(f), "guard: item reflete diástole zero", f);
  ck(seguro.umbilicalAlterado === true, "guard: umbilicalAlterado forçado");
}

// ── IP umbilical elevado SEM diástole zero ditada (só o valor bruto) ──
{
  const d = deriveUmbilicalSafety({ ipUmbilical: 1.8, ipACM: 1.2 }, "sem menção de diástole");
  ck(d.umbilicalAlterado === true, "IP 1,8 (≥1,5) sozinho → alterado");
  ck(!/normal/i.test(ipFrase(d)), "IP 1,8 → não afirma normal", ipFrase(d));
  ck(/elevado/i.test(ipFrase(d)), "IP 1,8 sem diástole zero → 'IP elevado na umbilical'", ipFrase(d));
}

// ── diástole zero ditada SEM valor de IP ──
{
  const d = deriveUmbilicalSafety({ ipACM: 1.0 }, "diástole reversa na artéria umbilical");
  ck(d.umbilicalAlterado === true, "diástole reversa (sem IP) → alterado");
  ck(d.diastoleZeroUmbilical === true, "diástole reversa → flag diastoleZeroUmbilical");
}

// ── NÃO regride o normal: IP umbilical baixo, sem diástole ──
{
  const normal: DopplerData = { ipUmbilical: 0.9, ipACM: 1.5, ipUterinaDir: 0.8, ipUterinaEsq: 0.8, ipMedioUterinas: 0.8 };
  const d = deriveUmbilicalSafety(normal, "exame sem alterações");
  ck(d.umbilicalAlterado !== true, "umbilical 0,9 normal → intocado");
  ck(/pulsatilidade\s+normal/i.test(ipFrase(d)) && /umbilical/i.test(ipFrase(d)),
    "umbilical normal → segue afirmando normalidade", ipFrase(d));
}

// ── limiar exato ──
{
  ck(deriveUmbilicalSafety({ ipUmbilical: UMBILICAL_IP_ALERTA }, "").umbilicalAlterado === true, `IP = ${UMBILICAL_IP_ALERTA} (limiar) → alterado`);
  ck(deriveUmbilicalSafety({ ipUmbilical: 1.49 }, "").umbilicalAlterado !== true, "IP 1,49 (< limiar) → intocado");
}

// ── diástole zero em OUTRO vaso (ducto venoso) não força umbilical ──
{
  const d = deriveUmbilicalSafety({ ipUmbilical: 0.9 }, "ducto venoso com onda A reversa");
  ck(d.umbilicalAlterado !== true, "diástole/onda reversa em ducto (sem 'umbilical') → não força umbilical");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
