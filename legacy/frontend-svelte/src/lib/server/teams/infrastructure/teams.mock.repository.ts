import type { TeamInfo, TeamMemberInfo } from '$lib/types';
import type { TeamsRepository } from '../domain/teams.repository';

// Simple in-memory mock state for Teams across requests
let mockTeams: TeamInfo[] = [
  { id: '1', nome: 'Pesquisa LLM Llama3', criado_em: '2026-03-01T00:00:00Z' },
  { id: '2', nome: 'Grupo NLP - UFPR', criado_em: '2026-02-15T00:00:00Z' }
];

let mockMembers: Record<string, TeamMemberInfo[]> = {
  '1': [
    { team_id: '1', user_id: 'u1', email: 'professor@example.com', role: 'admin', role_formatado: 'Administrador', convidado_em: '2026-03-01T00:00:00Z' }
  ],
  '2': []
};

export class TeamsMockRepository implements TeamsRepository {
  async getTeams(): Promise<TeamInfo[]> {
    return mockTeams;
  }

  async createTeam(nome: string): Promise<TeamInfo> {
    const novo: TeamInfo = {
      id: Math.random().toString(36).substr(2, 9),
      nome,
      criado_em: new Date().toISOString()
    };
    mockTeams = [...mockTeams, novo];
    mockMembers[novo.id] = [];
    return novo;
  }

  async getMembers(teamId: string): Promise<TeamMemberInfo[]> {
    return mockMembers[teamId] || [];
  }

  async inviteMember(teamId: string, email: string, role: string): Promise<boolean> {
    if (!mockMembers[teamId]) mockMembers[teamId] = [];
    mockMembers[teamId].push({
      team_id: teamId,
      user_id: Math.random().toString(36).substr(2, 9),
      email,
      role,
      role_formatado: role === 'admin' ? 'Administrador' : 'Visualizador',
      convidado_em: new Date().toISOString()
    });
    return true;
  }

  async removeMember(teamId: string, userId: string): Promise<boolean> {
    if (!mockMembers[teamId]) return false;
    mockMembers[teamId] = mockMembers[teamId].filter(m => m.user_id !== userId);
    return true;
  }
}
