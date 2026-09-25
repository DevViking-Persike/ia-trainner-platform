/**
 * Unified Models Service — works in both Web (SSR) and Tauri (IPC) modes.
 */
import { isTauri } from '$lib/services/platform';
import type { ModelInfo } from '$lib/types';

export interface ModelsService {
  getAvailable(): Promise<ModelInfo[]>;
  chat(model: string, message: string, history?: [string, string][]): Promise<string>;
}

class TauriModelsService implements ModelsService {
  async getAvailable(): Promise<ModelInfo[]> {
    const tauri = await import('$lib/tauri');
    return tauri.models.getAvailable();
  }

  async chat(model: string, message: string, history?: [string, string][]): Promise<string> {
    const tauri = await import('$lib/tauri');
    return tauri.models.chat(model, message, history);
  }
}

class WebModelsService implements ModelsService {
  async getAvailable(): Promise<ModelInfo[]> {
    throw new Error('Web models uses SSR — should not call this directly.');
  }

  async chat(model: string, message: string, history?: [string, string][]): Promise<string> {
    // Chat is interactive, so even on web we might use a fetch API endpoint
    const res = await fetch('/api/models/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, message, history }),
    });
    if (!res.ok) throw new Error('Erro ao enviar mensagem');
    const data = await res.json();
    return data.response;
  }
}

let _instance: ModelsService | null = null;

export function getModelsService(): ModelsService {
  if (!_instance) {
    _instance = isTauri() ? new TauriModelsService() : new WebModelsService();
  }
  return _instance;
}
