/**
 * E2E LIVE do interpretador de comandos por LLM (fase 2). Valida os casos que a
 * regex determinística NÃO cobre: âncora semântica (89de6e68) e achado-no-corpo
 * (88543eea). Chama a OpenAI.
 * Rodar: set -a; source apps/api/.env.local; set +a
 *   pnpm -F api exec tsx src/server/pipeline/__tests__/command-interpreter-e2e.manual.ts
 */
import { interpretCommandsLLM, applyCommandInterpreter } from "../commandInterpreter";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { fail += 1; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
}

const PROSTATA = [
  "ULTRASSONOGRAFIA DA PRÓSTATA (TRANSABDOMINAL)", "",
  "COMENTÁRIOS:", "Exame realizado por via suprapúbica.", "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "Bexiga de paredes finas e regulares.",
  "Próstata medindo 4,0 x 3,0 x 3,5 cm.", "",
  "CONCLUSÃO:",
  "1) Resíduo pós-miccional de 80 mL.",
  "2) Próstata com volume estimado em 25 g.",
].join("\n");

const MAMA = [
  "ULTRASSONOGRAFIA MAMÁRIA", "",
  "COMENTÁRIOS:", "Exame com transdutor linear.", "",
  "OS SEGUINTES ASPECTOS FORAM OBSERVADOS:",
  "Mamas de aspecto ecográfico normal.", "",
  "CONCLUSÃO:",
  "1) Estudo ecográfico mamário sem alterações (BI-RADS 1).",
].join("\n");

async function main() {
  // ── 89de6e68: âncora semântica "a frase do resíduo" ──
  console.log("\n== 89de6e68: 'no lugar da frase do resíduo escreva ...' ==");
  {
    const ditado = "Próstata e bexiga normais. No lugar da frase do resíduo escreva resíduo pós-miccional desprezível.";
    const ops = await interpretCommandsLLM(ditado, PROSTATA);
    console.log("  ops:", JSON.stringify(ops));
    const rep = ops.find((o) => o.op === "replace_phrase") as { from: string; to: string } | undefined;
    check("gerou replace_phrase", !!rep, JSON.stringify(ops));
    check("from é literal do draft (resíduo)", !!rep && PROSTATA.includes(rep.from) && /res[íi]duo/i.test(rep.from), JSON.stringify(rep));
    const out = await applyCommandInterpreter(PROSTATA, ditado);
    check("aplicado: resíduo virou 'desprezível'", /desprez[íi]vel/i.test(out) && !/Resíduo pós-miccional de 80 mL/.test(out), out);
  }

  // ── 88543eea: achado para o CORPO ──
  console.log("\n== 88543eea: 'pode colocar cisto de óleo' ==");
  {
    const ditado = "Mamas normais. Pode colocar cisto de óleo na mama direita.";
    const ops = await interpretCommandsLLM(ditado, MAMA);
    console.log("  ops:", JSON.stringify(ops));
    check("gerou add_body_finding (não conclusão)", ops.some((o) => o.op === "add_body_finding" && /cisto de óleo/i.test(o.text)), JSON.stringify(ops));
    const out = await applyCommandInterpreter(MAMA, ditado);
    const corpo = out.split("CONCLUSÃO:")[0] ?? "";
    check("aplicado: cisto de óleo no CORPO", /cisto de óleo/i.test(corpo), out);
    check("aplicado: não poluiu a conclusão", !/cisto de óleo/i.test(out.split("CONCLUSÃO:")[1] ?? ""), out);
  }

  // ── controle: sem comando → nenhuma operação ──
  console.log("\n== controle: ditado sem comando ==");
  {
    const ops = await interpretCommandsLLM("Próstata e bexiga de aspecto normal.", PROSTATA);
    check("sem comando → operations vazio", ops.length === 0, JSON.stringify(ops));
  }

  console.log(`\n===== ${pass} passaram, ${fail} falharam =====`);
  process.exit(fail === 0 ? 0 : 1);
}

void main();
