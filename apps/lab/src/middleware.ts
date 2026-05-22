import { NextResponse, type NextRequest } from "next/server";

const REALM = "LaudoUSG.lab";

function unauthorized(): NextResponse {
  return new NextResponse("Authorization required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

function decodeBasic(header: string): { user: string; pass: string } | null {
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const expectedUser = process.env.LAB_BASIC_AUTH_USER;
  const expectedPass = process.env.LAB_BASIC_AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (!auth) return unauthorized();

  const creds = decodeBasic(auth);
  if (!creds) return unauthorized();
  if (creds.user !== expectedUser || creds.pass !== expectedPass) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
