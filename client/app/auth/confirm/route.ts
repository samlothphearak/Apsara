import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/supabase/server";
import { getSafeNextPath } from "@/supabase/redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const safeNext = getSafeNextPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=verification_failed", request.url)
  );
}