import type { PageServerLoad } from './$types';
import { serverStatusDependencies } from '$lib/server/serverStatus';

export const load: PageServerLoad = async () => {
  const status = await serverStatusDependencies.getStatus.execute();
  return { status };
};
