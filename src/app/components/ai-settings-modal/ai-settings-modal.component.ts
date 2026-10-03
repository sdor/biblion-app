import { Component, inject, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiSettingsService } from '../../services/ai-settings.service';
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

  @Output() closed = new EventEmitter<void>();

  readonly provider = signal<AIProvider>('openrouter');
  readonly apiKey = signal<string>('');
  readonly model = signal<string>(DEFAULT_AI_MODELS.openrouter);
  readonly showKey = signal<boolean>(false);
  readonly saveSuccess = signal<boolean>(false);

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
    const current = this.aiSettingsService.settings();
    if (current) {
      this.provider.set(current.provider);
      this.apiKey.set(current.apiKey);
      this.model.set(current.model || DEFAULT_AI_MODELS[current.provider]);
    } else {
      this.model.set(DEFAULT_AI_MODELS.openrouter);
    }
  }

  onProviderChange(newProvider: AIProvider): void {
    this.provider.set(newProvider);
    const defaultModel = DEFAULT_AI_MODELS[newProvider];
    this.model.set(defaultModel);
  }

  toggleShowKey(): void {
    this.showKey.update((v) => !v);
  }

  save(): void {
    const key = this.apiKey().trim();
    if (!key) return;

    const newSettings: AISettings = {
      provider: this.provider(),
      apiKey: key,
      model: this.model().trim() || DEFAULT_AI_MODELS[this.provider()]
    };

    this.aiSettingsService.saveSettings(newSettings);
    this.saveSuccess.set(true);
    setTimeout(() => {
      this.close();
    }, 400);
  }

  clear(): void {
    this.aiSettingsService.clearSettings();
    this.apiKey.set('');
    this.saveSuccess.set(false);
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
