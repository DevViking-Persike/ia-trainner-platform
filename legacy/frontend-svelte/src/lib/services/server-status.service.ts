/**
 * Unified Server Status Service — works in both Web (SSR) and Tauri (IPC) modes.
 */
import { isTauri } from '$lib/services/platform';
import type { ServerStatus } from '$lib/types';

export interface ServerStatusService {
  getStatus(): Promise<ServerStatus>;
}

class TauriServerStatusService implements ServerStatusService {
  async getStatus() {
    const tauri = await import('$lib/tauri');
    return tauri.training.getServerStatus();
  }
}

class WebServerStatusService implements ServerStatusService {
  async getStatus(): Promise<ServerStatus> {
    throw new Error('Web server status uses SSR.');
  }
}

let _instance: ServerStatusService | null = null;

export function getServerStatusService(): ServerStatusService {
  if (!_instance) {
    _instance = isTauri() ? new TauriServerStatusService() : new WebServerStatusService();
  }
  return _instance;
}
