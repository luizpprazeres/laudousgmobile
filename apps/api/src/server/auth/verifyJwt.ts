import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { getDbClient, schema } from "@laudousg/db";
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

/**
 * Cache module-level por JWT — evita lookup repetido em profiles.role
 * a cada request. TTL curto (60s) porque role pode ser revogado por admin
 * a qualquer momento — não queremos um admin demitido manter acesso.
 *
 * Key: primeiros 32 chars do token (suficiente para distinguir, sem armazenar
 * token inteiro em memória).
 */
type RoleCacheEntry = { role: "user" | "admin"; expiresAt: number };
const roleCache = new Map<string, RoleCacheEntry>();
const ROLE_CACHE_TTL_MS = 60_000;

async function fetchRoleFromProfile(
  userId: string,
): Promise<"user" | "admin"> {
  try {
    const db = getDbClient();
    const [row] = await db
      .select({ role: schema.profiles.role })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);
    return (row?.role as "user" | "admin" | undefined) ?? "user";
  } catch (e) {
    // Se o lookup falhar (ex: profile ainda não criado por trigger), default user.
    // Log mas não bloqueia auth — usuário comum continua funcionando.
    console.warn("fetchRoleFromProfile failed:", e);
    return "user";
  }
}

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

  // Fix codex T7 MÉDIO #1: role vem da TABELA profiles.role (source-of-truth),
  // NÃO de app_metadata (que é manipulável e foi marcado como fraco no review).
  // RLS impede usuário comum de mudar próprio role (policy update tem withCheck
  // que travamos para não permitir mudança de role).
  const cacheKey = token.slice(0, 32);
  const cached = roleCache.get(cacheKey);
  const now = Date.now();
  let role: "user" | "admin";
  if (cached && cached.expiresAt > now) {
    role = cached.role;
  } else {
    role = await fetchRoleFromProfile(data.user.id);
    roleCache.set(cacheKey, { role, expiresAt: now + ROLE_CACHE_TTL_MS });
  }

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
