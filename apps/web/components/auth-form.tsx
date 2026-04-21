"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

type Mode = "sign-in" | "sign-up";

export function AuthForm() {
  const router = useRouter();
  const { hasEnv, isReady, supabase, user } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setFeedback("Add your Supabase env vars before trying auth.");
      return;
    }

    setPending(true);
    setFeedback(null);

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : undefined);

    const result =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: baseUrl
              ? {
                  emailRedirectTo: `${baseUrl}/auth`,
                }
              : undefined,
          });

    setPending(false);

    if (result.error) {
      setFeedback(result.error.message);
      return;
    }

    if (mode === "sign-up" && !result.data.session) {
      setFeedback(
        "Account created. If email confirmation is enabled in Supabase, check your inbox before signing in.",
      );
      return;
    }

    router.push("/my-cities");
  }

  if (!hasEnv) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-3 text-2xl font-semibold">Supabase keys are missing</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          This screen is ready, but it needs the frontend Supabase env vars in
          `apps/web/.env.local` before sign in and sign up can work.
        </p>
      </section>
    );
  }

  if (!isReady) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-3 text-2xl font-semibold">Connecting to Supabase…</h2>
      </section>
    );
  }

  if (user) {
    return (
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Account</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            You are already signed in.
          </h2>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
            Your account is ready for personalized cities and stored preferences.
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card-shell-strong px-5 py-5">
              <dt className="eyebrow">Email</dt>
              <dd className="mt-2 text-base font-medium">{user.email}</dd>
            </div>
            <div className="card-shell-strong px-5 py-5">
              <dt className="eyebrow">Next step</dt>
              <dd className="mt-2 text-base font-medium">Choose favorite cities</dd>
            </div>
          </dl>
        </div>

        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Navigation</p>
          <h3 className="mt-3 text-xl font-semibold">Keep building</h3>
          <div className="mt-6 flex flex-col gap-3">
            <Link className="button-primary" href="/my-cities">
              Manage favorites
            </Link>
            <Link className="button-secondary" href="/">
              View dashboard
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          Create an account to personalize the feed.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          The assignment requires sign in and personalized data. This flow uses
          Supabase Auth so classmates can create accounts and save their own city
          preferences.
        </p>

        <div className="mt-7 inline-flex rounded-full border border-[rgba(76,100,122,0.18)] bg-white/75 p-1">
          {([
            { label: "Sign in", value: "sign-in" },
            { label: "Sign up", value: "sign-up" },
          ] as const).map((item) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === item.value
                  ? "bg-[var(--ink)] text-white"
                  : "text-[var(--ink-soft)]"
              }`}
              key={item.value}
              onClick={() => setMode(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="eyebrow" htmlFor="email">
              Email
            </label>
            <input
              className="field mt-2"
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="weatherfan@example.com"
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <label className="eyebrow" htmlFor="password">
              Password
            </label>
            <input
              className="field mt-2"
              id="password"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              type="password"
              value={password}
            />
          </div>

          {feedback ? (
            <div className="rounded-[20px] border border-[rgba(49,140,207,0.16)] bg-white/80 px-4 py-3 text-sm leading-7 text-[var(--ink-soft)]">
              {feedback}
            </div>
          ) : null}

          <button className="button-primary w-full" disabled={pending} type="submit">
            {pending
              ? mode === "sign-in"
                ? "Signing in…"
                : "Creating account…"
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>

      <div className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">What unlocks after sign in</p>
        <div className="mt-5 space-y-4">
          {[
            "Save favorite cities to your own account.",
            "Store a preferred temperature unit.",
            "See a personalized dashboard instead of the generic featured feed.",
            "Test the assignment's auth plus personalization requirement.",
          ].map((item) => (
            <div className="card-shell-strong px-5 py-4 text-sm leading-7" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

