import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function PrivateRoutes() {
  const { isAuthorized } = useAuthStore();

  // Si no está autorizado, redirigir al login
  if (!isAuthorized) {
    return <Navigate to="/iniciar-sesion" replace />;
  }

  return <Outlet />;
}
