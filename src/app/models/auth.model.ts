export interface SubscriptionInfo {
  id?: number;
  lemonsqueezy_id?: string | null;
  status: 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired' | 'erased';
  active: boolean;
  on_trial: boolean;
  can_cancel: boolean;
  can_resume: boolean;
  trial_ends_at?: string | null;
  renews_at?: string | null;
  ends_at?: string | null;
  days_remaining?: number | null;
  in_grace_period?: boolean;
  data_erasure_scheduled_at?: string | null;
  days_until_erasure?: number | null;
  data_erased?: boolean;
  customer_portal_url?: string | null;
  update_payment_method_url?: string | null;
  card_brand?: string | null;
  card_last_four?: string | null;
  checkout_url?: string;
}

export interface User {
  id: number;
  email_address: string;
  name?: string;
  trial_used?: boolean;
  subscription?: SubscriptionInfo;
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

export interface UpdateAccountPayload {
  email_address?: string;
  password?: string;
  password_confirmation?: string;
  current_password?: string;
  name?: string;
}

export interface UpdateAccountResponse {
  user: User;
  message?: string;
  errors?: string[];
}

