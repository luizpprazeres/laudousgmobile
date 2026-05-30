import { getServiceClient } from "@/server/supabaseService";
import { checkAnnotationDeleteLimit } from "@/server/sala/rateLimit";
import { validateSalaToken } from "@/server/sala/validateToken";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/sala/[token]/annotations/[id]
 *
 * Remove anotação por id, escopada ao sala_token validado.
 * Rate limit: 5 DELETEs/minuto por token (round 5.1).
 * Retorna 204 No Content em sucesso.
 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await ctx.params;
  const validation = await validateSalaToken(token);
  if (!validation.ok) {
    return jsonError(validation.reason, 404);
  }

  const rateCheck = checkAnnotationDeleteLimit(validation.code);
  if (!rateCheck.ok) {
    return new Response(
      JSON.stringify({
        error: "rate_limit_exceeded",
        retryAfter: rateCheck.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(rateCheck.retryAfter),
          "cache-control": "no-store",
        },
      },
    );
  }

  if (!id || typeof id !== "string") {
    return jsonError("invalid_id", 400);
  }

  const service = getServiceClient();
  const { error } = await service
    .from("sala_annotations")
    .delete()
    .eq("id", id)
    .eq("sala_token", validation.code);

  if (error) {
    console.error("[sala/annotations DELETE] falhou", error);
    return jsonError("delete_failed", 500);
  }

  return new Response(null, { status: 204 });
}

function jsonError(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
