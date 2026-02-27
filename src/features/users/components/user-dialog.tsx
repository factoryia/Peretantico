import { useEffect } from "react";
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
import { userSchema, type UserFormValues } from "../schemas";
import { useUserMutations } from "../hooks/use-users";
import {
  Loader,
  User as UserIcon,
  Plus,
  Edit,
  Mail,
  Lock,
  Image as ImageIcon,
} from "lucide-react";
import { RequiredDot } from "@/components/common/required-dot";
import { RequiredFormMessage } from "@/components/common/form-message";
import type { AuthUser } from "../types";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: AuthUser | null;
}

export function UserDialog({
  open,
  onOpenChange,
  user,
}: UserDialogProps) {
  const isEditing = !!user;
  const { createMutation, updateMutation } = useUserMutations();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      image: "",
    },
  });

  const { isValid, isSubmitting } = form.formState;

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        image: user.image || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        image: "",
      });
    }
  }, [isEditing, user, form, open]);

  const handleSubmit = async (values: UserFormValues) => {
    if (isEditing && user) {
      await updateMutation.mutateAsync({ id: user.id, user: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    onOpenChange(false);
  };

  const sectionHeader = (icon: any, title: string) => {
    const Icon = icon;
    return (
      <div className="flex items-center gap-2.5 pb-2 mb-4 border-b border-gray-100">
        <Icon className="size-5 text-blue-600" />
        <h3 className="text-[#6B7280] text-[12.8px] uppercase font-bold tracking-wide">
          {title}
        </h3>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-0 border-none bg-white">
        <DialogHeader className="p-6 bg-white border-b border-gray-100 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isEditing
                  ? "bg-indigo-50 text-indigo-600"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              {isEditing ? (
                <Edit className="h-5 w-5" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
              </DialogTitle>
              <p className="text-xs text-gray-500 font-medium">
                {isEditing
                  ? "Gestione los datos del usuario en el sistema"
                  : "Registre un nuevo usuario completando los campos indicados"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="p-6 space-y-8 animate-in fade-in duration-500"
          >
            <div className="space-y-6">
              {sectionHeader(UserIcon, "Información Personal")}
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Nombre Completo <RequiredDot />
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Juan Pérez"
                          className="h-10 bg-slate-50/50 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                {!isEditing && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Contraseña <RequiredDot />
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
                )}

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Correo Electrónico <RequiredDot />
                      </FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="correo@ejemplo.com"
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
                  name="image"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        URL Imagen de Perfil
                      </FormLabel>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <FormControl>
                          <Input
                            placeholder="https://ejemplo.com/imagen.jpg"
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
            </div>

            <RequiredFormMessage />

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 px-6 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold text-[13px] uppercase tracking-wide transition-all"
              >
                Cancelar
              </Button>
              <Button
                disabled={!isValid || isSubmitting}
                type="submit"
                className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 rounded-xl font-bold text-[13px] uppercase tracking-wide transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader className="size-4 animate-spin" />
                ) : isEditing ? (
                  <Edit className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {isEditing ? "Actualizar" : "Registrar"} Usuario
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
