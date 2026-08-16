import { verifyJwt, unauthorized } from "@/server/auth/verifyJwt";
import { categoriasDaBiblioteca } from "@/server/renderer/catalog/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/model-catalog
 *
 * As categorias que a bancada do Lab pode abrir. Existe pelo mesmo motivo da
 * irmã em `/api/me/report-customizations`: a lista estava cravada no cliente
 * (`const CATEGORIA = "OBSTETRICA"`), então o backend podia servir treze que a
 * tela continuava mostrando uma.
 */
export async function GET(req: Request): Promise<Response> {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();
  return Response.json({ categorias: categoriasDaBiblioteca() });
}
