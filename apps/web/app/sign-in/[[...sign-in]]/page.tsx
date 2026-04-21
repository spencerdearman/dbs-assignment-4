import { SignIn } from "@clerk/nextjs";
import { SiteShell } from "@/components/site-shell";

export default function SignInPage() {
  return (
    <SiteShell>
      <section className="flex justify-center">
        <div className="card-shell px-6 py-7 sm:px-8">
          <p className="eyebrow">Sign in</p>
          <div className="mt-4">
            <SignIn
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

