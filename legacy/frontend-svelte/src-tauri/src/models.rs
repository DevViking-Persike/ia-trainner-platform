use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthUserInfo {
    pub id: String,
    pub nome: String,
    pub email: String,
    pub avatar_url: Option<String>,
    pub plano: String,
    pub creditos_restantes: i32,
    pub instituicao: String,
    pub departamento: String,
    pub area_pesquisa: String,
    pub titulacao: String,
    pub lattes_url: Option<String>,
    pub orcid_id: Option<String>,
    pub telefone: Option<String>,
    pub bio: Option<String>,
    pub criado_em: Option<String>,
    pub total_treinamentos: i32,
    pub total_colecoes: i32,
    pub horas_gpu_usadas: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrainingJob {
    pub id: String,
    pub nome: String,
    pub descricao: String,
    pub modelo_base: String,
    pub status: String,
    pub progresso: f32,
    pub epocas: i32,
    pub epoca_atual: i32,
    pub learning_rate: f32,
    pub batch_size: i32,
    pub dataset_id: Option<String>,
    pub erro_mensagem: Option<String>,
    pub gpu_utilizada: Option<String>,
    pub criado_em: String,
    pub iniciado_em: Option<String>,
    pub finalizado_em: Option<String>,
    pub em_andamento: bool,
    pub duracao_formatada: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServerStatus {
    pub online: bool,
    pub gpu_nome: Option<String>,
    pub gpu_memoria_total: f32,
    pub gpu_memoria_usada: f32,
    pub gpu_utilizacao: f32,
    pub gpu_temperatura: f32,
    pub gpu_power_watts: f32,
    pub cpu_modelo: Option<String>,
    pub ram_usada: f32,
    pub ram_total: f32,
    pub jobs_ativos: i32,
    pub jobs_na_fila: i32,
    pub gpu_memoria_percentual: f32,
    pub ram_percentual: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelInfo {
    pub id: String,
    pub nome: String,
    pub familia: String,
    pub tamanho: String,
    pub parametros_b: f32,
    pub suporta_fine_tuning: bool,
    pub suporta_rag: bool,
    pub vram_necessaria_gb: f32,
    pub descricao: Option<String>,
    pub disponivel: bool,
    pub parametros_formatado: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RagCollection {
    pub id: String,
    pub nome: String,
    pub descricao: String,
    pub modelo_embedding: String,
    pub total_documentos: i32,
    pub total_chunks: i32,
    pub status: String,
    pub criado_em: String,
    pub ultima_atualizacao: Option<String>,
    pub documentos: Vec<RagDocument>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RagDocument {
    pub id: String,
    pub nome_arquivo: String,
    pub tipo_arquivo: String,
    pub tamanho_bytes: i64,
    pub total_chunks: i32,
    pub status: String,
    pub enviado_em: String,
    pub erro_mensagem: Option<String>,
    pub tamanho_formatado: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub id: String,
    pub conteudo: String,
    pub role: String,
    pub timestamp: String,
    pub fontes_utilizadas: Option<Vec<String>>,
    pub model: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeamInfo {
    pub id: String,
    pub nome: String,
    pub owner_id: String,
    pub criado_em: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeamMemberInfo {
    pub id: String,
    pub team_id: String,
    pub user_id: String,
    pub email: String,
    pub role: String,
    pub convidado_em: String,
    pub aceito_em: Option<String>,
    pub role_formatado: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DashboardOverview {
    pub jobs: Vec<TrainingJob>,
    pub collections: Vec<RagCollection>,
    pub status: ServerStatus,
}
