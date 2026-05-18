import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { getServiceClient } from "@/server/supabaseService";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const service = getServiceClient();
  const { error } = await service.auth.admin.deleteUser(user.id);

  if (error) {
    return json(
      { error: "delete_failed", message: error.message },
      error.status ?? 500,
    );
  }

  return new Response(null, { status: 204 });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
