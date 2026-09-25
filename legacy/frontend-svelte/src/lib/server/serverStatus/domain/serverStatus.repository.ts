import type { ServerStatus } from '$lib/types';

export interface ServerStatusRepository {
  getStatus(): Promise<ServerStatus>;
}
