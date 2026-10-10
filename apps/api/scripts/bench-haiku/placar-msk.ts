/**
 * PLACAR DETERMINÍSTICO DO WRITER MSK (W9) — sem juiz, contra o laudo FINAL do médico.
 *
 * Para cada laudo-bloco (título "ULTRASSONOGRAFIA DO {SEGMENTO} {LADO}") de cada candidato:
 *   omissao   frase de normalidade do ROTEIRO que está no bloco do final e falta no do candidato;
 *   padrao    linha do final no padrão "frase normal + ', com …'" (alteração que não compromete a
 *             estrutura) — o candidato segue se tiver uma linha que começa com a mesma frase normal
 *             (sem o ponto) seguida de ", com";
 *   invasao   linha numerada que é cabeçalho ("5) ULTRASSONOGRAFIA…", "6) COMENTÁRIOS:"…);
 *   ressalva  "sem alteração … identificável" e parecidos (ressalva inventada).
 * Com --guard, reaplica o guard de comandos de HOJE sobre a saída crua do modelo (calls.jsonl)
 * para medir se o guard por laudo já resolve a invasão.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/placar-msk.ts <rodada> [--keys gpt,A,AS] [--guard <rodadas com calls.jsonl>]
 * Imprime só agregados e ids de 8 caracteres.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const dir = argv[0];
const arg = (k: string) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const KEYS = (arg("keys") ?? "gpt,A,AS").split(",");

type Row = Record<string, any>;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

async function main() {
  const { ROTEIRO, SEGMENTOS } = await import("../../src/server/renderer/categories/MUSCULOESQUELETICO");
  const { applyCommandOperations } = await import("../../src/server/pipeline/commandOperations");
  const rs: Row[] = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));

  const segDoTitulo = (titulo: string) => {
    const t = norm(titulo);
    const seg = SEGMENTOS.find((s) => t.includes(norm(ROTEIRO[s].titulo).replace(/^d[oa] /, "")));
    const lado = /\bdireit/.test(t) ? "direito" : /\besquerd/.test(t) ? "esquerdo" : "?";
    return seg ? `${seg}:${lado}` : null;
  };
  /** Laudo → blocos por título; chave = segmento:lado. */
  const blocos = (texto: string) => {
    const out = new Map<string, string[]>();
    let atual: string | null = null;
    for (const raw of (texto ?? "").split("\n")) {
      const linha = raw.replace(/^[\s*#_]+|[*_]+$/g, "").trim();
      if (/^(\d+\)\s*)?ULTRASSONOGRAFIA\b/i.test(linha)) {
        atual = segDoTitulo(linha) ?? atual;
        if (atual && !out.has(atual)) out.set(atual, []);
        continue;
      }
      if (atual) out.get(atual)!.push(linha);
    }
    return out;
  };
  const textoDe = (r: Row, k: string) => (k === "gpt" ? r.gpt : r[k]?.[0]?.text) ?? "";
  const RESSALVA = /sem (?:altera\S+|sinais)[^.]{0,60}identific\S*ve(?:l|is)|sem altera\S+ de espessura ou continuidade/iu;

  const total: Record<string, { normaisFinal: number; omissoes: number; padraoFinal: number; padraoSeguido: number; invasoes: number; ressalvas: number; casosInvasao: string[] }> = {};
  const porFrase: Record<string, Map<string, number>> = {};
  for (const k of KEYS) porFrase[k] = new Map();
  for (const k of KEYS) total[k] = { normaisFinal: 0, omissoes: 0, padraoFinal: 0, padraoSeguido: 0, invasoes: 0, ressalvas: 0, casosInvasao: [] };

  for (const r of rs) {
    const fin = blocos(r.final);
    for (const k of KEYS) {
      const texto = textoDe(r, k);
      if (!texto) continue;
      const cand = blocos(texto);
      const t = total[k];
      const inv = texto.split("\n").filter((l: string) => /^\s*\d+\)\s*(ULTRASSONOGRAFIA|COMENT[ÁA]RIOS|OS SEGUINTES|CONCLUS[ÃA]O|Exame realizado)/i.test(l)).length;
      if (inv) { t.invasoes += inv; t.casosInvasao.push(r.id8); }
      if (RESSALVA.test(texto)) t.ressalvas++;
      for (const [chave, linhasFin] of fin) {
        const seg = chave.split(":")[0] as keyof typeof ROTEIRO;
        const linhasCand = (cand.get(chave) ?? []).map(norm);
        const fin_n = linhasFin.map(norm);
        for (const e of ROTEIRO[seg].estruturas) {
          const frase = norm(e.normal);
          const stem = frase.replace(/\.$/, "");
          if (fin_n.includes(frase)) {
            t.normaisFinal++;
            if (!linhasCand.includes(frase)) {
              t.omissoes++;
              const id = `${seg}: ${e.normal}`;
              porFrase[k].set(id, (porFrase[k].get(id) ?? 0) + 1);
            }
          } else if (fin_n.some((l) => l.startsWith(`${stem}, com `))) {
            t.padraoFinal++;
            if (linhasCand.some((l) => l.startsWith(`${stem}, com `))) t.padraoSeguido++;
          }
        }
      }
    }
  }
  console.log(`rodada ${dir.split("/").pop()} · ${rs.length} casos`);
  console.log("| candidato | frases normais do final | omitidas | % omitidas | linhas 'normal + , com' no final | seguidas | invasões de numeração (casos) | ressalvas inventadas |");
  console.log("|---|---|---|---|---|---|---|---|");
  for (const k of KEYS) {
    const t = total[k];
    console.log(`| ${k} | ${t.normaisFinal} | ${t.omissoes} | ${((100 * t.omissoes) / Math.max(1, t.normaisFinal)).toFixed(1)}% | ${t.padraoFinal} | ${t.padraoSeguido} | ${t.invasoes} (${t.casosInvasao.length}) | ${t.ressalvas} |`);
  }
  if (argv.includes("--detalhe")) {
    for (const k of KEYS) {
      const top = [...porFrase[k].entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
      console.log(`\nomissões mais frequentes — ${k}:`);
      for (const [f, n] of top) console.log(`  ${n}× ${f}`);
    }
  }
  for (const k of KEYS) if (total[k].casosInvasao.length) console.log(`invasão ${k}: ${total[k].casosInvasao.join(" ")}`);

  // Guard de HOJE sobre a saída crua (calls.jsonl), por modelo.
  const guardDirs = arg("guard")?.split(",") ?? [];
  if (guardDirs.length) {
    const ditado = new Map(rs.map((r) => [r.id, r.ditado as string]));
    const cont: Record<string, { saidas: number; comInvasao: string[] }> = {};
    for (const gd of guardDirs) {
      const f = join(gd, "calls.jsonl");
      if (!existsSync(f)) continue;
      for (const l of readFileSync(f, "utf8").trim().split("\n")) {
        const c = JSON.parse(l);
        if (c.mode !== "haiku" || c.schemaName || !String(c.user).trimStart().startsWith("Ditado do médico")) continue;
        const d = ditado.get(c.case);
        if (d === undefined) continue;
        const out = applyCommandOperations(c.content, d);
        const m = (cont[c.model] ??= { saidas: 0, comInvasao: [] });
        m.saidas++;
        if (out.split("\n").some((x: string) => /^\s*\d+\)\s*(ULTRASSONOGRAFIA|COMENT[ÁA]RIOS|OS SEGUINTES|CONCLUS[ÃA]O)/i.test(x))) m.comInvasao.push(String(c.case).slice(0, 8));
      }
    }
    for (const [m, v] of Object.entries(cont)) console.log(`guard de hoje sobre a saída crua — ${m}: ${v.comInvasao.length}/${v.saidas} com invasão ${v.comInvasao.join(" ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
