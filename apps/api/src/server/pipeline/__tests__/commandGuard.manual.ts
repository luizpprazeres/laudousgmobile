/**
 * Teste manual do guard de comandos.
 * Rodar: npx tsx src/server/pipeline/__tests__/commandGuard.manual.ts
 */
import { applyCommandGuard, extractConclusionCommands } from "../commandGuard";

let pass = 0,
  fail = 0;
const check = (name: string, cond: boolean, detail?: string) => {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`);
  }
};

const CONC = `CONCLUSÃO:
1) Cisto hepático sem septações no lobo direito, medindo 1,8 cm.
2) Demais órgãos sem alterações.`;

// ── Extração + normalização ──
check(
  "'na conclusão, recomendar controle em 6 meses' → Recomenda-se",
  extractConclusionCommands("Fígado normal. Na conclusão, recomendar controle em 6 meses.")
    .some((c) => /Recomenda-se controle em 6 meses\./.test(c.text)),
  JSON.stringify(extractConclusionCommands("Na conclusão, recomendar controle em 6 meses.")),
);
check(
  "'recomendar controle anual' (standalone) → Recomenda-se",
  extractConclusionCommands("recomendar controle anual").some((c) => /Recomenda-se controle anual\./.test(c.text)),
);
check(
  "sem comando → vazio",
  extractConclusionCommands("Fígado de dimensões normais, sem nódulos.").length === 0,
);

// ── Posicional: "após o item 1" → insertAt = 1 ──
const posCmd = extractConclusionCommands("acrescente após o item 1 a frase: controle anual");
check(
  "'após o item 1' → insertAt=1 + texto sem o prefixo de posição",
  posCmd.some((c) => c.insertAt === 1 && /controle anual/i.test(c.text)),
  JSON.stringify(posCmd),
);
const posConc = `CONCLUSÃO:
1) Gestação em torno de 31 semanas.
2) Morfologia fetal sem alteração.
3) Doppler normal.`;
const posOut = applyCommandGuard(posConc, "acrescente após o item 1 a frase: líquido amniótico reduzido");
check(
  "inserido como item 2; os demais descem (morfologia vira 3, doppler vira 4)",
  /2\) Líquido amniótico reduzido\./.test(posOut) &&
    /3\) Morfologia fetal/.test(posOut) &&
    /4\) Doppler normal/.test(posOut),
  posOut,
);

// ── Aplicação: garante o comando ignorado ──
const out = applyCommandGuard(CONC, "Na conclusão, recomendar controle em 6 meses.");
check(
  "comando ignorado pelo LLM é acrescentado como item 3",
  /3\) Recomenda-se controle em 6 meses\./.test(out),
  out,
);
check(
  "preserva itens existentes",
  /1\) Cisto hepático/.test(out) && /2\) Demais órgãos/.test(out),
);

// ── Dedup: LLM já incluiu → não duplica ──
const jaTem = `CONCLUSÃO:
1) Cisto hepático no lobo direito.
2) Recomenda-se controle ultrassonográfico em 6 meses.`;
check(
  "não duplica se a conclusão já tem o comando",
  applyCommandGuard(jaTem, "na conclusão recomendar controle em 6 meses") === jaTem,
  applyCommandGuard(jaTem, "na conclusão recomendar controle em 6 meses"),
);

// ── No-op sem comando ──
check("sem comando → laudo intacto", applyCommandGuard(CONC, "abdome normal") === CONC);

// ── Comparação ──
const cmp = applyCommandGuard(CONC, "Na conclusão, comparar com exame anterior de 2025.");
check(
  "comando 'comparar com...' entra como item",
  /comparar com exame anterior/i.test(cmp),
  cmp,
);

// ── Regressão: "após o título acrescente X" NÃO é comando de conclusão ──
const tituloRaw =
  "Ultrassonografia obstétrica. Após o título acrescente a 1ª ultrassonografia realizada 4 de março de 2026 com 20 semanas, hoje com 37 semanas e 3 dias. Feto cefálico.";
check(
  "'após o título acrescente X' NÃO vira comando de conclusão",
  extractConclusionCommands(tituloRaw).length === 0,
  JSON.stringify(extractConclusionCommands(tituloRaw)),
);
const tituloConc = `CONCLUSÃO:
1) Gestação em torno de 37 semanas e 3 dias.
2) Líquido amniótico de quantidade normal.`;
check(
  "guard não duplica a frase do título na conclusão",
  applyCommandGuard(tituloConc, tituloRaw) === tituloConc,
  applyCommandGuard(tituloConc, tituloRaw),
);
// mas "acrescente na conclusão X" continua funcionando
check(
  "'acrescente na conclusão X' ainda é capturado",
  extractConclusionCommands("acrescente na conclusão que deve repetir em 30 dias").length === 1,
);

// ── Alvo no CORPO (final dos achados / antes da conclusão) NÃO vira conclusão ──
check(
  "'no final dos achados acrescente X' NÃO é comando de conclusão",
  extractConclusionCommands("No final dos achados acrescente nota sobre artefato técnico.").length === 0,
  JSON.stringify(extractConclusionCommands("No final dos achados acrescente nota sobre artefato técnico.")),
);
check(
  "'acrescente antes da conclusão X' NÃO é comando de conclusão",
  extractConclusionCommands("acrescente antes da conclusão a observação do equipamento.").length === 0,
  JSON.stringify(extractConclusionCommands("acrescente antes da conclusão a observação do equipamento.")),
);

console.log(`\n${pass}/${pass + fail} PASS` + (fail ? ` — ${fail} FAIL` : ""));
if (fail) process.exit(1);
