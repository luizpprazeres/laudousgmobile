// Showcase — gera/atualiza as amostras fictícias de laudo por categoria.
//
// Uso: GOLDEN_AUTH_TOKEN=... pnpm tsx tests/showcase/generate-samples.ts
//      [SHOWCASE_API_URL=http://localhost:3000] [SHOWCASE_FILTER=MORFOLOGICO]
//
// Gera via pipeline REAL (prod por padrão) e grava em
// category_showcase_samples via Supabase REST (service role do .env).
import "dotenv/config";
import {
  SHOWCASE_SAMPLES,
  type ShowcaseSample,
} from "../../apps/lab/src/lib/showcase/samples";

const API = process.env.SHOWCASE_API_URL ?? "https://laudousgmobile.vercel.app";
const TOKEN = process.env.GOLDEN_AUTH_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!TOKEN) throw new Error("GOLDEN_AUTH_TOKEN ausente");
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("env Supabase ausente");

async function generate(sample: ShowcaseSample): Promise<{
  laudo: string;
  modelWriter: string | null;
  latencyMs: number;
}> {
  const t0 = Date.now();
  const r = await fetch(`${API}/api/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      raw_input: sample.rawInput,
      category_hint: sample.categoryCode,
      writing_style_id: sample.writingStyleId,
      source: "web",
    }),
  });
  if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
  const dec = new TextDecoder();
  let buf = "";
  let reportId: string | null = null;
  for await (const chunk of r.body) {
    buf += dec.decode(chunk as Uint8Array, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = frame
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n");
      if (!data) continue;
      const ev = JSON.parse(data) as Record<string, unknown>;
      if (ev.type === "done") {
        reportId = (ev.report_id as string) ?? null;
        const modelWriter = await lookupModelWriter(reportId);
        return {
          laudo: ev.final_text as string,
          modelWriter,
          latencyMs: Date.now() - t0,
        };
      }
      if (ev.type === "error")
        throw new Error(`${ev.code}: ${ev.message}`);
      if (ev.type === "clarify")
        throw new Error("clarify — ditado fictício precisa de ajuste");
    }
  }
  throw new Error("stream sem done");
}

async function lookupModelWriter(reportId: string | null): Promise<string | null> {
  if (!reportId) return null;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/generation_runs?report_id=eq.${reportId}&select=model_writer&order=created_at.desc&limit=1`,
    { headers: { apikey: SERVICE_KEY!, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const rows = (await r.json()) as { model_writer: string | null }[];
  return rows[0]?.model_writer ?? null;
}

async function upsert(sample: ShowcaseSample, laudo: string, modelWriter: string | null, latencyMs: number) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/category_showcase_samples?on_conflict=sample_key`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        sample_key: sample.sampleKey,
        category_code: sample.categoryCode,
        variant_label: sample.variantLabel,
        writing_style_id: sample.writingStyleId,
        raw_input: sample.rawInput,
        laudo,
        model_writer: modelWriter,
        latency_ms: latencyMs,
        generated_at: new Date().toISOString(),
      }),
    },
  );
  if (!r.ok) throw new Error(`upsert ${r.status}: ${await r.text()}`);
}

async function main() {
  const filter = process.env.SHOWCASE_FILTER;
  const samples = SHOWCASE_SAMPLES.filter(
    (sample) => !filter || sample.sampleKey.includes(filter),
  );
  let ok = 0;
  const failed: string[] = [];
  for (const sample of samples) {
    process.stdout.write(`${sample.sampleKey}... `);
    try {
      const res = await generate(sample);
      await upsert(sample, res.laudo, res.modelWriter, res.latencyMs);
      ok += 1;
      console.log(`OK (${res.modelWriter ?? "?"}, ${res.latencyMs}ms)`);
    } catch (err) {
      failed.push(sample.sampleKey);
      console.log(`FALHOU: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`\n${ok}/${samples.length} amostras geradas`);
  if (failed.length > 0) {
    console.log(`Falharam: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("showcase falhou:", err);
  process.exit(1);
});
