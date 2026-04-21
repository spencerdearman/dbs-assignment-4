"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function AuthForm() {
  const { hasEnv, isReady, isSignedIn, missingEnv, userEmail } = useAuth();

  if (!hasEnv) {
    return (
      <section className="py-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Project keys are missing
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
          This screen is ready, but it needs the frontend Supabase and Clerk env
          vars in `apps/web/.env.local` before sign in and sign up can work.
        </p>
        <p className="mt-4 mono text-xs tracking-widest text-[var(--ink)]">
          Missing: {missingEnv.join(", ")}
        </p>
      </section>
    );
  }

  if (!isReady) {
    return (
      <section className="py-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Connecting...</h2>
      </section>
    );
  }

  if (isSignedIn) {
    return (
      <section className="space-y-16 py-8">
        <div className="border-b border-t border-[var(--border)] py-8">
          <p className="eyebrow mb-2">Account</p>
          <h2 className="text-3xl font-medium tracking-tight">Active session</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--ink-soft)]">
            Your account is ready for personalized cities and stored preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 border-b border-[var(--border)] pb-8 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-2">Identity</p>
            <p className="text-lg font-medium">{userEmail}</p>
          </div>
          <div>
            <p className="eyebrow mb-2">Navigation</p>
            <div className="flex gap-4">
              <Link className="button-primary" href="/my-cities">
                Manage settings
              </Link>
              <Link className="button-secondary" href="/">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-12 py-8 lg:grid-cols-2">
      <div className="card-shell p-8">
        <p className="eyebrow mb-4">Registration</p>
        <h2 className="text-3xl font-medium tracking-tight">
          Create an account.
        </h2>
        <p className="mt-6 text-sm leading-7 text-[var(--ink-soft)]">
          The assignment requires sign in and personalized data. This flow uses
          Clerk for authentication, while Supabase continues to power the data
          and realtime features.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link className="button-primary" href="/sign-up">
            Create account
          </Link>
          <Link className="button-secondary" href="/sign-in">
            Sign in
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="eyebrow">Platform Features</p>
        <div className="flex flex-col divide-y divide-[var(--border)] border-b border-t border-[var(--border)]">
          {[
            "Save favorite cities to your own account",
            "Store a preferred temperature unit",
            "See a personalized dashboard feed",
            "Use Google sign in via Clerk",
          ].map((item) => (
            <div className="py-4 text-sm text-[var(--ink)]" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
