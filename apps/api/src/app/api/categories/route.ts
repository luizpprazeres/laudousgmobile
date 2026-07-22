import { unauthorized, verifyJwt } from "@/server/auth/verifyJwt";
import { filterVisibleCategories } from "@/server/categories/categoryVisibility";
import { env } from "@/server/env";
import { getDbClient, schema } from "@laudousg/db";
import { asc, eq } from "drizzle-orm";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await verifyJwt(req);
  if (!user) return unauthorized();

  const db = getDbClient();
  const categories = await db
    .select({
      id: schema.categories.id,
      code: schema.categories.code,
      label: schema.categories.label,
    })
    .from(schema.categories)
    .where(eq(schema.categories.active, true))
    .orderBy(asc(schema.categories.label));

  return Response.json({
    categories: filterVisibleCategories(
      categories,
      user.id,
      env().TESTE_ALLOWED_USER_ID,
    ),
  });
}
