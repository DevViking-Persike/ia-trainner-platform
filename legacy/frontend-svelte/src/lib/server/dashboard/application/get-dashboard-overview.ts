import type { DashboardRepository } from '../domain/dashboard.repository';

export class GetDashboardOverviewUseCase {
  constructor(private readonly repository: DashboardRepository) {}

  execute() {
    return this.repository.getOverview();
  }
}
