import { Navigate, Outlet } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Loader } from "lucide-react";

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
  const user = useQuery(api.users.getMe);

  // Show nothing while loading to prevent premature redirects
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is null (not authenticated or no profile), allow auth guard to handle it or redirect
  if (user === null) {
      // It seems we are authenticated (passed PrivateRoutes) but have no profile
      // This might be a race condition or incomplete profile setup
      // For now, let's render null or a loading state, or redirect to setup
      // But typically PrivateRoutes handles unauthenticated state.
      // If we are here, we are likely authenticated but getMe returned null.
      return <Navigate to="/iniciar-sesion" replace />;
  }

  const userRoles = user?.roles || [];

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
