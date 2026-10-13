/**
 * MAPA SEMANAL DE ERROS DE TRANSCRIÇÃO (opção B do estudo de 12/10/2026).
 *
 * Lê asr_capturas (SÓ LEITURA): o que o Deepgram devolveu × o que o médico mandou. Cada correção feita
 * à mão é classificada — primeiro por regra (formato, número, negação, inserção, remoção) e, no que
 * sobrar, pela Jev (trecho curto, sem identificadores). Mostra também se a confiança do Deepgram
 * apontava a palavra corrigida (calibra o destaque na tela).
 *
 * Saída LOCAL: tmp-review/asr-mapa/<data>.md (dado sensível — não versionar, não publicar).
 * Rodar (de apps/api): pnpm exec tsx --env-file=../../.env scripts/asr/mapa-semanal.ts [dias=7]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { askJev, type JevQuestion } from "../../src/server/ai/jev";
import { hasIdentifierResidue, scrubIdentifiers } from "../../src/server/privacy/scrub";
import { normalizeAsrTranscript } from "../../src/server/asr/transcriptNormalizer";

type Corr = { antes: string; depois: string };
type Linha = { categoria: string | null; correcoes: Corr[]; palavras: Array<[string, number, number | null]> | null; editado: boolean };
type Classe = "formato" | "numero" | "negacao" | "termo" | "comum" | "insercao" | "remocao";

const OUT = "/Users/luizprazeres/laudousgmobile-def/tmp-review/asr-mapa";
const chave = (s: string) => normalizeAsrTranscript(s, { repairNumbers: true }).toLowerCase().normalize("NFD").replace(/\p{Mn}/gu, "").replace(/[^a-z0-9%/,]+/g, " ").trim();

function porRegra(c: Corr): Classe | null {
  if (!c.antes.trim()) return "insercao";
  if (!c.depois.trim()) return "remocao";
  if (chave(c.antes) === chave(c.depois)) return "formato";
  if (/\b(sem|não|nao|ausência|ausente)\b/i.test(c.depois) !== /\b(sem|não|nao|ausência|ausente)\b/i.test(c.antes)) return "negacao";
  if (/\d/.test(c.antes) || /\d/.test(c.depois)) return "numero";
  return null;
}

async function main() {
  const dias = Number(process.argv[2] ?? 7);
  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const rows = (await sql`select categoria, correcoes, palavras, editado from public.asr_capturas
    where created_at > now() - make_interval(days => ${dias}) order by created_at`) as unknown as Linha[];
  await sql.end();

  const itens: Array<Corr & { categoria: string | null; classe: Classe | null; baixa: boolean | null }> = [];
  for (const r of rows) {
    const conf = new Map<string, number>();
    for (const [w, c] of r.palavras ?? []) conf.set(w.toLowerCase().replace(/[^\p{L}\d]/gu, ""), Math.min(c, conf.get(w) ?? 1));
    for (const c of r.correcoes ?? []) {
      const ws = c.antes.split(/\s+/).map((w) => w.toLowerCase().replace(/[^\p{L}\d]/gu, "")).filter(Boolean);
      const cs = ws.map((w) => conf.get(w)).filter((x): x is number => x !== undefined);
      itens.push({ ...c, categoria: r.categoria, classe: porRegra(c), baixa: cs.length ? Math.min(...cs) < 0.65 : null });
    }
  }
  // o que a regra não decide vai à Jev, em lotes
  const pend = itens.map((it, i) => ({ it, i })).filter(({ it }) => !it.classe);
  for (let k = 0; k < pend.length; k += 150) {
    const qs: Record<string, JevQuestion> = {};
    for (const { it, i } of pend.slice(k, k + 150)) {
      const a = scrubIdentifiers(it.antes), d = scrubIdentifiers(it.depois);
      if (hasIdentifierResidue(a + " " + d) || a !== it.antes || d !== it.depois) continue;
      qs[`c${i}`] = {
        type: "choice",
        instructions: `Num ditado de laudo de ultrassom, o reconhecimento de voz escreveu "${a}" e o médico corrigiu para "${d}". Que tipo de correção é esta?`,
        criteria: { termo: "termo médico/anatômico com grafia errada", comum: "palavra comum trocada, sem mudar o sentido clínico", formato: "só pontuação, maiúscula ou formatação", numero: "número, medida, decimal ou unidade", negacao: "negação perdida ou trocada", insercao: "o médico acrescentou conteúdo novo (não era erro de transcrição)" },
      };
    }
    const r = await askJev({ tarefa: "classificar correções de ditado" }, qs, { timeoutMs: 20_000, tag: "mapa" });
    for (const [id, a] of Object.entries(r?.answers ?? {})) if (a.type === "choice") itens[Number(id.slice(1))]!.classe = a.choice as Classe;
  }

  const porClasse = new Map<string, number>(), porCat = new Map<string, number>(), pares = new Map<string, number>();
  for (const it of itens) {
    porClasse.set(it.classe ?? "sem classe", (porClasse.get(it.classe ?? "sem classe") ?? 0) + 1);
    if (it.classe && it.classe !== "formato" && it.classe !== "insercao") porCat.set(it.categoria ?? "-", (porCat.get(it.categoria ?? "-") ?? 0) + 1);
    if (it.classe === "termo" || it.classe === "negacao" || it.classe === "numero") {
      const k = `${it.antes.toLowerCase()} → ${it.depois.toLowerCase()}`.slice(0, 90);
      pares.set(k, (pares.get(k) ?? 0) + 1);
    }
  }
  const comConf = itens.filter((i) => i.classe && !["formato", "insercao"].includes(i.classe) && i.baixa !== null);
  const md = [
    `# Mapa de erros de transcrição — últimos ${dias} dias`,
    "",
    `${rows.length} ditados capturados, ${rows.filter((r) => r.editado).length} editados à mão, ${itens.length} correções.`,
    "",
    "## Por tipo", "", "| tipo | correções |", "|---|---|",
    ...[...porClasse].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Erros reais por categoria (sem formato nem conteúdo novo)", "", "| categoria | correções |", "|---|---|",
    ...[...porCat].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Pares que se repetem (candidatos à tabela de correção, keyterms e vocabulário)", "",
    ...[...pares].filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `- ${v}× ${k}`),
    "",
    `## A confiança do Deepgram apontava o erro?`, "",
    `${comConf.filter((i) => i.baixa).length} de ${comConf.length} palavras corrigidas vieram com confiança < 0,65.`,
    "",
  ].join("\n");
  mkdirSync(OUT, { recursive: true });
  const f = join(OUT, `${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(f, md);
  console.log(`mapa: ${rows.length} ditados, ${itens.length} correções → ${f}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
