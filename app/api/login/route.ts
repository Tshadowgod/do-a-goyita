import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const envUser  = process.env.ADMIN_USERNAME;
    const envPass  = process.env.ADMIN_PASSWORD;
    const envToken = process.env.AUTH_TOKEN;
    if (!envUser || !envPass || !envToken) {
      console.error("Faltan ADMIN_USERNAME / ADMIN_PASSWORD / AUTH_TOKEN en el entorno");
      return NextResponse.json({ error: "Servidor mal configurado" }, { status: 500 });
    }

    if (
      typeof username === "string" &&
      typeof password === "string" &&
      username === envUser &&
      password === envPass
    ) {
      const res = NextResponse.json({ ok: true });
      res.cookies.set("dg_auth", envToken, {
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
