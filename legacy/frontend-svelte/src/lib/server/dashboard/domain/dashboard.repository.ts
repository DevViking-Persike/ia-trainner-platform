import type { TrainingJob, RagCollection, ServerStatus } from '$lib/types';

export interface DashboardRepository {
  getOverview(): Promise<{
    jobs: TrainingJob[];
    collections: RagCollection[];
    status: ServerStatus;
  }>;
}
