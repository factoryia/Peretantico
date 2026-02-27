import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePasswordSchema, type ChangePasswordFormValues } from "../schemas";
import { useUserMutations } from "../hooks/use-users";
import {
  Loader,
  Key,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { RequiredDot } from "@/components/common/required-dot";
import { RequiredFormMessage } from "@/components/common/form-message";
import type { AuthUser } from "../types";
import { useEffect } from "react";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser | null;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  user,
}: ChangePasswordDialogProps) {
  const { updateMutation } = useUserMutations();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    if (user) {
      await updateMutation.mutateAsync({ 
        id: user.id, 
        user: { password: values.password } 
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 border-none bg-white">
        <DialogHeader className="p-6 bg-white border-b border-gray-100 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Cambiar Contraseña
              </DialogTitle>
              <p className="text-xs text-gray-500 font-medium">
                Usuario: <span className="text-gray-900 font-bold">{user?.name}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="p-6 space-y-6 animate-in fade-in duration-500"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Nueva Contraseña <RequiredDot />
                    </FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Confirmar Contraseña <RequiredDot />
                    </FormLabel>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />
            </div>

            <RequiredFormMessage />

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-[12px] uppercase tracking-wide transition-all"
              >
                Cancelar
              </Button>
              <Button
                disabled={!isValid || isSubmitting}
                type="submit"
                className="h-10 px-8 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20 rounded-xl font-bold text-[12px] uppercase tracking-wide transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader className="size-4 animate-spin" />
                ) : (
                  <Key className="size-4" />
                )}
                Actualizar Contraseña
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
