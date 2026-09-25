import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  throw redirect(303, '/');
};

export const actions: Actions = {
  default: async ({ cookies, locals }) => {
    cookies.delete('ia_trainner_session', { path: '/' });
    locals.session = null;
    throw redirect(303, '/login');
  }
};
