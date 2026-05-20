import { forbidden, unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
export { OPTIONS } from "@/server/cors";
import { getServiceClient } from "@/server/supabaseService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const { data, error } = await getServiceClient()
    .from("generation_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data ?? null });
}
