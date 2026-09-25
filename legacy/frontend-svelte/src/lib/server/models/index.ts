import { ModelsMockRepository } from './infrastructure/models.mock.repository';
import { ModelsUseCases } from './application/models.use-cases';

const repository = new ModelsMockRepository();

export const modelsDependencies = {
  useCases: new ModelsUseCases(repository)
};
