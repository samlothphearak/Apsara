"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UserPlus, UserRoundMinus, Users } from "lucide-react";
import { createClient } from "@/supabase/client";

type ConnectionProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
};

type ProfileConnectionsProps = {
  profileId: string;
  username: string;
  viewerId: string;
  isOwner: boolean;
  isPrivate: boolean;
};

type ListTab = "followers" | "following" | "friends";

export default function ProfileConnections({
  profileId,
  username,
  viewerId,
  isOwner,
  isPrivate,
}: ProfileConnectionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [counts, setCounts] = useState({
    followers: 0,
    following: 0,
    friends: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendship, setFriendship] = useState<FriendshipRow | null>(null);
  const [activeList, setActiveList] = useState<ListTab | null>(null);
  const [people, setPeople] = useState<ConnectionProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadConnections = useCallback(async () => {
    const [
      followersResult,
      followingResult,
      friendsResult,
      followResult,
      friendshipResult,
    ] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", profileId),
      supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", profileId),
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`),
      supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", viewerId)
        .eq("following_id", profileId)
        .maybeSingle(),
      supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .or(
          `and(requester_id.eq.${viewerId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${viewerId})`,
        )
        .in("status", ["pending", "accepted"])
        .limit(1),
    ]);

    const resultError =
      followersResult.error ||
      followingResult.error ||
      friendsResult.error ||
      followResult.error ||
      friendshipResult.error;
    if (resultError) throw resultError;

    setCounts({
      followers: followersResult.count ?? 0,
      following: followingResult.count ?? 0,
      friends: friendsResult.count ?? 0,
    });
    setIsFollowing(Boolean(followResult.data));
    setFriendship(friendshipResult.data?.[0] ?? null);
  }, [profileId, supabase, viewerId]);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      void loadConnections().catch((error: unknown) => {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load connections.",
          );
        }
      });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadConnections]);

  async function loadPeople(tab: ListTab) {
    setActiveList(tab);
    setPeople([]);
    setErrorMessage("");

    try {
      let ids: string[] = [];
      if (tab === "followers") {
        const { data, error } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("following_id", profileId);
        if (error) throw error;
        ids = (data ?? []).map((row) => row.follower_id);
      } else if (tab === "following") {
        const { data, error } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", profileId);
        if (error) throw error;
        ids = (data ?? []).map((row) => row.following_id);
      } else {
        const { data, error } = await supabase
          .from("friendships")
          .select("requester_id, addressee_id")
          .eq("status", "accepted")
          .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`);
        if (error) throw error;
        ids = (data ?? []).map((row) =>
          row.requester_id === profileId ? row.addressee_id : row.requester_id,
        );
      }

      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length === 0) {
        setPeople([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", uniqueIds);
      if (error) throw error;
      setPeople((data ?? []) as ConnectionProfile[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load this list.",
      );
    }
  }

  async function toggleFollow() {
    setBusy(true);
    setErrorMessage("");
    try {
      const result = isFollowing
        ? await supabase
            .from("follows")
            .delete()
            .eq("follower_id", viewerId)
            .eq("following_id", profileId)
        : await supabase
            .from("follows")
            .insert({ follower_id: viewerId, following_id: profileId });
      if (result.error) throw result.error;
      await loadConnections();
      if (activeList) await loadPeople(activeList);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your follow.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendFriendRequest() {
    setBusy(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.rpc("send_friend_request", {
        target_user_id: profileId,
      });
      if (error) throw error;
      await loadConnections();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send friend request.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function respondToFriendRequest(accept: boolean) {
    if (!friendship) return;
    setBusy(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.rpc("respond_to_friend_request", {
        request_id: friendship.id,
        accept_request: accept,
      });
      if (error) throw error;
      await loadConnections();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to respond to request.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeFriend() {
    if (!friendship) return;
    setBusy(true);
    setErrorMessage("");
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship.id);
      if (error) throw error;
      await loadConnections();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to remove friend.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function startConversation() {
    setBusy(true);
    setErrorMessage("");
    try {
      const { data, error } = await supabase.rpc("start_friend_conversation", {
        target_user_id: profileId,
      });
      if (error) throw error;
      router.push(`/messages/${data}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start a conversation.",
      );
    } finally {
      setBusy(false);
    }
  }

  const incomingRequest =
    friendship?.status === "pending" && friendship.addressee_id === viewerId;
  const outgoingRequest =
    friendship?.status === "pending" && friendship.requester_id === viewerId;
  const isFriend = friendship?.status === "accepted";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-5">
          {(["followers", "following", "friends"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => void loadPeople(tab)}
              className="text-left text-sm text-neutral-400 transition hover:text-amber-300"
            >
              <span className="font-semibold text-white">{counts[tab]}</span>{" "}
              {tab}
            </button>
          ))}
        </div>

        {!isOwner && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void toggleFollow()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 px-3.5 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-400/10 disabled:opacity-50"
            >
              {isFollowing ? <Check size={16} /> : <UserPlus size={16} />}
              {isFollowing ? "Following" : "Follow"}
            </button>

            {isFriend ? (
              <>
                <button
                  type="button"
                  onClick={() => void startConversation()}
                  disabled={busy}
                  className="rounded-xl bg-amber-400 px-3.5 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:opacity-50"
                >
                  Message
                </button>
                <button
                  type="button"
                  onClick={() => void removeFriend()}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 hover:bg-white/[0.05] disabled:opacity-50"
                >
                  <UserRoundMinus size={16} />
                  Unfriend
                </button>
              </>
            ) : incomingRequest ? (
              <>
                <button
                  type="button"
                  onClick={() => void respondToFriendRequest(true)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3.5 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
                >
                  <Check size={16} />
                  Accept request
                </button>
                <button
                  type="button"
                  onClick={() => void respondToFriendRequest(false)}
                  disabled={busy}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 disabled:opacity-50"
                >
                  Decline
                </button>
              </>
            ) : outgoingRequest ? (
              <button
                type="button"
                onClick={async () => {
                  if (!friendship) return;
                  setBusy(true);
                  setErrorMessage("");
                  try {
                    const { error } = await supabase
                      .from("friendships")
                      .delete()
                      .eq("id", friendship.id);
                    if (error) throw error;
                    await loadConnections();
                  } catch (error) {
                    setErrorMessage(
                      error instanceof Error
                        ? error.message
                        : "Unable to cancel the friend request.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="rounded-xl border border-white/10 px-3.5 py-2 text-sm text-neutral-300 disabled:opacity-50"
              >
                Cancel request
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void sendFriendRequest()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3.5 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:opacity-50"
              >
                <Users size={16} />
                Add friend
              </button>
            )}
          </div>
        )}
      </div>

      {isPrivate && !isOwner && !isFriend && (
        <p className="mt-4 text-sm text-neutral-400">
          This member has a private profile. Become friends to see friends-only
          posts.
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      {activeList && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold capitalize text-white">
              {activeList}
            </h3>
            <button
              type="button"
              onClick={() => setActiveList(null)}
              className="text-xs text-neutral-500 hover:text-white"
            >
              Close
            </button>
          </div>
          {people.length === 0 ? (
            <p className="text-sm text-neutral-500">No {activeList} yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {people.map((person) => (
                <li key={person.id}>
                  <Link
                    href={`/profile/${encodeURIComponent(person.username)}`}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
                  >
                    {person.avatar_url ? (
                      <Image
                        src={person.avatar_url}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400/15 text-xs font-semibold text-amber-200">
                        {(person.full_name || person.username)
                          .slice(0, 1)
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">
                        {person.full_name || person.username}
                      </span>
                      <span className="block truncate text-xs text-neutral-500">
                        @{person.username}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <span className="sr-only">Profile for @{username}</span>
    </section>
  );
}
