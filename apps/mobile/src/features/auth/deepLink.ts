export type AuthDeepLink = {
  accessToken: string;
  refreshToken: string;
  type: string | null;
};

/** Lê os tokens que o Supabase devolve no fragmento de links nativos. */
export function parseAuthDeepLink(url: string): AuthDeepLink | null {
  if (!url.startsWith("laudousg://auth/")) return null;

  const hash = url.includes("#") ? url.slice(url.indexOf("#") + 1) : "";
  const query = url.includes("?")
    ? url.slice(url.indexOf("?") + 1, url.includes("#") ? url.indexOf("#") : undefined)
    : "";
  const params = new URLSearchParams([query, hash].filter(Boolean).join("&"));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken, type: params.get("type") };
}
