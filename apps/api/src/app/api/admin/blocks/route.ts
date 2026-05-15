import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /api/admin/blocks — CRUD de knowledge_blocks (admin only).
 * STUB. Implementação real lê via Drizzle, valida com Zod (RagBlockSchema),
 * gera embedding ao criar/atualizar conteúdo.
 */
export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  return new Response(
    JSON.stringify({ items: [], note: "stub" }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

export async function POST(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  return new Response(
    JSON.stringify({ error: "not_implemented" }),
    { status: 501, headers: { "content-type": "application/json" } },
  );
}
