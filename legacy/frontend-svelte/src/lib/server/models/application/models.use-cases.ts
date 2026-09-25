import type { ModelsRepository } from '../domain/models.repository';

export class ModelsUseCases {
  constructor(private readonly repository: ModelsRepository) {}

  executeGetAvailable() {
    return this.repository.getAvailable();
  }
}
