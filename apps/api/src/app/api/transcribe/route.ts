import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/transcribe — proxy para Deepgram (live streaming WS) ou Whisper (batch).
 *
 * MVP path: cliente envia áudio (multipart) e recebe transcript (Whisper batch).
 * Próxima sessão: WS upgrade + Deepgram Nova-3 streaming.
 *
 * Por que proxy: DEEPGRAM_API_KEY NUNCA deve sair do servidor.
 *
 * STUB.
 */
export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  return new Response(
    JSON.stringify({ error: "not_implemented", note: "stub — Deepgram/Whisper integration pending" }),
    { status: 501, headers: { "content-type": "application/json" } },
  );
}
