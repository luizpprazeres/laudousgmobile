/**
 * GOLDEN do guard BI-RADS "SÓ SINALIZA" da MAMARIA (auditoria gap #3).
 * OFF (default) = laudo intocado. ON (flag MAMARIA_BIRADS_GUARD) = anexa
 * "[REVISAR: …]" nas incoerências; NUNCA muda a categoria BI-RADS.
 * Determinístico (sem LLM). Rodar: tsx src/server/renderer/__tests__/mamaria-birads-guard.manual.ts
 */
import { renderMamaria, biradsRevisarNotes } from "../categories/MAMARIA";
import { A, F } from "./mamaria-fixtures";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${detail ? `\n   ${detail}` : ""}`); }
}
const on = (f: Parameters<typeof renderMamaria>[0]) => renderMamaria(f, null, { biradsGuard: true });
const off = (f: Parameters<typeof renderMamaria>[0]) => renderMamaria(f, null, {});

// Nódulo morfologicamente benigno (oval + circunscrito + paralelo) mas BI-RADS
// DITADO 4A — contradição (caso real 88543eea). Calc daria "3".
const noduloBenignoDitado4A = A({
  tipo: "nodulo_solido", forma: "oval", margem: "circunscrita", orientacao: "paralela",
  medidas_cm: [1.6, 0.9, 1.7], birads_ditado: "4A",
});

// ── Condição B: BI-RADS >= 4 sobre nódulo benigno → [REVISAR], sem mudar categoria ──
{
  const f = F({ achados: [noduloBenignoDitado4A] });
  const lOn = on(f), lOff = off(f);
  check("B ON: anexa [REVISAR] de superestimação", /\[REVISAR: BI-RADS 4A atribuído a nódulo de morfologia benigna/.test(lOn), lOn);
  check("B ON: NÃO rebaixa — categoria segue 4A no laudo", /Categoria BI-RADS® 4A/.test(lOn), lOn);
  check("B ON: NÃO inventa BI-RADS 3", !/BI-RADS® 3\b/.test(lOn), lOn);
  check("B OFF: laudo intocado (sem [REVISAR])", !/\[REVISAR/.test(lOff), lOff);
  check("B OFF vs ON: só difere pelo bloco [REVISAR]", lOn.startsWith(lOff), lOn);
}

// ── Nódulo benigno com BI-RADS 3 (correto) → NÃO sinaliza ──
{
  const f = F({ achados: [A({ tipo: "nodulo_solido", forma: "oval", margem: "circunscrita", orientacao: "paralela", medidas_cm: [1.2, 0.8, 1.0] })] });
  check("benigno calc=3 → sem [REVISAR]", !/\[REVISAR/.test(on(f)), on(f));
}

// ── Nódulo 4A LEGÍTIMO (microlobulado) → NÃO sinaliza (não é totalmente benigno) ──
{
  const f = F({ achados: [A({ tipo: "nodulo_solido", forma: "oval", margem: "microlobulada", orientacao: "paralela", medidas_cm: [0.7, 0.4, 0.5] })] });
  const l = on(f);
  check("4A microlobulado → sem [REVISAR] (categorização legítima)", !/\[REVISAR/.test(l), l);
}

// ── Caso real 88543eea: forma NÃO-ditada, só circunscrita+paralela + 4A → sinaliza ──
{
  const f = F({ achados: [A({ tipo: "nodulo_solido", forma: null, margem: "circunscrita", orientacao: "paralela", medidas_cm: [0.5, 0.3, 0.8], birads_ditado: "4A" })] });
  const l = on(f);
  check("circunscrito+paralelo SEM forma ditada + 4A → [REVISAR]", /\[REVISAR: BI-RADS 4A/.test(l), l);
  check("nota não afirma forma não-ditada (sem 'oval'/'redondo')", /margem circunscrita, paralelo à pele/.test(l), l);
  check("categoria 4A preservada", /Categoria BI-RADS® 4A/.test(l), l);
}
// ── Circunscrito mas NÃO-paralelo → não sinaliza (não é totalmente benigno) ──
{
  const f = F({ achados: [A({ tipo: "nodulo_solido", margem: "circunscrita", orientacao: "nao_paralela", birads_ditado: "4A" })] });
  check("circunscrito + não-paralelo → sem [REVISAR]", !/\[REVISAR/.test(on(f)), on(f));
}

// ── Nódulo espiculado (5) → NÃO sinaliza (morfologia suspeita, categoria coerente) ──
{
  const f = F({ achados: [A({ tipo: "nodulo_solido", forma: "irregular", margem: "espiculada", orientacao: "nao_paralela", posterior: "sombra" })] });
  check("nódulo suspeito (5) → sem [REVISAR]", !/\[REVISAR/.test(on(f)), on(f));
}

// ── Condição A: achado categorizável sem categoria BI-RADS resolvida ──
{
  // birads_ditado string vazia + tipo cuja calc retornaria algo? Forçamos via
  // biradsRevisarNotes direto: um achado_nao_nodular sempre tem calc "4"; então
  // a omissão real só ocorre se calc e ditado forem null. Usamos a função:
  const notas = biradsRevisarNotes(F({ achados: [A({ tipo: "nodulo_solido", forma: "oval", margem: "circunscrita", orientacao: "paralela" })] }));
  check("A: nódulo com calc válido → sem nota de omissão", !notas.some((n) => /sem categoria BI-RADS/.test(n)));
}

// ── Mamas normais → nunca sinaliza ──
{
  check("mamas normais → sem [REVISAR]", !/\[REVISAR/.test(on(F({}))), on(F({})));
}

// ── Estilo objetivo também aplica o guard ──
{
  const f = F({ achados: [noduloBenignoDitado4A] });
  const l = renderMamaria(f, null, { objetivo: true, biradsGuard: true });
  check("objetivo ON: [REVISAR] presente", /\[REVISAR: BI-RADS 4A/.test(l), l);
  check("objetivo ON: categoria 4A preservada", /Categoria BI-RADS® 4A/.test(l), l);
}

// ── biradsRevisarNotes direto: B dispara, categoria não muda ──
{
  const notas = biradsRevisarNotes(F({ achados: [noduloBenignoDitado4A] }));
  check("notes: exatamente 1 nota (superestimação)", notas.length === 1 && /BI-RADS 4A/.test(notas[0]!), JSON.stringify(notas));
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail === 0 ? 0 : 1);
