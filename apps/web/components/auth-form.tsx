"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function AuthForm() {
  const { hasEnv, isReady, isSignedIn, userEmail } = useAuth();

  if (!hasEnv) {
    return (
      <section className="py-8">
        <p className="eyebrow">Authentication</p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">Project keys are missing</h2>
        <p className="mt-4 max-w-2xl font-mono text-xs uppercase tracking-wide text-[var(--ink-soft)]">
          This screen is ready, but it needs the frontend Supabase and Clerk env
          vars in `apps/web/.env.local` before sign in and sign up can work.
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
          <h2 className="text-3xl font-medium tracking-tight uppercase">
            Active Session
          </h2>
          <p className="mt-4 font-mono text-xs uppercase tracking-wide text-[var(--ink-soft)]">
            Your account is ready for personalized cities and stored preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 border-b border-[var(--border)] pb-8">
          <div>
            <p className="eyebrow mb-2">Identity</p>
            <p className="font-mono text-lg font-medium">{userEmail}</p>
          </div>
          <div>
             <p className="eyebrow mb-2">Navigation</p>
             <div className="flex gap-4">
                <Link className="button-primary" href="/my-cities">
                  Manage Settings
                </Link>
                <Link className="button-secondary" href="/">
                  Return Home
                </Link>
             </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-12 lg:grid-cols-2 py-8">
      <div className="border border-[var(--border)] p-8">
        <p className="eyebrow mb-4">Registration</p>
        <h2 className="text-3xl font-medium tracking-tight">
          Create an account.
        </h2>
        <p className="mt-6 font-mono text-xs leading-6 uppercase tracking-wider text-[var(--ink-soft)]">
          The assignment requires sign in and personalized data. This flow uses Clerk for authentication, while Supabase continues to power the data and realtime features.
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
            <div className="py-4 font-mono text-xs uppercase tracking-widest text-[var(--ink)]" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
