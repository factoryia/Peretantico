import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  // Use session storage by default if localStorage is causing issues with stale/invalid tokens
  // or simply rely on default behavior which is usually safer.
  
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
