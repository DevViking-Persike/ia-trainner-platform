<script lang="ts">
  import { onMount } from 'svelte';
  import { isTauri } from '$lib/services/platform';
  import { getTeamsService } from '$lib/services/teams.service';
  import { enhance } from '$app/forms';
  import { notifications } from '$lib/stores/notifications';

  let { data, form } = $props();

  let equipes = $state(data.equipes ?? []);
  let selecionada = $state<string | null>(null);

  onMount(async () => {
    if (isTauri()) {
      try {
        equipes = await getTeamsService().getTeams();
      } catch (e) {
        console.error('Erro ao carregar equipes via Tauri', e);
      }
    }
  });

  // Exibir notificações de erro retornadas pelo +page.server.ts
  $effect(() => {
    if (form?.erro) notifications.error(form.erro);
  });

  let criando = $state(false);
  let convidando = $state(false);

  function toggleMembros(id: string) {
    if (selecionada === id) { selecionada = null; return; }
    selecionada = id;
  }
</script>

<svelte:head><title>Equipes — IA Trainner</title></svelte:head>

<div class="page-header">
  <h1 class="page-title">Equipes</h1>
  <p class="page-subtitle">Gerencie suas equipes e colaboradores</p>
</div>

<!-- Create team -->
<div class="card" style="margin-bottom: var(--spacing-xl);">
  <div class="card-title" style="margin-bottom: var(--spacing-md);">Nova Equipe</div>
  <form method="POST" action="?/create" use:enhance={() => {
    criando = true;
    return async ({ update, result }) => {
      criando = false;
      if (result.type === 'success') {
          notifications.success('Equipe criada com sucesso!');
          update({ reset: true });
      }
    };
  }} style="display: flex; gap: var(--spacing-sm);">
    <input name="nome" class="input" placeholder="Nome da equipe" style="flex: 1;" required />
    <button class="btn btn-primary" disabled={criando} type="submit">
      {criando ? 'Criando...' : 'Criar'}
    </button>
  </form>
</div>

{#if equipes.length === 0}
  <div class="card">
    <div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <div class="empty-state-title">Nenhuma equipe</div>
      <div class="empty-state-text">Crie uma equipe para colaborar com outros pesquisadores.</div>
    </div>
  </div>
{:else}
  {#each equipes as equipe}
    <div class="card" style="margin-bottom: var(--spacing-md);">
      <button type="button" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; width: 100%; background: none; border: none; color: inherit; padding: 0; font: inherit; text-align: left;" onclick={() => toggleMembros(equipe.id)}>
        <div>
          <div style="font-weight: 600;">{equipe.nome}</div>
          <div style="font-size: 0.75rem; color: var(--text-tertiary);">Criada em {new Date(equipe.criado_em).toLocaleDateString('pt-BR')}</div>
        </div>
        <span style="color: var(--text-tertiary);">{selecionada === equipe.id ? '▲' : '▼'}</span>
      </button>

      {#if selecionada === equipe.id}
        <div style="margin-top: var(--spacing-md); padding-top: var(--spacing-md); border-top: 1px solid var(--border-primary);">
          <!-- Invite form -->
          <form method="POST" action="?/invite" use:enhance={() => {
            convidando = true;
            return async ({ update, result }) => {
              convidando = false;
              if (result.type === 'success') {
                notifications.success('Convite enviado!');
                update({ reset: true });
              }
            };
          }} style="display: flex; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
            <input type="hidden" name="teamId" value={equipe.id} />
            <input name="email" class="input" placeholder="email@exemplo.com" style="flex: 1;" required />
            <select name="role" class="select" style="width: 150px;">
              <option value="viewer">Visualizador</option>
              <option value="admin">Administrador</option>
            </select>
            <button class="btn btn-secondary" disabled={convidando} type="submit">Convidar</button>
          </form>

          <!-- Members -->
          {#if equipe.membros.length === 0}
            <div style="color: var(--text-tertiary); font-size: 0.85rem;">Nenhum membro ainda.</div>
          {:else}
            <div class="table-container">
              <table>
                <thead>
                  <tr><th>Email</th><th>Papel</th><th>Convidado</th><th></th></tr>
                </thead>
                <tbody>
                  {#each equipe.membros as m}
                    <tr>
                      <td>{m.email}</td>
                      <td><span class="badge badge-info">{m.role_formatado}</span></td>
                      <td style="font-size: 0.78rem; color: var(--text-tertiary);">{new Date(m.convidado_em).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <form method="POST" action="?/remove" use:enhance>
                           <input type="hidden" name="teamId" value={equipe.id} />
                           <input type="hidden" name="userId" value={m.user_id} />
                           <button class="btn btn-ghost btn-sm" type="submit">🗑</button>
                        </form>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
{/if}
