import { Navigate, Outlet } from "react-router";
import { useConvexAuth } from "convex/react";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useEffect } from "react";
import { Loader } from "lucide-react";

export function PrivateRoutes() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { setIsAuthorized } = useAuthStore();

  console.log("[PrivateRoutes] Auth State:", { isAuthenticated, isLoading });

  useEffect(() => {
    if (!isLoading) {
      console.log("[PrivateRoutes] Syncing store. IsAuthenticated:", isAuthenticated);
      setIsAuthorized(isAuthenticated);
    }
  }, [isAuthenticated, isLoading, setIsAuthorized]);

  if (isLoading) {
    console.log("[PrivateRoutes] Loading...");
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.warn("[PrivateRoutes] Not authenticated, redirecting to login");
    return <Navigate to="/iniciar-sesion" replace />;
  }

  console.log("[PrivateRoutes] Authenticated, rendering Outlet");
  return <Outlet />;
}
