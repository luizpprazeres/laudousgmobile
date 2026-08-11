/**
 * O catálogo reproduz os laudos REAIS, não só os cenários sintéticos?
 *
 * Rodar de apps/api:
 *   pnpm exec tsx --env-file=.env.local src/server/customization/equivalencia-real.manual.ts
 *
 * POR QUE ISTO EXISTE. A equivalência sintética (catalog-equivalence.manual.ts)
 * cobre 4320 combinações de 8 dimensões e é forte — mas é uma matriz que EU
 * construí. Ela não conhece a combinação que um médico de verdade produz num
 * plantão: o achado que ninguém previu, a medida no limite, o ditado que gera
 * um campo que nenhum cenário meu tem.
 *
 * Este harness fecha essa lacuna: pega os laudos obstétricos que a produção
 * gerou, remonta cada um pelo catálogo a partir dos MESMOS achados, e compara
 * byte a byte com o que o renderer produziu na hora.
 *
 * SOMENTE LEITURA. Não grava nada, não altera nada, e não expõe conteúdo
 * clínico: as divergências são reportadas por posição e trecho curto, e o
 * relatório completo fica no scratchpad (gitignorado), nunca no terminal.
 *
 * DEPENDE de `structured_output` estar preenchido, o que só passou a acontecer
 * com o `onFindings` (em produção desde 11/08). Laudos anteriores não têm o
 * dado e são ignorados — o script diz quantos.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/server/env";
import { renderObstetricaCatalogo } from "@/server/renderer/catalog/OBSTETRICA.render";
import type { ObstetricaFindings } from "@/server/renderer/categories/OBSTETRICA";

/** As flags como estavam em produção. Sem isto, a comparação é com outro laudo. */
function flagsDeProducao() {
  const e = env();
  return {
    objetivo: false,
    igCorrection: e.IG_REFERENCE_CORRECTION === "true",
    flexivel: e.FLEXIBLE_CONCLUSION === "true",
    grannum: e.GRANNUM_PLACENTA === "true",
  };
}

/** Primeira linha em que dois textos divergem — para localizar sem despejar o laudo. */
function primeiraDivergencia(a: string, b: string): { linha: number; esperado: string; obtido: string } | null {
  const la = a.split("\n");
  const lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      return { linha: i + 1, esperado: (la[i] ?? "(fim)").slice(0, 120), obtido: (lb[i] ?? "(fim)").slice(0, 120) };
    }
  }
  return null;
}

async function main() {
  const e = env();
  const sb = createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("generation_audit")
    .select("id,created_at,model_writer,structured_output,output_text,system_message_full")
    .eq("category", "OBSTETRICA")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const todos = data ?? [];
  let semAchados = 0;
  let naoRenderer = 0;
  let semTexto = 0;
  let comparados = 0;
  let iguais = 0;
  const divergentes: { id: string; quando: string; linha: number; esperado: string; obtido: string }[] = [];

  for (const r of todos) {
    // Só o caminho do renderer: no writer o LLM escreve o texto e não há
    // equivalência a estabelecer.
    //
    // O caminho está na SYSTEM MESSAGE, não em `model_writer` — esta coluna
    // guarda o modelo de IA (gpt-4.1-mini, gpt-5.4-mini) mesmo quando o laudo
    // foi montado em código. Filtrar por ela descartava 100% dos laudos, e foi
    // o que a primeira versão deste script fez.
    if (!((r.system_message_full ?? "") as string).startsWith("[renderer/")) { naoRenderer++; continue; }

    const s = r.structured_output as Record<string, unknown> | null;
    if (!s || Object.keys(s).length === 0 || !("fetos" in s)) { semAchados++; continue; }

    const esperado = (r.output_text ?? "") as string;
    if (esperado.trim() === "") { semTexto++; continue; }

    // Se a personalização já estava aplicada naquele laudo, a comparação com o
    // catálogo-base não faz sentido — pula.
    if ((r.system_message_full ?? "").includes("personalização v")) continue;

    let obtido: string;
    try {
      obtido = renderObstetricaCatalogo({
        findings: s as unknown as ObstetricaFindings,
        flags: flagsDeProducao(),
      });
    } catch (err) {
      divergentes.push({
        id: r.id as string,
        quando: (r.created_at as string).slice(0, 10),
        linha: 0,
        esperado: "(o renderer produziu texto)",
        obtido: `EXCEÇÃO: ${(err as Error).message.slice(0, 100)}`,
      });
      comparados++;
      continue;
    }

    comparados++;
    if (obtido === esperado) {
      iguais++;
    } else {
      const d = primeiraDivergencia(esperado, obtido);
      divergentes.push({
        id: r.id as string,
        quando: (r.created_at as string).slice(0, 10),
        linha: d?.linha ?? 0,
        esperado: d?.esperado ?? "",
        obtido: d?.obtido ?? "",
      });
    }
  }

  console.log(`\nEquivalência contra laudos REAIS — OBSTETRICA\n`);
  console.log(`  laudos examinados na auditoria: ${todos.length}`);
  console.log(`    fora do caminho renderer:     ${naoRenderer}`);
  console.log(`    sem achados gravados:         ${semAchados}  (anteriores ao onFindings de 11/08)`);
  console.log(`    sem texto de saída:           ${semTexto}`);
  console.log(`  COMPARADOS:                     ${comparados}`);
  console.log(`    byte-a-byte idênticos:        ${iguais}`);
  console.log(`    divergentes:                  ${divergentes.length}`);

  if (comparados === 0) {
    console.log(`
  Ainda não há laudo real com achados gravados. O \`onFindings\` entrou em
  produção em 11/08; rode de novo depois de alguns dias de uso — é este número
  que autoriza ligar MODEL_CATALOG_CATEGORIES com evidência de campo, e não só
  com a matriz sintética.
`);
    process.exit(0);
  }

  if (divergentes.length > 0) {
    console.log(`\n  Primeiras divergências (trecho curto, sem despejar o laudo):\n`);
    for (const d of divergentes.slice(0, 10)) {
      console.log(`   ${d.quando}  ${d.id.slice(0, 8)}  linha ${d.linha}`);
      console.log(`      renderer: ${d.esperado}`);
      console.log(`      catálogo: ${d.obtido}`);
    }
    if (divergentes.length > 10) console.log(`   … e mais ${divergentes.length - 10}.`);
  }

  const pct = comparados === 0 ? 0 : (100 * iguais) / comparados;
  console.log(`\n  ${iguais}/${comparados} (${pct.toFixed(1)}%) idênticos ao que a produção gerou.\n`);
  process.exit(divergentes.length === 0 ? 0 : 1);
}

void main();
