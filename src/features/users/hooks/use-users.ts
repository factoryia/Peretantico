import { useQuery, useMutation, useAction, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import type { AuthUser, CreateUserDto, UpdateUserDto } from "../types";
import { toast } from "sonner";
import type { Id } from "@convex/_generated/dataModel";

export const useUsersQuery = () => {
  const profiles = useQuery(api.profiles.list, {});

  const users: AuthUser[] | undefined = profiles?.map((profile: any) => ({
    id: profile._id,
    name: profile.fullName,
    email: profile.email || "",
    image: undefined,
    role: profile.roles && profile.roles.length > 0 ? profile.roles[0] : undefined,
    createdAt: new Date(profile._creationTime).toISOString(),
    updatedAt: new Date(profile._creationTime).toISOString(),
  }));

  return {
    data: users,
    isLoading: profiles === undefined,
  };
};

export const useUserQuery = (id: string) => {
  // Not implemented in convex/profiles.ts yet, but can filter list or add get query
  // For now, let's use list and find
  const profiles = useQuery(api.profiles.list, {});
  const profile = profiles?.find((p) => p._id === id);

  const user: AuthUser | undefined = profile
    ? {
        id: profile._id,
        name: profile.fullName,
        email: profile.email || "",
        image: undefined,
        createdAt: new Date(profile._creationTime).toISOString(),
        updatedAt: new Date(profile._creationTime).toISOString(),
      }
    : undefined;

  return {
    data: user,
    isLoading: profiles === undefined,
    enabled: !!id,
  };
};

export const useUserMutations = () => {
  const convex = useConvex();
  const createProfile = useMutation(api.profiles.create);
  const updateProfile = useMutation(api.profiles.update);
  const removeProfile = useMutation(api.profiles.remove);
  // @ts-ignore
  const updatePassword = useAction(api.users.updatePassword);
  const signIn = useAction(api.auth.signIn);

  const createMutation = {
    mutateAsync: async (user: CreateUserDto) => {
      try {
        // 1. Create Auth User using signIn flow
        const result = await signIn({
          provider: "password",
          params: {
            email: user.email,
            password: user.password,
            flow: "signUp",
          },
        });

        if (!("tokens" in result) || !result.tokens) {
          throw new Error("No se pudo crear el usuario de autenticación");
        }

        // 2. Extract userId
        // Since signIn might not return a token (using cookies), we query the user by email
        const newUser = await convex.query(api.users.getUserByEmail, { email: user.email });
        
        if (!newUser) {
          throw new Error("No se pudo obtener el ID del usuario creado");
        }
        
        const userIdString = newUser._id;

        if (!userIdString) {
          throw new Error("No se pudo obtener el ID del usuario");
        }

        // 3. Create Profile linked to the user
        await createProfile({
          userId: userIdString as Id<"users">,
          fullName: user.name,
          documentType: "CC", // Default or add to form
          documentNumber: "TEMP-" + Date.now(), // Temporary unique number
          phoneNumber: "0000000000", // Default or add to form
          role: user.role,
        });

        toast.success("Usuario creado correctamente");
      } catch (error) {
        console.error(error);
        toast.error("Error al crear usuario: " + (error as Error).message);
        throw error;
      }
    },
  };

  const updateMutation = {
    mutateAsync: async ({ id, user }: { id: string; user: UpdateUserDto }) => {
      await updateProfile({
        id: id as Id<"profiles">,
        fullName: user.name,
        email: user.email,
        role: user.role,
      });

      if (user.password) {
        // @ts-ignore
        await updatePassword({
          profileId: id as Id<"profiles">,
          password: user.password,
        });
      }

      toast.success("Usuario actualizado correctamente");
    },
  };

  const deleteMutation = {
    mutateAsync: async (id: string) => {
      await removeProfile({ id: id as Id<"profiles"> });
      toast.success("Usuario eliminado correctamente");
    },
  };

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
};
