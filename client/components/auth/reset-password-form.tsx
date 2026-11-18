"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";

export default function ResetPasswordForm() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold text-slate-900">
        Create a new password
      </h1>
      <p className="mb-6 mt-2 text-sm text-slate-500">
        Choose a secure password for your Socially account.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <input
          required
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="form-input"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        {success && (
          <p className="text-sm text-green-600">
            Password updated successfully.
          </p>
        )}

        <button
          disabled={loading || success}
          className="w-full rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Updating..." : "Update password"}
        </button>

        {success && (
          <a href="/login" className="block text-center text-blue-600">
            Return to login
          </a>
        )}
      </form>
    </div>
  );
}
