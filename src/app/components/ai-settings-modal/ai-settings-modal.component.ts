import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiSettingsService } from '../../services/ai-settings.service';
import { AiCredentialsService } from '../../services/ai-credentials.service';
import { AuthService } from '../../services/auth.service';
import { AIProvider, AISettings, DEFAULT_AI_MODELS } from '../../models/ai-settings.model';

@Component({
  selector: 'app-ai-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-settings-modal.component.html',
  styleUrls: ['./ai-settings-modal.component.scss']
})
export class AiSettingsModalComponent implements OnInit {
  readonly aiSettingsService = inject(AiSettingsService);
  readonly aiCredentialsService = inject(AiCredentialsService);
  readonly authService = inject(AuthService);

  @Output() closed = new EventEmitter<void>();

  readonly provider = signal<AIProvider>('openrouter');
  readonly apiKey = signal<string>('');
  readonly model = signal<string>(DEFAULT_AI_MODELS.openrouter);
  readonly showKey = signal<boolean>(false);
  readonly saveSuccess = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly activeMaskedKey = signal<string | null>(null);

  readonly providers: { id: AIProvider; name: string; description: string; placeholder: string; defaultModel: string }[] = [
    {
      id: 'openrouter',
      name: 'OpenRouter (Recommended)',
      description: 'Single API key for Claude 3.5 Sonnet, DeepSeek, Llama 3, and 100+ models.',
      placeholder: 'sk-or-v1-...',
      defaultModel: DEFAULT_AI_MODELS.openrouter
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'Direct OpenAI API key (GPT-4o, GPT-4o mini).',
      placeholder: 'sk-...',
      defaultModel: DEFAULT_AI_MODELS.openai
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Direct Anthropic API key (Claude 3.5 Sonnet, Claude 3.5 Haiku).',
      placeholder: 'sk-ant-...',
      defaultModel: DEFAULT_AI_MODELS.anthropic
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Direct Google AI Studio API key (Gemini 2.5 Flash, Pro).',
      placeholder: 'AIzaSy...',
      defaultModel: DEFAULT_AI_MODELS.gemini
    }
  ];

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.aiCredentialsService.loadCredentials().subscribe({
        next: () => {
          this.syncFromCredentials();
        },
        error: () => {
          this.syncFromLegacySettings();
        }
      });
    } else {
      this.syncFromLegacySettings();
    }
  }

  private syncFromCredentials(): void {
    const active = this.aiCredentialsService.activeCredential();
    if (active) {
      this.provider.set(active.provider);
      this.model.set(active.model || DEFAULT_AI_MODELS[active.provider]);
      this.activeMaskedKey.set(active.masked_key || active.key_hint || null);
    } else {
      this.syncFromLegacySettings();
    }
  }

  private syncFromLegacySettings(): void {
    const current = this.aiSettingsService.settings();
    if (current) {
      this.provider.set(current.provider);
      this.apiKey.set(current.apiKey);
      this.model.set(current.model || DEFAULT_AI_MODELS[current.provider]);
    } else {
      this.model.set(DEFAULT_AI_MODELS[this.provider()]);
    }
  }

  onProviderChange(newProvider: AIProvider): void {
    this.provider.set(newProvider);
    const existing = this.aiCredentialsService.credentials().find(c => c.provider === newProvider);
    if (existing) {
      this.model.set(existing.model || DEFAULT_AI_MODELS[newProvider]);
      this.activeMaskedKey.set(existing.masked_key || existing.key_hint || null);
    } else {
      this.model.set(DEFAULT_AI_MODELS[newProvider]);
      this.activeMaskedKey.set(null);
    }
  }

  toggleShowKey(): void {
    this.showKey.update((v) => !v);
  }

  save(): void {
    const key = this.apiKey().trim();
    const currentModel = this.model().trim() || DEFAULT_AI_MODELS[this.provider()];
    this.errorMessage.set(null);

    if (this.authService.isAuthenticated()) {
      if (!key && !this.activeMaskedKey()) {
        return;
      }
      this.isSaving.set(true);
      if (key) {
        this.aiCredentialsService.createCredential({
          provider: this.provider(),
          api_key: key,
          model: currentModel,
          is_active: true
        }).subscribe({
          next: (cred) => {
            this.isSaving.set(false);
            this.activeMaskedKey.set(cred.masked_key || cred.key_hint || null);
            this.apiKey.set('');
            this.saveSuccess.set(true);
            this.aiSettingsService.clearSettings();
            setTimeout(() => {
              this.close();
            }, 500);
          },
          error: (err) => {
            this.isSaving.set(false);
            this.errorMessage.set(err.message || 'Failed to save credential to backend.');
          }
        });
      } else {
        const existing = this.aiCredentialsService.credentials().find(c => c.provider === this.provider());
        if (existing) {
          this.aiCredentialsService.activateCredential(existing.id).subscribe({
            next: (cred) => {
              this.isSaving.set(false);
              this.activeMaskedKey.set(cred.masked_key || cred.key_hint || null);
              this.saveSuccess.set(true);
              this.aiSettingsService.clearSettings();
              setTimeout(() => {
                this.close();
              }, 500);
            },
            error: (err) => {
              this.isSaving.set(false);
              this.errorMessage.set(err.message || 'Failed to activate credential.');
            }
          });
        }
      }
    } else {
      if (!key) return;
      const newSettings: AISettings = {
        provider: this.provider(),
        apiKey: key,
        model: currentModel
      };
      this.aiSettingsService.saveSettings(newSettings);
      this.saveSuccess.set(true);
      setTimeout(() => {
        this.close();
      }, 400);
    }
  }

  clear(): void {
    const active = this.aiCredentialsService.activeCredential();
    if (active && this.authService.isAuthenticated()) {
      this.isSaving.set(true);
      this.aiCredentialsService.deleteCredential(active.id).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.activeMaskedKey.set(null);
          this.apiKey.set('');
          this.aiSettingsService.clearSettings();
          this.saveSuccess.set(false);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.message || 'Failed to remove credential.');
        }
      });
    } else {
      this.aiSettingsService.clearSettings();
      this.apiKey.set('');
      this.activeMaskedKey.set(null);
      this.saveSuccess.set(false);
    }
  }

  close(): void {
    this.aiSettingsService.closeSettingsModal();
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
