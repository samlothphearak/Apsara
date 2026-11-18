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
      className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
    >
      <LogOut size={18} />
      Sign out
    </button>
  );
}