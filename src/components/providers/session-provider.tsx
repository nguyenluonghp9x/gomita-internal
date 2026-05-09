"use client";

import { SessionProvider } from "next-auth/react";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={4 * 60} refetchOnWindowFocus>
      {children}
    </SessionProvider>
  );
}
