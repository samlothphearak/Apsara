"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
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

        const { data, error } = await supabase
          .from("profiles")
          .select("id, is_private")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Your profile could not be found.");
        if (active) {
          setUserId(user.id);
          setIsPrivate(data.is_private);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load settings.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function updatePrivacy(nextValue: boolean) {
    if (!userId) return;
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_private: nextValue })
        .eq("id", userId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Your profile could not be found.");
      setIsPrivate(nextValue);
      setSuccessMessage("Your privacy setting has been saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update privacy.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Account preferences
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Settings</h1>
      </header>

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-red-400/10 p-4 text-sm text-red-200">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p role="status" className="rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200">
          {successMessage}
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            {isPrivate ? <LockKeyhole size={20} /> : <ShieldCheck size={20} />}
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-white">Private profile</h2>
            <p className="mt-1 text-sm leading-6 text-neutral-400">
              When enabled, only you and accepted friends can see your posts.
              Public profiles can share public posts with all signed-in members.
            </p>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="text-sm text-neutral-300">
                {loading ? "Loading..." : isPrivate ? "Private" : "Public"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isPrivate}
                aria-label="Private profile"
                onClick={() => void updatePrivacy(!isPrivate)}
                disabled={loading || saving || !userId}
                className={`relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isPrivate ? "bg-amber-400" : "bg-neutral-700"
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                    isPrivate ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}