import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Verifica o JWT Supabase enviado pelo app no header Authorization.
 * Usa o supabase-js como source-of-truth (valida assinatura, exp, aud).
 *
 * Retorna o user ou null. Em rotas que exigem auth, lance 401 se null.
 */
export type AuthedUser = {
  id: string;
  email: string | null;
  role: "user" | "admin";
};

export async function verifyJwt(req: Request): Promise<AuthedUser | null> {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  const e = env();
  // Cliente "anon" apenas para validar o JWT
  const sb = createClient(e.SUPABASE_URL, e.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;

  // role vem do app_metadata (preferido) ou do profiles via fetch dedicado.
  // Para o esqueleto, lemos de app_metadata; refinaremos quando integrarmos
  // o fluxo admin (custom claim ou função is_admin()).
  const role =
    (data.user.app_metadata?.role as "user" | "admin" | undefined) ?? "user";

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role,
  };
}

export function unauthorized(message = "unauthorized") {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: { "content-type": "application/json" },
    },
  );
}

export function forbidden(message = "forbidden") {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: { "content-type": "application/json" },
    },
  );
}
