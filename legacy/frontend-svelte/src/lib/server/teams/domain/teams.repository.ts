import type { TeamInfo, TeamMemberInfo } from '$lib/types';

export interface TeamsRepository {
  getTeams(): Promise<TeamInfo[]>;
  createTeam(nome: string): Promise<TeamInfo>;
  getMembers(teamId: string): Promise<TeamMemberInfo[]>;
  inviteMember(teamId: string, email: string, role: string): Promise<boolean>;
  removeMember(teamId: string, userId: string): Promise<boolean>;
}
