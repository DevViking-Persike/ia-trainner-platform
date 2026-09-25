<script lang="ts">
  import { onMount } from 'svelte';
  import { isTauri } from '$lib/services/platform';
  import { getRagService } from '$lib/services/rag.service';
  import { enhance } from '$app/forms';
  import { notifications } from '$lib/stores/notifications';

  let { data, form } = $props();
  let colecoes = $state(data.colecoes ?? []);

  onMount(async () => {
    if (isTauri()) {
      try {
        colecoes = await getRagService().getCollections();
      } catch (e) {
        console.error('Erro ao carregar coleções via Tauri', e);
      }
    }
  });
  let processando = $state(false);
  let showForm = $state(false);

  $effect(() => {
    if (form?.erro) notifications.error(form.erro);
    if (form?.sucesso) {
      notifications.success(form.sucesso);
      showForm = false;
    }
  });
</script>

<svelte:head><title>RAG — IA Trainner</title></svelte:head>

<div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
  <div>
    <h1 class="page-title">RAG Collections</h1>
    <p class="page-subtitle">Gerencie seus workspaces de documentos</p>
  </div>
  <button class="btn btn-primary" onclick={() => showForm = !showForm}>
    {showForm ? '✕ Fechar' : '+ Nova Coleção'}
  </button>
</div>

{#if showForm}
  <div class="card" style="margin-bottom: var(--spacing-xl);">
    <form method="POST" action="?/create" use:enhance={() => {
      processando = true;
      return async ({ update, result }) => {
        processando = false;
        if (result.type === 'success') {
            update({ reset: true });
        }
      };
    }}>
      <div class="form-grid form-grid-2" style="margin-bottom: var(--spacing-md);">
        <div class="form-group">
          <label class="form-label" for="col-nome">Nome</label>
          <input id="col-nome" name="nome" class="input" placeholder="minha-colecao" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="col-modelo">Modelo Embedding</label>
          <select id="col-modelo" name="modelo" class="select">
            <option value="nomic-embed-text">nomic-embed-text</option>
            <option value="mxbai-embed-large">mxbai-embed-large</option>
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom: var(--spacing-lg);">
        <label class="form-label" for="col-desc">Descrição</label>
        <textarea id="col-desc" name="descricao" class="textarea" placeholder="Sobre o que são esses documentos?"></textarea>
      </div>
      <button class="btn btn-primary" disabled={processando} type="submit">
        {processando ? 'Criando...' : 'Criar Coleção'}
      </button>
    </form>
  </div>
{/if}

{#if colecoes.length === 0}
  <div class="card">
    <div class="empty-state">
      <div class="empty-state-icon">📚</div>
      <div class="empty-state-title">Nenhuma coleção</div>
      <div class="empty-state-text">Crie uma coleção para começar a fazer upload de documentos.</div>
    </div>
  </div>
{:else}
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--spacing-md);">
    {#each colecoes as col}
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
          <div>
            <div style="font-size: 1rem; font-weight: 600;">{col.nome}</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary);">{col.descricao || 'Sem descrição'}</div>
          </div>
          <span class="badge badge-success">Pronto</span>
        </div>

        <div style="display: flex; gap: var(--spacing-xl); margin-bottom: var(--spacing-md);">
          <div>
            <div style="font-size: 1.3rem; font-weight: 700;">{col.total_documentos}</div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">Documentos</div>
          </div>
          <div>
            <div style="font-size: 1.3rem; font-weight: 700;">{col.total_documentos * 12}</div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">Chunks</div>
          </div>
        </div>

        <div style="display: flex; gap: var(--spacing-sm);">
          <a href="/rag/chat?id={col.id}" class="btn btn-secondary btn-sm" style="flex: 1;">💬 Chat</a>
          <form method="POST" action="?/delete" use:enhance>
            <input type="hidden" name="id" value={col.id} />
             <button class="btn btn-danger btn-sm" type="submit">🗑</button>
          </form>
        </div>
      </div>
    {/each}
  </div>
{/if}
