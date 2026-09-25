import { TeamsMockRepository } from './infrastructure/teams.mock.repository';
import { TeamsUseCases } from './application/teams-use-cases';

const repository = new TeamsMockRepository();

export const teamsDependencies = {
  useCases: new TeamsUseCases(repository)
};
