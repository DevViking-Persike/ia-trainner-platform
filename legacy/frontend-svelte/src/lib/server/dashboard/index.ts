import { DashboardMockRepository } from './infrastructure/dashboard.mock.repository';
import { GetDashboardOverviewUseCase } from './application/get-dashboard-overview';

const dashboardRepository = new DashboardMockRepository();

export const dashboardDependencies = {
  getOverview: new GetDashboardOverviewUseCase(dashboardRepository)
};
