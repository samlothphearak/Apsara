"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="group flex w-full items-center gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm font-medium text-neutral-400 transition-all hover:border-red-500/30 hover:bg-red-950/20 hover:text-red-400 active:scale-[0.99]"
    >
      <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Sign out</span>
    </button>
  );
}
