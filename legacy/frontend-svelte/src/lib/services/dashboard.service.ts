/**
 * Unified Dashboard Service — works in both Web (SSR) and Tauri (IPC) modes.
 *
 * Web: Data loaded by +page.server.ts (SSR), this service is not called.
 * Tauri: Data loaded via Rust IPC on mount.
 */
import { isTauri } from '$lib/services/platform';
import type { TrainingJob, RagCollection, ServerStatus } from '$lib/types';

export interface DashboardOverview {
  jobs: TrainingJob[];
  collections: RagCollection[];
  status: ServerStatus | null;
}

export interface DashboardService {
  getOverview(): Promise<DashboardOverview>;
}

class TauriDashboardService implements DashboardService {
  async getOverview(): Promise<DashboardOverview> {
    const tauri = await import('$lib/tauri');
    const [jobs, collections, status] = await Promise.all([
      tauri.training.getJobs(),
      tauri.rag.getCollections(),
      tauri.training.getServerStatus().catch(() => null),
    ]);
    return { jobs, collections, status };
  }
}

class WebDashboardService implements DashboardService {
  async getOverview(): Promise<DashboardOverview> {
    // On web, data comes from +page.server.ts  via SSR
    throw new Error('Web dashboard uses SSR — should not call this directly.');
  }
}

let _instance: DashboardService | null = null;

export function getDashboardService(): DashboardService {
  if (!_instance) {
    _instance = isTauri() ? new TauriDashboardService() : new WebDashboardService();
  }
  return _instance;
}
