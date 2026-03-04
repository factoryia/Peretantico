import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { CurrentUser } from "@/features/auth/types";

interface AuthState {
  authUser: CurrentUser | null;
  isAuthorized: boolean;
  setAuthUser: (value: CurrentUser | null) => void;
  setIsAuthorized: (value: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  (set) => ({
    authUser: null,
    isAuthorized: false,

    setAuthUser: (value) => set({ authUser: value }),
    setIsAuthorized: (value) => set({ isAuthorized: value }),

    logout: () => {
      try {
        set({
          authUser: null,
          isAuthorized: false,
        });
      } catch (error) {
        toast.error("Algo salió mal al cerrar sesión. Inténtalo de nuevo.");
      }
    },
  })
);
