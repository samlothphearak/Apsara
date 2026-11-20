"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  MessageCircle,
  UserRound,
  Users,
} from "lucide-react";

type BottomNavProps = {
  username: string;
};

export default function BottomNav({ username }: BottomNavProps) {
  const pathname = usePathname();
  const items = [
    { href: "/feed", label: "Home", Icon: Home },
    { href: "/friends", label: "Friends", Icon: Users },
    { href: "/messages", label: "Messages", Icon: MessageCircle },
    { href: "/notifications", label: "Alerts", Icon: Bell },
    {
      href: `/profile/${encodeURIComponent(username)}`,
      label: "Profile",
      Icon: UserRound,
    },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-500/15 bg-[#09090c]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {items.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (label === "Profile" && pathname.startsWith("/profile/"));

          return (
            <Link
              key={label}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 transition-colors ${
                active
                  ? "text-amber-300"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.8}
                aria-hidden="true"
              />
              <span className="max-w-full truncate px-1 text-[10px] font-medium leading-none">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
