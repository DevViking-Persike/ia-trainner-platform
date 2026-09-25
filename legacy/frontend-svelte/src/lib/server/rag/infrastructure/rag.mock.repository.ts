import type { RagCollection } from '$lib/types';
import type { RagRepository } from '../domain/rag.repository';

let mockCollections: RagCollection[] = [
  { id: '1', nome: 'Documentação SvelteKit', descricao: 'Guia oficial', total_documentos: 42, data_criacao: '2026-04-14T00:00:00Z' },
  { id: '2', nome: 'Contratos Jurídicos', descricao: 'Acordos NDAs', total_documentos: 156, data_criacao: '2026-04-13T00:00:00Z' }
];

export class RagMockRepository implements RagRepository {
  async getCollections(): Promise<RagCollection[]> {
    return mockCollections;
  }

  async createCollection(nome: string, descricao: string): Promise<RagCollection> {
    const col: RagCollection = {
      id: Math.random().toString(36).substring(2, 10),
      nome,
      descricao,
      total_documentos: 0,
      data_criacao: new Date().toISOString()
    };
    mockCollections = [col, ...mockCollections];
    return col;
  }

  async deleteCollection(id: string): Promise<boolean> {
    mockCollections = mockCollections.filter(c => c.id !== id);
    return true;
  }
}
