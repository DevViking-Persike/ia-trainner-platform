<script lang="ts">
  import { enhance } from '$app/forms';
  import { isTauri } from '$lib/services/platform';
  import { authStore } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let { form } = $props();
  let loading = $state(false);
  let nome = $state('');
  let email = $state('');
  let senha = $state('');
  let confirmar = $state('');
  let tauriErro = $state('');

  async function handleTauriRegister() {
    loading = true;
    tauriErro = '';
    try {
      await authStore.register(nome, email, senha, confirmar);
      goto('/');
    } catch (e: any) {
      tauriErro = e.message || 'Erro ao criar conta';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Criar Conta — IA Trainner</title></svelte:head>

{#if isTauri()}
  <form onsubmit={(e) => { e.preventDefault(); handleTauriRegister(); }}>
    {#if tauriErro}
      <div class="alert alert-error">{tauriErro}</div>
    {/if}

    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" for="nome">Nome completo</label>
      <input id="nome" bind:value={nome} class="input" type="text" placeholder="Seu nome" required />
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" for="reg-email">Email</label>
      <input id="reg-email" bind:value={email} class="input" type="email" placeholder="seu@email.com" required />
    </div>

    <div class="form-grid form-grid-2" style="margin-bottom: 16px;">
      <div class="form-group">
        <label class="form-label" for="reg-senha">Senha</label>
        <input id="reg-senha" bind:value={senha} class="input" type="password" placeholder="Mín. 12 caracteres" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="confirmar">Confirmar</label>
        <input id="confirmar" bind:value={confirmar} class="input" type="password" placeholder="Repita a senha" required />
      </div>
    </div>

    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 24px;">
      A senha deve ter pelo menos 12 caracteres, com maiúscula, minúscula e número.
    </div>

    <button class="btn btn-primary" style="width: 100%; margin-bottom: 16px;" disabled={loading} type="submit">
      {#if loading}
        <div class="loading-spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
      {:else}
        Criar Conta
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
      <label class="form-label" for="nome">Nome completo</label>
      <input id="nome" name="nome" class="input" type="text" value={form?.nome ?? ''} placeholder="Seu nome" required />
    </div>

    <div class="form-group" style="margin-bottom: 16px;">
      <label class="form-label" for="reg-email">Email</label>
      <input id="reg-email" name="email" class="input" type="email" value={form?.email ?? ''} placeholder="seu@email.com" required />
    </div>

    <div class="form-grid form-grid-2" style="margin-bottom: 16px;">
      <div class="form-group">
        <label class="form-label" for="reg-senha">Senha</label>
        <input id="reg-senha" name="senha" class="input" type="password" placeholder="Mín. 12 caracteres" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="confirmar">Confirmar</label>
        <input id="confirmar" name="confirmar" class="input" type="password" placeholder="Repita a senha" required />
      </div>
    </div>

    <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 24px;">
      A senha deve ter pelo menos 12 caracteres, com maiúscula, minúscula e número.
    </div>

    <button class="btn btn-primary" style="width: 100%; margin-bottom: 16px;" disabled={loading} type="submit">
      {#if loading}
        <div class="loading-spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
      {:else}
        Criar Conta
      {/if}
    </button>
  </form>
{/if}

  <p style="text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
    Já tem conta? <a href="/login">Entrar</a>
  </p>
