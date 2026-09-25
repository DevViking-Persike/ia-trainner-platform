use crate::models::*;
use tauri::{command, AppHandle, Runtime, State};
use tauri_plugin_store::StoreExt;
use serde_json::json;
use std::sync::Mutex;

pub struct AuthState {
    pub user: Mutex<Option<AuthUserInfo>>,
}

// ══════════════════════════════════════════
// Auth Commands
// ══════════════════════════════════════════

#[command]
pub async fn login<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AuthState>,
    email: String,
    senha: String
) -> Result<AuthUserInfo, String> {
    if email == "teste@exemplo.com" && senha == "Senha123!@#123" {
        let user = AuthUserInfo {
            id: "user-123".into(),
            nome: "Usuário Teste Tauri".into(),
            email,
            avatar_url: None,
            plano: "Researcher".into(),
            creditos_restantes: 500,
            instituicao: "Universidade Federal de Testes".into(),
            departamento: "Ciência da Computação".into(),
            area_pesquisa: "LLM Fine-tuning".into(),
            titulacao: "Mestre".into(),
            lattes_url: None,
            orcid_id: None,
            telefone: None,
            bio: None,
            criado_em: Some("2026-04-14T00:00:00Z".into()),
            total_treinamentos: 12,
            total_colecoes: 5,
            horas_gpu_usadas: 45.5,
        };

        // Salvar no estado em memória
        let mut user_state = state.user.lock().unwrap();
        *user_state = Some(user.clone());

        // Salvar persistente no Store
        let store = app.store("auth.json").map_err(|e| e.to_string())?;
        store.set("session", json!({
            "token": "mock-jwt-token-tauri",
            "user": user.clone()
        }));
        store.save().map_err(|e| e.to_string())?;

        Ok(user)
    } else {
        Err("Credenciais inválidas. Tente teste@exemplo.com e Senha123!@#123".into())
    }
}

#[command]
pub async fn register(nome: String, email: String, _senha: String, _confirmar_senha: String) -> Result<AuthUserInfo, String> {
    Ok(AuthUserInfo {
        id: "user-999".into(),
        nome,
        email,
        avatar_url: None,
        plano: "Free".into(),
        creditos_restantes: 100,
        instituicao: "".into(),
        departamento: "".into(),
        area_pesquisa: "".into(),
        titulacao: "Graduando(a)".into(),
        lattes_url: None,
        orcid_id: None,
        telefone: None,
        bio: None,
        criado_em: Some("2026-04-14T00:00:00Z".into()),
        total_treinamentos: 0,
        total_colecoes: 0,
        horas_gpu_usadas: 0.0,
    })
}

#[command]
pub async fn restore_session<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AuthState>
) -> Result<bool, String> {
    let store = app.store("auth.json").map_err(|e| e.to_string())?;
    if let Some(session) = store.get("session") {
        if let Some(user_val) = session.get("user") {
            if let Ok(user) = serde_json::from_value::<AuthUserInfo>(user_val.clone()) {
                let mut user_state = state.user.lock().unwrap();
                *user_state = Some(user);
                return Ok(true);
            }
        }
    }
    Ok(false)
}

#[command]
pub async fn get_current_user(state: State<'_, AuthState>) -> Result<Option<AuthUserInfo>, String> {
    let user_state = state.user.lock().unwrap();
    Ok(user_state.clone())
}

#[command]
pub async fn is_authenticated(state: State<'_, AuthState>) -> Result<bool, String> {
    let user_state = state.user.lock().unwrap();
    Ok(user_state.is_some())
}

#[command]
pub async fn logout<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AuthState>
) -> Result<(), String> {
    let mut user_state = state.user.lock().unwrap();
    *user_state = None;

    let store = app.store("auth.json").map_err(|e| e.to_string())?;
    store.delete("session");
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn resend_verification(_email: String, _nome: Option<String>) -> Result<(), String> {
    Ok(())
}

// ══════════════════════════════════════════
// Training Commands
// ══════════════════════════════════════════

#[command]
pub async fn get_jobs() -> Result<Vec<TrainingJob>, String> {
    Ok(vec![
        TrainingJob {
            id: "1".into(),
            nome: "LLaMA3-8B-FTEstudos".into(),
            descricao: "Fine-tuning do LLaMA 3 para fins acadêmicos".into(),
            modelo_base: "Meta-Llama-3-8B".into(),
            status: "Executando".into(),
            progresso: 0.45,
            epocas: 3,
            epoca_atual: 1,
            learning_rate: 0.0002,
            batch_size: 4,
            dataset_id: Some("ds-123".into()),
            erro_mensagem: None,
            gpu_utilizada: Some("NVIDIA RTX 4090".into()),
            criado_em: "2026-04-14T00:00:00Z".into(),
            iniciado_em: Some("2026-04-14T01:00:00Z".into()),
            finalizado_em: None,
            em_andamento: true,
            duracao_formatada: "02:15:00".into(),
        },
        TrainingJob {
            id: "2".into(),
            nome: "Bert-PTBR-Classificador".into(),
            descricao: "Classificador de sentimentos em português".into(),
            modelo_base: "neuralmind/bert-base-portuguese-cased".into(),
            status: "Concluído".into(),
            progresso: 1.0,
            epocas: 5,
            epoca_atual: 5,
            learning_rate: 0.00005,
            batch_size: 16,
            dataset_id: Some("ds-456".into()),
            erro_mensagem: None,
            gpu_utilizada: Some("NVIDIA RTX 4090".into()),
            criado_em: "2026-04-13T10:00:00Z".into(),
            iniciado_em: Some("2026-04-13T11:00:00Z".into()),
            finalizado_em: Some("2026-04-13T14:30:00Z".into()),
            em_andamento: false,
            duracao_formatada: "03:30:00".into(),
        },
    ])
}

#[command]
pub async fn get_job(_id: String) -> Result<Option<TrainingJob>, String> {
    Ok(None)
}

#[command]
pub async fn create_job(_nome: String, _descricao: String, _modelo_base: String, _epocas: i32, _learning_rate: f32, _batch_size: i32) -> Result<TrainingJob, String> {
    Ok(TrainingJob {
        id: "new-job".into(),
        nome: "Novo Job".into(),
        descricao: "".into(),
        modelo_base: "".into(),
        status: "Criado".into(),
        progresso: 0.0,
        epocas: 1,
        epoca_atual: 0,
        learning_rate: 0.0,
        batch_size: 1,
        dataset_id: None,
        erro_mensagem: None,
        gpu_utilizada: None,
        criado_em: "2026-04-14T00:00:00Z".into(),
        iniciado_em: None,
        finalizado_em: None,
        em_andamento: false,
        duracao_formatada: "00:00:00".into(),
    })
}

#[command]
pub async fn start_job(_id: String) -> Result<TrainingJob, String> {
    Err("Not implemented in mock".into())
}

#[command]
pub async fn cancel_job(_id: String) -> Result<TrainingJob, String> {
    Err("Not implemented in mock".into())
}

#[command]
pub async fn delete_job(_id: String) -> Result<(), String> {
    Ok(())
}

#[command]
pub async fn get_server_status() -> Result<ServerStatus, String> {
    Ok(ServerStatus {
        online: true,
        gpu_nome: Some("NVIDIA RTX 4090".into()),
        gpu_memoria_total: 24.0,
        gpu_memoria_usada: 14.5,
        gpu_utilizacao: 88.0,
        gpu_temperatura: 72.0,
        gpu_power_watts: 320.0,
        cpu_modelo: Some("Intel Core i9-13900K".into()),
        ram_usada: 18.2,
        ram_total: 64.0,
        jobs_ativos: 1,
        jobs_na_fila: 0,
        gpu_memoria_percentual: 60.4,
        ram_percentual: 28.4,
    })
}

// ══════════════════════════════════════════
// Models & RAG
// ══════════════════════════════════════════

#[command]
pub async fn get_available_models() -> Result<Vec<ModelInfo>, String> {
    Ok(vec![
        ModelInfo {
            id: "llama3-8b".into(),
            nome: "LLaMA 3 (8B)".into(),
            familia: "Llama".into(),
            tamanho: "8B".into(),
            parametros_b: 8.0,
            suporta_fine_tuning: true,
            suporta_rag: true,
            vram_necessaria_gb: 12.0,
            descricao: Some("Modelo de última geração da Meta".into()),
            disponivel: true,
            parametros_formatado: "8B".into(),
        }
    ])
}

#[command]
pub async fn chat_with_model(_model: String, _message: String, _history: Option<Vec<(String, String)>>) -> Result<String, String> {
    Ok("Esta é uma resposta mock do backend Rust.".into())
}

#[command]
pub async fn get_collections() -> Result<Vec<RagCollection>, String> {
    Ok(vec![
        RagCollection {
            id: "c1".into(),
            nome: "Artigos Medicina".into(),
            descricao: "Base de conhecimento médico".into(),
            modelo_embedding: "text-embedding-3-small".into(),
            total_documentos: 412,
            total_chunks: 15400,
            status: "Pronto".into(),
            criado_em: "2026-04-01T00:00:00Z".into(),
            ultima_atualizacao: None,
            documentos: vec![],
        }
    ])
}

#[command]
pub async fn get_collection(_id: String) -> Result<Option<RagCollection>, String> {
    Ok(None)
}

#[command]
pub async fn create_collection(_nome: String, _descricao: String, _modelo_embedding: String) -> Result<RagCollection, String> {
    Err("Not implemented".into())
}

#[command]
pub async fn delete_collection(_id: String) -> Result<(), String> {
    Ok(())
}

#[command]
pub async fn upload_document(_collection_id: String, _file_path: String) -> Result<RagDocument, String> {
    Err("Not implemented".into())
}

#[command]
pub async fn query_rag(_collection_id: String, _pergunta: String, _model: Option<String>) -> Result<Vec<ChatMessage>, String> {
    Ok(vec![])
}

// ══════════════════════════════════════════
// Teams
// ══════════════════════════════════════════

#[command]
pub async fn get_teams() -> Result<Vec<TeamInfo>, String> {
    Ok(vec![])
}

#[command]
pub async fn create_team(_nome: String) -> Result<TeamInfo, String> {
    Err("Not implemented".into())
}

#[command]
pub async fn invite_to_team(_team_id: String, _email: String, _role: Option<String>) -> Result<bool, String> {
    Ok(true)
}

#[command]
pub async fn get_team_members(_team_id: String) -> Result<Vec<TeamMemberInfo>, String> {
    Ok(vec![])
}

#[command]
pub async fn remove_member(_team_id: String, _user_id: String) -> Result<bool, String> {
    Ok(true)
}

// ══════════════════════════════════════════
// Theme
// ══════════════════════════════════════════

#[command]
pub async fn get_theme() -> Result<String, String> {
    Ok("dark".into())
}

#[command]
pub async fn set_theme(_mode: String) -> Result<(), String> {
    Ok(())
}

#[command]
pub async fn toggle_theme() -> Result<String, String> {
    Ok("light".into())
}
