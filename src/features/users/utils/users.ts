import api from "@/api";
import type { AuthUser, CreateUserDto, UpdateUserDto } from "../types";

export const fetchUsers = async (): Promise<AuthUser[]> => {
  const { data } = await api.get<AuthUser[]>("/users");
  return data;
};

export const fetchUserById = async (id: string): Promise<AuthUser> => {
  const { data } = await api.get<AuthUser>(`/users/${id}`);
  return data;
};

export const createUser = async (user: CreateUserDto): Promise<AuthUser> => {
  const { data } = await api.post<AuthUser>("/users", user);
  return data;
};

export const updateUser = async (id: string, user: UpdateUserDto): Promise<AuthUser> => {
  const { data } = await api.patch<AuthUser>(`/users/${id}`, user);
  return data;
};

export const deleteUser = async (id: string): Promise<AuthUser> => {
  const { data } = await api.delete<AuthUser>(`/users/${id}`);
  return data;
};
