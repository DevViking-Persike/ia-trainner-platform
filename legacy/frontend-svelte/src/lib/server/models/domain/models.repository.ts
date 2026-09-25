import type { ModelInfo } from '$lib/types';

export interface ModelsRepository {
  getAvailable(): Promise<ModelInfo[]>;
}
