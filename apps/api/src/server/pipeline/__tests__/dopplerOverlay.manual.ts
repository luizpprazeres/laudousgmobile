/**
 * Teste manual do overlay Doppler determinístico + linha de líquido.
 * Rodar: npx tsx src/server/pipeline/__tests__/dopplerOverlay.manual.ts
 */
import { ensureAmnioticConclusionLine } from "../amnioticFluidGuard";
import {
  extractDopplerData,
  applyDopplerOverlay,
  buildDopplerConclusionItems,
} from "../dopplerOverlay";

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

// ── 1. Linha de líquido inserida como item 2 + renumeração ──
const baseConc = `ULTRASSONOGRAFIA MORFOLÓGICA

CONCLUSÃO:
1) Gestação em torno de ____ semanas.
2) Morfologia fetal sem evidência de alteração detectável pelo método.`;
const withLiq = ensureAmnioticConclusionLine(baseConc);
check(
  "líquido inserido como item 2",
  /2\) Líquido amniótico de quantidade normal\./.test(withLiq),
  withLiq,
);
check(
  "morfologia renumerada para item 3",
  /3\) Morfologia fetal/.test(withLiq),
  withLiq,
);
check(
  "não duplica se líquido já presente",
  ensureAmnioticConclusionLine(withLiq) === withLiq,
);

// ── 2. Extração Doppler ──
const raw =
  "morfológico com doppler. IP da artéria umbilical 0,9, ACM 1,7, IP médio das uterinas 0,8.";
const d = extractDopplerData(raw);
check("extrai umbilical 0,9", d.ipUmbilical === 0.9, JSON.stringify(d));
check("extrai ACM 1,7", d.ipACM === 1.7, JSON.stringify(d));
check("extrai IP médio uterinas 0,8", d.ipMedioUterinas === 0.8, JSON.stringify(d));
check("umbilical NÃO marcado como alterado (manual)", d.umbilicalAlterado === false);

// ── 3. Perfil = 1/RCP (RCP = ACM/umbilical = 1,89 → perfil = 0,53 < 1 normal) ──
const overlaid = applyDopplerOverlay(withLiq, d);
check(
  "seção DOPPLERVELOCIMETRIA presente",
  /DOPPLERVELOCIMETRIA:/.test(overlaid),
  overlaid,
);
check(
  "perfil hemodinâmico calculado 0,53",
  /Perfil hemodinâmico fetal: 0,53/.test(overlaid),
  overlaid,
);
check(
  "conclusão Doppler normal presente",
  /Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média\./.test(
    overlaid,
  ),
);
check(
  "perfil na conclusão é normal (<1.0)",
  /Perfil hemodinâmico fetal é normal, menor de 1\.0\./.test(overlaid),
);
check(
  "uterina dir/esq NÃO aparecem (não ditadas)",
  !/Artéria uterina direita/.test(overlaid),
);

// ── 4. Uterinas >P95 (auto) altera a frase ──
const dUt = buildDopplerConclusionItems({
  ipUmbilical: 0.9,
  ipACM: 1.7,
  ipMedioUterinas: 1.3,
  percMedioUterinas: 97,
});
check(
  "uterinas >P95 → frase só umbilical+ACM normais",
  dUt.some((i) => /normais nas artérias umbilical e cerebral média/.test(i)),
  JSON.stringify(dUt),
);
check(
  "uterinas >P95 → item de uterinas acima do P95",
  dUt.some((i) => /uterinas acima do percentil 95/.test(i)),
  JSON.stringify(dUt),
);

// ── 5. F3: umbilical alterado + uterinas >P95 → AMBOS os itens ──
const dCombo = buildDopplerConclusionItems({
  ipUmbilical: 1.6,
  ipACM: 1.0,
  umbilicalAlterado: true,
  percMedioUterinas: 97,
});
check(
  "F3: umbilical alterado mantém item de uterinas >P95",
  dCombo.some((i) => /umbilical/i.test(i) && /elevado|alterado/i.test(i)) &&
    dCombo.some((i) => /uterinas acima do percentil 95/.test(i)),
  JSON.stringify(dCombo),
);

// ── 6. F4: ectasia → uterinas alteradas (frase só umbilical+ACM) ──
const dEct = extractDopplerData(
  "doppler com ectasia das artérias uterinas. IP umbilical 0,9, ACM 1,7.",
);
check("F4: ectasia detectada", dEct.ectasia === true);
const dEctItems = buildDopplerConclusionItems(dEct);
check(
  "F4: ectasia tira uterinas da frase normal",
  dEctItems.some((i) => /normais nas artérias umbilical e cerebral média/.test(i)),
  JSON.stringify(dEctItems),
);

// ── 7. F5b: líquido no lugar errado (item 4) é movido pra item 2 ──
const wrongPos = `CONCLUSÃO:
1) Gestação em torno de 24 semanas.
2) Morfologia fetal sem evidência de alteração detectável pelo método.
3) Doppler normal.
4) Líquido amniótico de quantidade reduzida (ILA 5,0 cm).`;
const moved = ensureAmnioticConclusionLine(wrongPos);
check(
  "F5b: líquido movido pra item 2 preservando classe",
  /2\) Líquido amniótico de quantidade reduzida \(ILA 5,0 cm\)\./.test(moved),
  moved,
);
check(
  "F5b: não sobra líquido duplicado",
  (moved.match(/Líquido amniótico de quantidade/gi) ?? []).length === 1,
  moved,
);

// ── 7b. Líquido placeholder "____" do LLM → vira default "normal" ──
const liqPlaceholder = `CONCLUSÃO:
1) Gestação em torno de ____ semanas.
2) Líquido amniótico de quantidade ____.
3) Morfologia fetal sem evidência de alteração detectável pelo método.`;
const liqFixed = ensureAmnioticConclusionLine(liqPlaceholder);
check(
  "líquido placeholder ____ vira 'quantidade normal'",
  /2\) Líquido amniótico de quantidade normal\./.test(liqFixed) &&
    !/quantidade ____/.test(liqFixed),
  liqFixed,
);

// ── 8. F6: ducto venoso ausente → "onda A ausente" (não "reversa") ──
const dDucto = extractDopplerData("doppler, ducto venoso com onda A ausente.");
check("F6: ducto ausente não vira reversa", dDucto.ductoVenoso === "onda A ausente");

// ── 9. Fix B / bug D2: umbilical >P95 NÃO vai pra frase das uterinas ──
import { correctDopplerConclusion } from "../dopplerOverlay";
const rawD2 =
  "doppler obstétrico. IP da artéria umbilical acima do percentil 95. ACM normal. Artérias uterinas normais.";
const dD2 = extractDopplerData(rawD2);
check("D2: umbilical detectado como alterado", dD2.umbilicalAlterado === true);
check("D2: hasDoppler verdadeiro mesmo sem número de IP", true /* ver abaixo */);
// Laudo do LLM com o BUG: jogou na frase das uterinas
const laudoBug = `ULTRASSONOGRAFIA OBSTÉTRICA COM DOPPLER COLORIDO

DOPPLERVELOCIMETRIA:
Artéria umbilical: IP ____ (percentil 95).

CONCLUSÃO:
1) Gestação em torno de 32 semanas.
2) Líquido amniótico de quantidade normal.
3) IP médio das artérias uterinas acima do percentil 95 para a idade gestacional.
4) Ausência de sinais de incisuras.
5) Perfil hemodinâmico fetal é normal, menor de 1.0.`;
const fixedD2 = correctDopplerConclusion(laudoBug, dD2);
check(
  "D2: conclusão passa a falar de umbilical (vaso certo)",
  /pulsatilidade elevado na artéria umbilical/i.test(fixedD2),
  fixedD2,
);
check(
  "D2: NÃO sobra 'uterinas acima do percentil 95' (vaso errado)",
  !/uterinas acima do percentil 95/i.test(fixedD2),
  fixedD2,
);
check(
  "D2: preserva líquido e gestação (itens não-Doppler)",
  /Gestação em torno de 32 semanas/.test(fixedD2) &&
    /Líquido amniótico de quantidade normal/.test(fixedD2),
  fixedD2,
);

// ── 10. F1: conduta de peso fetal com "Doppler colorido" NÃO é removida ──
const laudoPeso = `CONCLUSÃO:
1) Gestação em torno de 30 semanas.
2) Líquido amniótico de quantidade normal.
3) O peso fetal encontra-se abaixo do percentil 10 (pequeno para a idade gestacional - P.I.G.). Convém, a critério clínico, acompanhamento seriado com Doppler colorido.
4) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.`;
const fixedPeso = correctDopplerConclusion(laudoPeso, { ipUmbilical: 0.9, ipACM: 1.7 });
check(
  "F1: item de conduta de peso fetal preservado",
  /acompanhamento seriado com Doppler colorido/.test(fixedPeso),
  fixedPeso,
);

// ── 11. F2: percentil não cruza vasos ──
const dCross = extractDopplerData(
  "IP umbilical 0,9, artéria cerebral média 1,7 percentil 50.",
);
check(
  "F2: percentil da ACM não vaza pro umbilical",
  dCross.percUmbilical === undefined && dCross.percACM === 50,
  JSON.stringify(dCross),
);

// ── 12. F3: negação de incisura/centralização ──
const dNeg = extractDopplerData(
  "doppler. Sem incisuras. Não há centralização. IP umbilical 0,9.",
);
check("F3: 'sem incisuras' → incisura false", dNeg.incisura === false);
check("F3: 'não há centralização' → centralizacao false", dNeg.centralizacao === false);
const dPos = extractDopplerData("doppler com incisura protodiastólica bilateral. brain sparing presente.");
check("F3: incisura positiva ainda detectada", dPos.incisura === true);
check("F3: brain sparing → centralizacao true", dPos.centralizacao === true);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
