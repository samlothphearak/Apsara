"use client";

import {
  Fragment,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Trash2,
} from "lucide-react";
import { createClient } from "@/supabase/client";
import { CreatePostComposer } from "@/components/feed/CreatePostComposer";

type MiniProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type CommentView = {
  id: string;
  content: string;
  created_at: string;
  author: MiniProfile;
};

type MediaResourceType = "image" | "video";

type PostMediaView = {
  id: string;
  post_id: string;
  media_url: string;
  media_type: MediaResourceType;
  cloudinary_public_id: string | null;
};

type PostView = {
  id: string;
  user_id: string;
  content: string;
  visibility: "public" | "friends" | "private";
  created_at: string;
  author: MiniProfile;
  likeCount: number;
  liked: boolean;
  comments: CommentView[];
  media: PostMediaView[];
};

type UploadedPostMedia = {
  media_url: string;
  media_type: MediaResourceType;
  cloudinary_public_id: string;
  cloudinary_format: string;
};

type CloudinaryUploadSignature = {
  apiKey: string;
  cloudName: string;
  publicId: string;
  resourceType: MediaResourceType;
  signature: string;
  timestamp: string;
  uploadParams: Record<string, string>;
};

type ComposerAuthor = Pick<
  MiniProfile,
  "username" | "full_name" | "avatar_url"
>;

type PostFeedProps = {
  viewerId: string;
  profileId?: string;
  canPost?: boolean;
  author?: ComposerAuthor;
};

const fallbackProfile: MiniProfile = {
  id: "",
  username: "member",
  full_name: "Apsara member",
  avatar_url: null,
};

const demoAds = [
  {
    title: "Find your people",
    description:
      "Discover new connections and build a community that feels like home.",
    href: "/friends",
    action: "Explore friends",
  },
  {
    title: "Make your profile yours",
    description:
      "Add a photo and a short introduction so friends can recognize you.",
    href: "/settings",
    action: "Update profile",
  },
];

const maxPostMediaFiles = 5;
const maxImageSizeBytes = 10 * 1024 * 1024;
const maxVideoSizeBytes = 50 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getApiError(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.error === "string") return payload.error;
  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return fallback;
}

function isCloudinaryUploadSignature(
  value: unknown,
): value is CloudinaryUploadSignature {
  return (
    isRecord(value) &&
    typeof value.apiKey === "string" &&
    typeof value.cloudName === "string" &&
    typeof value.publicId === "string" &&
    (value.resourceType === "image" || value.resourceType === "video") &&
    typeof value.signature === "string" &&
    typeof value.timestamp === "string" &&
    isRecord(value.uploadParams) &&
    Object.values(value.uploadParams).every(
      (param): param is string => typeof param === "string",
    )
  );
}

async function uploadPostMedia(file: File): Promise<UploadedPostMedia> {
  const resourceType: MediaResourceType = file.type.startsWith("video/")
    ? "video"
    : "image";
  const signatureResponse = await fetch("/api/cloudinary/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resourceType }),
  });
  const signaturePayload: unknown = await signatureResponse.json();

  if (!signatureResponse.ok) {
    throw new Error(
      getApiError(signaturePayload, "Unable to prepare the media upload."),
    );
  }
  if (!isCloudinaryUploadSignature(signaturePayload)) {
    throw new Error("Cloudinary returned an invalid upload signature.");
  }

  const formData = new FormData();
  formData.set("file", file);
  formData.set("api_key", signaturePayload.apiKey);
  formData.set("signature", signaturePayload.signature);
  Object.entries(signaturePayload.uploadParams).forEach(([key, value]) => {
    formData.set(key, value);
  });

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signaturePayload.cloudName}/${resourceType}/upload`,
    { method: "POST", body: formData },
  );
  const uploadPayload: unknown = await uploadResponse.json();

  if (!uploadResponse.ok) {
    throw new Error(
      getApiError(uploadPayload, "Cloudinary could not upload this file."),
    );
  }
  if (
    !isRecord(uploadPayload) ||
    typeof uploadPayload.secure_url !== "string" ||
    uploadPayload.public_id !== signaturePayload.publicId ||
    uploadPayload.resource_type !== resourceType ||
    typeof uploadPayload.format !== "string" ||
    !/^[a-z0-9]+$/i.test(uploadPayload.format)
  ) {
    throw new Error("Cloudinary returned invalid media details.");
  }

  const mediaUrl = new URL(uploadPayload.secure_url);
  if (
    mediaUrl.protocol !== "https:" ||
    mediaUrl.hostname !== "res.cloudinary.com"
  ) {
    throw new Error("Cloudinary returned an insecure media URL.");
  }

  return {
    media_url: mediaUrl.toString(),
    media_type: resourceType,
    cloudinary_public_id: signaturePayload.publicId,
    cloudinary_format: uploadPayload.format,
  };
}

async function deleteCloudinaryMedia(
  assets: Array<Pick<UploadedPostMedia, "media_type" | "cloudinary_public_id">>,
) {
  if (assets.length === 0) return;

  const response = await fetch("/api/cloudinary/destroy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assets: assets.map(({ cloudinary_public_id, media_type }) => ({
        publicId: cloudinary_public_id,
        resourceType: media_type,
      })),
    }),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(getApiError(payload, "Unable to clean up uploaded media."));
  }
}

function Avatar({
  profile,
  size = 40,
}: {
  profile: MiniProfile;
  size?: number;
}) {
  const initials =
    profile.full_name.trim().slice(0, 1).toUpperCase() ||
    profile.username.slice(0, 1).toUpperCase() ||
    "A";

  return profile.avatar_url ? (
    <Image
      src={profile.avatar_url}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="h-10 w-10 rounded-full border border-white/10 object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-amber-400/15 font-semibold text-amber-200"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}
//================================ SponsoredDemoCard ================================
function SponsoredDemoCard({ ad }: { ad: (typeof demoAds)[number] }) {
  return (
    <aside
      aria-label="Sponsored demo advertisement"
      className="overflow-hidden rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-400/[0.12] via-white/[0.04] to-white/[0.02] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-200">
          Sponsored · Demo
        </span>
        <span className="text-xs text-neutral-500">Apsara</span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{ad.title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-neutral-300">
        {ad.description}
      </p>
      <Link
        href={ad.href}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-200/20 bg-sky-200/10 px-3.5 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-200/15"
      >
        {ad.action}
        <ArrowRight size={15} />
      </Link>
    </aside>
  );
}
//================================ PostFeed Component ================================
export default function PostFeed({
  viewerId,
  profileId,
  canPost = false,
  author,
}: PostFeedProps) {
  const supabase = useMemo(() => createClient(), []);
  const [posts, setPosts] = useState<PostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<
    "public" | "friends" | "private"
  >("public");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [busyAction, setBusyAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      let query = supabase
        .from("posts")
        .select("id, user_id, content, visibility, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (profileId) {
        query = query.eq("user_id", profileId);
      } else {
        query = query
          .neq("user_id", viewerId)
          .in("visibility", ["public", "friends"]);
      }

      const { data: postRows, error: postError } = await query;
      if (postError) throw postError;
      if (!postRows?.length) {
        setPosts([]);
        return;
      }

      const postIds = postRows.map((post) => post.id);
      const profileIds = Array.from(
        new Set(postRows.map((post) => post.user_id)),
      );
      const [likeResult, commentResult, mediaResult] = await Promise.all([
        supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds),
        supabase
          .from("comments")
          .select("id, post_id, user_id, content, created_at")
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
          .limit(100),
        supabase
          .from("post_media")
          .select(
            "id, post_id, media_url, media_type, cloudinary_public_id, cloudinary_format",
          )
          .in("post_id", postIds)
          .order("created_at", { ascending: true }),
      ]);

      if (likeResult.error) throw likeResult.error;
      if (commentResult.error) throw commentResult.error;
      if (mediaResult.error) throw mediaResult.error;

      const cloudinaryMedia = (mediaResult.data ?? []).filter(
        (media) => media.cloudinary_public_id,
      );
      const signedMediaUrls = new Map<string, string>();
      if (cloudinaryMedia.length > 0) {
        const response = await fetch("/api/cloudinary/media-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaIds: cloudinaryMedia.map((media) => media.id),
          }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getApiError(payload, "Unable to securely load post media."),
          );
        }
        if (!isRecord(payload) || !Array.isArray(payload.urls)) {
          throw new Error("Cloudinary returned invalid media URLs.");
        }
        for (const item of payload.urls) {
          if (
            !isRecord(item) ||
            typeof item.id !== "string" ||
            typeof item.url !== "string"
          ) {
            throw new Error("Cloudinary returned invalid media URLs.");
          }
          const url = new URL(item.url);
          if (
            url.protocol !== "https:" ||
            url.hostname !== "api.cloudinary.com"
          ) {
            throw new Error("Cloudinary returned an insecure media URL.");
          }
          signedMediaUrls.set(item.id, url.toString());
        }
        if (cloudinaryMedia.some((media) => !signedMediaUrls.has(media.id))) {
          throw new Error("Unable to create a secure link for post media.");
        }
      }

      const commentProfileIds = (commentResult.data ?? []).map(
        (comment) => comment.user_id,
      );
      const allProfileIds = Array.from(
        new Set([...profileIds, ...commentProfileIds]),
      );
      const { data: allProfiles, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", allProfileIds);

      if (allProfilesError) throw allProfilesError;

      const profilesById = new Map(
        (allProfiles ?? []).map((profile) => [
          profile.id,
          profile as MiniProfile,
        ]),
      );
      const commentsByPost = new Map<string, CommentView[]>();
      const mediaByPost = new Map<string, PostMediaView[]>();
      const likesByPost = new Map<string, { count: number; liked: boolean }>();
      for (const like of likeResult.data ?? []) {
        const current = likesByPost.get(like.post_id) ?? {
          count: 0,
          liked: false,
        };
        current.count += 1;
        current.liked ||= like.user_id === viewerId;
        likesByPost.set(like.post_id, current);
      }

      for (const comment of commentResult.data ?? []) {
        const existing = commentsByPost.get(comment.post_id) ?? [];
        existing.push({
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          author: profilesById.get(comment.user_id) ?? fallbackProfile,
        });
        commentsByPost.set(comment.post_id, existing);
      }

      for (const media of mediaResult.data ?? []) {
        const existing = mediaByPost.get(media.post_id) ?? [];
        existing.push({
          ...media,
          media_url: signedMediaUrls.get(media.id) ?? media.media_url,
          media_type: media.media_type as MediaResourceType,
        });
        mediaByPost.set(media.post_id, existing);
      }

      setPosts(
        postRows.map((post) => ({
          ...post,
          visibility: post.visibility as PostView["visibility"],
          author: profilesById.get(post.user_id) ?? fallbackProfile,
          likeCount: likesByPost.get(post.id)?.count ?? 0,
          liked: likesByPost.get(post.id)?.liked ?? false,
          comments: commentsByPost.get(post.id) ?? [],
          media: mediaByPost.get(post.id) ?? [],
        })),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load posts.",
      );
    } finally {
      setLoading(false);
    }
  }, [profileId, supabase, viewerId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPosts();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadPosts]);

  async function createPost(
    event: FormEvent<HTMLFormElement>,
  ): Promise<boolean> {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (mediaFiles.length > maxPostMediaFiles) {
      setErrorMessage(`Attach no more than ${maxPostMediaFiles} photos or videos.`);
      return false;
    }

    const invalidMedia = mediaFiles.find((file) => {
      if (file.type.startsWith("image/")) return file.size > maxImageSizeBytes;
      if (file.type.startsWith("video/")) return file.size > maxVideoSizeBytes;
      return true;
    });
    if (invalidMedia) {
      setErrorMessage(
        "Use image or video files only. Images must be 10 MB or smaller and videos 50 MB or smaller.",
      );
      return false;
    }

    if (!trimmedContent && mediaFiles.length === 0) return false;

    setBusyAction("create");
    setErrorMessage("");
    const uploadedMedia: UploadedPostMedia[] = [];
    let createdPostId: string | null = null;
    try {
      for (const file of mediaFiles) {
        uploadedMedia.push(await uploadPostMedia(file));
      }

      const { data: post, error } = await supabase
        .from("posts")
        .insert({
          user_id: viewerId,
          content: trimmedContent,
          visibility,
        })
        .select("id")
        .single();
      if (error) throw error;
      createdPostId = post.id;

      if (uploadedMedia.length > 0) {
        const { error: mediaError } = await supabase
          .from("post_media")
          .insert(
            uploadedMedia.map((media) => ({
              ...media,
              post_id: post.id,
            })),
          );
        if (mediaError) throw mediaError;
      }

      setContent("");
      setMediaFiles([]);
      await loadPosts();
      return true;
    } catch (error) {
      let message =
        error instanceof Error ? error.message : "Unable to publish this post.";
      if (createdPostId) {
        const { error: rollbackError } = await supabase
          .from("posts")
          .delete()
          .eq("id", createdPostId)
          .eq("user_id", viewerId);
        if (rollbackError) {
          console.error("Could not roll back a post after media upload failed.", rollbackError);
          message += " The post may need to be removed manually.";
        }
      }

      if (uploadedMedia.length > 0) {
        try {
          await deleteCloudinaryMedia(uploadedMedia);
        } catch (cleanupError) {
          console.error("Could not clean up Cloudinary uploads.", cleanupError);
          message += " Some uploaded files may remain in Cloudinary.";
        }
      }

      setErrorMessage(message);
      return false;
    } finally {
      setBusyAction("");
    }
  }

  async function toggleLike(post: PostView) {
    setBusyAction(post.id);
    setErrorMessage("");
    try {
      const result = post.liked
        ? await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", post.id)
            .eq("user_id", viewerId)
        : await supabase
            .from("post_likes")
            .insert({ post_id: post.id, user_id: viewerId });
      if (result.error) throw result.error;
      const liked = !post.liked;
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                liked,
                likeCount: Math.max(
                  0,
                  item.likeCount + (liked ? 1 : -1),
                ),
              }
            : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update your like.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>, postId: string) {
    event.preventDefault();
    const draft = (commentDrafts[postId] ?? "").trim();
    if (!draft) return;

    setBusyAction(`comment-${postId}`);
    setErrorMessage("");
    try {
      const { data: comment, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: viewerId,
          content: draft,
        })
        .select("id, post_id, content, created_at")
        .single();
      if (error) throw error;
      const commentAuthor: MiniProfile = {
        id: viewerId,
        username: author?.username ?? fallbackProfile.username,
        full_name: author?.full_name ?? fallbackProfile.full_name,
        avatar_url: author?.avatar_url ?? null,
      };
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [
                  ...post.comments,
                  {
                    ...comment,
                    author: commentAuthor,
                  },
                ],
              }
            : post,
        ),
      );
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to add your comment.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function sharePost(post: PostView) {
    setErrorMessage("");
    setShareMessage("");
    const url = new URL(window.location.href);
    url.hash = `post-${post.id}`;
    const shareData = {
      title: `${post.author.full_name || post.author.username} on Apsara`,
      text: post.content || "Check out this post on Apsara.",
      url: url.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Post shared.");
        return;
      }

      if (!navigator.clipboard?.writeText) {
        throw new Error("Sharing is not available in this browser.");
      }
      await navigator.clipboard.writeText(shareData.url);
      setShareMessage("Post link copied.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to share this post.",
      );
    }
  }

  async function deletePost(postId: string) {
    setBusyAction(postId);
    setErrorMessage("");
    try {
      const { data: mediaRows, error: mediaError } = await supabase
        .from("post_media")
        .select("media_type, cloudinary_public_id")
        .eq("post_id", postId);
      if (mediaError) throw mediaError;

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", viewerId);
      if (error) throw error;
      setPosts((current) => current.filter((post) => post.id !== postId));

      const cloudinaryAssets = (mediaRows ?? [])
        .filter(
          (media): media is typeof media & {
            cloudinary_public_id: string;
            media_type: MediaResourceType;
          } =>
            typeof media.cloudinary_public_id === "string" &&
            (media.media_type === "image" || media.media_type === "video"),
        )
        .map((media) => ({
          media_type: media.media_type,
          cloudinary_public_id: media.cloudinary_public_id,
        }));
      try {
        await deleteCloudinaryMedia(cloudinaryAssets);
      } catch (cleanupError) {
        console.error("Could not clean up deleted post media.", cleanupError);
        setErrorMessage(
          "Post deleted, but Cloudinary could not remove some attached media.",
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to delete this post.",
      );
    } finally {
      setBusyAction("");
    }
  }
  //=
  return (
    <section className="space-y-4 sm:space-y-5">
      <CreatePostComposer
        canPost={canPost}
        content={content}
        setContent={setContent}
        visibility={visibility}
        setVisibility={setVisibility}
        mediaFiles={mediaFiles}
        setMediaFiles={setMediaFiles}
        busyAction={busyAction}
        errorMessage={errorMessage}
        createPost={createPost}
        author={author}
      />

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      )}
      {shareMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200"
        >
          {shareMessage}
        </p>
      )}

      {loading ? (
        <p
          role="status"
          className="rounded-2xl bg-white/[0.03] p-6 text-sm text-neutral-400"
        >
          Loading posts...
        </p>
      ) : posts.length === 0 ? (
        <div className="space-y-4 sm:space-y-5">
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-neutral-400 sm:p-6">
            {profileId
              ? "No posts to show yet."
              : "No public or friends posts yet. Add friends to see their updates."}
          </p>
          {!profileId && <SponsoredDemoCard ad={demoAds[0]} />}
        </div>
      ) : (
        posts.map((post, index) => (
          <Fragment key={post.id}>
            <article
              id={`post-${post.id}`}
              className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <Link
                  href={`/profile/${encodeURIComponent(post.author.username)}`}
                  aria-label={`View ${post.author.full_name}'s profile`}
                >
                  <Avatar profile={post.author} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/profile/${encodeURIComponent(post.author.username)}`}
                        className="truncate text-sm font-semibold text-white hover:text-amber-300"
                      >
                        {post.author.full_name || post.author.username}
                      </Link>
                      <p className="break-words text-xs text-neutral-500">
                        @{post.author.username} ·{" "}
                        {new Date(post.created_at).toISOString().slice(0, 10)} ·{" "}
                        {post.visibility}
                      </p>
                    </div>
                    {post.user_id === viewerId && (
                      <button
                        type="button"
                        onClick={() => void deletePost(post.id)}
                        disabled={busyAction === post.id}
                        aria-label="Delete post"
                        className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg p-2 text-neutral-500 transition hover:bg-red-400/10 hover:text-red-300"
                      >
                        {busyAction === post.id ? (
                          <MoreHorizontal size={17} />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    )}
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-200 [overflow-wrap:anywhere]">
                    {post.content}
                  </p>
                  {post.media.length > 0 && (
                    <div
                      className={`mt-4 grid gap-2 ${
                        post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                      }`}
                    >
                      {post.media.map((media) => (
                        <div
                          key={media.id}
                          className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/20"
                        >
                          {media.media_type === "video" ? (
                            <video
                              src={media.media_url}
                              controls
                              playsInline
                              preload="metadata"
                              aria-label="Video attached to post"
                              className="aspect-video max-h-[36rem] w-full bg-black object-contain"
                            />
                          ) : (
                            <Image
                              src={media.media_url}
                              alt="Photo attached to post"
                              width={1600}
                              height={1200}
                              unoptimized
                              className={`w-full bg-black/20 object-contain ${
                                post.media.length === 1
                                  ? "max-h-[36rem]"
                                  : "aspect-square"
                              }`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 pt-2 sm:pt-3">
                    <button
                      type="button"
                      onClick={() => void toggleLike(post)}
                      disabled={busyAction === post.id}
                      aria-pressed={post.liked}
                      className={`inline-flex min-h-10 items-center gap-2 text-sm transition ${
                        post.liked
                          ? "text-rose-300"
                          : "text-neutral-400 hover:text-rose-300"
                      }`}
                    >
                      <Heart
                        size={17}
                        fill={post.liked ? "currentColor" : "none"}
                      />
                      {post.likeCount} {post.likeCount === 1 ? "Like" : "Likes"}
                    </button>
                    <span className="inline-flex min-h-10 items-center gap-2 text-sm text-neutral-400">
                      <MessageCircle size={17} />
                      {post.comments.length} Comments
                    </span>
                    <button
                      type="button"
                      onClick={() => void sharePost(post)}
                      className="inline-flex min-h-10 items-center gap-2 text-sm text-neutral-400 transition hover:text-amber-300"
                    >
                      <Share2 size={17} />
                      Share
                    </button>
                  </div>
                  {post.comments.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2.5">
                          <Avatar profile={comment.author} size={30} />
                          <p className="min-w-0 flex-1 break-words rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-neutral-300 [overflow-wrap:anywhere]">
                            <span className="mr-2 font-semibold text-white">
                              {comment.author.full_name ||
                                comment.author.username}
                            </span>
                            {comment.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <form
                    onSubmit={(event) => void addComment(event, post.id)}
                    className="mt-3 flex min-w-0 gap-2"
                  >
                    <input
                      value={commentDrafts[post.id] ?? ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                      maxLength={3000}
                      aria-label="Write a comment"
                      placeholder="Write a comment..."
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400/40"
                    />
                    <button
                      type="submit"
                      disabled={
                        !(commentDrafts[post.id] ?? "").trim() ||
                        busyAction === `comment-${post.id}`
                      }
                      className="min-h-11 shrink-0 rounded-xl border border-white/10 px-2.5 text-sm text-neutral-300 hover:bg-white/[0.05] disabled:opacity-40 sm:px-3"
                    >
                      Comment
                    </button>
                  </form>
                </div>
              </div>
            </article>
            {!profileId && (index + 1) % 5 === 0 && (
              <SponsoredDemoCard
                ad={demoAds[Math.floor(index / 5) % demoAds.length]}
              />
            )}
          </Fragment>
        ))
      )}
    </section>
  );
}
