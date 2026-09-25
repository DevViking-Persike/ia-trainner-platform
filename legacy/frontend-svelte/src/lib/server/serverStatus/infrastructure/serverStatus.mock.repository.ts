import type { ServerStatus } from '$lib/types';
import type { ServerStatusRepository } from '../domain/serverStatus.repository';

export class ServerStatusMockRepository implements ServerStatusRepository {
  async getStatus(): Promise<ServerStatus> {
    return {
      online: true,
      gpu_nome: 'NVIDIA RTX 4090',
      gpu_memoria_usada: 14.5,
      gpu_memoria_total: 24.0,
      gpu_memoria_percentual: 60.4,
      gpu_temperatura: 72,
      gpu_utilizacao: 88,
      gpu_power_watts: 320,
      cpu_modelo: 'AMD Ryzen 9 7950X',
      cpu_utilizacao: 35.2,
      ram_usada: 18.2,
      ram_total: 64.0,
      ram_percentual: 28.4,
      jobs_ativos: 2,
      jobs_na_fila: 5
    };
  }
}
