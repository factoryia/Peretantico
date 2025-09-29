import { Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Home } from "@/features/reports/home/pages/home";
import { Reports } from "@/features/reports/pages/reports";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Distributors } from "@/features/distributors/pages/distributors";
import { AuthRoutes } from "@/features/auth/routes/auth-routes";
import { PrivateRoutes } from "@/features/auth/components/private-routes";
import { Configuration } from "./features/config/pages/configuration";
import Costs from "./features/costs/pages/costs";
import Client from "./features/client/pages/client";

export default function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minutos
      },
    },
  });

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
              <Route path="/costos" element={<Costs />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </QueryClientProvider>
  );
}
