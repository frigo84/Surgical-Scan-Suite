import { NextRequest, NextResponse } from "next/server";

const REALM = "AutoDoc";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
    },
  });
}

function parseBasicAuth(header: string | null) {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice("Basic ".length));
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const expectedUser = process.env.AUTODOC_USER;
  const expectedPassword = process.env.AUTODOC_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return NextResponse.next();
  }

  const credentials = parseBasicAuth(request.headers.get("authorization"));
  if (
    credentials?.username === expectedUser &&
    credentials.password === expectedPassword
  ) {
    return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|robots.txt).*)"],
};
