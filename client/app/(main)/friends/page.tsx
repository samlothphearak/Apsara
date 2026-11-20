"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UserRoundMinus, Users, X } from "lucide-react";
import { createClient } from "@/supabase/client";

type MiniProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

type Connection = {
  friendship: Friendship;
  profile: MiniProfile;
};

function ConnectionCard({
  connection,
  kind,
  onAction,
  busy,
}: {
  connection: Connection;
  kind: "incoming" | "outgoing" | "friend";
  onAction: (
    connection: Connection,
    action: "accept" | "decline" | "remove" | "message",
  ) => void;
  busy: boolean;
}) {
  const { profile } = connection;
  const initials = (profile.full_name || profile.username)
    .slice(0, 1)
    .toUpperCase();

  return (
    <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <Link
        href={`/profile/${encodeURIComponent(profile.username)}`}
        className="flex min-w-0 items-center gap-3"
      >
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/15 font-semibold text-amber-200">
            {initials}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {profile.full_name || profile.username}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            @{profile.username}
          </span>
        </span>
      </Link>
      <div className="flex flex-wrap gap-2">
        {kind === "incoming" ? (
          <>
            <button
              type="button"
              onClick={() => onAction(connection, "accept")}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
            >
              <Check size={15} /> Accept
            </button>
            <button
              type="button"
              onClick={() => onAction(connection, "decline")}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 disabled:opacity-50"
            >
              <X size={15} /> Decline
            </button>
          </>
        ) : kind === "outgoing" ? (
          <button
            type="button"
            onClick={() => onAction(connection, "decline")}
            disabled={busy}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300 disabled:opacity-50"
          >
            Request sent · Cancel
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onAction(connection, "message")}
              disabled={busy}
              className="rounded-xl bg-amber-400 px-3 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50"
            >
              Message
            </button>
            <button
              type="button"
              onClick={() => onAction(connection, "remove")}
              disabled={busy}
              aria-label={`Remove ${profile.username} as a friend`}
              className="rounded-xl border border-white/10 p-2 text-neutral-400 hover:text-rose-300 disabled:opacity-50"
            >
              <UserRoundMinus size={16} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<Connection[]>([]);
  const [outgoing, setOutgoing] = useState<Connection[]>([]);
  const [friends, setFriends] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        router.replace("/login");
        return;
      }
      setViewerId(user.id);

      const { data: rows, error } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status, created_at")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });
      if (error) throw error;

      const relations = (rows ?? []) as Friendship[];
      const peerIds = Array.from(
        new Set(
          relations.map((row) =>
            row.requester_id === user.id ? row.addressee_id : row.requester_id,
          ),
        ),
      );
      const { data: profiles, error: profilesError } =
        peerIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .in("id", peerIds)
          : { data: [], error: null };
      if (profilesError) throw profilesError;

      const byId = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile as MiniProfile]),
      );
      const mapped = relations.flatMap((friendship) => {
        const peerId =
          friendship.requester_id === user.id
            ? friendship.addressee_id
            : friendship.requester_id;
        const profile = byId.get(peerId);
        return profile ? [{ friendship, profile }] : [];
      });

      setIncoming(
        mapped.filter(
          ({ friendship }) =>
            friendship.status === "pending" &&
            friendship.addressee_id === user.id,
        ),
      );
      setOutgoing(
        mapped.filter(
          ({ friendship }) =>
            friendship.status === "pending" &&
            friendship.requester_id === user.id,
        ),
      );
      setFriends(
        mapped.filter(({ friendship }) => friendship.status === "accepted"),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load your friends.",
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  async function handleAction(
    connection: Connection,
    action: "accept" | "decline" | "remove" | "message",
  ) {
    setBusyId(connection.friendship.id);
    setErrorMessage("");
    try {
      if (
        action === "accept" ||
        (action === "decline" &&
          connection.friendship.addressee_id === viewerId)
      ) {
        const { error } = await supabase.rpc("respond_to_friend_request", {
          request_id: connection.friendship.id,
          accept_request: action === "accept",
        });
        if (error) throw error;
      } else if (action === "message") {
        const { data, error } = await supabase.rpc(
          "start_friend_conversation",
          {
            target_user_id: connection.profile.id,
          },
        );
        if (error) throw error;
        router.push(`/messages/${data}`);
        return;
      } else {
        const { error } = await supabase
          .from("friendships")
          .delete()
          .eq("id", connection.friendship.id);
        if (error) throw error;
      }
      await reload();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update this connection.",
      );
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
          <Users size={22} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Your community
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Friends</h1>
        </div>
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl bg-red-400/10 p-4 text-sm text-red-200"
        >
          {errorMessage}
        </p>
      )}
      {loading ? (
        <p
          role="status"
          className="rounded-xl bg-white/[0.03] p-5 text-sm text-neutral-400"
        >
          Loading connections...
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Friend requests{" "}
              <span className="text-sm text-neutral-500">
                ({incoming.length})
              </span>
            </h2>
            {incoming.length === 0 ? (
              <p className="rounded-xl border border-white/10 p-4 text-sm text-neutral-500">
                You’re all caught up.
              </p>
            ) : (
              incoming.map((connection) => (
                <ConnectionCard
                  key={connection.friendship.id}
                  connection={connection}
                  kind="incoming"
                  onAction={(item, action) => void handleAction(item, action)}
                  busy={busyId === connection.friendship.id}
                />
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Sent requests{" "}
              <span className="text-sm text-neutral-500">
                ({outgoing.length})
              </span>
            </h2>
            {outgoing.length === 0 ? (
              <p className="rounded-xl border border-white/10 p-4 text-sm text-neutral-500">
                No pending requests.
              </p>
            ) : (
              outgoing.map((connection) => (
                <ConnectionCard
                  key={connection.friendship.id}
                  connection={connection}
                  kind="outgoing"
                  onAction={(item, action) => void handleAction(item, action)}
                  busy={busyId === connection.friendship.id}
                />
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">
              Your friends{" "}
              <span className="text-sm text-neutral-500">
                ({friends.length})
              </span>
            </h2>
            {friends.length === 0 ? (
              <p className="rounded-xl border border-white/10 p-4 text-sm text-neutral-500">
                You haven’t connected with anyone yet. Visit a profile to send a
                friend request.
              </p>
            ) : (
              friends.map((connection) => (
                <ConnectionCard
                  key={connection.friendship.id}
                  connection={connection}
                  kind="friend"
                  onAction={(item, action) => void handleAction(item, action)}
                  busy={busyId === connection.friendship.id}
                />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
