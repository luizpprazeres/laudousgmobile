import { getAdminAccessToken } from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WRITING_STYLE_BY_CODE: Record<string, string> = {
  CLASSICO_COMPLETO: "11111111-1111-4111-8111-111111111111",
  CLÁSSICO_COMPLETO: "11111111-1111-4111-8111-111111111111",
  DIRETO_OBJETIVO: "22222222-2222-4222-8222-222222222222",
  DETALHADO_PROTOCOLAR: "33333333-3333-4333-8333-333333333333",
};

type RunBody = {
  raw_input?: string;
  category_hint?: string;
  writing_style_id?: string;
  writing_style_code?: string;
};

function backendUrl(): string {
  return process.env.BACKEND_API_URL ?? "https://laudousgmobile.vercel.app";
}

export async function POST(req: Request) {
  let body: RunBody;
  try {
    body = (await req.json()) as RunBody;
  } catch {
    return new Response(JSON.stringify({ error: "json invalido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawInput = (body.raw_input ?? "").trim();
  if (!rawInput) {
    return new Response(JSON.stringify({ error: "raw_input obrigatorio" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const writingStyleId =
    body.writing_style_id ??
    (body.writing_style_code ? WRITING_STYLE_BY_CODE[body.writing_style_code] : undefined) ??
    WRITING_STYLE_BY_CODE.CLASSICO_COMPLETO;

  let accessToken: string;
  try {
    accessToken = await getAdminAccessToken();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "auth falhou";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const upstream = await fetch(`${backendUrl()}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      raw_input: rawInput,
      category_hint: body.category_hint,
      writing_style_id: writingStyleId,
    }),
    signal: req.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return new Response(JSON.stringify({ error: `upstream ${upstream.status}`, detail: detail.slice(0, 500) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
