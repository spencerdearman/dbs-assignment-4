import { SignUp } from "@clerk/nextjs";
import { SiteShell } from "@/components/site-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <SiteShell>
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-8 lg:py-12">
        <div className="border-t border-[var(--border)] pt-8">
          <p className="eyebrow">Authentication</p>
          <h2 className="mt-4 text-4xl font-medium tracking-tight">
            Create your account
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            Join Cloud to save cities, store your temperature preference, and
            get a cleaner forecast feed.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[560px] rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 shadow-[0_24px_60px_rgba(17,17,17,0.06)] sm:p-6">
          <div className="rounded-[24px] border border-[var(--border)] bg-white px-5 py-6 sm:px-8 sm:py-8">
            <SignUp
              appearance={clerkAppearance}
              fallbackRedirectUrl="/my-cities"
              forceRedirectUrl="/my-cities"
              path="/sign-up"
              routing="path"
              signInUrl="/sign-in"
            />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
