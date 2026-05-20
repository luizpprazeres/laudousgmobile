import { requireAdmin, AdminAuthError } from "@/server/auth/requireAdmin";
import { getAuditRow, markdownForAudit } from "@/server/admin/audit";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(req);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const { id } = await params;
  const row = await getAuditRow(id);
  if (!row) return Response.json({ error: "not_found" }, { status: 404 });

  return new Response(markdownForAudit(row), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `inline; filename="laudo-${row.id.slice(0, 8)}.md"`,
    },
  });
}
