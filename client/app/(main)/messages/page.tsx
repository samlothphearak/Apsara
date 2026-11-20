"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/supabase/client";

type ConversationSummary = {
  id: string;
  peer: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  lastMessage: string;
  unreadCount: number;
};

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
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
      if (!user) throw new Error("Please sign in again to view your messages.");

      const { data: memberships, error: membershipsError } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .eq("user_id", user.id);
      if (membershipsError) throw membershipsError;

      const conversationIds = Array.from(
        new Set((memberships ?? []).map((member) => member.conversation_id)),
      );
      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      const [membersResult, messagesResult] = await Promise.all([
        supabase
          .from("conversation_members")
          .select("conversation_id, user_id")
          .in("conversation_id", conversationIds),
        supabase
          .from("messages")
          .select("conversation_id, sender_id, content, created_at, read_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (membersResult.error) throw membersResult.error;
      if (messagesResult.error) throw messagesResult.error;

      const peerIds = Array.from(
        new Set(
          (membersResult.data ?? [])
            .filter((member) => member.user_id !== user.id)
            .map((member) => member.user_id),
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

      const profileById = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile]),
      );
      const latestByConversation = new Map<
        string,
        NonNullable<typeof messagesResult.data>[number]
      >();
      const unreadByConversation = new Map<string, number>();
      for (const message of messagesResult.data ?? []) {
        if (!latestByConversation.has(message.conversation_id)) {
          latestByConversation.set(message.conversation_id, message);
        }
        if (message.sender_id !== user.id && !message.read_at) {
          unreadByConversation.set(
            message.conversation_id,
            (unreadByConversation.get(message.conversation_id) ?? 0) + 1,
          );
        }
      }

      const seenConversationIds = new Set<string>();
      const summaries = (memberships ?? []).flatMap((membership) => {
        const peerId = (membersResult.data ?? []).find(
          (member) =>
            member.conversation_id === membership.conversation_id &&
            member.user_id !== user.id,
        )?.user_id;
        const peer = peerId ? profileById.get(peerId) : null;
        if (!peer || seenConversationIds.has(membership.conversation_id)) return [];
        seenConversationIds.add(membership.conversation_id);
        return [
          {
            id: membership.conversation_id,
            peer,
            lastMessage:
              latestByConversation.get(membership.conversation_id)?.content ??
              "Start a conversation",
            unreadCount: unreadByConversation.get(membership.conversation_id) ?? 0,
          },
        ];
      });

      setConversations(summaries);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load messages.",
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <MessageCircle size={22} />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Private conversations
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-white">Messages</h1>
        </div>
      </header>

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-red-400/10 p-4 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
      {loading ? (
        <p role="status" className="rounded-xl bg-white/[0.03] p-5 text-sm text-neutral-400">
          Loading conversations...
        </p>
      ) : conversations.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-neutral-400">
          Your conversations will appear here. Become friends with someone to message them from their profile.
        </p>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
              >
                {conversation.peer.avatar_url ? (
                  <Image
                    src={conversation.peer.avatar_url}
                    alt=""
                    width={48}
                    height={48}
                    unoptimized
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 font-semibold text-amber-200">
                    {(conversation.peer.full_name || conversation.peer.username)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">
                    {conversation.peer.full_name || conversation.peer.username}
                  </span>
                  <span className="block truncate text-sm text-neutral-400">
                    {conversation.lastMessage}
                  </span>
                </span>
                {conversation.unreadCount > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-neutral-950">
                    {conversation.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
