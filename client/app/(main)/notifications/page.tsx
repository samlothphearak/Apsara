"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Check, Heart, MessageCircle, UserPlus } from "lucide-react";
import { createClient } from "@/supabase/client";

type ActorProfile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
};

type NotificationRow = {
  id: string;
  actor_id: string | null;
  type: string;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
  actor: ActorProfile | null;
};

function notificationMessage(type: string, name: string) {
  switch (type) {
    case "friend_request":
      return `${name} sent you a friend request.`;
    case "friend_accepted":
      return `${name} accepted your friend request.`;
    case "follow":
      return `${name} started following you.`;
    case "post_like":
      return `${name} liked your post.`;
    case "post_comment":
      return `${name} commented on your post.`;
    case "message":
      return `${name} sent you a message.`;
    default:
      return `${name} interacted with you.`;
  }
}

function NotificationIcon({ type }: { type: string }) {
  const Icon =
    type === "friend_request" || type === "friend_accepted" || type === "follow"
      ? UserPlus
      : type === "post_comment" || type === "message"
        ? MessageCircle
        : Heart;
  return <Icon size={17} />;
}

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
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
      if (!user) throw new Error("Please sign in again to view notifications.");

      const { data: rows, error } = await supabase
        .from("notifications")
        .select("id, actor_id, type, entity_id, read_at, created_at")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const actorIds = Array.from(
        new Set((rows ?? []).flatMap((row) => row.actor_id ?? [])),
      );
      const { data: profiles, error: profilesError } =
        actorIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .in("id", actorIds)
          : { data: [], error: null };
      if (profilesError) throw profilesError;
      const actors = new Map(
        (profiles ?? []).map((profile) => [
          profile.id,
          profile as ActorProfile,
        ]),
      );
      setNotifications(
        (rows ?? []).map((row) => ({
          ...row,
          actor: row.actor_id ? (actors.get(row.actor_id) ?? null) : null,
        })),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load notifications.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  async function markAllRead() {
    setBusyId("all");
    setErrorMessage("");
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in again.");

      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (error) throw error;
      await reload();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to mark notifications read.",
      );
    } finally {
      setBusyId("");
    }
  }

  async function markNotificationRead(notification: NotificationRow) {
    if (notification.read_at) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", notification.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read_at: readAt } : item,
      ),
    );
  }

  async function answerRequest(notification: NotificationRow, accept: boolean) {
    if (!notification.entity_id) return;
    setBusyId(notification.id);
    setErrorMessage("");
    try {
      const { error } = await supabase.rpc("respond_to_friend_request", {
        request_id: notification.entity_id,
        accept_request: accept,
      });
      if (error) throw error;
      await reload();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to respond to request.",
      );
    } finally {
      setBusyId("");
    }
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
            <Bell size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Stay connected
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-white">
              Notifications
            </h1>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={busyId === "all"}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-neutral-300 hover:bg-white/[0.05] disabled:opacity-50"
          >
            <Check size={16} />
            Mark all read
          </button>
        )}
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
          Loading notifications...
        </p>
      ) : notifications.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-neutral-400">
          You’re all caught up. New activity will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const actor = notification.actor;
            const actorName = actor?.full_name || actor?.username || "A member";
            const href =
              notification.type === "friend_request"
                ? "/friends"
                : notification.type === "post_like" ||
                    notification.type === "post_comment"
                  ? "/feed"
                  : notification.type === "message" && notification.entity_id
                    ? `/messages/${notification.entity_id}`
                    : actor
                      ? `/profile/${encodeURIComponent(actor.username)}`
                      : "/notifications";

            return (
              <li
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.read_at
                    ? "border-white/10 bg-white/[0.02]"
                    : "border-amber-400/20 bg-amber-400/[0.05]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Link
                    href={
                      actor
                        ? `/profile/${encodeURIComponent(actor.username)}`
                        : href
                    }
                    onClick={() => void markNotificationRead(notification)}
                  >
                    {actor?.avatar_url ? (
                      <Image
                        src={actor.avatar_url}
                        alt=""
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15 text-amber-200">
                        <NotificationIcon type={notification.type} />
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={href}
                      onClick={() => void markNotificationRead(notification)}
                      className="text-sm text-neutral-200 hover:text-white"
                    >
                      {notificationMessage(notification.type, actorName)}
                    </Link>
                    <p className="mt-1 text-xs text-neutral-500">
                      {new Date(notification.created_at)
                        .toISOString()
                        .slice(0, 10)}
                    </p>
                    {notification.type === "friend_request" &&
                      notification.entity_id &&
                      !notification.read_at && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void answerRequest(notification, true)
                            }
                            disabled={busyId === notification.id}
                            className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-neutral-950 disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void answerRequest(notification, false)
                            }
                            disabled={busyId === notification.id}
                            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-300 disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                  </div>
                  {!notification.read_at && (
                    <span
                      aria-label="Unread"
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300"
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
