import { getServiceClient } from "@/server/supabaseService";
import { validateSalaToken } from "@/server/sala/validateToken";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GLOBAL_PHRASES: { title: string; body: string }[] = [
  {
    title: "DUM (Data da Última Menstruação)",
    body: "DUM: ____. Idade gestacional de ____ semanas e ____ dias na data do exame.",
  },
  {
    title: "Idade gestacional por USG",
    body: "Idade gestacional ajustada pela USG: ____ semanas e ____ dias. DPP: ____.",
  },
  {
    title: "Data provável do parto",
    body: "Data provável do parto: ____.",
  },
  {
    title: "Feto único — apresentação cefálica",
    body: "Feto único, em situação longitudinal e apresentação cefálica, com BCF presentes.",
  },
  {
    title: "Placenta corporal posterior grau 0/I",
    body: "Placenta de implantação corporal posterior, grau 0/I de Grannum.",
  },
  {
    title: "Líquido amniótico normal",
    body: "Líquido amniótico em quantidade normal (ILA 12 cm).",
  },
  {
    title: "Tireoide tópica normal",
    body: "Glândula tireoide tópica, contornos regulares, dimensões e ecotextura preservadas.",
  },
  {
    title: "Doppler tireoidiano normal",
    body: "Vascularização ao Doppler colorido sem alterações.",
  },
];

/**
 * GET /api/sala/[token]/phrases?categoryCode=ABDOMEN_TOTAL
 *
 * Retorna:
 *   { natives: Phrase[], globals: Phrase[] }
 *
 * natives vêm de user_phrases filtradas por (category_code IS NULL OR = categoryCode)
 * globals são as 8 hardcoded (espelham UserPhrasesService.swift do iOS).
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const validation = await validateSalaToken(token);
  if (!validation.ok) {
    return json({ error: validation.reason }, 404);
  }

  const url = new URL(req.url);
  const categoryCode = url.searchParams.get("categoryCode");

  const service = getServiceClient();
  let query = service
    .from("user_phrases")
    .select("id, title, body, category_code, position")
    .eq("user_id", validation.userId)
    .order("position", { ascending: true });

  if (categoryCode) {
    query = query.or(`category_code.is.null,category_code.eq.${categoryCode}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[sala/phrases] user_phrases lookup falhou", error);
    return json({ natives: [], globals: GLOBAL_PHRASES });
  }

  const natives = (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    categoryCode: row.category_code as string | null,
    position: (row.position as number) ?? 0,
  }));

  return json({ natives, globals: GLOBAL_PHRASES });
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
