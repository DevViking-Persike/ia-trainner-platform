<script lang="ts">
  import { enhance } from '$app/forms';
  import { isTauri } from '$lib/services/platform';
  import { authStore } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let { form } = $props();
  let loading = $state(false);
  let email = $state('');
  let senha = $state('');
  let tauriErro = $state('');

  async function handleTauriLogin() {
    loading = true;
    tauriErro = '';
    try {
      await authStore.login(email, senha);
      goto('/');
    } catch (e: any) {
      tauriErro = e.message || 'Erro ao entrar';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Login — IA Trainner</title></svelte:head>

{#if isTauri()}
  <form onsubmit={(e) => { e.preventDefault(); handleTauriLogin(); }}>
    {#if tauriErro}
      <div class="alert alert-error">{tauriErro}</div>
    {/if}

    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" for="email">Email</label>
      <input id="email" bind:value={email} class="input" type="email" placeholder="seu@email.com" required />
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
      <label class="form-label" for="senha">Senha</label>
      <input id="senha" bind:value={senha} class="input" type="password" placeholder="••••••••••••" required />
    </div>

    <button class="btn btn-primary" style="width: 100%; margin-bottom: 16px;" disabled={loading} type="submit">
      {#if loading}
        <div class="loading-spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
      {:else}
        Entrar
      {/if}
    </button>
  </form>
{:else}
  <form method="POST" use:enhance={() => {
    loading = true;
    return async ({ update }) => {
      loading = false;
      update();
    };
  }}>
    {#if form?.erro}
      <div class="alert alert-error">{form.erro}</div>
    {/if}

    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" for="email">Email</label>
      <input id="email" name="email" class="input" type="email" value={form?.email ?? ''} placeholder="seu@email.com" required />
    </div>

    <div class="form-group" style="margin-bottom: 24px;">
      <label class="form-label" for="senha">Senha</label>
      <input id="senha" name="senha" class="input" type="password" placeholder="••••••••••••" required />
    </div>

    <button class="btn btn-primary" style="width: 100%; margin-bottom: 16px;" disabled={loading} type="submit">
      {#if loading}
        <div class="loading-spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
      {:else}
        Entrar
      {/if}
    </button>
  </form>
{/if}

  <p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
    Não tem conta? <a href="/cadastro">Criar conta</a>
  </p>
