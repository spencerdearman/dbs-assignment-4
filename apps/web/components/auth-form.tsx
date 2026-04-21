"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function AuthForm() {
  const { hasEnv, isReady, isSignedIn, userEmail } = useAuth();

  if (!hasEnv) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-3 text-2xl font-semibold">Project keys are missing</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          This screen is ready, but it needs the frontend Supabase and Clerk env
          vars in `apps/web/.env.local` before sign in and sign up can work.
        </p>
      </section>
    );
  }

  if (!isReady) {
    return (
      <section className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-3 text-2xl font-semibold">Connecting to Clerk…</h2>
      </section>
    );
  }

  if (isSignedIn) {
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
              <dd className="mt-2 text-base font-medium">{userEmail}</dd>
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
          The assignment requires sign in and personalized data. This flow now
          uses Clerk for authentication, including Google sign in, while
          Supabase continues to power the data and realtime features.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="button-primary" href="/sign-up">
            Create account
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Sign in
          </Link>
        </div>
      </div>

      <div className="card-shell px-6 py-7 sm:px-8">
        <p className="eyebrow">What unlocks after sign in</p>
        <div className="mt-5 space-y-4">
          {[
            "Save favorite cities to your own account.",
            "Store a preferred temperature unit.",
            "See a personalized dashboard instead of the generic featured feed.",
            "Use Google sign in if it is enabled in your Clerk instance.",
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
