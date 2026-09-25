import type { TeamsRepository } from '../domain/teams.repository';

export class TeamsUseCases {
  constructor(private readonly repository: TeamsRepository) {}

  executeGetTeams() { return this.repository.getTeams(); }
  executeCreateTeam(nome: string) { return this.repository.createTeam(nome); }
  executeGetMembers(teamId: string) { return this.repository.getMembers(teamId); }
  executeInviteMember(teamId: string, email: string, role: string) { return this.repository.inviteMember(teamId, email, role); }
  executeRemoveMember(teamId: string, userId: string) { return this.repository.removeMember(teamId, userId); }
}
