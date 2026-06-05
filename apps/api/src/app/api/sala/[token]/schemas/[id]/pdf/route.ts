import { getServiceClient } from "@/server/supabaseService";
import { validateSalaToken } from "@/server/sala/validateToken";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/sala/[token]/schemas/[id]/pdf
 * Baixa o PDF (paisagem) de um esquema. Decodifica o base64 e devolve os bytes
 * com Content-Disposition: attachment → o navegador baixa direto.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await ctx.params;
  const validation = await validateSalaToken(token);
  if (!validation.ok) {
    return new Response("unauthorized", { status: 401 });
  }

  const service = getServiceClient();
  const { data, error } = await service
    .from("sala_schemas")
    .select("pdf_base64, exam_label")
    .eq("id", id)
    .eq("user_id", validation.userId)
    .maybeSingle();

  if (error || !data?.pdf_base64) {
    return new Response("not_found", { status: 404 });
  }

  const bytes = Buffer.from(data.pdf_base64 as string, "base64");
  const safeName = String(data.exam_label ?? "esquema")
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "esquema";

  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${safeName}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
