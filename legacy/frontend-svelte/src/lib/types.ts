// ══════════════════════════════════════════
// TypeScript types mirroring Rust models
// All business logic lives in Tauri commands
// Frontend is presentation-only
// ══════════════════════════════════════════

export interface AuthUserInfo {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string;
  plano: string;
  creditos_restantes: number;
  instituicao: string;
  departamento: string;
  area_pesquisa: string;
  titulacao: string;
  lattes_url?: string;
  orcid_id?: string;
  telefone?: string;
  bio?: string;
  criado_em?: string;
  total_treinamentos: number;
  total_colecoes: number;
  horas_gpu_usadas: number;
}

export interface TrainingJob {
  id: string;
  nome: string;
  descricao: string;
  modelo_base: string;
  status: string;
  progresso: number;
  epocas: number;
  epoca_atual: number;
  learning_rate: number;
  batch_size: number;
  dataset_id?: string;
  erro_mensagem?: string;
  gpu_utilizada?: string;
  criado_em: string;
  iniciado_em?: string;
  finalizado_em?: string;
  em_andamento: boolean;
  duracao_formatada: string;
}

export interface ServerStatus {
  online: boolean;
  gpu_nome?: string;
  gpu_memoria_total: number;
  gpu_memoria_usada: number;
  gpu_utilizacao: number;
  gpu_temperatura: number;
  gpu_power_watts: number;
  cpu_modelo?: string;
  ram_usada: number;
  ram_total: number;
  jobs_ativos: number;
  jobs_na_fila: number;
  gpu_memoria_percentual: number;
  ram_percentual: number;
}

export interface ModelInfo {
  id: string;
  nome: string;
  familia: string;
  tamanho: string;
  parametros_b: number;
  suporta_fine_tuning: boolean;
  suporta_rag: boolean;
  vram_necessaria_gb: number;
  descricao?: string;
  disponivel: boolean;
  parametros_formatado: string;
}

export interface TeamInfo {
  id: string;
  nome: string;
  owner_id: string;
  criado_em: string;
}

export interface TeamMemberInfo {
  id: string;
  team_id: string;
  user_id: string;
  email: string;
  role: string;
  convidado_em: string;
  aceito_em?: string;
  role_formatado: string;
}

export interface RagCollection {
  id: string;
  nome: string;
  descricao: string;
  modelo_embedding: string;
  total_documentos: number;
  total_chunks: number;
  status: string;
  criado_em: string;
  ultima_atualizacao?: string;
  documentos: RagDocument[];
}

export interface RagDocument {
  id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho_bytes: number;
  total_chunks: number;
  status: string;
  enviado_em: string;
  erro_mensagem?: string;
  tamanho_formatado: string;
}

export interface ChatMessage {
  id: string;
  conteudo: string;
  role: string;
  timestamp: string;
  fontes_utilizadas?: string[];
  model?: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  collection_id: string;
  collection_name: string;
  title?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
