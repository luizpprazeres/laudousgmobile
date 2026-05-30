import { getServiceClient } from "@/server/supabaseService";
import { validateSalaToken } from "@/server/sala/validateToken";
export { OPTIONS } from "@/server/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Formato esperado de category_code: CAPS_SNAKE_CASE (ex: ABDOMEN_TOTAL,
 * DOPPLER_OBSTETRICO). Validar antes de interpolar no PostgREST .or() evita
 * injeção/filtro malformado em endpoint público.
 */
const CATEGORY_CODE_RE = /^[A-Z][A-Z0-9_]{1,63}$/;

/**
 * Categorias obstétricas que recebem o pacote de frases pré-natal.
 * Espelha categorias da Sala (Categories.swift).
 */
const OBSTET_CATEGORIES = [
  "OBSTETRICA",
  "DOPPLER_OBSTETRICO",
  "MORFOLOGICO",
] as const;

type GlobalPhrase = {
  title: string;
  body: string;
  categoryCodes: readonly string[];
};

const GLOBAL_PHRASES: GlobalPhrase[] = [
  {
    title: "DUM (Data da Última Menstruação)",
    body: "DUM: ____. Idade gestacional de ____ semanas e ____ dias na data do exame.",
    categoryCodes: OBSTET_CATEGORIES,
  },
  {
    title: "Idade gestacional por USG",
    body: "Idade gestacional ajustada pela USG: ____ semanas e ____ dias. DPP: ____.",
    categoryCodes: OBSTET_CATEGORIES,
  },
  {
    title: "Data provável do parto",
    body: "Data provável do parto: ____.",
    categoryCodes: OBSTET_CATEGORIES,
  },
  {
    title: "Feto único — apresentação cefálica",
    body: "Feto único, em situação longitudinal e apresentação cefálica, com BCF presentes.",
    categoryCodes: OBSTET_CATEGORIES,
  },
  {
    title: "Placenta corporal posterior grau 0/I",
    body: "Placenta de implantação corporal posterior, grau 0/I de Grannum.",
    categoryCodes: OBSTET_CATEGORIES,
  },
  {
    title: "Líquido amniótico normal",
    body: "Líquido amniótico em quantidade normal (ILA 12 cm).",
    categoryCodes: OBSTET_CATEGORIES,
  },
  {
    title: "Tireoide tópica normal",
    body: "Glândula tireoide tópica, contornos regulares, dimensões e ecotextura preservadas.",
    categoryCodes: ["TIREOIDE"],
  },
  {
    title: "Doppler tireoidiano normal",
    body: "Vascularização ao Doppler colorido sem alterações.",
    categoryCodes: ["TIREOIDE"],
  },
];

/**
 * GET /api/sala/[token]/phrases?categoryCode=ABDOMEN_TOTAL
 *
 * Retorna:
 *   { natives: Phrase[], globals: Phrase[] }
 *
 * Round 6: multi-category support.
 * - Globals: filtradas server-side por categoryCodes contém categoryCode.
 *   Se categoryCode ausente (sem laudo ainda) → retorna todas (comportamento legado).
 * - Natives: filtradas via category_codes (array text[]) contém categoryCode OU
 *   array vazio (frase genérica que aparece em qualquer categoria).
 *   Migration round 6 faz backfill de category_code → category_codes + trigger
 *   mantém sync automático em INSERT/UPDATE (incluindo writes do iOS Build 77).
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

  if (categoryCode !== null && !CATEGORY_CODE_RE.test(categoryCode)) {
    return json({ error: "invalid_category_code" }, 400);
  }

  const filteredGlobals: GlobalPhrase[] = categoryCode
    ? GLOBAL_PHRASES.filter(
        (p) =>
          p.categoryCodes.length === 0 ||
          p.categoryCodes.includes(categoryCode),
      )
    : GLOBAL_PHRASES;

  const service = getServiceClient();
  let query = service
    .from("user_phrases")
    .select("id, title, body, category_code, category_codes, position")
    .eq("user_id", validation.userId)
    .order("position", { ascending: true });

  if (categoryCode) {
    // PostgREST: cs = contains, valor pra array é {X}. Combinado com OR pra
    // incluir frases genéricas (array vazio = aparece em qualquer categoria).
    query = query.or(
      `category_codes.cs.{${categoryCode}},category_codes.eq.{}`,
    );
  }

  const { data, error } = await query;

  const mappedGlobals = filteredGlobals.map((p, i) => ({
    id: `global-${i}`,
    title: p.title,
    body: p.body,
    categoryCodes: p.categoryCodes,
  }));

  if (error) {
    console.error("[sala/phrases] user_phrases lookup falhou", error);
    return json({ natives: [], globals: mappedGlobals });
  }

  const natives = (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    categoryCode: row.category_code as string | null,
    categoryCodes: (row.category_codes as string[] | null) ?? [],
    position: (row.position as number) ?? 0,
  }));

  return json({ natives, globals: mappedGlobals });
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
