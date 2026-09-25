/**
 * Typed wrapper over Tauri invoke() for all backend commands.
 * The frontend NEVER contains business logic — all operations
 * go through these commands which execute in Rust.
 */
import { invoke } from '@tauri-apps/api/core';
import type {
  AuthUserInfo, TrainingJob, ServerStatus, ModelInfo,
  TeamInfo, TeamMemberInfo, RagCollection, RagDocument,
  ChatMessage, ChatSession, ThemeMode
} from './types';

// ══════════════════════════════════════════
// Auth
// ══════════════════════════════════════════

export const auth = {
  login: (email: string, senha: string) =>
    invoke<AuthUserInfo>('login', { email, senha }),

  register: (nome: string, email: string, senha: string, confirmarSenha: string) =>
    invoke<AuthUserInfo>('register', { nome, email, senha, confirmarSenha }),

  logout: () => invoke<void>('logout'),

  restoreSession: () => invoke<boolean>('restore_session'),

  resendVerification: (email: string, nome?: string) =>
    invoke<void>('resend_verification', { email, nome }),

  getCurrentUser: () => invoke<AuthUserInfo | null>('get_current_user'),

  isAuthenticated: () => invoke<boolean>('is_authenticated'),
};

// ══════════════════════════════════════════
// Training
// ══════════════════════════════════════════

export const training = {
  getJobs: () => invoke<TrainingJob[]>('get_jobs'),

  getJob: (id: string) => invoke<TrainingJob | null>('get_job', { id }),

  createJob: (nome: string, descricao: string, modeloBase: string, epocas: number, learningRate: number, batchSize: number) =>
    invoke<TrainingJob>('create_job', { nome, descricao, modeloBase, epocas, learningRate, batchSize }),

  startJob: (id: string) => invoke<TrainingJob>('start_job', { id }),

  cancelJob: (id: string) => invoke<TrainingJob>('cancel_job', { id }),

  deleteJob: (id: string) => invoke<void>('delete_job', { id }),

  getServerStatus: () => invoke<ServerStatus>('get_server_status'),
};

// ══════════════════════════════════════════
// Models
// ══════════════════════════════════════════

export const models = {
  getAvailable: () => invoke<ModelInfo[]>('get_available_models'),

  chat: (model: string, message: string, history?: [string, string][]) =>
    invoke<string>('chat_with_model', { model, message, history }),
};

// ══════════════════════════════════════════
// RAG
// ══════════════════════════════════════════

export const rag = {
  getCollections: () => invoke<RagCollection[]>('get_collections'),

  getCollection: (id: string) => invoke<RagCollection | null>('get_collection', { id }),

  createCollection: (nome: string, descricao: string, modeloEmbedding: string) =>
    invoke<RagCollection>('create_collection', { nome, descricao, modeloEmbedding }),

  deleteCollection: (id: string) => invoke<void>('delete_collection', { id }),

  uploadDocument: (collectionId: string, filePath: string) =>
    invoke<RagDocument>('upload_document', { collectionId, filePath }),

  query: (collectionId: string, pergunta: string, model?: string) =>
    invoke<ChatMessage[]>('query_rag', { collectionId, pergunta, model }),
};

// ══════════════════════════════════════════
// Chat History
// ══════════════════════════════════════════

export const chatHistory = {
  createSession: (userId: string, collectionId: string, collectionName: string) =>
    invoke<ChatSession>('create_chat_session', { userId, collectionId, collectionName }),

  getSession: (sessionId: string) =>
    invoke<ChatSession | null>('get_chat_session', { sessionId }),

  getSessions: (userId: string, collectionId?: string) =>
    invoke<ChatSession[]>('get_chat_sessions', { userId, collectionId }),

  addMessage: (sessionId: string, message: ChatMessage) =>
    invoke<void>('add_chat_message', { sessionId, message }),

  updateTitle: (sessionId: string, title: string) =>
    invoke<void>('update_session_title', { sessionId, title }),

  deleteSession: (sessionId: string) =>
    invoke<void>('delete_chat_session', { sessionId }),
};

// ══════════════════════════════════════════
// Teams
// ══════════════════════════════════════════

export const teams = {
  getTeams: () => invoke<TeamInfo[]>('get_teams'),

  createTeam: (nome: string) => invoke<TeamInfo>('create_team', { nome }),

  inviteToTeam: (teamId: string, email: string, role?: string) =>
    invoke<boolean>('invite_to_team', { teamId, email, role }),

  getMembers: (teamId: string) =>
    invoke<TeamMemberInfo[]>('get_team_members', { teamId }),

  removeMember: (teamId: string, userId: string) =>
    invoke<boolean>('remove_member', { teamId, userId }),
};

// ══════════════════════════════════════════
// Theme
// ══════════════════════════════════════════

export const theme = {
  get: () => invoke<ThemeMode>('get_theme'),
  set: (mode: ThemeMode) => invoke<void>('set_theme', { mode }),
  toggle: () => invoke<ThemeMode>('toggle_theme'),
};
