import type { PageServerLoad } from './$types';
import { dashboardDependencies } from '$lib/server/dashboard';

export const load: PageServerLoad = async () => {
  const data = await dashboardDependencies.getOverview.execute();
  return {
    dashboard: data
  };
};
