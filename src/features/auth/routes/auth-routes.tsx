import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useConvexAuth } from "convex/react";

export function PublicGuard() {
  const { isAuthorized } = useAuthStore();
  const { isAuthenticated, isLoading } = useConvexAuth();

  // Si está autorizado o autenticado en Convex, redirigir al dashboard
  // Añadimos isLoading para evitar redirecciones prematuras
  if (!isLoading && (isAuthorized || isAuthenticated)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
