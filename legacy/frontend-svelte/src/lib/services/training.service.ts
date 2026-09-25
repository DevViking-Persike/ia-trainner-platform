/**
 * Unified Training Service — works in both Web (SSR) and Tauri (IPC) modes.
 */
import { isTauri } from '$lib/services/platform';
import type { TrainingJob, ServerStatus } from '$lib/types';

export interface TrainingService {
  getJobs(): Promise<TrainingJob[]>;
  getJob(id: string): Promise<TrainingJob | null>;
  createJob(nome: string, descricao: string, modeloBase: string, epocas: number, learningRate: number, batchSize: number): Promise<TrainingJob>;
  startJob(id: string): Promise<TrainingJob>;
  cancelJob(id: string): Promise<TrainingJob>;
  deleteJob(id: string): Promise<void>;
  getServerStatus(): Promise<ServerStatus>;
}

class TauriTrainingService implements TrainingService {
  async getJobs() {
    const tauri = await import('$lib/tauri');
    return tauri.training.getJobs();
  }

  async getJob(id: string) {
    const tauri = await import('$lib/tauri');
    return tauri.training.getJob(id);
  }

  async createJob(nome: string, descricao: string, modeloBase: string, epocas: number, learningRate: number, batchSize: number) {
    const tauri = await import('$lib/tauri');
    return tauri.training.createJob(nome, descricao, modeloBase, epocas, learningRate, batchSize);
  }

  async startJob(id: string) {
    const tauri = await import('$lib/tauri');
    return tauri.training.startJob(id);
  }

  async cancelJob(id: string) {
    const tauri = await import('$lib/tauri');
    return tauri.training.cancelJob(id);
  }

  async deleteJob(id: string) {
    const tauri = await import('$lib/tauri');
    return tauri.training.deleteJob(id);
  }

  async getServerStatus() {
    const tauri = await import('$lib/tauri');
    return tauri.training.getServerStatus();
  }
}

class WebTrainingService implements TrainingService {
  async getJobs(): Promise<TrainingJob[]> {
    throw new Error('Web training uses SSR — should not call this directly.');
  }
  async getJob(): Promise<TrainingJob | null> {
    throw new Error('Web training uses SSR.');
  }
  async createJob(): Promise<TrainingJob> {
    throw new Error('Web training uses form actions.');
  }
  async startJob(): Promise<TrainingJob> {
    throw new Error('Web training uses form actions.');
  }
  async cancelJob(): Promise<TrainingJob> {
    throw new Error('Web training uses form actions.');
  }
  async deleteJob(): Promise<void> {
    throw new Error('Web training uses form actions.');
  }
  async getServerStatus(): Promise<ServerStatus> {
    throw new Error('Web server status uses SSR.');
  }
}

let _instance: TrainingService | null = null;

export function getTrainingService(): TrainingService {
  if (!_instance) {
    _instance = isTauri() ? new TauriTrainingService() : new WebTrainingService();
  }
  return _instance;
}
