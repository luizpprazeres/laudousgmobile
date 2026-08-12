/**
 * Testes do diff usado no painel de correções.
 * Rodar: pnpm exec tsx apps/lab/src/lib/diff/linhas.manual.ts
 */
import { diffLinhas, diffPalavras, resumirDiff } from "./linhas";

let pass = 0, fail = 0;
const check = (n: string, c: boolean, d?: unknown) => {
  if (c) { pass++; console.log(`  ✓ ${n}`); }
  else { fail++; console.log(`  ✗ ${n}`); if (d !== undefined) console.log("   ", JSON.stringify(d)); }
};

console.log("\n[diff de linhas]\n");

check("texto idêntico não gera mudança",
  resumirDiff(diffLinhas("a\nb\nc", "a\nb\nc")).alteradas === 0);

const d1 = diffLinhas(
  "Fígado de dimensões normais.\nVesícula biliar sem cálculos.\nBaço normal.",
  "Fígado de dimensões normais.\nVesícula biliar com cálculos.\nBaço normal.",
);
check("frase editada vira 'alterada', não removida+adicionada",
  resumirDiff(d1).alteradas === 1 && resumirDiff(d1).removidas === 0 && resumirDiff(d1).adicionadas === 0,
  resumirDiff(d1));

const alterada = d1.find((l) => l.tipo === "alterada");
check("a linha alterada guarda antes e depois",
  alterada?.tipo === "alterada" && alterada.antes.includes("sem cálculos") && alterada.depois.includes("com cálculos"));
check("o destaque por palavra isola só o que mudou",
  alterada?.tipo === "alterada" &&
  alterada.palavras.filter((p) => p.tipo !== "igual").every((p) => /sem|com/.test(p.texto)),
  alterada?.tipo === "alterada" ? alterada.palavras.filter((p) => p.tipo !== "igual") : null);

const d2 = diffLinhas("a\nb", "a\nb\nRecomenda-se controle em 4 semanas.");
check("linha acrescentada no fim é 'adicionada'",
  resumirDiff(d2).adicionadas === 1 && resumirDiff(d2).removidas === 0);

const d3 = diffLinhas("a\nlinha que sai\nb", "a\nb");
check("linha removida é 'removida'",
  resumirDiff(d3).removidas === 1 && resumirDiff(d3).adicionadas === 0);

check("frases sem nada em comum não são casadas como edição",
  resumirDiff(diffLinhas("Baço de dimensões normais.", "Recomenda-se controle ecográfico.")).alteradas === 0);

console.log("\n[diff de palavras]\n");
const p = diffPalavras("Peso aproximado de 2450 gramas.", "Peso aproximado de 2500 gramas.");
check("só o número muda",
  p.filter((x) => x.tipo === "removida").map((x) => x.texto).join("") === "2450" &&
  p.filter((x) => x.tipo === "adicionada").map((x) => x.texto).join("") === "2500",
  p.filter((x) => x.tipo !== "igual"));
check("trechos iguais consecutivos são fundidos",
  p.filter((x) => x.tipo === "igual").length <= 2, p.filter((x) => x.tipo === "igual").length);

console.log(`\n${pass} passaram, ${fail} falharam\n`);
if (fail > 0) process.exit(1);
