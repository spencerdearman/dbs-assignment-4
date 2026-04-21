import { SignUp } from "@clerk/nextjs";
import { SiteShell } from "@/components/site-shell";
import { clerkAppearance } from "@/lib/clerk-appearance";

export default function SignUpPage() {
  return (
    <SiteShell>
      <section className="flex justify-center">
        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Create account</p>
          <div className="mt-4">
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
