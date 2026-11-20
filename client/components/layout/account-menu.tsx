"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageCircle,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/supabase/client";

export type UserProfileMenuUser = {
  fullName: string;
  username: string;
  email?: string | null;
  avatarUrl?: string | null;
};

type UserProfileMenuProps = {
  user: UserProfileMenuUser;
  unreadNotifications?: number;
  pendingRequests?: number;
};

type PanelView = "main" | "preferences";

export default function AccountMenu({
  user,
  unreadNotifications = 0,
  pendingRequests = 0,
}: UserProfileMenuProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("main");
  const [signingOut, setSigningOut] = useState(false);
  const [compactFeed, setCompactFeed] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const initials = (user.fullName || user.username || "A")
    .slice(0, 1)
    .toUpperCase();

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setView("main");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setView("main");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      setOpen(false);
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const totalAlerts = unreadNotifications + pendingRequests;

  return (
    <div ref={containerRef} className="relative flex items-center gap-2.5">
      {/* Facebook-style Quick Action Circles in Top Header */}
      <Link
        href="/messages"
        aria-label="Messages"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-200 transition hover:border-amber-400/40 hover:bg-white/[0.08] hover:text-amber-200"
      >
        <MessageCircle size={17} />
      </Link>

      <Link
        href="/notifications"
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-neutral-200 transition hover:border-amber-400/40 hover:bg-white/[0.08] hover:text-amber-200"
      >
        <Bell size={17} />
        {unreadNotifications > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-neutral-950">
            {unreadNotifications > 9 ? "9+" : unreadNotifications}
          </span>
        )}
      </Link>

      {/* Facebook-style Avatar Trigger with Bottom-Right Badge */}
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (open) setView("main");
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account and profile menu"
        className="group relative flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95"
      >
        <MenuAvatar
          avatarUrl={user.avatarUrl}
          initials={initials}
          name={user.fullName}
          size="md"
        />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#060608] bg-neutral-800 text-neutral-200 transition group-hover:bg-amber-400 group-hover:text-neutral-950">
          <ChevronDown
            size={11}
            className={`transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
        {totalAlerts > 0 && !open && (
          <span className="sr-only">{totalAlerts} unread alerts</span>
        )}
      </button>

      {/* Facebook-style Account Dropdown Panel */}
      {open && (
        <div
          role="menu"
          className="fixed inset-x-3 top-18 z-50 overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#171411] via-[#12100d] to-[#0c0b09] p-2.5 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.95)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-88"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/75 to-transparent"
          />

          {view === "main" ? (
            <div className="space-y-1.5">
              {/* Profile Card */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-2.5">
                <Link
                  href={`/profile/${encodeURIComponent(user.username)}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-white/[0.05]"
                >
                  <MenuAvatar
                    avatarUrl={user.avatarUrl}
                    initials={initials}
                    name={user.fullName}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.fullName}
                    </p>
                    <p className="truncate text-xs text-amber-300/80">
                      @{user.username}
                    </p>
                    {user.email && (
                      <p className="truncate text-[11px] text-neutral-500">
                        {user.email}
                      </p>
                    )}
                  </div>
                </Link>

                <div className="mt-2 border-t border-white/[0.07] pt-2">
                  <Link
                    href={`/profile/${encodeURIComponent(user.username)}`}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400/12 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
                  >
                    <User size={13} />
                    <span>See your profile</span>
                  </Link>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="pt-1">
                <MenuRowLink
                  href="/friends"
                  icon={<Users size={16} className="text-amber-300" />}
                  label="Friends"
                  description="Requests, sent & connections"
                  badge={pendingRequests}
                  onSelect={() => setOpen(false)}
                />
                <MenuRowLink
                  href="/notifications"
                  icon={<Bell size={16} className="text-sky-400" />}
                  label="Notifications"
                  description="Activity & sanctuary updates"
                  badge={unreadNotifications}
                  onSelect={() => setOpen(false)}
                />
                <MenuRowLink
                  href="/messages"
                  icon={
                    <MessageCircle size={16} className="text-emerald-400" />
                  }
                  label="Messages"
                  description="Direct chats with friends"
                  onSelect={() => setOpen(false)}
                />
                <MenuRowLink
                  href="/settings"
                  icon={<Settings size={16} className="text-neutral-300" />}
                  label="Settings & privacy"
                  description="Account, profile & security"
                  onSelect={() => setOpen(false)}
                />
              </div>

              {/* Sub-panel Trigger */}
              <button
                type="button"
                role="menuitem"
                onClick={() => setView("preferences")}
                className="flex w-full items-center justify-between rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-white/[0.05]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-amber-300">
                    <Sparkles size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-neutral-100">
                      Display & accessibility
                    </span>
                    <span className="block text-[11px] text-neutral-500">
                      Feed density & motion options
                    </span>
                  </span>
                </span>
                <ChevronRight size={16} className="text-neutral-500" />
              </button>

              {/* Log Out */}
              <div className="border-t border-white/[0.08] pt-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleSignOut()}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-rose-300">
                    <LogOut size={16} />
                  </span>
                  <span className="text-sm font-medium text-rose-200">
                    {signingOut ? "Logging out..." : "Log out"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  aria-label="Back to menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-neutral-200 transition hover:bg-white/[0.12]"
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className="text-sm font-semibold text-white">
                  Display & accessibility
                </h2>
              </div>

              <ToggleRow
                title="Compact feed spacing"
                description="Fit more posts per screen"
                checked={compactFeed}
                onChange={setCompactFeed}
              />

              <ToggleRow
                title="Reduced motion"
                description="Minimize subtle UI transitions"
                checked={reduceMotion}
                onChange={setReduceMotion}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MenuRowLink({
  href,
  icon,
  label,
  description,
  badge = 0,
  onSelect,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: number;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex items-center justify-between rounded-2xl px-2.5 py-2.5 transition hover:bg-white/[0.05]"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
          {icon}
        </span>
        <span>
          <span className="block text-sm font-medium text-neutral-100">
            {label}
          </span>
          <span className="block text-[11px] text-neutral-500">
            {description}
          </span>
        </span>
      </span>

      <span className="flex items-center gap-2">
        {badge > 0 && (
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
            {badge}
          </span>
        )}
        <ChevronRight size={15} className="text-neutral-600" />
      </span>
    </Link>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl px-2.5 py-2.5 text-left transition hover:bg-white/[0.05]"
    >
      <span>
        <span className="block text-sm font-medium text-neutral-100">
          {title}
        </span>
        <span className="block text-[11px] text-neutral-500">
          {description}
        </span>
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-amber-400" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-neutral-950 transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

function MenuAvatar({
  avatarUrl,
  initials,
  name,
  size,
}: {
  avatarUrl?: string | null;
  initials: string;
  name: string;
  size: "md" | "lg";
}) {
  const dimensions = size === "lg" ? "h-12 w-12" : "h-10 w-10";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${name}'s avatar`}
        width={48}
        height={48}
        unoptimized
        className={`${dimensions} shrink-0 rounded-full object-cover ring-2 ring-amber-400/40`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300/25 to-amber-500/10 text-sm font-semibold text-amber-200 ring-2 ring-amber-400/35`}
    >
      {initials}
    </span>
  );
}
