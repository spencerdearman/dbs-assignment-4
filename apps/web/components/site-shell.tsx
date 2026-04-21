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
    <div className="mx-auto flex min-h-screen w-full flex-col bg-[var(--canvas)]">
      {/* Top Black Nav Bar */}
      <header className="flex w-full flex-col sm:flex-row sm:items-center justify-between bg-[var(--ink)] px-6 py-4 text-[var(--canvas)]">
        <div className="flex items-center gap-8">
          <div className="font-mono text-sm font-bold tracking-widest uppercase">
            Cloud
          </div>
          <nav className="flex gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  className={`font-mono text-xs tracking-wider uppercase transition-colors ${
                    isActive ? "text-white font-medium" : "text-[#888888] hover:text-white"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs font-mono tracking-wider uppercase text-[#888888] sm:mt-0">
          {!hasEnv
            ? "Setup Required"
            : !isReady
              ? "Connecting..."
              : isSignedIn
                ? userEmail
                : "Guest"}
          
          {isReady && hasEnv && (
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <>
                  <UserButton />
                  <button
                    className="hover:text-white transition-colors"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    type="button"
                  >
                    {signingOut ? "..." : "Out"}
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        {!hasEnv ? (
          <div className="mb-8 border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-4 font-mono text-sm uppercase tracking-wide text-[var(--ink)] sm:px-6">
            Missing Env Vars: Add Supabase & Clerk keys to .env.local
          </div>
        ) : null}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
