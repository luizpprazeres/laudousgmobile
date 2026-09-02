/**
 * SEGURANÇA P0 — guard umbilical do Doppler (boletim 03/07, caso 89ffa1ef).
 * Feto PIG com IP umbilical 2,11 + diástole zero ditada saiu "IP normal na
 * umbilical". NUNCA mais: a diástole prevalece e o IP só é classificado pela
 * equação Barcelona quando a idade gestacional está disponível.
 * Rodar: tsx src/server/pipeline/__tests__/dopplerUmbilicalSafety.manual.ts
 */
import {
  buildDopplerConclusionItems,
  deriveUmbilicalSafety,
  correctDopplerConclusion,
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

// ── O mesmo IP muda de significado com a idade gestacional ──
{
  const semIg = deriveUmbilicalSafety({ ipUmbilical: 1.8, ipACM: 1.2 }, "sem menção de IG");
  ck(semIg.umbilicalAlterado !== true, "IP 1,8 sem IG → não inventa classificação");

  const ig20 = deriveUmbilicalSafety({ ipUmbilical: 1.8, gestationalWeeks: 20 }, "");
  ck(ig20.umbilicalAlterado !== true, "IP 1,8 com 20 semanas → normal pela equação Barcelona");

  const ig30 = deriveUmbilicalSafety({ ipUmbilical: 1.8, gestationalWeeks: 30 }, "");
  ck(ig30.umbilicalAlterado === true, "IP 1,8 com 30 semanas → acima do p95");
  ck(/elevado/i.test(ipFrase(ig30)), "IP 1,8 em 30 semanas → conclusão de IP elevado", ipFrase(ig30));
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

// ── p95 exato é normal; acima dele é patológico no calc.js Barcelona ──
{
  const media30 = 3.55219 - 0.13558 * 30 + 0.00174 * 30 * 30;
  const p95 = media30 + 0.299 * 1.645;
  ck(deriveUmbilicalSafety({ ipUmbilical: p95, gestationalWeeks: 30 }, "").umbilicalAlterado !== true, "z=1,645 / p95 exato → normal");
  ck(deriveUmbilicalSafety({ ipUmbilical: media30 + 0.299 * 1.646, gestationalWeeks: 30 }, "").umbilicalAlterado === true, "z=1,646 / p96 → alterado");
}

// ── diástole zero em OUTRO vaso (ducto venoso) não força umbilical ──
{
  const d = deriveUmbilicalSafety({ ipUmbilical: 0.9 }, "ducto venoso com onda A reversa");
  ck(d.umbilicalAlterado !== true, "diástole/onda reversa em ducto (sem 'umbilical') → não força umbilical");
}

// ── caminho writer/post-processor (correctDopplerConclusion) — P0 dex1 ──
{
  const laudoFalsoNormal = `DOPPLERVELOCIMETRIA:
Artéria umbilical: IP 2,11.

CONCLUSÃO:
1) Gestação em torno de 26 semanas.
2) Índice de pulsatilidade normal nas artérias uterinas e umbilical.
3) Diástole zero na artéria umbilical.`;
  const dBruto: DopplerData = { ipUmbilical: 2.11, ipUterinaDir: 1.17, ipUterinaEsq: 1.87, ipMedioUterinas: 1.52 };
  // SEM guard: correctDopplerConclusion mantém/reescreve a frase normal.
  const semGuard = correctDopplerConclusion(laudoFalsoNormal, dBruto);
  ck(/pulsatilidade\s+normal[^.]*umbilical/i.test(semGuard), "correctDopplerConclusion SEM guard: ainda pode afirmar normal");
  // COM guard (d derivado): nunca normal na umbilical.
  const comGuard = correctDopplerConclusion(laudoFalsoNormal, deriveUmbilicalSafety(dBruto, RAW));
  ck(!/pulsatilidade\s+normal[^.]*umbilical/i.test(comGuard), "correctDopplerConclusion COM guard: NÃO afirma normal na umbilical");
  ck(/diast[óo]lico\s+ausente|di[áa]stole\s+zero/i.test(comGuard), "correctDopplerConclusion COM guard: reflete diástole zero");
}

console.log(`\n${pass} ok, ${fail} falhas`);
if (fail > 0) process.exit(1);
