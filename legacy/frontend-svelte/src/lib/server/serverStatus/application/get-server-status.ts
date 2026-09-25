import type { ServerStatusRepository } from '../domain/serverStatus.repository';

export class GetServerStatusUseCase {
  constructor(private readonly repository: ServerStatusRepository) {}

  execute() {
    return this.repository.getStatus();
  }
}
