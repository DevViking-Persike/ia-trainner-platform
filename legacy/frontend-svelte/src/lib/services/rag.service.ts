/**
 * Unified RAG Service — works in both Web (SSR) and Tauri (IPC) modes.
 */
import { isTauri } from '$lib/services/platform';
import type { RagCollection, RagDocument, ChatMessage } from '$lib/types';

export interface RagService {
  getCollections(): Promise<RagCollection[]>;
  getCollection(id: string): Promise<RagCollection | null>;
  createCollection(nome: string, descricao: string, modeloEmbedding?: string): Promise<RagCollection>;
  deleteCollection(id: string): Promise<void>;
  uploadDocument(collectionId: string, filePath: string): Promise<RagDocument>;
  query(collectionId: string, pergunta: string, model?: string): Promise<ChatMessage[]>;
}

class TauriRagService implements RagService {
  async getCollections() {
    const tauri = await import('$lib/tauri');
    return tauri.rag.getCollections();
  }

  async getCollection(id: string) {
    const tauri = await import('$lib/tauri');
    return tauri.rag.getCollection(id);
  }

  async createCollection(nome: string, descricao: string, modeloEmbedding?: string) {
    const tauri = await import('$lib/tauri');
    return tauri.rag.createCollection(nome, descricao, modeloEmbedding || 'text-embedding-ada-002');
  }

  async deleteCollection(id: string) {
    const tauri = await import('$lib/tauri');
    return tauri.rag.deleteCollection(id);
  }

  async uploadDocument(collectionId: string, filePath: string) {
    const tauri = await import('$lib/tauri');
    return tauri.rag.uploadDocument(collectionId, filePath);
  }

  async query(collectionId: string, pergunta: string, model?: string) {
    const tauri = await import('$lib/tauri');
    return tauri.rag.query(collectionId, pergunta, model);
  }
}

class WebRagService implements RagService {
  async getCollections(): Promise<RagCollection[]> {
    throw new Error('Web RAG uses SSR — should not call this directly.');
  }
  async getCollection(): Promise<RagCollection | null> {
    throw new Error('Web RAG uses SSR.');
  }
  async createCollection(): Promise<RagCollection> {
    throw new Error('Web RAG uses form actions.');
  }
  async deleteCollection(): Promise<void> {
    throw new Error('Web RAG uses form actions.');
  }
  async uploadDocument(): Promise<RagDocument> {
    throw new Error('Web RAG uses form actions.');
  }
  async query(): Promise<ChatMessage[]> {
    throw new Error('Web RAG uses form actions.');
  }
}

let _instance: RagService | null = null;

export function getRagService(): RagService {
  if (!_instance) {
    _instance = isTauri() ? new TauriRagService() : new WebRagService();
  }
  return _instance;
}
