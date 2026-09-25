import type { RagRepository } from '../domain/rag.repository';

export class RagUseCases {
  constructor(private readonly repository: RagRepository) {}

  executeGetCollections() { return this.repository.getCollections(); }
  executeCreateCollection(nome: string, desc: string) { return this.repository.createCollection(nome, desc); }
  executeDeleteCollection(id: string) { return this.repository.deleteCollection(id); }
}
