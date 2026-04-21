"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useClerk, useSession, useUser } from "@clerk/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthContextValue = {
  hasEnv: boolean;
  isReady: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  supabase: SupabaseClient | null;
  userEmail: string | null;
  userId: string | null;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { signOut } = useClerk();
  const { isLoaded: isSessionLoaded, session } = useSession();
  const { isLoaded: isUserLoaded, user } = useUser();

  const supabase = useMemo(
    () =>
      createSupabaseBrowserClient(async () => (await session?.getToken()) ?? null),
    [session],
  );

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null;

  return (
    <AuthContext.Provider
      value={{
        hasEnv: Boolean(supabase),
        isReady: Boolean(supabase) && isSessionLoaded && isUserLoaded,
        isSignedIn: Boolean(user),
        signOut,
        supabase,
        userEmail,
        userId: user?.id ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
