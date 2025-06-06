import { Route, Routes } from "react-router";

import { Home } from "@/features/home/pages/home";
import { Reports } from "@/features/reports/pages/reports";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Distributors } from "@/features/distributors/pages/distributors";
import { Login } from "@/features/auth/pages/login";

export default function App() {
  return (
    <div className="size-full overflow-y-hidden">
      <Routes>
        <Route path="/iniciar-sesion" element={<Login />} />
        {/* rutas del dashboard */}
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/repartidores" element={<Distributors />} />
          <Route path="/reportes" element={<Reports />} />
        </Route>
      </Routes>
    </div>
  );
}
