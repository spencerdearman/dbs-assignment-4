import { SignIn } from "@clerk/nextjs";
import { SiteShell } from "@/components/site-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignInPage() {
  return (
    <SiteShell>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-8 lg:py-12">
        <div className="border-t border-[var(--border)] pt-8">
          <p className="eyebrow">Authentication</p>
          <h2 className="mt-4 text-4xl font-medium tracking-tight">
            Welcome back
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            Sign in with Google or email to manage your favorite cities and
            keep your forecast feed synced.
          </p>
        </div>

        <div className="card-shell bg-[var(--surface-strong)] p-4 sm:p-6">
          <div className="rounded-[28px] border border-[var(--border)] bg-white px-5 py-6 shadow-[0_24px_60px_rgba(17,17,17,0.06)] sm:px-8 sm:py-8">
            <SignIn
              appearance={clerkAppearance}
              fallbackRedirectUrl="/my-cities"
              forceRedirectUrl="/my-cities"
              path="/sign-in"
              routing="path"
              signUpUrl="/sign-up"
            />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
