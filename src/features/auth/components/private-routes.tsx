import { useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";

export function PrivateRoutes() {
  const navigate = useNavigate();

  const { isAuthorized } = useAuthStore();

  useEffect(() => {
    if (!isAuthorized) {
      navigate("/iniciar-sesion");
    }
  }, [isAuthorized, navigate]);

  return isAuthorized ? <Outlet /> : <Navigate to="/iniciar-sesion" replace />;
}
