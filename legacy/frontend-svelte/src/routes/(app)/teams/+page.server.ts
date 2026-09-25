import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { teamsDependencies } from '$lib/server/teams';

export const load: PageServerLoad = async () => {
  const teams = await teamsDependencies.useCases.executeGetTeams();
  // Fetch members for all teams so UI can accordion it directly,
  // or handle dynamic fetching via separate endpoints. For simplicity, we fetch all here.
  const teamsWithMembers = await Promise.all(
    teams.map(async t => ({
        ...t,
        membros: await teamsDependencies.useCases.executeGetMembers(t.id)
    }))
  );

  return { equipes: teamsWithMembers };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const nome = data.get('nome')?.toString();
    if (!nome) return fail(400, { erro: 'Nome obrigatório' });
    try {
      await teamsDependencies.useCases.executeCreateTeam(nome);
      return { success: true };
    } catch { return fail(500, { erro: 'Erro ao criar' }); }
  },

  invite: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email')?.toString();
    const role = data.get('role')?.toString() || 'viewer';
    const teamId = data.get('teamId')?.toString();

    if (!email || !teamId) return fail(400, { erro: 'Dados inválidos' });
    try {
      await teamsDependencies.useCases.executeInviteMember(teamId, email, role);
      return { success: true };
    } catch { return fail(500, { erro: 'Erro ao convidar' }); }
  },

  remove: async ({ request }) => {
    const data = await request.formData();
    const teamId = data.get('teamId')?.toString();
    const userId = data.get('userId')?.toString();

    if (!userId || !teamId) return fail(400, { erro: 'Dados inválidos' });
    try {
      await teamsDependencies.useCases.executeRemoveMember(teamId, userId);
      return { success: true };
    } catch { return fail(500, { erro: 'Erro ao remover' }); }
  }
};
