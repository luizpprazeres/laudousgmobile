/**
 * Harness de comparação Writer V2 — 3 braços (review Dex2):
 *  A) comportamento ATUAL real (endpoint prod ABDOMEN_TOTAL = renderer determinístico)
 *  B) Writer V1 FORÇADO (buildSystemMessage real: contrato + GLOBAL_RULES + few-shots do bundle)
 *  C) Writer V2 (núcleo universal + contrato mínimo + laudo-base)
 * Mesmo modelo/params/wrapper nos braços B e C. N execuções por cenário (variância).
 * Uso: cd apps/api && set -a; . ./.env.local; set +a; pnpm -s tsx _writer_v2_harness.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { buildSystemMessage } from "./src/server/prompts/buildSystemMessage";
import { loadDeterministicBundle } from "./src/server/pipeline/bundleLoader";
import { buildSystemMessageV2, ABDOME_CONTRACT_V2 } from "./src/server/prompts/universalCoreV2";
import { ABDOMEN_TOTAL_MODELO_BASE } from "./src/server/prompts/contracts/ABDOMEN_TOTAL";

const API = "https://laudousgmobile.vercel.app";
const WS = "11111111-1111-4111-8111-111111111111"; // CLASSICO_COMPLETO
const WRITER_MODEL = "gpt-5.4-mini"; // igual a prod
const RUNS_BC = 2; // execuções por cenário nos braços B e C
const OUT = "/private/tmp/claude-501/-Users-luizprazeres-laudousgmobile-def/ec31c22d-4555-4880-915a-3fcefa8b31b2/scratchpad/writer_v2_3arms.json";

async function main() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: "luizp02121@gmail.com" });
  const { data: sess } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: link!.properties!.hashed_token! });
  const H = { authorization: `Bearer ${sess!.session!.access_token}`, "content-type": "application/json" };

  // Wrapper de user message idêntico p/ B e C (espelha writer.buildRawUserMessage, enxuto).
  function userMsg(raw: string): string {
    return `=== DITADO DO MÉDICO (achados + instruções) ===\n${raw.trim()}\n\nRedija o laudo final completo, seguindo o laudo-base e as regras acima.`;
  }

  async function callModel(system: string, raw: string): Promise<{ text: string; ms: number; err: string }> {
    const t0 = Date.now();
    try {
      const r = await openai.chat.completions.create({
        model: WRITER_MODEL,
        messages: [ { role: "system", content: system }, { role: "user", content: userMsg(raw) } ],
        max_completion_tokens: 2500,
        reasoning_effort: "none" as never,
      } as never);
      return { text: ((r as { choices: { message: { content: string } }[] }).choices[0]?.message?.content ?? "").trim(), ms: Date.now() - t0, err: "" };
    } catch (e) {
      return { text: "", ms: Date.now() - t0, err: e instanceof Error ? e.message : String(e) };
    }
  }

  async function armA_renderer(raw: string): Promise<{ text: string; ms: number; err: string }> {
    const t0 = Date.now();
    const res = await fetch(`${API}/api/generate`, { method: "POST", headers: { ...H, accept: "text/event-stream" }, body: JSON.stringify({ raw_input: raw, category_hint: "ABDOMEN_TOTAL", writing_style_id: WS, mode: "standard" }) });
    if (!res.ok) return { text: "", ms: Date.now() - t0, err: `HTTP ${res.status}` };
    const rd = res.body!.getReader(); const dec = new TextDecoder(); let buf = "", done = false, text = "", err = "";
    for (;;) { const { value, done: d } = await rd.read(); if (d) break; buf += dec.decode(value, { stream: true });
      for (const line of buf.split("\n")) { if (!line.startsWith("data:")) continue; try { const ev = JSON.parse(line.slice(5).trim());
        if (ev.type === "token") text += ev.delta ?? ""; if (ev.type === "done") done = true; if (ev.type === "error" || ev.type === "blocked") err = ev.message ?? ev.reason; } catch { /* ignore */ } }
      buf = buf.slice(buf.lastIndexOf("\n") + 1); if (done) break; }
    return { text: text.trim(), ms: Date.now() - t0, err };
  }

  // Braço B: system message REAL do writer V1 (contrato + GLOBAL_RULES + few-shots do bundle).
  const bundle = await loadDeterministicBundle({ categoryCode: "ABDOMEN_TOTAL", writingStyleId: WS, rawInput: "abdome total" });
  const v1System = "error" in bundle && bundle.error
    ? buildSystemMessage({ categoryCode: "ABDOMEN_TOTAL", categoryLabel: "Abdome Total", writingStyleCode: "CLASSICO", ragBlocks: [] })
    : buildSystemMessage({ categoryCode: "ABDOMEN_TOTAL", categoryLabel: "Abdome Total", writingStyleCode: "CLASSICO", ragBlocks: (bundle as { blocks: never[] }).blocks });

  const v2System = buildSystemMessageV2({ categoryContract: ABDOME_CONTRACT_V2, laudoBase: ABDOMEN_TOTAL_MODELO_BASE });

  const SCENARIOS: [string, string][] = [
    ["1. Normal", "Abdome total normal, fígado normal, vesícula sem cálculos, vias biliares finas, pâncreas normal, baço normal, rins normais, aorta normal."],
    ["2. Alteração frequente", "Fígado com esteatose difusa moderada. Vesícula com cálculo de 1,2 cm, móvel, com sombra acústica. Demais normais."],
    ["3. Achado incomum", "No segmento VII do fígado uma imagem de 2,3 centímetros com halo hipoecoico e centro hiperecoico, aspecto em alvo. Resto normal."],
    ["4. Pedido de ajuste", "Abdome normal. Na conclusão, item 1: 'Fígado de dimensões no limite superior da normalidade'. Não descreva a bexiga."],
    ["5. Erro linguístico", "fikado com esteatoze, vezícula com cauculo de zero vírgula oito, baso normal, rinz normais, pancreas normal."],
    ["6. Ruído de transcrição", "fígado normal ééé vesícula sem cálculos hã pâncreas não deu pra ver direito por causa de gases tá rins normais aorta normal."],
    ["7. Contradição/auto-correção", "Vesícula normal sem cálculos… na verdade tem um cálculo de 8 milímetros móvel. Resto normal."],
    ["8. Ambiguidade", "Cisto no rim direito de ponto cinco centímetros. Cálculo de 15 no rim esquerdo."],
    ["9. Troca de lateralidade/medida", "Cisto cortical no rim esquerdo de 2,4 cm. Aliás não é esquerdo, é o rim direito. Resto normal."],
    ["10. Órgão não visualizado", "Fígado e vesícula normais. Não consegui ver o pâncreas por gases. Baço, rins e aorta normais."],
    ["11. Volume não solicitado", "Rim direito com cálculo de 4 mm no grupo calicinal inferior. Rim esquerdo 10,2 por 4,8 por 4,5 cm normal. Resto normal."],
    ["12. Duas lesões", "Fígado com dois cistos simples, um no segmento IV de 1,1 cm e outro no segmento VII de 0,7 cm. Vesícula, pâncreas, baço, rins e aorta normais."],
  ];

  const results: unknown[] = [];
  for (const [label, raw] of SCENARIOS) {
    const a = await armA_renderer(raw);
    const b: { text: string; ms: number; err: string }[] = [];
    const c: { text: string; ms: number; err: string }[] = [];
    for (let i = 0; i < RUNS_BC; i++) { b.push(await callModel(v1System, raw)); c.push(await callModel(v2System, raw)); }
    results.push({ label, raw, armA: a, armB: b, armC: c });
    writeFileSync(OUT, JSON.stringify({ meta: { model: WRITER_MODEL, runsBC: RUNS_BC, v1SystemLen: v1System.length, v2SystemLen: v2System.length }, results }, null, 2));
    console.log(`ok ${label}`);
  }
  console.log("FIM");

}
main().catch((e) => { console.error(e); process.exit(1); });
