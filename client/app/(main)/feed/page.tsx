"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import PostFeed from "@/components/social/post-feed";

type FeedAuthor = {
  username: string;
  full_name: string;
  avatar_url: string | null;
};

export default function FeedPage() {
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [author, setAuthor] = useState<FeedAuthor>();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadViewer() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) {
          router.replace("/login");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;

        if (active) {
          setViewerId(user.id);
          setAuthor(profile ?? undefined);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your feed.",
          );
        }
      }
    }

    void loadViewer();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Your community
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Home feed
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Share updates and catch up on posts you’re allowed to see.
        </p>
      </header>
      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl bg-red-400/10 p-4 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      )}
      {viewerId ? (
        <PostFeed viewerId={viewerId} canPost author={author} />
      ) : (
        !errorMessage && (
          <p
            role="status"
            className="rounded-xl bg-white/[0.03] p-5 text-sm text-neutral-400"
          >
            Loading your feed...
          </p>
        )
      )}
    </div>
  );
}
