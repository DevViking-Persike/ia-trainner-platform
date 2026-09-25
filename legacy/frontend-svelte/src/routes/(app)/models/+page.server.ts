import type { PageServerLoad } from './$types';
import { modelsDependencies } from '$lib/server/models';

export const load: PageServerLoad = async () => {
  const models = await modelsDependencies.useCases.executeGetAvailable();
  return {
    models
  };
};
