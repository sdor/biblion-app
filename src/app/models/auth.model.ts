export interface User {
  id: number;
  email_address: string;
  name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email_address: string;
  password: string;
}

export interface RegisterData {
  email_address: string;
  password: string;
  password_confirmation?: string;
  name?: string;
}

export interface ApiErrorResponse {
  error?: string;
  errors?: string[];
}
