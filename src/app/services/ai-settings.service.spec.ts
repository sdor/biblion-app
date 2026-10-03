import { TestBed } from '@angular/core/testing';
import { AiSettingsService, AI_SETTINGS_STORAGE_KEY } from './ai-settings.service';
import { AISettings } from '../models/ai-settings.model';

describe('AiSettingsService', () => {
  let service: AiSettingsService;

  beforeEach(() => {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.clear();
    }
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiSettingsService);
  });

  afterEach(() => {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.clear();
    }
  });

  it('should initialize with null settings if storage is empty', () => {
    expect(service.settings()).toBeNull();
    expect(service.isConfigured()).toBe(false);
  });

  it('should save settings and update signals and localStorage', () => {
    const toSave: AISettings = {
      provider: 'openrouter',
      apiKey: 'sk-or-test-key-12345',
      model: 'anthropic/claude-3.5-sonnet'
    };

    service.saveSettings(toSave);

    expect(service.isConfigured()).toBe(true);
    expect(service.settings()?.provider).toBe('openrouter');
    expect(service.settings()?.apiKey).toBe('sk-or-test-key-12345');
    expect(service.settings()?.model).toBe('anthropic/claude-3.5-sonnet');

    const stored = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.apiKey).toBe('sk-or-test-key-12345');
  });

  it('should clear settings on clearSettings()', () => {
    service.saveSettings({
      provider: 'openai',
      apiKey: 'sk-openai-key'
    });
    expect(service.isConfigured()).toBe(true);

    service.clearSettings();
    expect(service.settings()).toBeNull();
    expect(service.isConfigured()).toBe(false);
    expect(localStorage.getItem(AI_SETTINGS_STORAGE_KEY)).toBeNull();
  });

  it('should manage modal open/close state', () => {
    expect(service.isModalOpen()).toBe(false);
    service.openSettingsModal();
    expect(service.isModalOpen()).toBe(true);
    service.closeSettingsModal();
    expect(service.isModalOpen()).toBe(false);
  });
});
