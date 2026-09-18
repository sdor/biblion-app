export interface User {
  id: number;
  email_address: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface SyncPayload {
  articles?: any[];
  collections?: any[];
  deleted_pmids?: string[];
  deleted_collection_ids?: string[];
}

export interface SyncResponse {
  articles: any[];
  collections: any[];
}

export interface PasswordResetRequestPayload {
  email_address: string;
}

export interface PasswordResetPayload {
  token: string;
  password: string;
  password_confirmation?: string;
}

export interface MessageResponse {
  message: string;
  error?: string;
}
