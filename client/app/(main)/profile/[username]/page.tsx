"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Save,
  UserRound,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/supabase/client";
import PostFeed from "@/components/social/post-feed";
import ProfileConnections from "@/components/social/profile-connections";

type Profile = {
  id: string;
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  website: string | null;
  location: string | null;
  is_private: boolean;
};

type ProfileFormValues = {
  username: string;
  full_name: string;
  bio: string;
  avatar_url: string;
  cover_url: string;
  website: string;
  location: string;
};

type ProfileImageKind = "avatar" | "cover";

const emptyProfile: ProfileFormValues = {
  username: "",
  full_name: "",
  bio: "",
  avatar_url: "",
  cover_url: "",
  website: "",
  location: "",
};

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-amber-400/50 focus:ring-4 focus:ring-amber-400/10";

const profileMediaBucket = "profile-media";
const maxProfileImageSize = 10 * 1024 * 1024;
const imageExtensions: Record<string, string> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function uploadProfileImage(
  file: File,
  userId: string,
  kind: ProfileImageKind,
) {
  const extension = imageExtensions[file.type];

  if (!extension) {
    throw new Error("Choose a JPG, PNG, WebP, AVIF, or GIF image.");
  }
  if (file.size === 0 || file.size > maxProfileImageSize) {
    throw new Error("Images must be non-empty and no larger than 10 MB.");
  }

  const path = `${userId}/${kind}-${crypto.randomUUID()}.${extension}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(profileMediaBucket)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return supabase.storage.from(profileMediaBucket).getPublicUrl(path).data
    .publicUrl;
}

function toFormValues(profile: Profile): ProfileFormValues {
  return {
    username: profile.username,
    full_name: profile.full_name ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
    cover_url: profile.cover_url ?? "",
    website: profile.website ?? "",
    location: profile.location ?? "",
  };
}

function getSafeHttpUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormValues>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<
    "avatar_url" | "cover_url" | null
  >(null);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const isOwner = profile?.id === currentUserId;

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setProfile(null);
      setNotFound(false);
      setIsEditing(false);
      setErrorMessage("");
      setSuccessMessage("");

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
          .select(
            "id, username, full_name, bio, avatar_url, cover_url, website, location, is_private",
          )
          .eq("username", username)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          if (!data) {
            setNotFound(true);
          } else {
            setProfile(data);
            setForm(toFormValues(data));
          }
          setCurrentUserId(user.id);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load this profile.",
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
  }, [router, username]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!profile || !isOwner) {
        throw new Error("You can only edit your own profile.");
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .update({
          username: form.username.trim(),
          full_name: form.full_name.trim(),
          bio: form.bio.trim(),
          avatar_url: form.avatar_url.trim() || null,
          cover_url: form.cover_url.trim() || null,
          website: form.website.trim() || null,
          location: form.location.trim() || null,
        })
        .eq("id", profile.id)
        .select(
          "id, username, full_name, bio, avatar_url, cover_url, website, location, is_private",
        )
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Your profile could not be found.");

      setProfile(data);
      setForm(toFormValues(data));
      setIsEditing(false);
      setSuccessMessage("Your profile has been updated.");
      router.refresh();

      if (data.username !== username) {
        router.replace(`/profile/${encodeURIComponent(data.username)}`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(
    file: File | undefined,
    kind: ProfileImageKind,
  ) {
    if (!file || !profile || !isOwner) return;

    const field = kind === "avatar" ? "avatar_url" : "cover_url";
    setUploadingField(field);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const publicUrl = await uploadProfileImage(file, profile.id, kind);
      setForm((current) => ({ ...current, [field]: publicUrl }));
      setSuccessMessage("Image uploaded. Save your profile to apply it.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to upload this image.",
      );
    } finally {
      setUploadingField(null);
    }
  }

  function cancelEditing() {
    if (profile) setForm(toFormValues(profile));
    setIsEditing(false);
    setErrorMessage("");
    setSuccessMessage("");
  }

  const initials =
    profile?.full_name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ||
    profile?.username.slice(0, 1).toUpperCase() ||
    "A";
  const safeAvatarUrl = getSafeHttpUrl(
    isEditing ? form.avatar_url : (profile?.avatar_url ?? null),
  );
  const safeCoverUrl = getSafeHttpUrl(
    isEditing ? form.cover_url : (profile?.cover_url ?? null),
  );
  const safeWebsiteUrl = getSafeHttpUrl(profile?.website ?? null);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Link
          href="/feed"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-neutral-300 transition hover:border-amber-400/30 hover:text-amber-300"
        >
          <ArrowLeft size={16} />
          Back to Feed
        </Link>
      </header>

      {loading ? (
        <div
          role="status"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-sm text-neutral-400"
        >
          Fetching profile details...
        </div>
      ) : errorMessage && !profile ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-sm text-red-200"
        >
          {errorMessage}
        </div>
      ) : notFound || !profile ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-neutral-400">
            <UserRound size={24} />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">
            Profile not found
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            There isn&apos;t an Apsara profile for @{username}.
          </p>
        </div>
      ) : (
        <>
          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200"
            >
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p
              role="status"
              className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200"
            >
              {successMessage}
            </p>
          )}

          <article className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-neutral-950/85 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
            {/* Top Champagne Hairline Highlight */}
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

            {/* Cover Banner */}
            <div className="relative h-44 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.22),transparent_60%),linear-gradient(120deg,#12100d,#08080a_55%,#151109)] sm:h-56">
              {safeCoverUrl && (
                <Image
                  src={safeCoverUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 1024px"
                  className="object-cover opacity-65"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent"
              />
            </div>

            <div className="px-6 pb-8 sm:px-10">
              <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
                {/* Glowing Avatar */}
                <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border-4 border-neutral-950 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-3xl font-bold text-neutral-950 shadow-[0_0_30px_rgba(245,158,11,0.35)] sm:h-32 sm:w-32">
                  {safeAvatarUrl ? (
                    <Image
                      src={safeAvatarUrl}
                      alt={`${profile.full_name || profile.username}'s profile`}
                      width={128}
                      height={128}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                {isOwner && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(toFormValues(profile));
                      setIsEditing(true);
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.15)] transition hover:border-amber-400 hover:bg-amber-500/20"
                  >
                    <Sparkles size={15} className="text-amber-400" />
                    Edit profile
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      Curate Profile
                    </h2>
                    <p className="mt-1 text-sm text-neutral-400">
                      Refine your presence within the Apsara sanctuary.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="space-y-2 text-xs font-medium uppercase tracking-wider text-neutral-300">
                      Username
                      <input
                        required
                        minLength={3}
                        maxLength={30}
                        pattern="[A-Za-z0-9_]+"
                        title="Use 3 to 30 letters, numbers, or underscores."
                        value={form.username}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            username: event.target.value,
                          }))
                        }
                        className={inputClassName}
                      />
                    </label>

                    <label className="space-y-2 text-xs font-medium uppercase tracking-wider text-neutral-300">
                      Full name
                      <input
                        maxLength={100}
                        value={form.full_name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            full_name: event.target.value,
                          }))
                        }
                        className={inputClassName}
                      />
                    </label>

                    <label className="space-y-2 text-xs font-medium uppercase tracking-wider text-neutral-300 sm:col-span-2">
                      Introduction
                      <textarea
                        rows={4}
                        maxLength={500}
                        value={form.bio}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            bio: event.target.value,
                          }))
                        }
                        className={`${inputClassName} resize-y`}
                        placeholder="Share a reflection or introduction with your circle..."
                      />
                      <span className="block text-right text-xs font-normal text-neutral-500">
                        {form.bio.length}/500
                      </span>
                    </label>

                    <label className="space-y-2 text-xs font-medium uppercase tracking-wider text-neutral-300">
                      Location
                      <input
                        maxLength={100}
                        value={form.location}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            location: event.target.value,
                          }))
                        }
                        className={inputClassName}
                        placeholder="Phnom Penh, Cambodia"
                      />
                    </label>

                    <label className="space-y-2 text-xs font-medium uppercase tracking-wider text-neutral-300">
                      Website
                      <input
                        type="url"
                        maxLength={2048}
                        value={form.website}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            website: event.target.value,
                          }))
                        }
                        className={inputClassName}
                        placeholder="https://apsara.sanctuary"
                      />
                    </label>

                    {/* Avatar Upload */}
                    <label className="space-y-2 text-xs font-medium uppercase tracking-wider text-neutral-300 sm:col-span-2">
                      Avatar Image
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          type="file"
                          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                          disabled={saving || uploadingField !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            void handleImageUpload(file, "avatar");
                          }}
                          className={`${inputClassName} file:mr-4 file:rounded-xl file:border file:border-amber-400/40 file:bg-amber-500/10 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-amber-300 file:transition hover:file:bg-amber-500/20`}
                        />
                      </div>
                      <span className="block text-xs font-normal text-neutral-500">
                        {uploadingField === "avatar_url"
                          ? "Uploading avatar to sanctuary storage..."
                          : "Upload a portrait (JPG, PNG, WebP, AVIF, GIF; max 10 MB)."}
                      </span>
                    </label>

                    {/* Cover Upload */}
                    <label className="space-y-2 text-xs font-medium uppercase tracking-wider text-neutral-300 sm:col-span-2">
                      Cover Banner Image
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          type="file"
                          accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                          disabled={saving || uploadingField !== null}
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            void handleImageUpload(file, "cover");
                          }}
                          className={`${inputClassName} file:mr-4 file:rounded-xl file:border file:border-amber-400/40 file:bg-amber-500/10 file:px-4 file:py-2.5 file:text-xs file:font-semibold file:text-amber-300 file:transition hover:file:bg-amber-500/20`}
                        />
                      </div>
                      <span className="block text-xs font-normal text-neutral-500">
                        {uploadingField === "cover_url"
                          ? "Uploading cover banner..."
                          : "Upload a wide banner (JPG, PNG, WebP, AVIF, GIF; max 10 MB)."}
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-6">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={saving || uploadingField !== null}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving || uploadingField !== null}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-6 py-3 text-sm font-semibold text-neutral-950 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.4)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save profile"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <section>
                    <h2 className="text-2xl font-semibold text-white">
                      {profile.full_name || profile.username}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-amber-400">
                      @{profile.username}
                    </p>
                    <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-neutral-300">
                      {profile.bio ||
                        "This member has chosen to keep their introduction serene and minimal."}
                    </p>
                  </section>

                  <aside className="h-fit rounded-2xl border border-amber-500/20 bg-white/[0.02] p-5 backdrop-blur-md">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-400/90">
                      Sanctuary Details
                    </h3>
                    <div className="mt-4 space-y-4 text-sm">
                      {profile.location && (
                        <p className="flex items-center gap-2.5 text-neutral-300">
                          <MapPin
                            size={16}
                            className="shrink-0 text-amber-400"
                          />
                          {profile.location}
                        </p>
                      )}
                      {profile.website && (
                        <p className="break-all">
                          {safeWebsiteUrl ? (
                            <a
                              href={safeWebsiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-amber-300 transition hover:text-amber-200"
                            >
                              Website
                              <ArrowUpRight size={14} />
                            </a>
                          ) : (
                            <span className="text-neutral-400">
                              {profile.website}
                            </span>
                          )}
                        </p>
                      )}
                      {!profile.location && !profile.website && (
                        <p className="text-neutral-500">
                          No additional details shared yet.
                        </p>
                      )}
                    </div>
                  </aside>
                </div>
              )}
            </div>
          </article>
          <ProfileConnections
            profileId={profile.id}
            username={profile.username}
            viewerId={currentUserId ?? profile.id}
            isOwner={isOwner}
            isPrivate={profile.is_private}
          />
          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Posts</h2>
            <PostFeed
              profileId={profile.id}
              viewerId={currentUserId ?? profile.id}
              canPost={isOwner}
              author={profile}
            />
          </section>
        </>
      )}
    </div>
  );
}
