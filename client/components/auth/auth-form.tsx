"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/supabase/client";
import { getSafeNextPath } from "@/supabase/redirect";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  User,
} from "lucide-react";

type AuthMode = "login" | "register" | "forgot";
type OAuthProvider = "google" | "github";

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 429
  ) {
    return "Supabase has temporarily rate-limited this request. Wait for the limit to reset before trying again. For signup emails, configure custom SMTP and check Authentication > Rate Limits in your Supabase project.";
  }

  return error instanceof Error ? error.message : fallback;
}

function getCallbackErrorMessage(error?: string) {
  if (error === "verification_failed") {
    return "That verification link is invalid or has expired. Please register again or sign in.";
  }

  if (error === "oauth_callback_failed") {
    return "We couldn't complete sign in. Please try again.";
  }

  return "";
}

function ApsaraEmblem() {
  return (
    <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
      {/* Subtle Golden Ambient Glow */}
      <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />

      {/* Outer Sacred Ring */}
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-500/15 via-neutral-900 to-neutral-950 shadow-[0_0_25px_rgba(245,158,11,0.18)]">
        {/* Inner Corner Filigree Accents */}
        <div className="absolute inset-1.5 rounded-xl border border-amber-300/15" />

        {/* Stylized Apsara Crown & Lotus Silhouette SVG */}
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]"
        >
          <defs>
            <linearGradient
              id="apsaraGold"
              x1="12"
              y1="6"
              x2="52"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>

          {/* Sacred Halo Arch */}
          <path
            d="M14 42C10.5 36.5 10.5 28.5 14.5 22.5C19 15.8 25.5 13 32 13C38.5 13 45 15.8 49.5 22.5C53.5 28.5 53.5 36.5 50 42"
            stroke="url(#apsaraGold)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />

          {/* Tiered Khmer Spire Crown (Mokot) */}
          <path d="M32 6L34.2 13.5H29.8L32 6Z" fill="url(#apsaraGold)" />
          <path
            d="M27.5 16.5H36.5L38 20H26L27.5 16.5Z"
            fill="url(#apsaraGold)"
          />
          <path
            d="M24.5 21.5H39.5L41 24.5H23L24.5 21.5Z"
            fill="url(#apsaraGold)"
          />

          {/* Graceful Apsara Face & Headpiece */}
          <path
            d="M27 26C27 29.5 29.2 32.5 32 32.5C34.8 32.5 37 29.5 37 26"
            stroke="url(#apsaraGold)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Ornate Ear & Shoulder Drapes */}
          <path
            d="M23.5 25.5C21.5 27.5 21 30.5 22.5 33"
            stroke="url(#apsaraGold)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M40.5 25.5C42.5 27.5 43 30.5 41.5 33"
            stroke="url(#apsaraGold)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Dancing Graceful Arms & Mudra */}
          <path
            d="M26 36.5C21 37.5 16.5 35.5 14.5 31.5C13.8 30 14.5 28.5 15.8 28.8"
            stroke="url(#apsaraGold)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M38 36.5C43 37.5 47.5 35.5 49.5 31.5C50.2 30 49.5 28.5 48.2 28.8"
            stroke="url(#apsaraGold)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Royal Collar & Silk Waist */}
          <path
            d="M26.5 36.5L32 41L37.5 36.5"
            stroke="url(#apsaraGold)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Lotus Pedestal Base */}
          <path
            d="M20 49C24 46.5 28 45.5 32 45.5C36 45.5 40 46.5 44 49C40 51.5 36 52.5 32 52.5C28 52.5 24 51.5 20 49Z"
            stroke="url(#apsaraGold)"
            strokeWidth="1.6"
            fill="url(#apsaraGold)"
            fillOpacity="0.2"
          />
          <path
            d="M25 54.5C27.5 55.8 29.8 56.5 32 56.5C34.2 56.5 36.5 55.8 39 54.5"
            stroke="url(#apsaraGold)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-neutral-200"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function AuthForm({
  mode,
  initialError,
  nextPath,
}: {
  mode: AuthMode;
  initialError?: string;
  nextPath?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(() =>
    getCallbackErrorMessage(initialError),
  );

  const isBusy = loading || oauthLoading !== null;

  function getNextPath() {
    return getSafeNextPath(nextPath);
  }

  async function handleOAuthLogin(provider: OAuthProvider) {
    setOauthLoading(provider);
    setMessage("");
    setError("");

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", getNextPath());

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw error;
    } catch (err) {
      setError(getAuthErrorMessage(err, `Unable to continue with ${provider}.`));
      setOauthLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "register") {
        if (name.trim().length < 2) {
          throw new Error("Please enter your full name.");
        }

        const confirmationUrl = new URL(
          "/auth/confirm",
          window.location.origin,
        );
        confirmationUrl.searchParams.set("next", getNextPath());

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: confirmationUrl.toString(),
            data: {
              full_name: name.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace(getNextPath());
          router.refresh();
        } else {
          setMessage(
            "Account created! Please check your email to verify your account.",
          );
        }
      }

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) throw error;

        router.replace(getNextPath());
        router.refresh();
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          },
        );

        if (error) throw error;

        setMessage("Password reset instructions have been sent to your email.");
      }
    } catch (err) {
      setError(getAuthErrorMessage(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  const config = {
    register: {
      title: "Begin Your Journey",
      description: "Create an exclusive account to enter the world of Apsara.",
      submitText: "Create account",
    },
    forgot: {
      title: "Recover Access",
      description: "Enter your email to receive a private recovery link.",
      submitText: "Send reset link",
    },
    login: {
      title: "Welcome Back",
      description: "Sign in to continue your Apsara experience.",
      submitText: "Enter Apsara",
    },
  }[mode];

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/20 bg-neutral-950/90 p-8 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:p-10">
      {/* Top Champagne Hairline Highlight */}
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      {/* Subtle Ambient Corner Light */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Header & Apsara Emblem */}
      <div className="relative mb-8 text-center">
        <ApsaraEmblem />

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-400/90">
          Apsara
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {config.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          {config.description}
        </p>
      </div>

      {/* Social OAuth Buttons (Login & Register) */}
      {mode !== "forgot" && (
        <div className="relative mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleOAuthLogin("google")}
              className="group flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-neutral-200 transition-all hover:border-amber-400/40 hover:bg-white/[0.07] hover:text-white active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <GoogleIcon />
              )}
              <span>Google</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleOAuthLogin("github")}
              className="group flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-neutral-200 transition-all hover:border-amber-400/40 hover:bg-white/[0.07] hover:text-white active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
            >
              {oauthLoading === "github" ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <GitHubIcon />
              )}
              <span>GitHub</span>
            </button>
          </div>

          {/* Ornamental Divider */}
          <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="mx-3 shrink text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              or with email
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>
        </div>
      )}

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} className="relative space-y-5">
        {mode === "register" && (
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-300"
            >
              Full name
            </label>
            <div className="group relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
              <input
                id="name"
                type="text"
                required
                disabled={isBusy}
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sokha Chan"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 transition-all focus:border-amber-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-amber-400/10 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-medium uppercase tracking-wider text-neutral-300"
          >
            Email address
          </label>
          <div className="group relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
            <input
              id="email"
              required
              disabled={isBusy}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-neutral-600 transition-all focus:border-amber-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-amber-400/10 disabled:opacity-50"
            />
          </div>
        </div>

        {mode !== "forgot" && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wider text-neutral-300"
              >
                Password
              </label>
              {mode === "login" && (
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-amber-400/90 transition-colors hover:text-amber-300"
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <div className="group relative">
              <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-colors group-focus-within:text-amber-400" />
              <input
                id="password"
                required
                disabled={isBusy}
                type={showPassword ? "text" : "password"}
                minLength={8}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-neutral-600 transition-all focus:border-amber-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-4 focus:ring-amber-400/10 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-neutral-500 transition-colors hover:bg-white/5 hover:text-amber-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/40 p-3.5 text-sm text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {message && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-sm text-emerald-300"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}

        {/* Gold Foil Submit Button */}
        <button
          type="submit"
          disabled={isBusy}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-5 py-3.5 text-sm font-semibold text-neutral-950 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.4)] transition-all hover:brightness-105 hover:shadow-[0_12px_30px_-4px_rgba(245,158,11,0.55)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-neutral-950" />
          ) : (
            <>
              <span>{config.submitText}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Footer Navigation */}
      <div className="relative mt-8 border-t border-white/10 pt-6 text-center text-sm text-neutral-400">
        {mode === "forgot" ? (
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 font-medium text-neutral-300 transition-colors hover:text-amber-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        ) : (
          <p>
            {mode === "register" ? "Already a member?" : "New to Apsara?"}{" "}
            <Link
              href={mode === "register" ? "/login" : "/register"}
              className="font-semibold text-amber-400 transition-colors hover:text-amber-300 hover:underline"
            >
              {mode === "register" ? "Sign in" : "Request access"}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
