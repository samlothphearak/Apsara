import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/supabase/server";
import LogoutButton from "@/components/layout/logout-button";

function MainLayoutFallback() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 text-center text-slate-500">
      Loading your account...
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
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <a
            href="/dashboard"
            className="text-2xl font-extrabold tracking-tight text-blue-600"
          >
            Socially.
          </a>

          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-500 sm:block">
              Your social space
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </div>
  );
}
