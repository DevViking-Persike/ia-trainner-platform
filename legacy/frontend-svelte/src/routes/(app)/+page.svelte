<script lang="ts">
  import { onMount } from 'svelte';
  import { isTauri } from '$lib/services/platform';
  import { getDashboardService } from '$lib/services/dashboard.service';

  let { data } = $props();

  // SSR provides data.dashboard, but in Tauri mode it's empty — we load via IPC.
  let jobs = $state(data.dashboard?.jobs ?? []);
  let collections = $state(data.dashboard?.collections ?? []);
  let status = $state(data.dashboard?.status ?? null);

  let totalJobs = $derived(jobs.length);
  let jobsAtivos = $derived(jobs.filter(j => j.em_andamento).length);
  let totalCollections = $derived(collections.length);
  let totalDocs = $derived(collections.reduce((s, c) => s + c.total_documentos, 0));

  let loading = $state(!data.dashboard);

  onMount(async () => {
    if (isTauri()) {
      try {
        const service = getDashboardService();
        const overview = await service.getOverview();
        jobs = overview.jobs;
        collections = overview.collections;
        status = overview.status;
      } catch (e) {
        console.error('Erro ao carregar dashboard via Tauri:', e);
      } finally {
        loading = false;
      }
    }
  });
</script>

<svelte:head><title>Dashboard — IA Trainner</title></svelte:head>

<div class="page-header">
  <h1 class="page-title">Dashboard</h1>
  <p class="page-subtitle">Visão geral da sua plataforma de IA</p>
</div>

{#if loading}
  <div class="loading-overlay"><div class="loading-spinner"></div></div>
{:else}
  <!-- Stats -->
  <div class="stats-grid" style="margin-bottom: var(--spacing-xl);">
    <div class="stat-card">
      <div class="stat-value">{totalJobs}</div>
      <div class="stat-label">Treinamentos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{jobsAtivos}</div>
      <div class="stat-label">Jobs Ativos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{totalCollections}</div>
      <div class="stat-label">Coleções RAG</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{totalDocs}</div>
      <div class="stat-label">Documentos</div>
    </div>
  </div>

  <!-- Server Status -->
  {#if status}
    <div class="card" style="margin-bottom: var(--spacing-xl);">
      <div class="card-header">
        <div>
          <div class="card-title">🖥️ Status do Servidor</div>
          <div class="card-subtitle">
            <span class="badge {status.online ? 'badge-success' : 'badge-error'}">
              {status.online ? '● Online' : '● Offline'}
            </span>
          </div>
        </div>
      </div>

      {#if status.online}
        <div class="stats-grid">
          <div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">
              GPU {status.gpu_nome ?? ''}
            </div>
            <div class="progress-bar" style="margin-bottom: 4px;">
              <div class="progress-fill" style="width: {status.gpu_memoria_percentual}%"></div>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary);">
              {status.gpu_memoria_usada.toFixed(1)} / {status.gpu_memoria_total.toFixed(1)} GB
            </div>
          </div>
          <div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">RAM</div>
            <div class="progress-bar" style="margin-bottom: 4px;">
              <div class="progress-fill" style="width: {status.ram_percentual}%"></div>
            </div>
            <div style="font-size: 0.72rem; color: var(--text-tertiary);">
              {status.ram_usada.toFixed(1)} / {status.ram_total.toFixed(1)} GB
            </div>
          </div>
          <div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">GPU Util.</div>
            <div style="font-size: 1.5rem; font-weight: 700;">{status.gpu_utilizacao}%</div>
          </div>
          <div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">Temp</div>
            <div style="font-size: 1.5rem; font-weight: 700;">{status.gpu_temperatura}°C</div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Recent Jobs -->
  <div class="card">
    <div class="card-header">
      <div class="card-title">🧠 Treinamentos Recentes</div>
      <a href="/training" class="btn btn-ghost btn-sm">Ver todos →</a>
    </div>

    {#if jobs.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">🧠</div>
        <div class="empty-state-title">Nenhum treinamento</div>
        <div class="empty-state-text">Crie seu primeiro job de treinamento.</div>
      </div>
    {:else}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Modelo</th>
              <th>Status</th>
              <th>Progresso</th>
            </tr>
          </thead>
          <tbody>
            {#each jobs.slice(0, 5) as job}
              <tr>
                <td style="font-weight: 500;">{job.nome}</td>
                <td><span class="badge badge-neutral">{job.modelo_base}</span></td>
                <td>
                  <span class="badge {
                    job.status === 'Concluído' ? 'badge-success' :
                    job.status === 'Executando' ? 'badge-info' :
                    job.status === 'Erro' ? 'badge-error' :
                    job.status === 'Cancelado' ? 'badge-warning' : 'badge-neutral'
                  }">{job.status}</span>
                </td>
                <td>
                  <div class="progress-bar" style="width: 100px;">
                    <div class="progress-fill" style="width: {job.progresso * 100}%"></div>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
{/if}
