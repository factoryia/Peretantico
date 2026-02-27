import { z } from "zod";
import { toast } from "sonner";
import axios, { isAxiosError } from "axios";
import { Eye, EyeOff, FileText, Loader, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { useState } from "react";

import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormWrapper } from "@/features/auth/components/form-wrapper";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { ACCESS_TOKEN, API_BASE_URL } from "@/features/auth/constants";
import type { CurrentUser } from "@/features/auth/types";

const loginSchema = z.object({
  name: z.string().min(1, { message: "El usuario es obligatorio." }),
  pass: z.string().min(1, { message: "La contraseña es obligatoria." }),
});

type LoginSchema = z.infer<typeof loginSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractToken(data: unknown): string | null {
  if (typeof data === "string") {
    return data;
  }

  if (isRecord(data)) {
    const tokenKeys = ["token", "access_token", "accessToken"];

    for (const key of tokenKeys) {
      const value = data[key];
      if (typeof value === "string") {
        return value;
      }
    }
  }

  return null;
}

function mapToCurrentUser(data: unknown): CurrentUser {
  let source = data;

  if (isRecord(data) && "user" in data) {
    const userContainer = data as { user: unknown };
    source = userContainer.user;
  }

  const record = isRecord(source) ? source : {};

  const uidKeys = ["uid", "id", "userId", "sub"];
  let uidValue: string | number | undefined;
  for (const key of uidKeys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      uidValue = value;
      break;
    }
  }

  const nameKeys = ["name", "email", "username", "mail"];
  let nameValue: string | undefined;
  for (const key of nameKeys) {
    const value = record[key];
    if (typeof value === "string") {
      nameValue = value;
      break;
    }
  }

  const rolesSource =
    (record.roles as unknown) ?? (record.permissions as unknown);

  let roles: string[] = [];

  if (Array.isArray(rolesSource)) {
    roles = rolesSource
      .map((role: any) => {
        if (typeof role === "string") return role;
        if (typeof role === "object" && role !== null) {
          // Estructura: { role: { name: "Repartidor" } }
          if (role.role && typeof role.role.name === "string") {
            return role.role.name;
          }
          // Estructura: { name: "Repartidor" }
          if (typeof role.name === "string") {
            return role.name;
          }
        }
        return null;
      })
      .filter((r): r is string => typeof r === "string");
  }

  return {
    uid: String(uidValue ?? ""),
    name: String(nameValue ?? ""),
    roles,
  };
}

export function Login() {
  const navigate = useNavigate();
  const { setAuthUser, setIsAuthorized } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      name: "",
      pass: "",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  const onSubmit = async (values: LoginSchema) => {
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: values.name,
        password: values.pass,
      });

      const token = extractToken(loginResponse.data);

      if (!token) {
        throw new Error("No se pudo obtener el token de autenticación.");
      }

      localStorage.setItem(ACCESS_TOKEN, token);

      const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const currentUser = mapToCurrentUser(meResponse.data);

      setAuthUser(currentUser);
      setIsAuthorized(true);

      navigate("/");
    } catch (error) {
      if (isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message ||
          "Algo salió mal. Por favor intentalo otra vez.";

        toast.error(errorMessage);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Un error inesperado ha ocurrido.");
      }
    }
  };

  return (
    <FormWrapper
      title="Bienvenido a Pere Tantico"
      description="Administra tu empresa de forma eficiente desde un solo lugar."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuario</FormLabel>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <FormControl>
                    <Input
                      placeholder="tu-correo@email.com"
                      className="pl-10"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pass"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText size={18} className="text-gray-400" />
                  </div>
                  <FormControl>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••"
                      className="px-10"
                      {...field}
                    />
                  </FormControl>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-right">
            <Link
              to="/restablecer-contraseña"
              className="text-sm text-primary hover:text-primary/80 transition-all hover:underline cursor-pointer font-medium"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="w-full h-11 font-medium rounded-lg"
          >
            {isSubmitting && <Loader className="animate-spin" />}
            Iniciar sesión
          </Button>
        </form>
      </Form>
    </FormWrapper>
  );
}
