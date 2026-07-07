import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();

  const password = String(formData.get("password") || "");
  const nextRaw = String(formData.get("next") || "/admin");

  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  const nextPath = nextRaw.startsWith("/admin") ? nextRaw : "/admin";

  if (!adminPassword || !sessionSecret) {
    return NextResponse.json(
      {
        error:
          "Falten ADMIN_PASSWORD o ADMIN_SESSION_SECRET al fitxer .env.local.",
      },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    const loginUrl = new URL("/admin-login", request.url);
    loginUrl.searchParams.set("error", "1");
    loginUrl.searchParams.set("next", nextPath);

    return NextResponse.redirect(loginUrl, 303);
  }

  const response = NextResponse.redirect(
    new URL(nextPath, request.url),
    303
  );

  response.cookies.set("campus_admin_session", sessionSecret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}