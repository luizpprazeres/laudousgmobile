/**
 * CENÁRIOS SINTÉTICOS DA REVISÃO W13 (W14) — pelve e MSK, pela ASSINATURA (`claude -p`), sem banco.
 * Cada ditado é inventado (sem dado de paciente) e reproduz um achado do Codex; a saída passa pelo mesmo
 * pós-processamento do writer dedicado (formato + nota da auditoria determinística) e é conferida por regex. Few-shots dobrados no system como na bancada.
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/cenarios-w14.ts [--models claude-haiku-5-5,claude-sonnet-5-5] [--out <dir>]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { callClaude } from "./claudeCli";

type Check = [nome: string, ok: (laudo: string) => boolean];
type Cenario = { id: string; achado: string; categoria: "pelve" | "msk"; ditado: string; checks: Check[] };

const corpo = (t: string) => t.split(/CONCLUS[ÃA]O:/i)[0] ?? "";
const conclusao = (t: string) => t.split(/CONCLUS[ÃA]O:/i)[1] ?? "";

const CENARIOS: Cenario[] = [
  {
    id: "P1", achado: "A02", categoria: "pelve",
    ditado: "Ultrassonografia pélvica transvaginal. Útero em anteversão medindo 7,8 por 4,1 por 4,6, com volume de 76,4. Endométrio de 0,8. Ovários normais, o direito com 5,2 cm³ e o esquerdo 4,8 cm³.",
    checks: [
      ["ovário sem eixos inventados", (t) => !/Ovário (direito|esquerdo) medindo/.test(t)],
      ["sem [REVISAR] por falta", (t) => !/\[REVISAR/.test(t)],
      ["volumes ovarianos preservados", (t) => /5,2 cm³/.test(t) && /4,8 cm³/.test(t)],
      ["sem 0,0 nem ____", (t) => !/____|\b0,0\b/.test(t)],
    ],
  },
  {
    id: "P2", achado: "A02", categoria: "pelve",
    ditado: "Pelve transabdominal e transvaginal. Útero em anteversão medindo 8,1 por 4,3 por 5,0. Endométrio 0,7. Ovário direito medindo 3,0 por 2,1 por 2,4 e esquerdo medindo 2,8 por 2,0 por 2,2, normais.",
    checks: [
      ["volume uterino não inventado", (t) => !/Útero de volume normal \(\d/.test(t) && !/volume de \d+,\d+ cm³\)/.test(conclusao(t).split("\n").find((l) => /Útero/.test(l)) ?? "")],
      ["sem [REVISAR] por falta", (t) => !/\[REVISAR/.test(t)],
      ["sem volumes ovarianos inventados", (t) => !/o direito com \d/.test(t)],
    ],
  },
  {
    id: "P3", achado: "A03", categoria: "pelve",
    ditado: "Pelve transabdominal e transvaginal. Útero em anteversão medindo 9,0 por 5,0 por 6,0, volume de 141,0. Endométrio 0,9. Mioma medindo 2,1 por 1,8 por 2,0 na parede posterior. Ovários normais, direito 6,1 e esquerdo 5,0 de volume.",
    checks: [
      ["sem FIGO inventado", (t) => !/FIGO/.test(t)],
      ["sem tipo inventado", (t) => !/intramural|subseros|submucos/i.test(t)],
      ["mioma na conclusão", (t) => /nódulo miomatoso/.test(conclusao(t))],
    ],
  },
  {
    id: "P4", achado: "A03", categoria: "pelve",
    ditado: "Pelve transabdominal e transvaginal. Útero em anteversão medindo 9,2 por 5,1 por 6,3, volume de 154,0. Endométrio 1,0. Mioma intramural medindo 2,0 por 1,9 por 2,1 na parede anterior. Ovários normais, direito 5,5 e esquerdo 4,9.",
    checks: [
      ["tipo ditado preservado", (t) => /intramural/.test(conclusao(t))],
      ["sem FIGO inventado", (t) => !/FIGO/.test(t)],
    ],
  },
  {
    id: "P5", achado: "A03", categoria: "pelve",
    ditado: "Pelve transvaginal. Útero em anteversão medindo 8,8 por 4,9 por 5,8, volume de 130,0. Endométrio 0,8. Mioma subseroso FIGO 2 medindo 1,5 por 1,4 por 1,6 na parede anterior. Ovários normais, direito 4,8 e esquerdo 5,1.",
    checks: [
      ["tipo e FIGO ditados preservados", (t) => /subseroso/.test(t) && /FIGO 2/.test(t)],
      ["incompatibilidade sinalizada", (t) => /\[REVISAR/.test(t)],
      ["legenda FIGO uma vez, sem número", (t) => (t.match(/FIGO: Federa/g) ?? []).length === 1 && !/^\s*\d+\)\s*FIGO:/m.test(t)],
    ],
  },
  {
    id: "M1", achado: "A09", categoria: "msk",
    ditado: "Ultrassonografia do joelho direito. Ligamento colateral medial espessado, com redução da ecogenicidade. Restante normal.",
    checks: [
      ["achado fora do roteiro no corpo", (t) => /colateral medial/i.test(corpo(t))],
      ["sem meniscos/cartilagem presumidos", (t) => !/menisco|cartilagem/i.test(t)],
    ],
  },
  {
    id: "M2", achado: "M01", categoria: "msk",
    ditado: "Ultrassonografia do punho esquerdo. Imagem anecoica de margem regular medindo 1,2 por 0,8 por 0,9 no dorso do punho, provável cisto sinovial. Restante normal.",
    checks: [
      ["sem 'compatível com' no corpo", (t) => !/compatível com/i.test(corpo(t))],
      ["hipótese na fórmula da casa", (t) => /que tem como diagnóstico mais provável cisto sinovial/i.test(conclusao(t))],
      ["sem 'O diagnóstico mais provável é'", (t) => !/O diagnóstico mais provável é/.test(t)],
    ],
  },
  {
    id: "M3", achado: "M01/M03", categoria: "msk",
    ditado: "Ultrassonografia do ombro direito. Tendão supraespinhal espessado e hipoecogênico. Bursa normal. Restante normal.",
    checks: [
      ["'sem evidência de rotura' (singular)", (t) => /supraespinhal[^\n]*sem evidência de rotura\./.test(corpo(t))],
      ["vocabulário hipoecoico", (t) => !/ecogênic/i.test(t)],
    ],
  },
];

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const models = (arg("models") ?? "claude-haiku-5-5,claude-sonnet-5-5").split(",");
  const out = arg("out") ?? join("..", "..", "tmp-review", "bench-haiku", "w14", new Date().toISOString().slice(0, 19).replace(/:/g, "-"));
  mkdirSync(out, { recursive: true });

  const { buildPelveWriterSystemMessage } = await import("../../src/server/renderer/categories/PELVE_FEMININA");
  const { PELVE_FEWSHOTS } = await import("../../src/server/renderer/categories/pelveFewshots");
  const { buildMskWriterSystemMessage } = await import("../../src/server/renderer/categories/MUSCULOESQUELETICO");
  const { MSK_FEWSHOTS } = await import("../../src/server/renderer/categories/mskFewshots");
  const { WRITER_OUTPUT_RULE, cleanWriterOutput } = await import("../../src/server/pipeline/writerOutputGuard");
  const { normalizeMskWriterFormat } = await import("../../src/server/pipeline/mskWriterFormat");
  const { auditPelveFacts, pelveRevisarNote } = await import("../../src/server/pipeline/pelveWriterAudit");
  const { auditMskFacts, auditRevisarNote } = await import("../../src/server/pipeline/mskWriterAudit");
  const notaAuditoria = (c: Cenario, laudo: string) =>
    c.categoria === "pelve" ? pelveRevisarNote(auditPelveFacts(c.ditado, laudo)) : auditRevisarNote(auditMskFacts(c.ditado, laudo));

  const fold = (base: string, shots: ReadonlyArray<{ raw: string; laudo: string }>) =>
    `${base}\n\n${WRITER_OUTPUT_RULE}\n\nEXEMPLOS (pares ditado → laudo assinado; siga o mesmo padrão):\n` +
    shots.map((f) => `\n<ditado>\nDitado do médico:\n${f.raw}\n</ditado>\n<laudo>\n${f.laudo}\n</laudo>`).join("\n");
  const SYSTEM = {
    pelve: fold(buildPelveWriterSystemMessage(), PELVE_FEWSHOTS),
    msk: fold(buildMskWriterSystemMessage(), MSK_FEWSHOTS),
  };

  const tarefas = models.flatMap((m) => CENARIOS.map((c) => ({ m, c })));
  const res: { modelo: string; id: string; achado: string; laudo: string; falhas: string[] }[] = [];
  let i = 0;
  const worker = async () => {
    while (i < tarefas.length) {
      const { m, c } = tarefas[i++]!;
      const r = await callClaude({ model: m, system: SYSTEM[c.categoria], user: `Ditado do médico:\n${c.ditado}`, timeoutMs: 240_000 });
      let laudo = normalizeMskWriterFormat(cleanWriterOutput(r.text).text);
      const nota = notaAuditoria(c, laudo);
      if (nota) laudo = `${laudo}\n\n${nota}`;
      const falhas = c.checks.filter(([, ok]) => !ok(laudo)).map(([n]) => n);
      res.push({ modelo: m, id: c.id, achado: c.achado, laudo, falhas });
      console.log(`${m.padEnd(18)} ${c.id} (${c.achado}) ${falhas.length ? `✗ ${falhas.join(" · ")}` : "✓"}`);
    }
  };
  await Promise.all([worker(), worker()]);
  res.sort((a, b) => (a.modelo + a.id).localeCompare(b.modelo + b.id));
  writeFileSync(join(out, "cenarios.json"), JSON.stringify(res, null, 1));
  for (const m of models) {
    const r = res.filter((x) => x.modelo === m);
    const total = r.reduce((s, x) => s + CENARIOS.find((c) => c.id === x.id)!.checks.length, 0);
    console.log(`${m}: ${total - r.reduce((s, x) => s + x.falhas.length, 0)}/${total} checagens · ${r.filter((x) => !x.falhas.length).length}/${r.length} cenários`);
  }
  console.log(`saídas: ${out}/cenarios.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
