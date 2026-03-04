import { Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Home } from "@/features/home/pages/home";
import { Reports } from "@/features/reports/pages/reports";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Distributors } from "@/features/distributors/pages/distributors";
import { PublicGuard } from "@/features/auth/routes/auth-routes";
import { PrivateRoutes } from "@/features/auth/components/private-routes";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { Configuration } from "./features/config/pages/configuration";
import { UsersPage } from "./features/users/pages/users";
import CostPage from "@/features/costs/pages/page";
import Client from "./features/client/pages/client";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { Login } from "@/features/auth/pages/login";
import { ResetPassword } from "@/features/auth/pages/reset-password";
import { NewPassword } from "@/features/auth/pages/new-password";

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
          {/* Rutas de autenticación (Públicas) */}
          <Route element={<PublicGuard />}>
            <Route element={<AuthLayout />}>
              <Route path="/iniciar-sesion" element={<Login />} />
              <Route path="/restablecer-contraseña" element={<ResetPassword />} />
              <Route path="/nueva-contraseña" element={<NewPassword />} />
            </Route>
          </Route>

          {/* Rutas protegidas - Rutas del dashboard */}
          <Route element={<PrivateRoutes />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Home />} />

              {/* Rutas exclusivas para admin (excluidas para distribuidores) */}
              <Route
                element={
                  <RoleGuard excludedRoles={["distributor", "Repartidor"]} />
                }
              >
                <Route path="/repartidores" element={<Distributors />} />
                <Route path="/usuarios" element={<UsersPage />} />
                <Route path="/reportes" element={<Reports />} />
                <Route path="/configuraciones" element={<Configuration />} />
                <Route path="/clientes" element={<Client />} />
                <Route path="/costos" element={<CostPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </div>
    </QueryClientProvider>
  );
}
