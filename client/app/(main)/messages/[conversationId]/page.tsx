"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { createClient } from "@/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type PeerProfile = {
  username: string;
  full_name: string;
  avatar_url: string | null;
};

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [peer, setPeer] = useState<PeerProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadThread = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
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

      const { data: members, error: membersError } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId);
      if (membersError) throw membersError;
      const otherUserId = members?.find((member) => member.user_id !== user.id)?.user_id;
      if (!otherUserId) throw new Error("This conversation could not be found.");

      const [profileResult, messageResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", otherUserId)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id, sender_id, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(100),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (messageResult.error) throw messageResult.error;
      if (!profileResult.data) throw new Error("The other member’s profile is unavailable.");

      setPeer(profileResult.data);
      const nextMessages = (messageResult.data ?? []) as Message[];
      setMessages((currentMessages) => {
        const sameMessages =
          currentMessages.length === nextMessages.length &&
          currentMessages.every(
            (message, index) => message.id === nextMessages[index]?.id,
          );
        return sameMessages ? currentMessages : nextMessages;
      });

      const { error: readError } = await supabase.rpc("mark_conversation_read", {
        target_conversation_id: conversationId,
      });
      if (readError) throw readError;
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load this conversation.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [conversationId, router, supabase]);

  useEffect(() => {
    const initialTimeoutId = window.setTimeout(() => {
      void loadThread(true);
    }, 0);
    const intervalId = window.setInterval(() => {
      void loadThread();
    }, 5000);
    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !viewerId) return;

    setSending(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: viewerId,
        content,
      });
      if (error) throw error;
      setDraft("");
      await loadThread();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to send your message.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col rounded-2xl border border-white/10 bg-white/[0.03]">
      <header className="flex items-center gap-3 border-b border-white/10 p-4">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="rounded-lg p-2 text-neutral-400 hover:bg-white/[0.05] hover:text-white"
        >
          <ArrowLeft size={18} />
        </Link>
        {peer?.avatar_url ? (
          <Image
            src={peer.avatar_url}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/15 font-semibold text-amber-200">
            {(peer?.full_name || peer?.username || "A").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-sm font-semibold text-white">
            {peer?.full_name || peer?.username || "Conversation"}
          </h1>
          {peer?.username && (
            <Link
              href={`/profile/${encodeURIComponent(peer.username)}`}
              className="text-xs text-neutral-500 hover:text-amber-300"
            >
              @{peer.username}
            </Link>
          )}
        </div>
      </header>

      {errorMessage && (
        <p role="alert" className="m-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <p role="status" className="text-sm text-neutral-400">
            Loading conversation...
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">
            Say hello to start the conversation.
          </p>
        ) : (
          messages.map((message) => {
            const ownMessage = message.sender_id === viewerId;
            return (
              <div
                key={message.id}
                className={`flex ${ownMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    ownMessage
                      ? "rounded-br-md bg-amber-400 text-neutral-950"
                      : "rounded-bl-md bg-white/[0.07] text-neutral-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.content}
                  </p>
                  <time className="mt-1 block text-right text-[10px] opacity-60">
                    {new Date(message.created_at).toISOString().slice(0, 16).replace("T", " ")}
                  </time>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={5000}
          rows={2}
          placeholder="Write a message..."
          aria-label="Write a message"
          className="min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-amber-400/40"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending || !viewerId}
          className="self-end inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-neutral-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
          <span className="hidden sm:inline">{sending ? "Sending..." : "Send"}</span>
        </button>
      </form>
    </div>
  );
}
