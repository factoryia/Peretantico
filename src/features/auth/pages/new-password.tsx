import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileText,
  Info,
  Loader2,
  User,
} from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { FormWrapper } from "@/features/auth/components/form-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const newPasswordSchema = z
  .object({
    email: z.string().min(1, {
      message: "Este campo es obligatorio.",
    }),
    code: z.string().min(1, {
      message: "Este campo es obligatorio.",
    }),
    newPassword: z.string().min(8, {
      message: "La contraseña debe tener al menos 8 caracteres.",
    }),
  })
  .strict();

type FormValues = z.infer<typeof newPasswordSchema>;

export function NewPassword() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const [showCode, setShowCode] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const title =
    "Hemos enviado un código de verificación a tu correo electrónico. Ingresa el código y crea una nueva contraseña segura para acceder a tu cuenta.";

  const form = useForm<FormValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: FormValues) => {
    try {
      await signIn("password", {
        email: values.email,
        code: values.code,
        newPassword: values.newPassword,
        flow: "reset-verification",
      }) as any;
      toast.success("Contraseña actualizada con éxito.");
      navigate("/iniciar-sesion");
    } catch (error) {
      console.log(error);
      toast.error("Código inválido o error al actualizar.");
    }
  };
  return (
    <FormWrapper title="Restablecer Contraseña">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 bg-blue-100 border-blue-400 p-2 rounded-sm"
            )}
          >
            <Info className="size-5 text-blue-500 mt-0.5" />
            <p className="text-sm text-muted-foreground text-center pb-2 px-2">
              {title}
            </p>
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      className="pl-10"
                      placeholder="tu-correo@email.com"
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
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de verificación</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText size={18} className="text-gray-400" />
                    </div>
                    <FormControl>
                      <Input
                        type={showCode ? "text" : "password"}
                        placeholder="••••••"
                        className="px-10"
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowCode(!showCode)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        {showCode ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText size={18} className="text-gray-400" />
                    </div>
                    <FormControl>
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="••••••••••"
                        className="px-10"
                        {...field}
                      />
                    </FormControl>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => navigate("/iniciar-sesion")}
            >
              <ArrowLeft size={16} className="mr-1" />
              Volver
            </Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enviar
            </Button>
          </div>
        </form>
      </Form>
    </FormWrapper>
  );
}