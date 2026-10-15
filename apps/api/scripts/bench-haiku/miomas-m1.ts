/**
 * Miomas numerados (M1, M2…) no writer da PELVE — ditados sintéticos, pela assinatura (`claude -p`).
 * Uso (de apps/api): npx tsx scripts/bench-haiku/miomas-m1.ts [--models claude-sonnet-5-5]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { callClaude } from "./claudeCli";

type Cenario = { id: string; ditado: string; checks: [string, (t: string) => boolean][] };

const corpo = (t: string) => t.split(/CONCLUS[ÃA]O:/)[0] ?? "";
const conclusao = (t: string) => t.split(/CONCLUS[ÃA]O:/)[1] ?? "";

const CENARIOS: Cenario[] = [
  {
    id: "dois-figo",
    ditado: "Pelve transabdominal e transvaginal. Útero em anteversão medindo 9,8 por 5,1 por 6,4, volume de 167. Endométrio 0,8. Dois miomas: o primeiro medindo 2,6 por 2,4 por 2,2 na parede lateral direita, subseroso com mais de 50% intramural, FIGO 5; o segundo medindo 4,2 por 3,8 por 3,5 em região fúndica, intramural. Ovários normais, direito 6,1 e esquerdo 5,4.",
    checks: [
      ["corpo: cabeça 'assim descritas:'", (t) => /duas imagens hipoecoicas e heterogêneas, com margens regulares, assim descritas:/.test(corpo(t))],
      ["corpo: linha (M1) - medindo 2,6", (t) => /^\(M1\) - medindo 2,6 x 2,4 x 2,2 cm/m.test(corpo(t))],
      ["corpo: linha (M2) - medindo 4,2", (t) => /^\(M2\) - medindo 4,2 x 3,8 x 3,5 cm/m.test(corpo(t))],
      ["conclusão: M1 - … FIGO 5", (t) => /M1 - subseroso com mais de 50% intramural \(categoria FIGO 5\)/.test(conclusao(t))],
      ["conclusão: M2 - intramural FIGO 4", (t) => /M2 - intramural \(categoria FIGO 4\)/.test(conclusao(t))],
      ["nota FIGO no fim", (t) => /FIGO: Federação Internacional de Ginecologia e Obstetrícia\./.test(t)],
    ],
  },
  {
    id: "tres-misto",
    ditado: "Pelve transvaginal. Útero em retroversão medindo 10,4 por 5,6 por 7,0, volume 213. Endométrio 1,0. Três miomas. Primeiro 3,1 por 2,8 por 2,7 na parede posterior, intramural. Segundo 1,9 por 1,7 por 1,6 na parede anterior, submucoso FIGO 1. Terceiro 1,4 por 1,2 por 1,1 na parede lateral esquerda. Ovários normais.",
    checks: [
      ["corpo: três + assim descritas", (t) => /três imagens hipoecoicas e heterogêneas, com margens regulares, assim descritas:/.test(corpo(t))],
      ["corpo: M1, M2 e M3 em linhas", (t) => [1, 2, 3].every((n) => new RegExp(`^\\(M${n}\\) - medindo`, "m").test(corpo(t)))],
      ["conclusão: M1 intramural FIGO 4", (t) => /M1 - intramural \(categoria FIGO 4\)/.test(conclusao(t))],
      ["conclusão: M2 submucoso FIGO 1", (t) => /M2 - submucoso[^,)]*\(categoria FIGO 1\)/.test(conclusao(t))],
      ["conclusão: M3 sem FIGO inventada", (t) => /M3 - nódulo miomatoso/.test(conclusao(t)) && !/M3 - [^.,]*FIGO/.test(conclusao(t))],
    ],
  },
  {
    id: "um-so",
    ditado: "Pelve transabdominal e transvaginal. Útero anteversão 8,9 por 4,8 por 5,9, volume 132. Endométrio 0,7. Mioma intramural na parede anterior medindo 2,0 por 1,8 por 1,7. Ovários normais.",
    checks: [
      ["corpo sem numeração (um mioma)", (t) => !/\(M1\)/.test(t) && /imagem hipoecoica e heterogênea, com margens regulares, medindo 2,0 x 1,8 x 1,7 cm/.test(corpo(t))],
      ["conclusão singular FIGO 4", (t) => /nódulo miomatoso intramural \(categoria FIGO 4\)/.test(conclusao(t))],
    ],
  },
  {
    id: "dois-sem-classe",
    ditado: "Pelve transvaginal. Útero em anteversão medindo 9,0 por 5,0 por 6,0, volume 141. Endométrio 0,9. Dois miomas, o primeiro com 2,2 por 2,0 por 1,9 na parede anterior e o segundo com 1,5 por 1,4 por 1,3 na parede posterior. Ovários normais.",
    checks: [
      ["corpo: M1 e M2 em linhas", (t) => /^\(M1\) - medindo 2,2/m.test(corpo(t)) && /^\(M2\) - medindo 1,5/m.test(corpo(t))],
      ["conclusão sem lista nem FIGO", (t) => /nódulos miomatosos\./.test(conclusao(t)) && !/M1 -|FIGO/.test(conclusao(t))],
    ],
  },
  {
    id: "multiplos",
    ditado: "Pelve transabdominal e transvaginal. Útero aumentado, anteversão, 12,1 por 6,8 por 8,2, volume 352. Endométrio 0,9. Múltiplos miomas, os maiores: primeiro 4,5 por 4,1 por 3,9 fúndico subseroso FIGO 6; segundo 3,3 por 3,0 por 2,9 parede posterior intramural; terceiro 2,8 por 2,5 por 2,4 parede anterior FIGO 3; quarto 2,1 por 2,0 por 1,8 parede lateral direita intramural. Ovários normais.",
    checks: [
      ["corpo: múltiplas + as maiores assim descritas", (t) => /múltiplas imagens hipoecoicas e heterogêneas, com margens regulares, as maiores assim descritas:/.test(corpo(t))],
      ["corpo: M1..M4 em linhas", (t) => [1, 2, 3, 4].every((n) => new RegExp(`^\\(M${n}\\) - medindo`, "m").test(corpo(t)))],
      ["conclusão: M1 FIGO 6 … M4 FIGO 4", (t) => /M1 - [^,]*\(categoria FIGO 6\)/.test(conclusao(t)) && /M4 - intramural \(categoria FIGO 4\)/.test(conclusao(t))],
      ["conclusão: M3 FIGO 3", (t) => /M3 - [^,]*\(categoria FIGO 3\)/.test(conclusao(t))],
    ],
  },
];

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const models = (arg("models") ?? "claude-sonnet-5-5").split(",");
  const out = arg("out") ?? join("..", "..", "tmp-review", "bench-haiku", "miomas-m1", new Date().toISOString().slice(0, 19).replace(/:/g, "-"));
  mkdirSync(out, { recursive: true });

  const { buildPelveWriterSystemMessage } = await import("../../src/server/renderer/categories/PELVE_FEMININA");
  const { PELVE_FEWSHOTS } = await import("../../src/server/renderer/categories/pelveFewshots");
  const { WRITER_OUTPUT_RULE, cleanWriterOutput } = await import("../../src/server/pipeline/writerOutputGuard");
  const { auditPelveFacts, pelveRevisarNote } = await import("../../src/server/pipeline/pelveWriterAudit");
  const system = `${buildPelveWriterSystemMessage()}\n\n${WRITER_OUTPUT_RULE}\n\nEXEMPLOS (pares ditado → laudo assinado; siga o mesmo padrão):\n` +
    PELVE_FEWSHOTS.map((f) => `\n<ditado>\nDitado do médico:\n${f.raw}\n</ditado>\n<laudo>\n${f.laudo}\n</laudo>`).join("\n");

  const res: { modelo: string; id: string; laudo: string; auditoria: string | null; falhas: string[] }[] = [];
  const tarefas = models.flatMap((m) => CENARIOS.map((c) => ({ m, c })));
  let i = 0;
  const worker = async () => {
    while (i < tarefas.length) {
      const { m, c } = tarefas[i++]!;
      const r = await callClaude({ model: m, system, user: `Ditado do médico:\n${c.ditado}`, timeoutMs: 240_000 });
      const laudo = cleanWriterOutput(r.text).text;
      const auditoria = pelveRevisarNote(auditPelveFacts(c.ditado, laudo));
      const falhas = c.checks.filter(([, ok]) => !ok(laudo)).map(([n]) => n);
      if (auditoria) falhas.push(`auditoria: ${auditoria}`);
      res.push({ modelo: m, id: c.id, laudo, auditoria, falhas });
      console.log(`${m.padEnd(18)} ${c.id.padEnd(16)} ${falhas.length ? `✗ ${falhas.join(" · ")}` : "✓"}`);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  writeFileSync(join(out, "miomas-m1.json"), JSON.stringify(res, null, 1));
  console.log(`saídas: ${out}/miomas-m1.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
