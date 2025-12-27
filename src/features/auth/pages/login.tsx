import { z } from "zod";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Eye, EyeOff, FileText, Loader, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, type SessionData } from "react-router";

import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";

import api from "@/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormWrapper } from "@/features/auth/components/form-wrapper";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import {
  ACCESS_TOKEN,
  CSRF_TOKEN,
  LOGOUT_TOKEN,
} from "@/features/auth/constants";
import { useState } from "react";

const loginSchema = z.object({
  name: z.string().min(1, { message: "El usuario es obligatorio." }),
  pass: z.string().min(1, { message: "La contraseña es obligatoria." }),
});

type LoginSchema = z.infer<typeof loginSchema>;

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
      const res = await api.post<SessionData>(
        "/user/login?_format=json",
        values
      );

      if (res.status === 200) {
        localStorage.setItem(ACCESS_TOKEN, res.data.access_token);
        localStorage.setItem(CSRF_TOKEN, res.data.csrf_token);
        localStorage.setItem(LOGOUT_TOKEN, res.data.logout_token);

        console.log(res.data);

        setAuthUser(res.data.current_user);
        setIsAuthorized(true);

        navigate("/");
      }
    } catch (error) {
      if (isAxiosError(error)) {
        const errorMessage =
          error.response?.data?.message ||
          "Algo salió mal. Por favor intentalo otra vez.";

        toast.error(errorMessage);
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
