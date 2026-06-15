import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("dg_auth", process.env.AUTH_TOKEN ?? "", {
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        path:     "/",
        maxAge:   60 * 60 * 24 * 30, // 30 days
      });
      return res;
    }

    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}
