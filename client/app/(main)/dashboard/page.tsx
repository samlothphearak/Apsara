"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  Bell,
  Check,
  Compass,
  Image,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { createClient } from "@/supabase/client";
import DashboardHeader from "@/components/layout/dashboard-header";

type DashboardProfile = {
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
};

const spaces = [
  {
    name: "Your feed",
    description: "A home for moments and updates from your community.",
    icon: Image,
    href: "/feed",
    accent: "bg-blue-50 text-blue-600",
  },
  {
    name: "Friends",
    description: "Find your people and build meaningful connections.",
    icon: Users,
    href: "/friends",
    accent: "bg-violet-50 text-violet-600",
  },
  {
    name: "Messages",
    description: "Keep the conversation going, one note at a time.",
    icon: MessageCircle,
    href: "/messages",
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "Notifications",
    description: "Your important updates will find a home here.",
    icon: Bell,
    href: "/notifications",
    accent: "bg-amber-50 text-amber-600",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [profileError, setProfileError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("username, full_name, bio, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error(
            "No profile exists for this account. Apply the Supabase profile migration and create a profile.",
          );
        }

        if (active) setProfile(data);
      } catch (error) {
        if (active) {
          setProfileError(
            error instanceof Error
              ? error.message
              : "Unable to load your profile.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || "Friend";
  const username = profile?.username || "Unknown";
  const setupItems = [
    { label: "Add your name", complete: Boolean(profile?.full_name?.trim()) },
    {
      label: "Write a short introduction",
      complete: Boolean(profile?.bio?.trim()),
    },
    { label: "Add a profile photo", complete: Boolean(profile?.avatar_url) },
  ];
  const completedItems = setupItems.filter((item) => item.complete).length;
  const completion = Math.round((completedItems / setupItems.length) * 100);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <DashboardHeader
        firstName={firstName}
        username={username}
        loading={loading}
      />

      {profileError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {profileError}
        </p>
      )}

      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-900 px-6 py-9 text-white shadow-xl shadow-indigo-950/10 sm:px-10 sm:py-12">
        <div
          aria-hidden="true"
          className="absolute -right-20 -top-32 -z-10 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl"
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100">
              <Sparkles size={14} />A space to feel at home
            </div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              Your people.
              <br />
              Your moments.
              <span className="text-blue-300"> Your space.</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-blue-100/80 sm:text-base">
              Make yourself at home, shape your profile, and get ready to
              discover a more thoughtful way to stay connected.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#community"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                Explore your space
                <ArrowRight size={16} />
              </Link>
              <Link
                href={
                  profile
                    ? `/profile/${encodeURIComponent(profile.username)}`
                    : "#profile-setup"
                }
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Finish your profile
                <ArrowDownRight size={16} />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-blue-100">
                Profile setup
              </span>
              <span className="text-sm font-semibold text-white">
                {loading ? "…" : `${completion}%`}
              </span>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-label="Profile setup progress"
              aria-valuenow={loading ? 0 : completion}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-300 to-violet-300 transition-[width]"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-blue-100/75">
              {loading
                ? "Loading profile details..."
                : `${completedItems} of ${setupItems.length} profile details complete`}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section id="community" className="scroll-mt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Made for connection
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                Your community
              </h2>
            </div>
            <Compass className="mb-1 text-blue-600" size={20} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {spaces.map((space) => {
              const Icon = space.icon;

              return (
                <Link
                  href={space.href}
                  key={space.name}
                  className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${space.accent}`}
                    >
                      <Icon size={20} />
                    </span>
                    <ArrowRight
                      size={17}
                      className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
                    />
                  </div>
                  <h3 className="mt-5 font-semibold text-slate-900">
                    {space.name}
                  </h3>
                  <p className="mt-1.5 text-sm leading-5 text-slate-500">
                    {space.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <aside
          id="profile-setup"
          className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                A good first step
              </p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">
                Make it yours
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users size={19} />
            </div>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            A few details help friends recognize you and make your profile feel
            like home.
          </p>

          <ul className="mt-5 space-y-3">
            {setupItems.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 text-sm text-slate-700"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    item.complete
                      ? "bg-emerald-100 text-emerald-700"
                      : "border border-slate-300 text-transparent"
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                <span
                  className={item.complete ? "text-slate-400 line-through" : ""}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Your profile
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-800">
              @{username}
            </p>
          </div>
        </aside>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="font-semibold text-slate-900">
            Small moments make a community.
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Share a post, connect with friends, and continue conversations from
            your community.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-blue-700">
          <Sparkles size={14} />
          You&apos;re early
        </span>
      </section>
    </div>
  );
}
