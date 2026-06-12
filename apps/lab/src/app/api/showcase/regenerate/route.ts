import { NextResponse } from "next/server";
import { getAdminAccessToken } from "@/lib/supabase/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SHOWCASE_SAMPLES } from "@/lib/showcase/samples";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendUrl(): string {
  return process.env.BACKEND_API_URL ?? "https://laudousgmobile.vercel.app";
}

/**
 * Regenera UMA amostra do showcase pelo pipeline real e atualiza a tabela.
 * Body: { sample_key } — precisa existir no catálogo (samples.ts).
 */
export async function POST(req: Request) {
  let body: { sample_key?: string };
  try {
    body = (await req.json()) as { sample_key?: string };
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }
  const sample = SHOWCASE_SAMPLES.find((s) => s.sampleKey === body.sample_key);
  if (!sample) {
    return NextResponse.json({ error: "sample_key desconhecida" }, { status: 400 });
  }

  let accessToken: string;
  try {
    accessToken = await getAdminAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "auth falhou";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const t0 = Date.now();
  const upstream = await fetch(`${backendUrl()}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      raw_input: sample.rawInput,
      category_hint: sample.categoryCode,
      writing_style_id: sample.writingStyleId,
      source: "web",
    }),
    signal: req.signal,
  });
  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `upstream ${upstream.status}`, detail: detail.slice(0, 300) },
      { status: 502 },
    );
  }

  // Consome o SSE até o done (sem stream pro cliente — resposta é JSON).
  const dec = new TextDecoder();
  let buf = "";
  let laudo: string | null = null;
  let reportId: string | null = null;
  const reader = upstream.body.getReader();
  while (laudo === null) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
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
        laudo = ev.final_text as string;
        reportId = (ev.report_id as string) ?? null;
        break;
      }
      if (ev.type === "error" || ev.type === "clarify") {
        return NextResponse.json(
          { error: `geração: ${String(ev.code ?? ev.type)}` },
          { status: 502 },
        );
      }
    }
  }
  if (laudo === null) {
    return NextResponse.json({ error: "stream sem done" }, { status: 502 });
  }

  const supa = createServerSupabaseClient();
  let modelWriter: string | null = null;
  if (reportId) {
    const { data: run } = await supa
      .from("generation_runs")
      .select("model_writer")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    modelWriter = (run?.model_writer as string | null) ?? null;
  }

  const updated = {
    sample_key: sample.sampleKey,
    category_code: sample.categoryCode,
    variant_label: sample.variantLabel,
    writing_style_id: sample.writingStyleId,
    raw_input: sample.rawInput,
    laudo,
    model_writer: modelWriter,
    latency_ms: Date.now() - t0,
    generated_at: new Date().toISOString(),
  };
  const { error } = await supa
    .from("category_showcase_samples")
    .upsert(updated, { onConflict: "sample_key" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sample: updated });
}
