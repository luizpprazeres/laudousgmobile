import "server-only";

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cache: CachedToken | null = null;
let inflight: Promise<string> | null = null;

const REFRESH_MARGIN_MS = 60_000;

function env(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY" | "LAB_ADMIN_EMAIL" | "LAB_ADMIN_PASSWORD") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ausente`);
  return value;
}

async function fetchToken(): Promise<string> {
  const url = `${env("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: env("LAB_ADMIN_EMAIL"),
      password: env("LAB_ADMIN_PASSWORD"),
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`admin signIn falhou: ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) throw new Error("access_token ausente na resposta do Supabase");

  const expiresIn = (data.expires_in ?? 3600) * 1000;
  cache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn,
  };
  return data.access_token;
}

export async function getAdminAccessToken(): Promise<string> {
  if (cache && cache.expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return cache.accessToken;
  }
  if (inflight) return inflight;
  inflight = fetchToken().finally(() => {
    inflight = null;
  });
  return inflight;
}
