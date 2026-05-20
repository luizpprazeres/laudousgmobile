import { cookies, headers } from "next/headers";
import { verifyJwt, type AuthedUser } from "./verifyJwt";

export class AdminAuthError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}

export async function requireAdmin(req?: Request): Promise<AuthedUser> {
  const authReq = req ?? (await requestFromPageContext());
  const user = await verifyJwt(authReq);
  if (!user) throw new AdminAuthError(401, "unauthorized");
  if (user.role !== "admin") throw new AdminAuthError(403, "forbidden");
  return user;
}

async function requestFromPageContext(): Promise<Request> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const token = extractBearerToken(
    headerStore.get("authorization"),
    cookieStore.getAll().map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
    })),
  );
  const reqHeaders = new Headers();
  if (token) reqHeaders.set("authorization", `Bearer ${token}`);
  return new Request("http://localhost/admin", { headers: reqHeaders });
}

function extractBearerToken(
  authorization: string | null,
  cookieValues: Array<{ name: string; value: string }>,
): string | null {
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);

  for (const key of ["access_token", "sb-access-token", "supabase-access-token"]) {
    const token = cookieValues.find((cookie) => cookie.name === key)?.value;
    if (token) return token;
  }

  for (const cookie of cookieValues) {
    if (!cookie.name.includes("auth-token")) continue;
    const parsed = parseAuthCookie(cookie.value);
    if (parsed) return parsed;
  }

  return null;
}

function parseAuthCookie(value: string): string | null {
  const decoded = decodeURIComponent(value);
  try {
    const parsed = JSON.parse(decoded) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0];
    if (isRecord(parsed)) {
      const accessToken = parsed.access_token;
      if (typeof accessToken === "string") return accessToken;
      const session = parsed.currentSession;
      if (isRecord(session) && typeof session.access_token === "string") {
        return session.access_token;
      }
    }
  } catch {
    if (decoded.split(".").length === 3) return decoded;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
