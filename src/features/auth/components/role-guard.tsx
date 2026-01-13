import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

interface RoleGuardProps {
  allowedRoles?: string[];
  excludedRoles?: string[];
  redirectTo?: string;
}

export function RoleGuard({
  allowedRoles,
  excludedRoles,
  redirectTo = "/",
}: RoleGuardProps) {
  const { authUser } = useAuthStore();
  const userRoles = authUser?.roles || [];

  // Verificar si tiene algún rol excluido
  if (excludedRoles && excludedRoles.some((role) => userRoles.includes(role))) {
    return <Navigate to={redirectTo} replace />;
  }

  // Verificar si tiene los roles permitidos (si se especifican)
  if (allowedRoles && !allowedRoles.some((role) => userRoles.includes(role))) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
