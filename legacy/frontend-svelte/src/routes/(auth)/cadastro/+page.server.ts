import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { authDependencies } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) {
    throw redirect(303, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const nome = data.get('nome')?.toString() || '';
    const email = data.get('email')?.toString() || '';
    const senha = data.get('senha')?.toString() || '';
    const confirmar = data.get('confirmar')?.toString() || '';

    try {
      const response = await authDependencies.registerUser.execute(nome, email, senha, confirmar);

      const payload = {
        user: response.user,
        exp: Date.now() + 1000 * 60 * 60 * 24 // 24 hours
      };

      cookies.set('ia_trainner_session', btoa(JSON.stringify(payload)), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24
      });

      throw redirect(303, '/');
    } catch (e: any) {
      return fail(400, { erro: e.message || 'Erro ao criar conta', nome, email });
    }
  }
};
