import { ServerStatusMockRepository } from './infrastructure/serverStatus.mock.repository';
import { GetServerStatusUseCase } from './application/get-server-status';

const repository = new ServerStatusMockRepository();

export const serverStatusDependencies = {
  getStatus: new GetServerStatusUseCase(repository)
};
