import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET });
  const isLoggedIn = !!token;
  const role = token?.role as string | undefined | null;
  const path = req.nextUrl.pathname;
  const needsOnboarding = isLoggedIn && !role;

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    if (
      path.startsWith("/dashboard") ||
      path.startsWith("/owner") ||
      path.startsWith("/admin") ||
      path.startsWith("/onboarding")
    ) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
    return NextResponse.next();
  }

  // ── Logged in, no role yet (Google first-time user) ────────────────────────
  if (needsOnboarding) {
    if (!path.startsWith("/onboarding/role")) {
      return NextResponse.redirect(new URL("/onboarding/role", req.nextUrl));
    }
    return NextResponse.next();
  }

  // ── Has role — block onboarding (already completed) ────────────────────────
  if (path.startsWith("/onboarding")) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
    if (role === "OWNER") return NextResponse.redirect(new URL("/owner/dashboard", req.nextUrl));
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // ── Admin route protection — ADMIN only ───────────────────────────────────
  if (path.startsWith("/admin")) {
    if (role !== "ADMIN") {
      if (role === "OWNER") return NextResponse.redirect(new URL("/owner/dashboard", req.nextUrl));
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // ── Owner route protection ─────────────────────────────────────────────────
  if (path.startsWith("/owner")) {
    if (role !== "OWNER") {
      if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // ── Player dashboard protection ────────────────────────────────────────────
  if (path.startsWith("/dashboard")) {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
    if (role === "OWNER") return NextResponse.redirect(new URL("/owner/dashboard", req.nextUrl));
    return NextResponse.next();
  }

  // ── Already logged in visiting login/signup ────────────────────────────────
  if (path === "/login" || path === "/signup") {
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.nextUrl));
    if (role === "OWNER") return NextResponse.redirect(new URL("/owner/dashboard", req.nextUrl));
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
