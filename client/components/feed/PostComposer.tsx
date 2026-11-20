"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  ChevronDown,
  Globe,
  Lock,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export type PostVisibility = "public" | "friends" | "private";

type AuthorProfile = {
  full_name?: string | null;
  username?: string;
  avatar_url?: string | null;
};

type CreatePostComposerProps = {
  canPost: boolean;
  content: string;
  setContent: (value: string) => void;
  visibility: PostVisibility;
  setVisibility: (value: PostVisibility) => void;
  busyAction: string;
  createPost: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
  author?: AuthorProfile;
};

const VISIBILITY_META: Record<
  PostVisibility,
  { label: string; description: string; Icon: typeof Globe }
> = {
  public: {
    label: "Everyone",
    description: "Anyone in the community",
    Icon: Globe,
  },
  friends: {
    label: "Friends",
    description: "Your connected circle",
    Icon: Users,
  },
  private: {
    label: "Only me",
    description: "Private personal journal",
    Icon: Lock,
  },
};

export function CreatePostComposer({
  canPost,
  content,
  setContent,
  visibility,
  setVisibility,
  busyAction,
  createPost,
  author,
}: CreatePostComposerProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false);

  const isPublishing = busyAction === "create";
  const canSubmit = content.trim().length > 0 && !isPublishing;
  const displayName = author?.full_name || author?.username || "Member";
  const initials = displayName.slice(0, 1).toUpperCase();
  const ActiveVisibility = VISIBILITY_META[visibility];

  // Lock background scroll when iPhone-style sheet is open
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (!canPost) return null;

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    await createPost(event);
    setMobileOpen(false);
    setAudienceMenuOpen(false);
  }

  return (
    <>
      {/* 1. MOBILE TRIGGER CARD (iPhone Facebook "What's on your mind?" bar) */}
      <div className="sm:hidden">
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#171411] to-[#0f0d0b] p-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.85)]">
          {/* Subtle Khmer gold top filigree line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
          />

          <div className="flex items-center gap-3">
            <AvatarBadge
              avatarUrl={author?.avatar_url}
              initials={initials}
              name={displayName}
            />

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex min-h-11 flex-1 items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left transition active:scale-[0.99] active:bg-white/[0.07]"
            >
              <span className="truncate text-sm text-neutral-300">
                {content.trim()
                  ? content
                  : "Share a moment with your community..."}
              </span>
              <Sparkles size={15} className="ml-2 shrink-0 text-amber-400/80" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MOBILE FULL-SCREEN IPHONE MODAL COMPOSER */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create post"
          className="fixed inset-0 z-50 flex flex-col bg-[#0c0b09] sm:hidden"
        >
          {/* iOS Navigation Bar */}
          <div className="flex items-center justify-between border-b border-amber-400/15 bg-[#12100d]/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setAudienceMenuOpen(false);
              }}
              aria-label="Close composer"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-neutral-300 active:bg-white/15"
            >
              <X size={18} />
            </button>

            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">
                សួស្តី · Share
              </p>
              <h2 className="text-sm font-semibold text-white">Create Post</h2>
            </div>

            <button
              type="submit"
              form="mobile-create-post-form"
              disabled={!canSubmit}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 text-xs font-bold text-neutral-950 shadow-[0_4px_16px_rgba(251,191,36,0.35)] transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              {isPublishing ? "Posting..." : "Post"}
            </button>
          </div>

          {/* Composer Body */}
          <form
            id="mobile-create-post-form"
            onSubmit={handleFormSubmit}
            className="flex flex-1 flex-col justify-between overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
          >
            <div>
              {/* Author + Audience Pill */}
              <div className="flex items-center gap-3">
                <AvatarBadge
                  avatarUrl={author?.avatar_url}
                  initials={initials}
                  name={displayName}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {displayName}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAudienceMenuOpen((prev) => !prev)}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-200 active:bg-amber-400/20"
                  >
                    <ActiveVisibility.Icon size={12} />
                    <span>{ActiveVisibility.label}</span>
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>

              {/* iOS-Style Segmented Audience Drawer */}
              {audienceMenuOpen && (
                <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-amber-400/20 bg-[#16130f] p-1.5">
                  {(Object.keys(VISIBILITY_META) as PostVisibility[]).map(
                    (key) => {
                      const item = VISIBILITY_META[key];
                      const active = visibility === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setVisibility(key);
                            setAudienceMenuOpen(false);
                          }}
                          className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition ${
                            active
                              ? "bg-amber-400 text-neutral-950 font-semibold shadow-sm"
                              : "text-neutral-300 hover:bg-white/5"
                          }`}
                        >
                          <item.Icon size={14} />
                          <span className="text-[11px]">{item.label}</span>
                        </button>
                      );
                    },
                  )}
                </div>
              )}

              {/* Textarea */}
              <textarea
                id="mobile-new-post-content"
                autoFocus
                value={content}
                onChange={(event) => setContent(event.target.value)}
                maxLength={10000}
                rows={7}
                placeholder="What’s on your mind today?"
                className="mt-4 w-full resize-none bg-transparent text-base leading-relaxed text-white outline-none placeholder:text-neutral-500"
              />
            </div>

            {/* Bottom Character & Khmer Accent Footer */}
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1.5 text-amber-300/80">
                <span className="h-1.5 w-1.5 rotate-45 bg-amber-400" />
                {ActiveVisibility.description}
              </span>
              <span>{content.length.toLocaleString()} / 10,000</span>
            </div>
          </form>
        </div>
      )}

      {/* 3. DESKTOP / TABLET LUXURY KHMER CARD */}
      <form
        onSubmit={handleFormSubmit}
        className="relative hidden overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#171410] via-[#12100d] to-[#0e0c0a] p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] sm:block"
      >
        {/* Top Khmer Gold Filigree Accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"
        />

        {/* Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AvatarBadge
              avatarUrl={author?.avatar_url}
              initials={initials}
              name={displayName}
            />
            <div>
              <label
                htmlFor="new-post-content"
                className="block text-sm font-semibold text-white"
              >
                {displayName}
              </label>
              <p className="text-[11px] tracking-wide text-amber-300/80">
                Share a moment with your circle
              </p>
            </div>
          </div>

          {/* Segmented Khmer Gold Audience Pill Selector */}
          <div
            role="group"
            aria-label="Post audience"
            className="inline-flex rounded-full border border-white/10 bg-black/40 p-1"
          >
            {(Object.keys(VISIBILITY_META) as PostVisibility[]).map((key) => {
              const item = VISIBILITY_META[key];
              const active = visibility === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVisibility(key)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-amber-400 text-neutral-950 shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <item.Icon size={12} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Textarea */}
        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-black/30 p-3.5 transition focus-within:border-amber-400/45 focus-within:bg-black/45">
          <textarea
            id="new-post-content"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={10000}
            rows={3}
            placeholder="What would you like to share today?"
            className="w-full resize-y bg-transparent text-sm leading-relaxed text-white outline-none placeholder:text-neutral-500"
          />
        </div>

        {/* Footer Action Bar */}
        <div className="mt-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rotate-45 bg-amber-400/80"
            />
            <span>{ActiveVisibility.description}</span>
            {content.length > 0 && (
              <span className="text-neutral-600">
                · {content.length.toLocaleString()} / 10,000
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-[0_8px_24px_-6px_rgba(251,191,36,0.45)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
          >
            <Send size={14} />
            {isPublishing ? "Publishing..." : "Post"}
          </button>
        </div>
      </form>
    </>
  );
}

function AvatarBadge({
  avatarUrl,
  initials,
  name,
  size = "md",
}: {
  avatarUrl?: string | null;
  initials: string;
  name: string;
  size?: "md" | "lg";
}) {
  const dimensions = size === "lg" ? "h-11 w-11" : "h-10 w-10";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${name}'s avatar`}
        width={44}
        height={44}
        unoptimized
        className={`${dimensions} shrink-0 rounded-full object-cover ring-2 ring-amber-400/40`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimensions} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300/25 to-amber-500/10 font-semibold text-amber-200 ring-2 ring-amber-400/35`}
    >
      {initials}
    </span>
  );
}
