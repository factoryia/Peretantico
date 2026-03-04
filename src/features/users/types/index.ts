export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password?: string;
  image?: string;
  role?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  image?: string;
  role?: string;
}

export interface FetchUsersResponse {
  users: AuthUser[];
}
