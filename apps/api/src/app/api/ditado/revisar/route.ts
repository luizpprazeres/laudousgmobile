import { z } from "zod";
import { CategoryCodeSchema } from "@laudousg/shared";
import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { arbitrate } from "@/server/asr/jevArbiter";
import { env } from "@/server/env";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ditado/revisar — opções C+D do estudo de transcrição de 12/10/2026.
 *
 * O app chama ao parar de ditar. Devolve o que destacar no ditado:
 *   - automatic=true: troca segura (não era palavra / grafia quase idêntica) — o app aplica e mostra com "desfazer"
 *   - automatic=false: sugestão — o médico aceita com um toque (número e negação SEMPRE caem aqui)
 *   - replacement=null: só aviso ("confira esta medida")
 * Desligado (ASR_JEV_REVISAR≠true) ou Jev fora do ar → lista vazia; o app segue como hoje.
 * Nada é gravado; só um trecho curto e sem identificadores vai à Jev.
 */
const Body = z.object({
  texto: z.string().min(1).max(20_000),
  categoria: CategoryCodeSchema.optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  if (env().ASR_JEV_REVISAR !== "true") return json({ enabled: false, suggestions: [] });
  const r = await arbitrate(parsed.data.texto, parsed.data.categoria ?? null, { mode: "suggest", timeoutMs: 2500 });
  console.log(`[ditado/revisar] categoria=${parsed.data.categoria ?? "-"} perguntas=${r.asked} sugestoes=${r.suggestions.length} ms=${r.ms}`);
  return json({
    enabled: true,
    suggestions: r.suggestions.map((s) => ({
      start: s.start, end: s.end, original: s.original, replacement: s.replacement,
      kind: s.kind, confidence: Math.round(s.confidence * 100) / 100, automatic: s.automatic,
    })),
  });
}
