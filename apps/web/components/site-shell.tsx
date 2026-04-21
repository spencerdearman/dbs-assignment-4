"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasEnv, isReady, isSignedIn, missingEnv, signOut, userEmail } =
    useAuth();
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
      <header className="border-b border-black bg-[var(--ink)] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-8">
            <div className="text-sm font-semibold tracking-tight">Cloud</div>
            <nav className="flex flex-wrap gap-2">
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
          </div>

          <div className="flex items-center gap-3 text-xs text-white/70">
            <span>
              {!hasEnv
                ? "Setup required"
                : !isReady
                  ? "Connecting"
                  : isSignedIn
                    ? userEmail
                    : "Guest"}
            </span>

            {isReady && hasEnv && isSignedIn ? (
              <div className="flex items-center gap-3">
                <UserButton appearance={clerkAppearance} />
                <button
                  className="text-white/70 transition-colors hover:text-white"
                  disabled={signingOut}
                  onClick={handleSignOut}
                  type="button"
                >
                  {signingOut ? "Signing out" : "Sign out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        {!hasEnv ? (
          <div className="mb-8 card-shell-strong px-5 py-4 text-sm text-[var(--ink)] sm:px-6">
            <span className="eyebrow block">Environment</span>
            <p className="mt-2 text-sm text-[var(--ink)]">
              Missing env vars: {missingEnv.join(", ")}
            </p>
          </div>
        ) : null}

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
