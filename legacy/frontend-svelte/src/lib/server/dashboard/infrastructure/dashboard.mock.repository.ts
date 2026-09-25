import type { DashboardRepository } from '../domain/dashboard.repository';

export class DashboardMockRepository implements DashboardRepository {
  async getOverview() {
    return {
      jobs: [
        { id: '1', nome: 'LLaMA3-8B-FTEstudos', modelo_base: 'Meta-Llama-3-8B', data_criacao: '2026-04-14T00:00:00Z', status: 'Executando', etapa_atual: 'Treinamento', progresso: 0.45, em_andamento: true },
        { id: '2', nome: 'Bert-PTBR-Classificador', modelo_base: 'neuralmind/bert-base-portuguese-cased', data_criacao: '2026-04-13T10:00:00Z', status: 'Concluído', etapa_atual: 'Finalizado', progresso: 1.0, em_andamento: false }
      ],
      collections: [
        { id: 'c1', nome: 'Artigos Medicina', descricao: '', total_documentos: 412, data_criacao: '2026-04-01T00:00:00Z' },
        { id: 'c2', nome: 'Jurisprudência STF', descricao: '', total_documentos: 1530, data_criacao: '2026-04-10T00:00:00Z' }
      ],
      status: {
        online: true,
        gpu_nome: 'NVIDIA RTX 4090',
        gpu_memoria_usada: 14.5,
        gpu_memoria_total: 24.0,
        gpu_memoria_percentual: 60.4,
        gpu_temperatura: 72,
        gpu_utilizacao: 88,
        cpu_utilizacao: 35.2,
        ram_usada: 18.2,
        ram_total: 64.0,
        ram_percentual: 28.4
      }
    };
  }
}
