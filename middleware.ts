import { NextRequest, NextResponse } from "next/server";

// Paths that never require login (customer store + auth endpoints)
const PUBLIC_PREFIXES = ["/login", "/api/login", "/api/logout", "/tienda", "/api/tienda"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get("dg_auth")?.value;
  if (token && token === process.env.AUTH_TOKEN) {
    return NextResponse.next();
  }

  // Not authenticated
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and the logo asset
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};
