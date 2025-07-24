import { useEffect } from "react";
import { Route, Routes } from "react-router";

import { Home } from "@/features/home/pages/home";
import { Reports } from "@/features/reports/pages/reports";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Distributors } from "@/features/distributors/pages/distributors";
import { AuthRoutes } from "@/features/auth/routes/auth-routes";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { PrivateRoutes } from "@/features/auth/components/private-routes";
import { Configuration } from "./features/config/pages/configuration";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Client from "./features/client/pages/client";

export default function App() {
  const { isCheckingAuth, authUser, auth } = useAuthStore();
  const queryClient = new QueryClient();

  useEffect(() => {
    auth();
  }, [auth]);

  if (isCheckingAuth && !authUser) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="size-full overflow-y-hidden">
        <Routes>
          {/* Rutas de autenticación */}
          <Route path="/*" element={<AuthRoutes />} />

          {/* Rutas protegidas - Rutas del dashboard */}
          <Route element={<PrivateRoutes />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/repartidores" element={<Distributors />} />
              <Route path="/reportes" element={<Reports />} />
              <Route path="/configuraciones" element={<Configuration />} />
              <Route path="/clientes" element={<Client />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </QueryClientProvider>
  );
}
