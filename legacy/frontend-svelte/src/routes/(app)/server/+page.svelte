<script lang="ts">
  import { onMount } from 'svelte';
  import { isTauri } from '$lib/services/platform';
  import { getServerStatusService } from '$lib/services/server-status.service';
  import { enhance } from '$app/forms';

  let { data } = $props();
  let status = $state(data.status ?? null);

  onMount(async () => {
    if (isTauri()) {
      try {
        status = await getServerStatusService().getStatus();
      } catch (e) {
        console.error('Erro ao carregar status via Tauri', e);
      }
    }
  });

  // To handle client-side refresh we could invalidateAll or submit to an empty action.
  // For simplicity, a form submission or just an anchor tag reloading works for now.
</script>

<svelte:head><title>Servidor — IA Trainner</title></svelte:head>

<div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
  <div>
    <h1 class="page-title">Status do Servidor</h1>
    <p class="page-subtitle">Monitoramento de hardware em tempo real</p>
  </div>
  <a href="/server" class="btn btn-secondary">🔄 Atualizar</a>
</div>

{#if status}
  <div style="margin-bottom: var(--spacing-xl);">
    <span class="badge {status.online ? 'badge-success' : 'badge-error'}" style="font-size: 0.85rem; padding: 6px 14px;">
      {status.online ? '● Servidor Online' : '● Servidor Offline'}
    </span>
  </div>

  {#if status.online}
    <!-- GPU -->
    <div class="card" style="margin-bottom: var(--spacing-xl);">
      <div class="card-title" style="margin-bottom: var(--spacing-lg);">🎮 GPU</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">{status.gpu_nome ?? 'GPU'}</div>
          <div class="stat-value">{status.gpu_utilizacao}%</div>
          <div class="stat-label">Utilização</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{status.gpu_temperatura}°C</div>
          <div class="stat-label">Temperatura</div>
          <div class="progress-bar" style="margin-top: 8px;">
            <div class="progress-fill" style="width: {Math.min(status.gpu_temperatura, 100)}%; background: {
              status.gpu_temperatura > 80 ? 'var(--color-error)' :
              status.gpu_temperatura > 60 ? 'var(--color-warning)' : 'var(--color-success)'
            };"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{status.gpu_power_watts.toFixed(0)}W</div>
          <div class="stat-label">Potência</div>
        </div>
        <div class="stat-card">
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">VRAM</div>
          <div class="stat-value">{status.gpu_memoria_percentual.toFixed(0)}%</div>
          <div class="progress-bar" style="margin-top: 8px;">
            <div class="progress-fill" style="width: {status.gpu_memoria_percentual}%"></div>
          </div>
          <div class="stat-label" style="margin-top: 4px;">{status.gpu_memoria_usada.toFixed(1)} / {status.gpu_memoria_total.toFixed(1)} GB</div>
        </div>
      </div>
    </div>

    <!-- CPU & RAM -->
    <div class="card" style="margin-bottom: var(--spacing-xl);">
      <div class="card-title" style="margin-bottom: var(--spacing-lg);">💻 CPU & RAM</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">{status.cpu_modelo ?? 'CPU'}</div>
          <div class="stat-label">Processador</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{status.ram_percentual.toFixed(0)}%</div>
          <div class="progress-bar" style="margin-top: 8px;">
            <div class="progress-fill" style="width: {status.ram_percentual}%"></div>
          </div>
          <div class="stat-label" style="margin-top: 4px;">{status.ram_usada.toFixed(1)} / {status.ram_total.toFixed(1)} GB</div>
        </div>
      </div>
    </div>

    <!-- Jobs -->
    <div class="card">
      <div class="card-title" style="margin-bottom: var(--spacing-lg);">📊 Jobs</div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{status.jobs_ativos}</div>
          <div class="stat-label">Jobs Ativos</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{status.jobs_na_fila}</div>
          <div class="stat-label">Na Fila</div>
        </div>
      </div>
    </div>
  {/if}
{/if}
