import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ragDependencies } from '$lib/server/rag';

export const load: PageServerLoad = async () => {
  const collections = await ragDependencies.useCases.executeGetCollections();
  return { colecoes: collections };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const nome = data.get('nome')?.toString();
    const descricao = data.get('descricao')?.toString() || '';

    if (!nome) return fail(400, { erro: 'O nome da coleção é obrigatório.' });

    try {
      await ragDependencies.useCases.executeCreateCollection(nome, descricao);
      return { success: true };
    } catch { return fail(500, { erro: 'Erro ao criar coleção.' }); }
  },

  delete: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id')?.toString();

    if (!id) return fail(400, { erro: 'ID inválido.' });

    try {
      await ragDependencies.useCases.executeDeleteCollection(id);
      return { success: true };
    } catch { return fail(500, { erro: 'Erro ao excluir coleção.' }); }
  }
};
