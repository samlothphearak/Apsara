"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import {
  ChevronDown,
  Film,
  Globe,
  ImagePlus,
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
  mediaFiles: File[];
  setMediaFiles: (files: File[]) => void;
  busyAction: string;
  errorMessage?: string;
  createPost: (event: FormEvent<HTMLFormElement>) => Promise<boolean> | boolean;
  author?: AuthorProfile;
};

const MAX_LENGTH = 10000;

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
  mediaFiles,
  setMediaFiles,
  busyAction,
  errorMessage,
  createPost,
  author,
}: CreatePostComposerProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [audienceMenuOpen, setAudienceMenuOpen] = useState(false);

  const mobileEditorRef = useRef<HTMLDivElement | null>(null);
  const desktopEditorRef = useRef<HTMLDivElement | null>(null);

  const mobilePhotoInputRef = useRef<HTMLInputElement | null>(null);
  const mobileVideoInputRef = useRef<HTMLInputElement | null>(null);
  const desktopPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const desktopVideoInputRef = useRef<HTMLInputElement | null>(null);

  const isPublishing = busyAction === "create";
  const hasText = content.trim().length > 0;
  const hasMedia = mediaFiles.length > 0;
  const canSubmit = (hasText || hasMedia) && !isPublishing;

  const displayName = author?.full_name || author?.username || "Member";
  const initials = displayName.slice(0, 1).toUpperCase();
  const ActiveVisibility = VISIBILITY_META[visibility];

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Sync external resets (e.g. after a successful post) into contentEditable nodes
  useEffect(() => {
    if (
      mobileEditorRef.current &&
      mobileEditorRef.current.innerText !== content &&
      content === ""
    ) {
      mobileEditorRef.current.innerText = "";
    }
    if (
      desktopEditorRef.current &&
      desktopEditorRef.current.innerText !== content &&
      content === ""
    ) {
      desktopEditorRef.current.innerText = "";
    }
  }, [content]);

  if (!canPost) return null;

  function syncTextFromEditor(el: HTMLDivElement | null) {
    if (!el) return;
    const raw = (el.innerText ?? "").replace(/\u00a0/g, " ");
    const clamped = raw.slice(0, MAX_LENGTH);
    if (clamped !== raw) {
      el.innerText = clamped;
    }
    setContent(clamped);
  }

  function handlePastePlainText(
    event: ClipboardEvent<HTMLDivElement>,
    el: HTMLDivElement | null,
  ) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text/plain") ?? "";
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !el) return;

    const remaining = Math.max(0, MAX_LENGTH - content.length);
    const chunk = pasted.slice(0, remaining);
    if (!chunk) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(chunk);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    syncTextFromEditor(el);
  }

  function appendFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    if (picked.length > 0) {
      setMediaFiles([...mediaFiles, ...picked]);
    }
    event.target.value = "";
  }

  function openMobileWithPicker(type: "photo" | "video") {
    setMobileOpen(true);
    window.setTimeout(() => {
      if (type === "photo") {
        mobilePhotoInputRef.current?.click();
      } else {
        mobileVideoInputRef.current?.click();
      }
    }, 60);
  }

  function removeMediaAt(index: number) {
    setMediaFiles(mediaFiles.filter((_, idx) => idx !== index));
  }

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const created = await createPost(event);
    if (!created) return;

    setMobileOpen(false);
    setAudienceMenuOpen(false);
  }

  const mobileSummary = hasText
    ? content
    : hasMedia
      ? `${mediaFiles.length} ${mediaFiles.length === 1 ? "attachment" : "attachments"} ready to post`
      : `What's on your mind, ${displayName.split(" ")[0]}?`;

  return (
    <>
      <input
        ref={mobilePhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={appendFiles}
        className="sr-only"
      />
      <input
        ref={mobileVideoInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={appendFiles}
        className="sr-only"
      />
      <input
        ref={desktopPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={appendFiles}
        className="sr-only"
      />
      <input
        ref={desktopVideoInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={appendFiles}
        className="sr-only"
      />

      {/* 1. MOBILE TRIGGER BAR (Phone) */}
      <div className="sm:hidden">
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#171411] to-[#0f0d0b] p-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.85)]">
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
              className="flex min-h-11 min-w-0 flex-1 items-center justify-between rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left transition active:scale-[0.99] active:bg-white/[0.07]"
            >
              <span className="truncate text-sm text-neutral-300">
                {mobileSummary}
              </span>
              <Sparkles size={15} className="ml-2 shrink-0 text-amber-400/80" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 border-t border-white/[0.07] pt-2">
            <button
              type="button"
              onClick={() => openMobileWithPicker("photo")}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl text-xs font-medium text-neutral-200 transition active:bg-white/10"
            >
              <ImagePlus size={15} className="text-emerald-400" />
              <span>Photo</span>
            </button>

            <button
              type="button"
              onClick={() => openMobileWithPicker("video")}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border-l border-white/[0.07] text-xs font-medium text-neutral-200 transition active:bg-white/10"
            >
              <Film size={15} className="text-amber-400" />
              <span>Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MOBILE FULL-SCREEN COMPOSER (Pinned header & footer so Post is always visible) */}
      {mobileOpen && (
        <form
          onSubmit={handleFormSubmit}
          role="dialog"
          aria-modal="true"
          aria-label="Create post"
          className="fixed inset-0 z-50 flex max-h-[100dvh] flex-col overflow-hidden bg-[#0c0b09] sm:hidden"
        >
          {/* Top Bar */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-amber-400/15 bg-[#12100d] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setAudienceMenuOpen(false);
              }}
              aria-label="Close composer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-neutral-300 active:bg-white/15"
            >
              <X size={18} />
            </button>

            <div className="min-w-0 text-center">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">
                សួស្តី · Share
              </p>
              <h2 className="truncate text-sm font-semibold text-white">
                Create Post
              </h2>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 text-xs font-bold text-neutral-950 shadow-[0_4px_16px_rgba(251,191,36,0.35)] transition active:scale-95 disabled:opacity-40 disabled:shadow-none"
            >
              {isPublishing ? "Posting..." : "Post"}
            </button>
          </div>

          {/* Scrollable Middle Content */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
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
                            ? "bg-amber-400 font-semibold text-neutral-950 shadow-sm"
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

            {/* IG/FB-style editable caption box (no textarea) */}
            <div className="relative mt-4 min-h-28 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              {!content && (
                <span className="pointer-events-none absolute left-3.5 top-3.5 text-base text-neutral-500">
                  Write a caption or share a moment...
                </span>
              )}
              <div
                ref={mobileEditorRef}
                role="textbox"
                aria-multiline="true"
                aria-label="Post caption"
                contentEditable
                suppressContentEditableWarning
                onInput={() => syncTextFromEditor(mobileEditorRef.current)}
                onPaste={(e) =>
                  handlePastePlainText(e, mobileEditorRef.current)
                }
                className="min-h-20 whitespace-pre-wrap break-words text-base leading-relaxed text-white outline-none"
              />
            </div>

            {hasMedia && (
              <div className="mt-3">
                <MediaGallery files={mediaFiles} onRemove={removeMediaAt} />
              </div>
            )}

            {errorMessage && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
              >
                {errorMessage}
              </p>
            )}
          </div>

          {/* Always-Visible Bottom Action Bar on Phone */}
          <div className="shrink-0 border-t border-amber-400/15 bg-[#12100d] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => mobilePhotoInputRef.current?.click()}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-medium text-emerald-200 active:bg-emerald-400/20"
                >
                  <ImagePlus size={15} />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => mobileVideoInputRef.current?.click()}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3.5 py-1.5 text-xs font-medium text-amber-200 active:bg-amber-400/20"
                >
                  <Film size={15} />
                  <span>Video</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 px-4 py-1.5 text-xs font-bold text-neutral-950 disabled:opacity-40"
              >
                <Send size={13} />
                <span>{isPublishing ? "Posting..." : "Post"}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. DESKTOP / TABLET COMPOSER */}
      <form
        onSubmit={handleFormSubmit}
        className="relative hidden overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-b from-[#171410] via-[#12100d] to-[#0e0c0a] p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] sm:block"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent"
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AvatarBadge
              avatarUrl={author?.avatar_url}
              initials={initials}
              name={displayName}
            />
            <div>
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="text-[11px] tracking-wide text-amber-300/80">
                Share text, photos, or videos
              </p>
            </div>
          </div>

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

        <div className="relative mt-4 rounded-2xl border border-white/[0.07] bg-black/30 p-3.5 transition focus-within:border-amber-400/45 focus-within:bg-black/45">
          {!content && (
            <span className="pointer-events-none absolute left-3.5 top-3.5 text-sm text-neutral-500">
              Write a caption or share a moment...
            </span>
          )}
          <div
            ref={desktopEditorRef}
            role="textbox"
            aria-multiline="true"
            aria-label="Post caption"
            contentEditable
            suppressContentEditableWarning
            onInput={() => syncTextFromEditor(desktopEditorRef.current)}
            onPaste={(e) => handlePastePlainText(e, desktopEditorRef.current)}
            className="min-h-20 whitespace-pre-wrap break-words text-sm leading-relaxed text-white outline-none"
          />

          {hasMedia && (
            <div className="mt-3 border-t border-white/[0.07] pt-3">
              <MediaGallery files={mediaFiles} onRemove={removeMediaAt} />
            </div>
          )}
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"
          >
            {errorMessage}
          </p>
        )}

        <div className="mt-3.5 flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => desktopPhotoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-emerald-400/40 hover:bg-white/[0.08]"
            >
              <ImagePlus size={14} className="text-emerald-400" />
              <span>Photo</span>
            </button>

            <button
              type="button"
              onClick={() => desktopVideoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-amber-400/40 hover:bg-white/[0.08]"
            >
              <Film size={14} className="text-amber-400" />
              <span>Video</span>
            </button>

            <span className="ml-1 hidden items-center gap-1.5 text-xs text-neutral-500 lg:inline-flex">
              <span
                aria-hidden="true"
                className="inline-block h-1.5 w-1.5 rotate-45 bg-amber-400/80"
              />
              {hasMedia
                ? `${mediaFiles.length} ${mediaFiles.length === 1 ? "file" : "files"} attached`
                : ActiveVisibility.description}
            </span>
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

function MediaGallery({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      })),
    [files],
  );

  useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  const gridClass =
    previews.length === 1
      ? "grid-cols-1"
      : previews.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={`grid gap-2.5 ${gridClass}`}>
      {previews.map((item, index) => (
        <div
          key={`${item.file.name}-${item.file.lastModified}-${index}`}
          className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/50 ${
            previews.length === 1 ? "aspect-video max-h-64" : "aspect-square"
          }`}
        >
          {item.isVideo ? (
            <>
              <video
                src={item.url}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-amber-300 backdrop-blur-sm">
                VIDEO
              </span>
            </>
          ) : (
            <img
              src={item.url}
              alt={item.file.name}
              className="h-full w-full object-cover"
            />
          )}

          <button
            type="button"
            onClick={() => onRemove(index)}
            aria-label={`Remove ${item.file.name}`}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white backdrop-blur-sm transition hover:bg-rose-500"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
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