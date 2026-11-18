import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeNextPath } from "@/supabase/redirect";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getClaims();

  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname === "/login" || pathname === "/register";
  const protectedRoutes = [
    "/dashboard",
    "/feed",
    "/friends",
    "/marketplace",
    "/messages",
    "/notifications",
    "/profile",
    "/settings",
  ];
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (error || !data?.claims) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set(
        "next",
        `${pathname}${request.nextUrl.search}`,
      );

      return NextResponse.redirect(url);
    }
  } else if (isAuthPage) {
    const next = getSafeNextPath(request.nextUrl.searchParams.get("next"));
    const redirectUrl = new URL(next, request.url);

    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}