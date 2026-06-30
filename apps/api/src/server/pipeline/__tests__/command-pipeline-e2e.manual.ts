/**
 * VALIDAÇÃO E2E do parser COMPLETO (fase 3 + 1 + 2) sobre casos reais.
 * Replica o fluxo do route com as flags ON: strip pré-gen → gera draft limpo (LLM
 * real) → aplica fase 1 (determinística) + fase 2 (LLM) → sanitiza. Confere que o
 * draft sai SEM eco do comando e que o comando é EXECUTADO no lugar certo.
 * Rodar: set -a; source apps/api/.env.local; set +a
 *   pnpm -F api exec tsx src/server/pipeline/__tests__/command-pipeline-e2e.manual.ts
 */
import { createClient } from "@supabase/supabase-js";
import { env } from "../../env";
import { parseCommandsPregen } from "../commandStripper";
import { applyOperations } from "../operations";
import { applyCommandInterpreter } from "../commandInterpreter";
import { sanitizeDictationArtifacts } from "../dictationSanitizer";
import { runRendererStream } from "../renderer";

let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { fail += 1; console.error(`  ✗ ${name}${detail ? `\n     ${detail}` : ""}`); }
}
function concl(l: string): string { return l.split(/CONCLUS[ÃA]O\s*:/i)[1] ?? ""; }
function corpo(l: string): string { return l.split(/CONCLUS[ÃA]O\s*:/i)[0] ?? ""; }

async function generate(categoryCode: string, genText: string): Promise<string> {
  const gen = runRendererStream({ categoryCode, rawInput: genText, templateBody: "" });
  let draft = "";
  for (;;) { const n = await gen.next(); if (n.done) break; draft += n.value; }
  return draft;
}

const CASES = [
  { id: "89de6e68-c419-43d6-9a23-6b2e94326e5d", cat: "PROSTATA_SUPRAPUBICA", kind: "replace" },
  { id: "88543eea-3947-48fa-bfa9-1a6ccaefa302", cat: "MAMARIA", kind: "body" },
];

async function main() {
  const sb = createClient(env().SUPABASE_URL, env().SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb.from("reports").select("id, raw_input").in("id", CASES.map((c) => c.id));
  if (error || !data) throw new Error(`DB: ${error?.message}`);
  const raws = new Map(data.map((r) => [r.id as string, r.raw_input as string]));

  for (const c of CASES) {
    const raw = raws.get(c.id)!;
    console.log(`\n========== ${c.id.slice(0, 8)} (${c.cat}, ${c.kind}) ==========`);
    // 1. Pré-geração: régua ÚNICA (clean p/ gerar + ops p/ aplicar).
    const pregen = parseCommandsPregen(raw, { typedEngine: true });
    // 2. Geração do draft a partir do ditado LIMPO (LLM real).
    const draft = await generate(c.cat, pregen.clean);
    // 3+4. Aplica os ops da régua + fase 2 (LLM) + sanitizer.
    const s1 = applyOperations(draft, pregen.ops).laudo;
    const s2 = await applyCommandInterpreter(s1, raw);
    const out = sanitizeDictationArtifacts(s2);

    // Draft limpo: sem eco do comando.
    check("draft SEM eco ('no lugar'/'pode colocar'/'na conclusão' como item)",
      !/no\s+lugar\s+d|pode colocar|na conclus[ãa]o,/i.test(draft), concl(draft));

    if (c.kind === "replace") {
      check("executado: resíduo virou 'não foi possível aferir'",
        /n[ãa]o foi poss[íi]vel aferir/i.test(out), out.slice(-500));
      check("conclusão SEM eco 'no lugar da frase'", !/no\s+lugar\s+da\s+frase/i.test(concl(out)), concl(out));
    }
    if (c.kind === "body") {
      check("executado: 'cisto de óleo' presente no laudo", /cisto de óleo/i.test(out), out.slice(-300));
      check("conclusão SEM eco 'pode colocar' / ditado-cru",
        !/pode colocar|algum algumas imagens/i.test(concl(out)), concl(out));
    }
    console.log("  --- conclusão final ---");
    console.log("  " + concl(out).trim().split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8).join("\n  "));
  }

  console.log(`\n===== ${pass} passaram, ${fail} falharam =====`);
  process.exit(fail === 0 ? 0 : 1);
}

void main();
