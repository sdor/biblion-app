export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'gemini';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model?: string;
}

export interface UserAiCredential {
  id: number;
  provider: AIProvider;
  model: string;
  is_active: boolean;
  key_hint: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAiCredentialPayload {
  provider: AIProvider;
  api_key: string;
  model?: string;
  is_active?: boolean;
}

export interface QueryRewriteRequest {
  query: string;
}

export interface QueryRewriteResponse {
  rewritten_query: string;
  syntax_valid: boolean;
  warnings?: string[];
}

export const DEFAULT_AI_MODELS: Record<AIProvider, string> = {
  openrouter: 'anthropic/claude-3.5-sonnet',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-2.5-flash'
};
