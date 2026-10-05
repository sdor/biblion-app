import { Injectable, signal, computed, inject } from '@angular/core';
import { AISettings, AIProvider, DEFAULT_AI_MODELS } from '../models/ai-settings.model';
import { AiCredentialsService } from './ai-credentials.service';

export const AI_SETTINGS_STORAGE_KEY = 'biblion_ai_byok_settings';

@Injectable({
  providedIn: 'root'
})
export class AiSettingsService {
  private aiCredentialsService = inject(AiCredentialsService, { optional: true });

  readonly settings = signal<AISettings | null>(this.getInitialSettings());
  readonly isModalOpen = signal<boolean>(false);

  readonly isConfigured = computed<boolean>(() => {
    if (this.aiCredentialsService?.hasActiveCredential()) {
      return true;
    }
    const s = this.settings();
    return !!(s && s.apiKey && s.apiKey.trim().length > 0);
  });

  readonly currentProvider = computed<AIProvider>(() => {
    const dbActive = this.aiCredentialsService?.activeCredential();
    if (dbActive) {
      return dbActive.provider;
    }
    return this.settings()?.provider || 'openrouter';
  });

  openSettingsModal(): void {
    this.isModalOpen.set(true);
  }

  closeSettingsModal(): void {
    this.isModalOpen.set(false);
  }

  saveSettings(settings: AISettings): void {
    const normalized: AISettings = {
      provider: settings.provider,
      apiKey: settings.apiKey.trim(),
      model: settings.model?.trim() || DEFAULT_AI_MODELS[settings.provider]
    };
    this.settings.set(normalized);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch (e) {
      console.error('Failed to save AI settings to localStorage', e);
    }
  }

  clearSettings(): void {
    this.settings.set(null);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(AI_SETTINGS_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to remove AI settings from localStorage', e);
    }
  }

  private getInitialSettings(): AISettings | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.provider && parsed.apiKey) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not parse stored AI settings', e);
    }
    return null;
  }
}
