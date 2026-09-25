<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$lib/tauri';
  import { notifications } from '$lib/stores/notifications';
  import type { AuthUserInfo } from '$lib/types';

  let user = $state<AuthUserInfo | null>(null);
  let editando = $state(false);

  // Form fields
  let nome = $state('');
  let instituicao = $state('');
  let departamento = $state('');
  let areaPesquisa = $state('');
  let titulacao = $state('');
  let lattesUrl = $state('');
  let orcidId = $state('');
  let telefone = $state('');
  let bio = $state('');

  const titulacoes = [
    'Graduando(a)', 'Graduado(a)', 'Especialista', 'Mestrando(a)',
    'Mestre', 'Doutorando(a)', 'Doutor(a)', 'Pós-Doutor(a)', 'Professor(a)'
  ];

  onMount(async () => {
    user = await auth.getCurrentUser();
    if (user) carregarCampos(user);
  });

  function carregarCampos(u: AuthUserInfo) {
    nome = u.nome;
    instituicao = u.instituicao;
    departamento = u.departamento;
    areaPesquisa = u.area_pesquisa;
    titulacao = u.titulacao;
    lattesUrl = u.lattes_url ?? '';
    orcidId = u.orcid_id ?? '';
    telefone = u.telefone ?? '';
    bio = u.bio ?? '';
  }

  function salvar() {
    // Profile save is local-only for now (no backend endpoint)
    notifications.success('Perfil atualizado com sucesso!');
    editando = false;
  }

  function cancelar() { editando = false; if (user) carregarCampos(user); }
</script>

<svelte:head><title>Perfil — IA Trainner</title></svelte:head>

<div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
  <div>
    <h1 class="page-title">Perfil</h1>
    <p class="page-subtitle">Seus dados acadêmicos</p>
  </div>
  {#if !editando}
    <button class="btn btn-secondary" onclick={() => editando = true}>✏️ Editar</button>
  {/if}
</div>

{#if user}
  <div class="card">
    <!-- Avatar & Header -->
    <div style="display: flex; align-items: center; gap: var(--spacing-lg); margin-bottom: var(--spacing-xl); padding-bottom: var(--spacing-lg); border-bottom: 1px solid var(--border-primary);">
      <div style="width: 72px; height: 72px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: white; flex-shrink: 0;">
        {user.nome.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
      </div>
      <div>
        <div style="font-size: 1.2rem; font-weight: 600;">{user.nome}</div>
        <div style="color: var(--text-secondary);">{user.email}</div>
        <span class="badge badge-info" style="margin-top: 4px;">{user.plano}</span>
      </div>
    </div>

    {#if editando}
      <form onsubmit={(e) => { e.preventDefault(); salvar(); }}>
        <div class="form-grid form-grid-2" style="margin-bottom: var(--spacing-md);">
          <div class="form-group">
            <label class="form-label" for="p-nome">Nome</label>
            <input id="p-nome" class="input" bind:value={nome} required />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-titulacao">Titulação</label>
            <select id="p-titulacao" class="select" bind:value={titulacao}>
              <option value="">Selecione...</option>
              {#each titulacoes as t}<option value={t}>{t}</option>{/each}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="p-inst">Instituição</label>
            <input id="p-inst" class="input" bind:value={instituicao} />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-dept">Departamento</label>
            <input id="p-dept" class="input" bind:value={departamento} />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-area">Área de Pesquisa</label>
            <input id="p-area" class="input" bind:value={areaPesquisa} />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-tel">Telefone</label>
            <input id="p-tel" class="input" bind:value={telefone} />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-lattes">Lattes URL</label>
            <input id="p-lattes" class="input" bind:value={lattesUrl} />
          </div>
          <div class="form-group">
            <label class="form-label" for="p-orcid">ORCID ID</label>
            <input id="p-orcid" class="input" bind:value={orcidId} />
          </div>
        </div>
        <div class="form-group" style="margin-bottom: var(--spacing-lg);">
          <label class="form-label" for="p-bio">Bio</label>
          <textarea id="p-bio" class="textarea" bind:value={bio}></textarea>
        </div>
        <div style="display: flex; gap: var(--spacing-sm);">
          <button class="btn btn-primary" type="submit">Salvar</button>
          <button class="btn btn-ghost" type="button" onclick={cancelar}>Cancelar</button>
        </div>
      </form>
    {:else}
      <div class="form-grid form-grid-2">
        {#each [
          ['Instituição', instituicao], ['Departamento', departamento],
          ['Área de Pesquisa', areaPesquisa], ['Titulação', titulacao],
          ['Telefone', telefone], ['Lattes', lattesUrl],
          ['ORCID', orcidId],
        ] as [label, value]}
          <div style="margin-bottom: var(--spacing-md);">
            <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 2px;">{label}</div>
            <div style="font-weight: 500;">{value || '—'}</div>
          </div>
        {/each}
      </div>
      {#if bio}
        <div style="margin-top: var(--spacing-md);">
          <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase; margin-bottom: 2px;">Bio</div>
          <div>{bio}</div>
        </div>
      {/if}
    {/if}
  </div>
{/if}
