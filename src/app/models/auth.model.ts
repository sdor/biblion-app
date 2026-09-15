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
