/**
 * Fonte de imagens liberada no CSP: só o caminho público do bucket `social` no Storage do Supabase
 * (derivado de SUPABASE_URL). Sem URL válida, nada é liberado (falha fechada).
 */
export const BUCKET_SOCIAL = "social";

export function origemSupabase(url: string | undefined): string | null {
  const v = url?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !(local && u.protocol === "http:")) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** "https://x.supabase.co/storage/v1/object/public/social/" (a barra final casa o prefixo). */
export function fonteImagensSocial(url: string | undefined): string | null {
  const o = origemSupabase(url);
  return o ? `${o}/storage/v1/object/public/${BUCKET_SOCIAL}/` : null;
}

/** URL pública de um arquivo do bucket (a mesma que o Storage devolve em getPublicUrl). */
export function urlPublicaSocial(url: string | undefined, caminho: string): string | null {
  const f = fonteImagensSocial(url);
  return f ? f + caminho.split("/").map(encodeURIComponent).join("/") : null;
}
