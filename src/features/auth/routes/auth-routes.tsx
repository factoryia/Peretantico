import { Navigate, Route, Routes } from "react-router";

import { Login } from "@/features/auth/pages/login";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { ResetPassword } from "@/features/auth/pages/reset-password";
import { NewPassword } from "@/features/auth/pages/new-password";

export function AuthRoutes() {
  const { isAuthorized } = useAuthStore();

  // Si está autorizado, redirigir al dashboard
  if (isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="iniciar-sesion" element={<Login />} />
        <Route path="restablecer-contraseña" element={<ResetPassword />} />
        <Route path="nueva-contraseña" element={<NewPassword />} />
      </Route>
    </Routes>
  );
}
