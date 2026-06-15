import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, FileText, Loader, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

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

const loginSchema = z.object({
  name: z.string().min(1, { message: "El usuario es obligatorio." }),
  pass: z.string().min(1, { message: "La contraseña es obligatoria." }),
});

type LoginSchema = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { setIsAuthorized } = useAuthStore();
  const { signIn } = useAuthActions();

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
      console.log("Intentando iniciar sesión...");
      const result = await signIn("password", {
        email: values.name.trim().toLowerCase(),
        password: values.pass,
        flow: "signIn",
      }) as any;
      console.log("Resultado del login:", result);

      // Verificar si hay tokens en localStorage
      const convexKeys = Object.keys(localStorage).filter(k => k.startsWith("__convexAuth"));
      console.log("Claves de Convex encontradas:", convexKeys);
      
      // Verificamos si la autenticación fue exitosa (tokens devueltos o flag signingIn)
      if (result?.tokens || result?.signingIn || result?.started) {
        console.log("Login exitoso. Redirigiendo...");
        
        setIsAuthorized(true);
        navigate("/");
      } else {
        console.warn("Respuesta inesperada del login:", result);
        // Intentamos navegar de todas formas si parece exitoso
        navigate("/");
      }
    } catch (error) {
      console.error("Error en login:", error);
      toast.error("Error al iniciar sesión. Verifica tus credenciales.");
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

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            Repartidores: ingresa con tu <strong>correo</strong> y tu{" "}
            <strong>número de cédula</strong> como contraseña.
          </p>
        </form>
      </Form>
    </FormWrapper>
  );
}
