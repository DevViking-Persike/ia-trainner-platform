<script lang="ts">
  import { onMount } from 'svelte';
  import { training, models as modelsApi } from '$lib/tauri';
  import { notifications } from '$lib/stores/notifications';
  import type { TrainingJob, ModelInfo } from '$lib/types';

  let jobs = $state<TrainingJob[]>([]);
  let modelos = $state<ModelInfo[]>([]);
  let loading = $state(true);
  let showForm = $state(false);

  // Form
  let nome = $state('');
  let descricao = $state('');
  let modelo = $state('');
  let epocas = $state(3);
  let lr = $state(0.0001);
  let batch = $state(8);
  let criando = $state(false);

  onMount(() => load());

  async function load() {
    loading = true;
    try {
      const [j, m] = await Promise.all([training.getJobs(), modelsApi.getAvailable()]);
      jobs = j;
      modelos = m;
      if (m.length > 0 && !modelo) modelo = m[0].id;
    } catch {} finally {
      loading = false;
    }
  }

  async function criarJob() {
    criando = true;
    try {
      await training.createJob(nome, descricao, modelo, epocas, lr, batch);
      notifications.success('Treinamento criado com sucesso!');
      nome = ''; descricao = ''; showForm = false;
      await load();
    } catch (e: any) {
      notifications.error(e);
    } finally {
      criando = false;
    }
  }

  async function iniciar(id: string) {
    try { await training.startJob(id); await load(); } catch (e: any) { notifications.error(e); }
  }
  async function cancelar(id: string) {
    try { await training.cancelJob(id); await load(); } catch (e: any) { notifications.error(e); }
  }
  async function excluir(id: string) {
    try { await training.deleteJob(id); await load(); } catch (e: any) { notifications.error(e); }
  }
</script>

<svelte:head><title>Treinamento — IA Trainner</title></svelte:head>

<div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
  <div>
    <h1 class="page-title">Treinamento</h1>
    <p class="page-subtitle">Gerencie seus jobs de fine-tuning</p>
  </div>
  <button class="btn btn-primary" onclick={() => showForm = !showForm}>
    {showForm ? '✕ Fechar' : '+ Novo Job'}
  </button>
</div>

{#if showForm}
  <div class="card" style="margin-bottom: var(--spacing-xl);">
    <div class="card-title" style="margin-bottom: var(--spacing-md);">Novo Treinamento</div>
    <form onsubmit={(e) => { e.preventDefault(); criarJob(); }}>
      <div class="form-grid form-grid-2" style="margin-bottom: var(--spacing-md);">
        <div class="form-group">
          <label class="form-label" for="job-nome">Nome</label>
          <input id="job-nome" class="input" bind:value={nome} placeholder="Ex: Fine-tune Llama3" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="job-modelo">Modelo Base</label>
          <select id="job-modelo" class="select" bind:value={modelo}>
            {#each modelos as m}
              <option value={m.id}>{m.nome} ({m.parametros_formatado})</option>
            {/each}
          </select>
        </div>
      </div>
      <div class="form-group" style="margin-bottom: var(--spacing-md);">
        <label class="form-label" for="job-desc">Descrição</label>
        <textarea id="job-desc" class="textarea" bind:value={descricao} placeholder="Descreva o treinamento..."></textarea>
      </div>
      <div class="form-grid form-grid-3" style="margin-bottom: var(--spacing-lg);">
        <div class="form-group">
          <label class="form-label" for="job-epocas">Épocas</label>
          <input id="job-epocas" class="input" type="number" bind:value={epocas} min="1" />
        </div>
        <div class="form-group">
          <label class="form-label" for="job-lr">Learning Rate</label>
          <input id="job-lr" class="input" type="number" bind:value={lr} step="0.0001" />
        </div>
        <div class="form-group">
          <label class="form-label" for="job-batch">Batch Size</label>
          <input id="job-batch" class="input" type="number" bind:value={batch} min="1" />
        </div>
      </div>
      <button class="btn btn-primary" disabled={criando} type="submit">
        {criando ? 'Criando...' : 'Criar Treinamento'}
      </button>
    </form>
  </div>
{/if}

{#if loading}
  <div class="loading-overlay"><div class="loading-spinner"></div></div>
{:else if jobs.length === 0}
  <div class="card">
    <div class="empty-state">
      <div class="empty-state-icon">🧠</div>
      <div class="empty-state-title">Nenhum treinamento</div>
      <div class="empty-state-text">Crie seu primeiro job clicando em "Novo Job".</div>
    </div>
  </div>
{:else}
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Modelo</th>
          <th>Épocas</th>
          <th>Status</th>
          <th>Progresso</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {#each jobs as job}
          <tr>
            <td>
              <div style="font-weight: 500;">{job.nome}</div>
              <div style="font-size: 0.75rem; color: var(--text-tertiary);">{job.descricao}</div>
            </td>
            <td><span class="badge badge-neutral">{job.modelo_base}</span></td>
            <td>{job.epoca_atual}/{job.epocas}</td>
            <td>
              <span class="badge {
                job.status === 'Concluído' ? 'badge-success' :
                job.status === 'Executando' || job.status === 'Preparando' ? 'badge-info' :
                job.status === 'Erro' ? 'badge-error' :
                job.status === 'Cancelado' ? 'badge-warning' : 'badge-neutral'
              }">{job.status}</span>
            </td>
            <td>
              <div class="progress-bar" style="width: 80px;">
                <div class="progress-fill" style="width: {job.progresso * 100}%"></div>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 4px;">
                {#if job.status === 'Pendente'}
                  <button class="btn btn-sm btn-secondary" onclick={() => iniciar(job.id)}>▶ Iniciar</button>
                {/if}
                {#if job.em_andamento}
                  <button class="btn btn-sm btn-danger" onclick={() => cancelar(job.id)}>⏹ Cancelar</button>
                {/if}
                {#if !job.em_andamento}
                  <button class="btn btn-sm btn-ghost" onclick={() => excluir(job.id)}>🗑</button>
                {/if}
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
