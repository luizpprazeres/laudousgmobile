/**
 * E2E do backend de progresso: runRendererStream com onProgress num ditado real.
 * Mostra a timeline de eventos (interpretando → achado → montando) + o laudo.
 * Rodar: tsx --env-file=.env apps/api/src/server/renderer/__tests__/progress-stream-e2e.manual.ts
 */
import { readFileSync } from "node:fs";
import { runRendererStream } from "../../pipeline/renderer";

const rows = JSON.parse(readFileSync("/tmp/obst-com-1aus.full.json", "utf-8")) as { raw_input: string }[];
const raw = rows[2]!.raw_input; // caso 3

const run = async () => {
  const t0 = Date.now();
  const eventos: string[] = [];
  console.log("Timeline de progresso (o que o app mostraria):\n");

  const gen = runRendererStream({
    categoryCode: "OBSTETRICA",
    rawInput: raw,
    templateBody: "",
    onProgress: (e) => {
      const ms = Date.now() - t0;
      const linha = `  ${String(ms).padStart(5)}ms  [${e.stage}] ${e.label}`;
      console.log(linha);
      eventos.push(e.stage);
    },
  });

  let laudo = "";
  while (true) {
    const next = await gen.next();
    if (next.done) { laudo = next.value.fullText; break; }
    laudo += next.value;
  }

  console.log(`\n  ${String(Date.now() - t0).padStart(5)}ms  laudo pronto\n`);
  console.log("Conclusão gerada:");
  const m = laudo.match(/CONCLUSÃO:[\s\S]*/);
  console.log("  " + (m ? m[0].split("\n").join("\n  ") : laudo).slice(0, 400));

  // Asserções
  let pass = 0, fail = 0;
  const ck = (n: boolean, t: string) => { n ? pass++ : fail++; console.log(`${n ? "✓" : "✗"} ${t}`); };
  console.log("");
  ck(eventos[0] === "interpretando", "1º evento = interpretando");
  ck(eventos.includes("achado"), "emitiu ao menos 1 'achado' (streaming funcionou)");
  ck(eventos[eventos.length - 1] === "montando", "último evento = montando");
  ck(laudo.includes("CONCLUSÃO"), "laudo válido gerado");
  console.log(`\n${pass} ok, ${fail} falhas`);
  if (fail > 0) process.exit(1);
};

run().catch((e) => { console.error(e); process.exit(1); });
