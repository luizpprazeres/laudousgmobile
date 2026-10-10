/**
 * CENÁRIOS SINTÉTICOS — "calcule o volume" (decisão do Luiz de 10/10, rodada 2) e A10 de partes moles
 * ("Correlacionar com dados clínicos" só quando ditado). Haiku 5.5 pela ASSINATURA, concorrência 2.
 * Ditados inventados, sem dado de paciente.
 *
 * Writer completo: system efetivo (contrato + global enxuto + biblioteca do banco, só leitura) +
 * WRITER_OUTPUT_RULE, como o writerClient. Writers dedicados: prompt + regra de volume + few-shots
 * dobrados no system, como na bancada W14. Depois, o mesmo pós-processamento da rota: limpeza do
 * writer e `applyVolumePolicy` (writer completo: política inteira; dedicado: só com pedido).
 * Cada verificação de volume é medida duas vezes: no texto do Haiku ("modelo") e depois do guard ("final").
 *
 * Rodar (de apps/api): pnpm exec tsx scripts/bench-haiku/sinteticos-volume.ts [--reps 2] [--only V,P] [--out <dir>]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { callClaude } from "./claudeCli";

loadDotenv({ path: join(resolve(__dirname, "../../../.."), ".env") });

type Tipo = "completo" | "pelve" | "msk" | "partes_moles";
type Check = [nome: string, ok: (t: string) => boolean];
type Caso = { id: string; tipo: Tipo; categoria: string; label: string; ditado: string; volume: Check[]; outros: Check[] };

const conclusao = (t: string) => t.split(/CONCLUS[ÃA]O:|IMPRESS[ÃA]O:/i)[1] ?? "";
const semVolumeNovo = (t: string) => !/\d+,\d+\s*cm³/.test(t);

const CASOS: Caso[] = [
  // ── writer completo ──
  { id: "V1", tipo: "completo", categoria: "ABDOMEN_TOTAL", label: "Abdome total",
    ditado: "Ultrassonografia do abdome total. Fígado, vesícula, pâncreas e baço normais. Rim direito com imagem anecoica de paredes finas no polo superior medindo 3,2 por 2,8 por 2,5 centímetros, calcule o volume. Rim esquerdo normal. Bexiga normal.",
    volume: [["cisto: 3,2 x 2,8 x 2,5 x 0,52 = 11,6 cm³", (t) => /11,6 cm³/.test(t)]],
    outros: [["sem volume em outra estrutura", (t) => (t.match(/cm³/g) ?? []).length <= 2], ["medidas do cisto", (t) => /3,2 x 2,8 x 2,5 cm/.test(t)]] },
  { id: "V2", tipo: "completo", categoria: "ABDOMEN_TOTAL", label: "Abdome total",
    ditado: "Abdome total. Rim direito com imagem anecoica de paredes finas no polo superior medindo 3,2 por 2,8 por 2,5 centímetros. Demais órgãos normais.",
    volume: [["sem pedido: nenhum volume calculado", semVolumeNovo]],
    outros: [["medidas do cisto", (t) => /3,2 x 2,8 x 2,5 cm/.test(t)]] },
  { id: "V3", tipo: "completo", categoria: "ABDOMEN_TOTAL", label: "Abdome total",
    ditado: "Abdome total. Baço aumentado, homogêneo, medindo 12 por 5 por 4 centímetros, calcule o volume do baço. Restante do exame normal.",
    volume: [["baço: 12 x 5 x 4 x 0,52 = 124,8 cm³", (t) => /124,8 cm³/.test(t)]],
    outros: [["esplenomegalia/baço aumentado na conclusão", (t) => /baço|esplenomegalia/i.test(conclusao(t))]] },
  { id: "V4", tipo: "completo", categoria: "VIAS_URINARIAS", label: "Vias urinárias",
    ditado: "Vias urinárias. Rins normais, exceto imagem anecoica simples no terço médio do rim esquerdo medindo 2,0 por 1,8 por 1,6 cm, calcule o volume dela. Bexiga com volume pré-miccional de 320 ml.",
    volume: [["cisto: 2,0 x 1,8 x 1,6 x 0,52 = 3,0 cm³", (t) => /\b3,0 cm³/.test(t)], ["volume da bexiga ditado preservado (320)", (t) => /320 m[lL]/.test(t)]],
    outros: [] },
  { id: "V5", tipo: "completo", categoria: "ABDOMEN_TOTAL", label: "Abdome total",
    ditado: "Abdome total. Rim esquerdo com imagem anecoica de paredes finas medindo 2,4 por 2,0 por 2,2 cm, não precisa calcular o volume. Demais órgãos normais.",
    volume: [["negação: nenhum volume calculado", semVolumeNovo]],
    outros: [["medidas do cisto", (t) => /2,4 x 2,0 x 2,2 cm/.test(t)]] },
  // ── writers dedicados ──
  { id: "P1", tipo: "pelve", categoria: "PELVE_FEMININA", label: "Pelve feminina",
    ditado: "Pelve transvaginal. Útero em anteversão medindo 7,5 por 4,2 por 5,0, calcule o volume do útero. Endométrio de 0,8. Ovários normais, o direito com 6,1 cm³ e o esquerdo com 5,4 cm³.",
    volume: [["útero: 7,5 x 4,2 x 5,0 x 0,52 = 81,9 cm³", (t) => /81,9 cm³/.test(t)], ["ovários ditados preservados", (t) => /6,1 cm³/.test(t) && /5,4 cm³/.test(t)]],
    outros: [] },
  { id: "P2", tipo: "pelve", categoria: "PELVE_FEMININA", label: "Pelve feminina",
    ditado: "Pelve transvaginal. Útero em anteversão medindo 7,5 por 4,2 por 5,0. Endométrio de 0,8. Ovários normais.",
    volume: [["sem pedido: nenhum volume calculado", semVolumeNovo]],
    outros: [] },
  { id: "P3", tipo: "pelve", categoria: "PELVE_FEMININA", label: "Pelve feminina",
    ditado: "Pelve transvaginal. Útero em anteversão medindo 7,8 por 4,1 por 4,6, com volume de 80,2. Endométrio 0,6. Ovário direito com imagem anecoica de paredes finas medindo 3,0 por 2,6 por 2,8, calcule o volume do cisto. Ovário esquerdo normal.",
    volume: [["cisto: 3,0 x 2,6 x 2,8 x 0,52 = 11,4 cm³", (t) => /11,4 cm³/.test(t)], ["útero ditado preservado (80,2)", (t) => /80,2 cm³/.test(t)]],
    outros: [] },
  { id: "M1", tipo: "msk", categoria: "MUSCULOESQUELETICO_V2", label: "Joelho",
    ditado: "Ultrassonografia do joelho direito. Imagem anecoica na fossa poplítea, entre o gastrocnêmio medial e o semimembranoso, medindo 4,2 por 1,5 por 2,0 cm, calcule o volume. Cisto de Baker. Restante normal.",
    volume: [["cisto de Baker: 4,2 x 1,5 x 2,0 x 0,52 = 6,6 cm³", (t) => /6,6 cm³/.test(t)]],
    outros: [["Baker na conclusão", (t) => /Baker/i.test(conclusao(t))]] },
  { id: "S1", tipo: "partes_moles", categoria: "PARTES_MOLES", label: "Partes moles",
    ditado: "Partes moles da coxa esquerda. Coleção com ecos internos no subcutâneo medindo 5,0 por 3,0 por 2,0 centímetros, calcule o volume. Na conclusão, hematoma.",
    volume: [["coleção: 5,0 x 3,0 x 2,0 x 0,52 = 15,6 cm³", (t) => /15,6 cm³/.test(t)]],
    outros: [["A10: sem 'correlacionar' não ditado", (t) => !/correlac/i.test(t)]] },
  // ── A10 ──
  { id: "A1", tipo: "partes_moles", categoria: "PARTES_MOLES", label: "Partes moles",
    ditado: "Partes moles da região inguinal direita. Linfonodo de morfologia preservada, com hilo ecogênico, medindo 1,5 por 0,8 por 0,6 centímetros.",
    volume: [], outros: [["A10 negativo: sem 'correlacionar'", (t) => !/correlac/i.test(t)], ["medida", (t) => /1,5 x 0,8 x 0,6 cm/.test(t)]] },
  { id: "A2", tipo: "partes_moles", categoria: "PARTES_MOLES", label: "Partes moles",
    ditado: "Partes moles do antebraço direito. Imagem nodular sólida hipoecoica, de contornos regulares, no subcutâneo, medindo 1,2 por 0,9 por 0,7 cm, sem fluxo ao Doppler. Na conclusão, imagem nodular a esclarecer.",
    volume: [], outros: [["A10 negativo: sem 'correlacionar'", (t) => !/correlac/i.test(t)], ["a esclarecer", (t) => /esclarecer/i.test(conclusao(t))]] },
  { id: "A3", tipo: "partes_moles", categoria: "PARTES_MOLES", label: "Partes moles",
    ditado: "Partes moles do dorso. Lipoma.",
    volume: [], outros: [["A10 negativo: sem 'correlacionar'", (t) => !/correlac/i.test(t)], ["lipoma na conclusão", (t) => /lipoma/i.test(conclusao(t))]] },
  { id: "A4", tipo: "partes_moles", categoria: "PARTES_MOLES", label: "Partes moles",
    ditado: "Partes moles da região cervical esquerda. Linfonodo arredondado, sem hilo, medindo 1,8 por 1,4 por 1,2 cm. Na conclusão, linfonodo de aspecto atípico, correlacionar com dados clínicos.",
    volume: [], outros: [["A10 positivo: 'Correlacionar com dados clínicos' presente", (t) => /correlacionar com dados clínicos/i.test(conclusao(t))], ["uma vez só", (t) => (t.match(/correlac/gi) ?? []).length === 1]] },
  { id: "A5", tipo: "partes_moles", categoria: "PARTES_MOLES", label: "Partes moles",
    ditado: "Partes moles da axila direita. Coleção anecoica de paredes finas medindo 3,0 por 2,0 por 1,5 cm. Conclusão: seroma. Convém correlação com os dados clínicos e laboratoriais.",
    volume: [], outros: [["A10 positivo: redação do médico", (t) => /correla[çc][ãa]o com os dados cl[íi]nicos e laboratoriais/i.test(conclusao(t))], ["sem 'Correlacionar com dados clínicos' extra", (t) => !/Correlacionar com dados clínicos/.test(t)]] },
];

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
  const reps = Number(arg("reps") ?? "2");
  const so = arg("only")?.split(",");
  const out = arg("out") ?? join("..", "..", "tmp-review", "bench-haiku", "volume", new Date().toISOString().slice(0, 19).replace(/:/g, "-"));
  mkdirSync(out, { recursive: true });

  const { buildSystemMessage } = await import("../../src/server/prompts/buildSystemMessage");
  const { loadDeterministicBundle } = await import("../../src/server/pipeline/bundleLoader");
  const { buildRawUserMessage, chosenExamLabel } = await import("../../src/server/pipeline/writer");
  const { WRITER_OUTPUT_RULE, cleanWriterOutput } = await import("../../src/server/pipeline/writerOutputGuard");
  const { VOLUME_CALCULO_RULE } = await import("../../src/server/prompts/global");
  const { applyVolumePolicy } = await import("../../src/server/pipeline/volumeGuard");
  const { normalizeMskWriterFormat } = await import("../../src/server/pipeline/mskWriterFormat");
  const { buildPelveWriterSystemMessage } = await import("../../src/server/renderer/categories/PELVE_FEMININA");
  const { PELVE_FEWSHOTS } = await import("../../src/server/renderer/categories/pelveFewshots");
  const { buildMskWriterSystemMessage } = await import("../../src/server/renderer/categories/MUSCULOESQUELETICO");
  const { MSK_FEWSHOTS } = await import("../../src/server/renderer/categories/mskFewshots");
  const { buildPartesMolesWriterSystemMessage } = await import("../../src/server/renderer/categories/PARTES_MOLES");
  const { PARTES_MOLES_FEWSHOTS } = await import("../../src/server/renderer/categories/partesMolesFewshots");

  const fold = (base: string, shots: ReadonlyArray<{ raw: string; laudo: string }>) =>
    `${base}\n\n${VOLUME_CALCULO_RULE}\n\n${WRITER_OUTPUT_RULE}\n\nEXEMPLOS (pares ditado → laudo assinado; siga o mesmo padrão):\n` +
    shots.map((f) => `\n<ditado>\nDitado do médico:\n${f.raw}\n</ditado>\n<laudo>\n${f.laudo}\n</laudo>`).join("\n");
  const DEDICADO: Record<Exclude<Tipo, "completo">, string> = {
    pelve: fold(buildPelveWriterSystemMessage(), PELVE_FEWSHOTS),
    msk: fold(buildMskWriterSystemMessage(), MSK_FEWSHOTS),
    partes_moles: fold(buildPartesMolesWriterSystemMessage(), PARTES_MOLES_FEWSHOTS),
  };

  const postgres = (await import("postgres")).default;
  const sql = postgres(process.env.DATABASE_URL!, { ssl: "require", max: 1 });
  const [ws] = await sql`select id from writing_styles where code = 'CLASSICO_COMPLETO'`;
  await sql.end();

  const tarefas = CASOS.filter((c) => !so || so.some((p) => c.id.startsWith(p))).flatMap((c) => Array.from({ length: reps }, (_, r) => ({ c, r })));
  const res: Array<{ id: string; rep: number; modelo: string; final: string; falhasModelo: string[]; falhasFinal: string[] }> = [];
  let i = 0;
  const worker = async () => {
    while (i < tarefas.length) {
      const { c, r } = tarefas[i++]!;
      let system: string;
      let user: string;
      if (c.tipo === "completo") {
        const bundle = await loadDeterministicBundle({ categoryCode: c.categoria, writingStyleId: ws.id, rawInput: c.ditado });
        if (bundle.error) throw new Error(bundle.error.code);
        const label = chosenExamLabel(c.categoria, c.label);
        system = `${buildSystemMessage({ categoryCode: c.categoria, categoryLabel: label, writingStyleCode: "CLASSICO_COMPLETO", ragBlocks: bundle.blocks, inputMode: "raw" })}\n\n${WRITER_OUTPUT_RULE}`;
        user = buildRawUserMessage(c.ditado, false, { label, code: c.categoria });
      } else {
        system = DEDICADO[c.tipo];
        user = `Ditado do médico:\n${c.ditado}`;
      }
      const resp = await callClaude({ model: "claude-haiku-5-5", system, user, timeoutMs: 240_000 });
      let modelo = cleanWriterOutput(resp.text).text;
      if (c.tipo === "msk") modelo = normalizeMskWriterFormat(modelo);
      const final = applyVolumePolicy(modelo, c.ditado, { soPedido: c.tipo !== "completo" });
      const todos = [...c.volume, ...c.outros];
      const falhasModelo = c.volume.filter(([, ok]) => !ok(modelo)).map(([n]) => n);
      const falhasFinal = todos.filter(([, ok]) => !ok(final)).map(([n]) => n);
      res.push({ id: c.id, rep: r, modelo, final, falhasModelo, falhasFinal });
      console.log(`${c.id}#${r} ${falhasFinal.length ? `✗ ${falhasFinal.join(" · ")}` : "✓"}${falhasModelo.length ? `  (modelo antes do guard: ✗ ${falhasModelo.join(" · ")})` : ""}`);
    }
  };
  await Promise.all([worker(), worker()]);
  res.sort((a, b) => (a.id + a.rep).localeCompare(b.id + b.rep));
  writeFileSync(join(out, "sinteticos-volume.json"), JSON.stringify(res, null, 1));

  const vol = res.filter((x) => CASOS.find((c) => c.id === x.id)!.volume.length > 0);
  const nVol = vol.reduce((s, x) => s + CASOS.find((c) => c.id === x.id)!.volume.length, 0);
  const okModelo = nVol - vol.reduce((s, x) => s + x.falhasModelo.length, 0);
  const nTodos = res.reduce((s, x) => { const c = CASOS.find((k) => k.id === x.id)!; return s + c.volume.length + c.outros.length; }, 0);
  const okFinal = nTodos - res.reduce((s, x) => s + x.falhasFinal.length, 0);
  console.log(`\nvolume — Haiku sozinho: ${okModelo}/${nVol} verificações · depois do guard (final): ver total`);
  console.log(`final (volume + demais): ${okFinal}/${nTodos} verificações · ${res.filter((x) => !x.falhasFinal.length).length}/${res.length} saídas sem falha`);
  console.log(`saídas: ${out}/sinteticos-volume.json`);
  process.exit(0); // o cliente da assinatura deixa handle aberto
}

main().catch((e) => { console.error(e); process.exit(1); });
