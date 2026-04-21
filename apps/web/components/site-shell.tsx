"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasEnv, isReady, supabase, user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    router.push("/");
  }

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/my-cities", label: "My Cities" },
    { href: "/auth", label: user ? "Account" : "Sign In" },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="card-shell mb-8 flex flex-col gap-6 px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="pill w-fit">
              <span className="pill-dot" />
              Realtime weather system
            </div>
            <div>
              <p className="eyebrow">Design, Build, Ship • Week 4</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                CityCast Live
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
                A multi-service weather dashboard with a Railway worker,
                Supabase Realtime, and personalized city tracking.
              </p>
            </div>
          </div>

          <div className="card-shell-strong flex flex-col gap-3 px-4 py-4 sm:min-w-80">
            <p className="eyebrow">Session</p>
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              {!hasEnv
                ? "Add your Supabase project keys to begin."
                : !isReady
                  ? "Connecting to Supabase…"
                  : user
                    ? `Signed in as ${user.email ?? "a weather fan"}`
                    : "Browsing the public featured weather feed."}
            </p>
            <div className="flex flex-wrap gap-3">
              {user ? (
                <button
                  className="button-secondary"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  type="button"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              ) : (
                <Link className="button-primary" href="/auth">
                  Create account
                </Link>
              )}
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {!hasEnv ? (
        <div className="card-shell-strong mb-8 border border-[rgba(255,143,90,0.18)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)] sm:px-6">
          Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
          `NEXT_PUBLIC_SITE_URL` to `apps/web/.env.local`, then restart the web
          app.
        </div>
      ) : null}

      <main className="flex-1">{children}</main>
    </div>
  );
}

