<script lang="ts">
  import { auth } from '$lib/tauri';

  let email = $state('');
  let loading = $state(false);
  let sucesso = $state(false);
  let erro = $state('');

  async function handleResend() {
    loading = true;
    erro = '';
    try {
      await auth.resendVerification(email);
      sucesso = true;
    } catch (e: any) {
      erro = e;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Verificar Email — IA Trainner</title></svelte:head>

<div style="text-align: center;">
  <div style="font-size: 3rem; margin-bottom: 16px;">📧</div>
  <h2 style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">Verificar Email</h2>
  <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 24px;">
    Verifique sua caixa de entrada para ativar sua conta.
  </p>
</div>

{#if sucesso}
  <div class="alert alert-success">Email de verificação reenviado!</div>
{/if}

{#if erro}
  <div class="alert alert-error">{erro}</div>
{/if}

<form onsubmit={(e) => { e.preventDefault(); handleResend(); }}>
  <div class="form-group" style="margin-bottom: 16px;">
    <label class="form-label" for="ver-email">Email</label>
    <input id="ver-email" class="input" type="email" bind:value={email} placeholder="seu@email.com" required />
  </div>

  <button class="btn btn-secondary" style="width: 100%; margin-bottom: 16px;" disabled={loading} type="submit">
    {#if loading}
      <div class="loading-spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
    {:else}
      Reenviar Email
    {/if}
  </button>

  <p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
    <a href="/login">Voltar ao login</a>
  </p>
</form>
