/**
 * Teste manual do guard de peso fetal.
 * Rodar: npx tsx src/server/pipeline/__tests__/pesoFetalGuard.manual.ts
 */
import {
  extractPesoFetal,
  buildPesoFetalItems,
  ensurePesoFetalConclusion,
} from "../pesoFetalGuard";

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

// ── Classificação ──
check(
  "<P10 (percentil 8) → P.I.G. 1 item",
  (() => {
    const it = buildPesoFetalItems(extractPesoFetal("peso fetal no percentil 8"));
    return it.length === 1 && /percentil 10.*P\.I\.G/.test(it[0]!);
  })(),
);
check(
  "<P10 + restrição → 2 itens (P10 + Gratacós)",
  (() => {
    const it = buildPesoFetalItems(
      extractPesoFetal("peso fetal abaixo do percentil 10, com restrição do crescimento"),
    );
    return it.length === 2 && /Gratacós/.test(it[1]!);
  })(),
);
check(
  "<P3 → 2 itens (P3 + Gratacós)",
  (() => {
    const it = buildPesoFetalItems(
      extractPesoFetal("peso fetal abaixo do percentil 3"),
    );
    return it.length === 2 && /percentil 3/.test(it[0]!) && /Gratacós/.test(it[1]!);
  })(),
);
check(
  ">P95 (percentil 97 / G.I.G.) → 1 item",
  (() => {
    const it = buildPesoFetalItems(
      extractPesoFetal("peso fetal no percentil 97, grande para a idade gestacional"),
    );
    return it.length === 1 && /G\.I\.G/.test(it[0]!);
  })(),
);
check(
  "P10..95 (percentil 50) → NENHUM item",
  buildPesoFetalItems(extractPesoFetal("peso fetal no percentil 50")).length === 0,
);
check(
  "sem menção de peso → NENHUM item",
  buildPesoFetalItems(extractPesoFetal("doppler normal, IP umbilical 0,9")).length === 0,
);

check(
  "F1: percentil do DBP NÃO vira P.I.G. (não cruza biometria)",
  buildPesoFetalItems(
    extractPesoFetal("peso fetal 1800 g, DBP no percentil 8, CA percentil 40"),
  ).length === 0,
);
check(
  "F2: percentil exatamente 3 → P10/P.I.G. (>=3 e <10)",
  (() => {
    const it = buildPesoFetalItems(extractPesoFetal("peso fetal no percentil 3"));
    return it.length === 1 && /percentil 10.*P\.I\.G/.test(it[0]!);
  })(),
);
check(
  "valor real <3 (percentil 2) → P3 + Gratacós",
  (() => {
    const it = buildPesoFetalItems(extractPesoFetal("peso fetal no percentil 2"));
    return it.length === 2 && /percentil 3/.test(it[0]!);
  })(),
);

// ── Inserção na conclusão (após líquido) ──
const laudo = `CONCLUSÃO:
1) Gestação em torno de 30 semanas.
2) Líquido amniótico de quantidade normal.
3) Índice de pulsatilidade normal nas artérias uterinas, umbilical e artéria cerebral média.`;
const out = ensurePesoFetalConclusion(laudo, "peso fetal no percentil 8");
check(
  "peso inserido como item 3 (após líquido)",
  /3\) O peso fetal encontra-se abaixo do percentil 10/.test(out),
  out,
);
check(
  "Doppler renumerado para item 4",
  /4\) Índice de pulsatilidade normal/.test(out),
  out,
);
check(
  "não duplica se já houver item de peso",
  ensurePesoFetalConclusion(out, "peso fetal no percentil 8") === out,
);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
