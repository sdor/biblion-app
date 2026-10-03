export type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'gemini';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  model?: string;
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
