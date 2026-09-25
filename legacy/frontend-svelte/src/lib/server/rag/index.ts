import { RagMockRepository } from './infrastructure/rag.mock.repository';
import { RagUseCases } from './application/rag.use-cases';

const repository = new RagMockRepository();

export const ragDependencies = {
  useCases: new RagUseCases(repository)
};
