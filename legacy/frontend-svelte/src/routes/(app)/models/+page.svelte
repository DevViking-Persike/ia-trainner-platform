<script lang="ts">
  import { onMount } from 'svelte';
  import { isTauri } from '$lib/services/platform';
  import { getModelsService } from '$lib/services/models.service';

  let { data } = $props();
  let modelos = $state(data.models ?? []);

  onMount(async () => {
    if (isTauri()) {
      try {
        modelos = await getModelsService().getAvailable();
      } catch (e) {
        console.error('Erro ao carregar modelos via Tauri', e);
      }
    }
  });

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
</script>

<svelte:head><title>Modelos — IA Trainner</title></svelte:head>

<div class="page-header">
  <h1 class="page-title">Modelos Disponíveis</h1>
  <p class="page-subtitle">Modelos de IA baixados e geridos via Ollama</p>
</div>

{#if modelos.length === 0}
  <div class="card">
    <div class="empty-state">
      <div class="empty-state-icon">🤖</div>
      <div class="empty-state-title">Nenhum modelo disponível</div>
      <div class="empty-state-text">O servidor Ollama não retornou modelos.</div>
    </div>
  </div>
{:else}
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-md);">
    {#each modelos as m}
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
          <div>
            <div style="font-size: 1rem; font-weight: 600;">{m.nome}</div>
            <div style="font-size: 0.78rem; color: var(--text-secondary);">{m.familia}</div>
          </div>
          <span class="badge {m.disponivel ? 'badge-success' : 'badge-error'}">
            {m.disponivel ? 'Disponível' : 'Indisponível'}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
          <div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">Parâmetros</div>
            <div style="font-weight: 600;">{m.parametros_formatado}</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">Tamanho</div>
            <div style="font-weight: 600;">{m.tamanho}</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">VRAM</div>
            <div style="font-weight: 600;">{m.vram_necessaria_gb} GB</div>
          </div>
          <div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary); text-transform: uppercase;">RAG</div>
            <div style="font-weight: 600;">{m.suporta_rag ? '✅' : '❌'}</div>
          </div>
        </div>

        <a href="/models/chat?model={m.id}" class="btn btn-secondary btn-sm" style="width: 100%;">
          💬 Chat com {m.nome}
        </a>
      </div>
    {/each}
  </div>
{/if}
