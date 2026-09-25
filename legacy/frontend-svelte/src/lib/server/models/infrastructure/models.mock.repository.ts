import type { ModelInfo } from '$lib/types';
import type { ModelsRepository } from '../domain/models.repository';

export class ModelsMockRepository implements ModelsRepository {
  async getAvailable(): Promise<ModelInfo[]> {
    return [
      {
        id: '1',
        nome: 'meta-llama-3-8b',
        familia: 'llama',
        disponivel: true,
        parametros_formatado: '8B',
        tamanho: '4.7 GB',
        vram_necessaria_gb: 6,
        suporta_rag: true
      },
      {
        id: '2',
        nome: 'mistral-7b',
        familia: 'mistral',
        disponivel: true,
        parametros_formatado: '7B',
        tamanho: '4.1 GB',
        vram_necessaria_gb: 5,
        suporta_rag: false
      }
    ];
  }
}
