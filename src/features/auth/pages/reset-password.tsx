import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { ArrowLeft, Info, Loader2, User } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import api from "@/api";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormWrapper } from "@/features/auth/components/form-wrapper";
import { isAxiosError } from "axios";

const resetPasswordSchema = z
  .object({
    mail: z.string().min(1, {
      message: "Este campo es obligatorio.",
    }),
  })
  .strict();

type FormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPassword() {
  const navigate = useNavigate();

  const title =
    "Por favor, ingrese su nombre de usuario o correo electrónico asociada a su cuenta para enviarte las indicaciones.";

  const form = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      mail: "",
    },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: FormValues) => {
    try {
      const existEmailRes = await api.get("/api/user-email-verifications", {
        params: {
          email: values.mail,
        },
      });

      if (existEmailRes.status === 200) {
        const res = await api.post("/user/lost-password?_format=json", values);

        if (res.status === 200) {
          toast.message(res.data.message);
          navigate("/nueva-contraseña");
        }
      }
    } catch (error) {
      console.log(error)
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
    <FormWrapper title="Reestablecer contraseña">
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
            name="mail"
            render={({ field }) => (
              <FormItem>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <FormControl>
                    <Input
                      disabled={isSubmitting}
                      className="pl-10"
                      placeholder="Usuario o correo electrónico"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
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
