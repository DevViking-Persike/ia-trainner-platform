/**
 * Unified Teams Service — works in both Web (SSR) and Tauri (IPC) modes.
 */
import { isTauri } from '$lib/services/platform';
import type { TeamInfo, TeamMemberInfo } from '$lib/types';

export interface TeamsService {
  getTeams(): Promise<TeamInfo[]>;
  createTeam(nome: string): Promise<TeamInfo>;
  inviteToTeam(teamId: string, email: string, role?: string): Promise<boolean>;
  getMembers(teamId: string): Promise<TeamMemberInfo[]>;
  removeMember(teamId: string, userId: string): Promise<boolean>;
}

class TauriTeamsService implements TeamsService {
  async getTeams() {
    const tauri = await import('$lib/tauri');
    return tauri.teams.getTeams();
  }

  async createTeam(nome: string) {
    const tauri = await import('$lib/tauri');
    return tauri.teams.createTeam(nome);
  }

  async inviteToTeam(teamId: string, email: string, role?: string) {
    const tauri = await import('$lib/tauri');
    return tauri.teams.inviteToTeam(teamId, email, role);
  }

  async getMembers(teamId: string) {
    const tauri = await import('$lib/tauri');
    return tauri.teams.getMembers(teamId);
  }

  async removeMember(teamId: string, userId: string) {
    const tauri = await import('$lib/tauri');
    return tauri.teams.removeMember(teamId, userId);
  }
}

class WebTeamsService implements TeamsService {
  async getTeams(): Promise<TeamInfo[]> {
    throw new Error('Web teams uses SSR.');
  }
  async createTeam(): Promise<TeamInfo> {
    throw new Error('Web teams uses form actions.');
  }
  async inviteToTeam(): Promise<boolean> {
    throw new Error('Web teams uses form actions.');
  }
  async getMembers(): Promise<TeamMemberInfo[]> {
    throw new Error('Web teams uses SSR.');
  }
  async removeMember(): Promise<boolean> {
    throw new Error('Web teams uses form actions.');
  }
}

let _instance: TeamsService | null = null;

export function getTeamsService(): TeamsService {
  if (!_instance) {
    _instance = isTauri() ? new TauriTeamsService() : new WebTeamsService();
  }
  return _instance;
}
