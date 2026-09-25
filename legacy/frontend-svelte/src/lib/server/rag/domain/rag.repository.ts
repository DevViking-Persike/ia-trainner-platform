import type { RagCollection } from '$lib/types';

export interface RagRepository {
  getCollections(): Promise<RagCollection[]>;
  createCollection(nome: string, descricao: string): Promise<RagCollection>;
  deleteCollection(id: string): Promise<boolean>;
}
