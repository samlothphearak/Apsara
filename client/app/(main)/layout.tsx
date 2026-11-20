import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { Bell, Home, MessageCircle, Settings, Users } from "lucide-react";
import AccountMenu from "@/components/layout/account-menu";
import BottomNav from "@/components/layout/bottom-nav";
import { ApsaraLogo } from "@/components/apsara-logo";
import { createClient } from "@/supabase/server";

function MainLayoutFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060608] text-center text-sm font-medium tracking-wide text-neutral-400">
      Loading your sanctuary...
    </main>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<MainLayoutFallback />}>
      <AuthenticatedMainLayout>{children}</AuthenticatedMainLayout>
    </Suspense>
  );
}

async function AuthenticatedMainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || typeof userId !== "string") {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const emailClaim = data?.claims?.email;
  const email = typeof emailClaim === "string" ? emailClaim : undefined;
  const username = profile?.username || "member";
  const user = {
    fullName: profile?.full_name?.trim() || "Apsara Member",
    username,
    email,
    avatarUrl: profile?.avatar_url ?? null,
  };

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.06),transparent_50%)]" />

      <header className="sticky top-0 z-40 border-b border-amber-500/15 bg-[#060608]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6">
          <Link href="/feed">
            <ApsaraLogo />
          </Link>

          <div className="flex items-center gap-5">
            <span className="hidden text-xs uppercase tracking-[0.22em] text-neutral-500 md:block">
              Celestial Sanctuary
            </span>
            <div className="hidden h-4 w-px bg-white/10 md:block" />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <nav
        aria-label="Main navigation"
        className="relative z-10 hidden border-b border-white/[0.06] bg-[#060608]/75 md:block"
      >
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-6 py-2">
          {[
            { href: "/feed", label: "Feed", Icon: Home },
            { href: "/friends", label: "Friends", Icon: Users },
            { href: "/messages", label: "Messages", Icon: MessageCircle },
            { href: "/notifications", label: "Notifications", Icon: Bell },
            { href: "/settings", label: "Settings", Icon: Settings },
          ].map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-neutral-400 transition hover:bg-white/[0.05] hover:text-amber-200"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-10 md:pb-10">
        {children}
      </main>
      <BottomNav username={username} />
    </div>
  );
}
