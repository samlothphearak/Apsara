"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { ChevronDown, Home, LogOut, User } from "lucide-react";

interface UserProfileMenuProps {
  user: {
    fullName: string;
    username: string;
    email?: string;
    avatarUrl?: string | null;
  };
}

export default function UserProfileMenu({ user }: UserProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarUrl = user.avatarUrl;

  const initials =
    user.fullName
      ?.trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Profile Pill Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="group flex items-center gap-3 rounded-full border border-amber-500/20 bg-white/[0.03] py-1.5 pl-1.5 pr-3.5 text-left transition-all hover:border-amber-400/50 hover:bg-white/[0.06]"
      >
        {avatarUrl && avatarUrl !== failedAvatarUrl ? (
          <Image
            src={avatarUrl}
            alt={user.fullName}
            width={32}
            height={32}
            unoptimized
            className="h-8 w-8 rounded-full border border-amber-400/40 object-cover"
            onError={() => setFailedAvatarUrl(avatarUrl)}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/35 bg-gradient-to-b from-amber-500/20 to-amber-500/5 text-xs font-bold text-amber-300">
            {initials}
          </div>
        )}

        <div className="hidden sm:block">
          <p className="max-w-[130px] truncate text-xs font-semibold text-white">
            {user.fullName}
          </p>
          <p className="max-w-[130px] truncate text-[10px] text-amber-400/80">
            @{user.username}
          </p>
        </div>

        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 group-hover:text-amber-300 ${
            open ? "rotate-180 text-amber-300" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2.5 w-60 origin-top-right overflow-hidden rounded-2xl border border-amber-500/25 bg-[#0B0B0F]/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          {/* Top Champagne Hairline */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

          {/* User Info Header */}
          <div className="border-b border-white/10 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-white">
              {user.fullName}
            </p>
            <p className="truncate text-xs text-amber-400/80">
              @{user.username}
            </p>
            {user.email && (
              <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                {user.email}
              </p>
            )}
          </div>

          {/* Navigation Links */}
          <div className="py-1.5">
            <Link
              href="/feed"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-amber-300"
            >
              <Home className="h-4 w-4 text-amber-400/80" />
              Feed
            </Link>

            <Link
              href={`/profile/${encodeURIComponent(user.username)}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-amber-300"
            >
              <User className="h-4 w-4 text-amber-400/80" />
              Your Profile
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-white/10 pt-1.5">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-neutral-400 transition-colors hover:bg-red-950/30 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
