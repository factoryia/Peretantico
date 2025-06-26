import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { ACCESS_TOKEN } from "@/features/auth/constants";
import type { CurrentUser } from "@/features/auth/types";

interface AuthState {
  authUser: CurrentUser | null;
  isAuthorized: boolean;
  isCheckingAuth: boolean;
  setIsAuthorized: (value: boolean) => void;
  setAuthUser: (value: CurrentUser | null) => void;
  auth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      authUser: null,
      isAuthorized: false,
      isCheckingAuth: false,

      setIsAuthorized: (value) => set({ isAuthorized: value }),
      setAuthUser: (value) => set({ authUser: value }),

      auth: async () => {
        set({ isCheckingAuth: true });

        const token = localStorage.getItem(ACCESS_TOKEN);

        if (!token) {
          set({ authUser: null, isAuthorized: false, isCheckingAuth: false });
          return;
        }

        set({ isAuthorized: true, isCheckingAuth: false });
      },

      logout: async () => {
        try {
          localStorage.clear();
          set({
            authUser: null,
            isAuthorized: false,
          });
        } catch (error) {
          toast.error("Algo salió mal al cerrar sesión. Inténtalo de nuevo.");
        }
      },
    }),
    {
      name: "peretantico-auth",
      partialize: (state) => ({
        authUser: state.authUser,
        isAuthorized: state.isAuthorized,
      }),
    }
  )
);
