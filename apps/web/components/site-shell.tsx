"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasEnv, isReady, isSignedIn, signOut, userEmail } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    router.push("/");
  }

  const navItems = [
    { href: "/", label: "Dashboard" },
    { href: "/my-cities", label: "My Cities" },
    { href: "/auth", label: isSignedIn ? "Account" : "Sign In" },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="card-shell mb-8 flex flex-col gap-6 px-5 py-5 sm:px-8 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="pill w-fit">
              <span className="pill-dot" />
              Cloud
            </div>
            <div>
              <p className="eyebrow">Design, Build, Ship • Week 4</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Cloud
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
                ? "Add your Supabase and Clerk project keys to begin."
                : !isReady
                  ? "Connecting to Clerk and Supabase…"
                  : isSignedIn
                    ? `Signed in as ${userEmail ?? "a weather fan"}`
                    : "Browsing the public featured weather feed."}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {isSignedIn ? (
                <>
                  <UserButton />
                  <button
                    className="button-secondary"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    type="button"
                  >
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </>
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
          Add the Supabase and Clerk env vars to `apps/web/.env.local`, then
          restart the web app.
        </div>
      ) : null}

      <main className="flex-1">{children}</main>
    </div>
  );
}
