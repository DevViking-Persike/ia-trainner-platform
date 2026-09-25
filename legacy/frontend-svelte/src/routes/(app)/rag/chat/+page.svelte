<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { rag, models as modelsApi, chatHistory, auth as authApi } from '$lib/tauri';
  import type { RagCollection, ChatMessage, ChatSession } from '$lib/types';

  let collectionId = $derived($page.url.searchParams.get('id') ?? '');
  let collection = $state<RagCollection | null>(null);
  let mensagens = $state<ChatMessage[]>([]);
  let sessoes = $state<ChatSession[]>([]);
  let sessaoAtual = $state<ChatSession | null>(null);
  let pergunta = $state('');
  let enviando = $state(false);
  let modelo = $state('smart');
  let modelosDisponiveis = $state<string[]>(['smart']);
  let userId = $state('');

  onMount(async () => {
    try {
      const user = await authApi.getCurrentUser();
      userId = user?.id ?? '';

      if (collectionId) {
        collection = await rag.getCollection(collectionId);
        sessoes = await chatHistory.getSessions(userId, collectionId);
      }

      const models = await modelsApi.getAvailable();
      if (models.length > 0) {
        modelosDisponiveis = models.map(m => m.id);
      }
    } catch {}
  });

  async function enviar() {
    if (!pergunta.trim() || enviando || !collectionId) return;
    enviando = true;

    try {
      // Auto-create session
      if (!sessaoAtual && userId) {
        sessaoAtual = await chatHistory.createSession(userId, collectionId, collection?.nome ?? '');
        sessoes = await chatHistory.getSessions(userId, collectionId);
      }

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conteudo: pergunta,
        role: 'user',
        timestamp: new Date().toISOString(),
      };
      mensagens = [...mensagens, userMsg];
      const perguntaTexto = pergunta;
      pergunta = '';

      if (sessaoAtual) {
        await chatHistory.addMessage(sessaoAtual.id, userMsg);
        if (!sessaoAtual.title) {
          const title = perguntaTexto.length > 80 ? perguntaTexto.slice(0, 80) + '...' : perguntaTexto;
          await chatHistory.updateTitle(sessaoAtual.id, title);
          sessaoAtual.title = title;
        }
      }

      const respostas = await rag.query(collectionId, perguntaTexto, modelo);
      for (const resp of respostas.filter(m => m.role === 'assistant')) {
        mensagens = [...mensagens, resp];
        if (sessaoAtual) await chatHistory.addMessage(sessaoAtual.id, resp);
      }
    } catch (e: any) {
      mensagens = [...mensagens, {
        id: crypto.randomUUID(), conteudo: `Erro: ${e}`,
        role: 'assistant', timestamp: new Date().toISOString()
      }];
    } finally {
      enviando = false;
    }
  }

  async function carregarSessao(id: string) {
    const session = await chatHistory.getSession(id);
    if (session) {
      sessaoAtual = session;
      mensagens = session.messages;
    }
  }

  async function novaSessao() {
    sessaoAtual = null;
    mensagens = [];
    pergunta = '';
  }

  async function excluirSessao(id: string) {
    await chatHistory.deleteSession(id);
    if (sessaoAtual?.id === id) { sessaoAtual = null; mensagens = []; }
    sessoes = await chatHistory.getSessions(userId, collectionId);
  }
</script>

<svelte:head><title>RAG Chat — IA Trainner</title></svelte:head>

<div class="page-header">
  <h1 class="page-title">📚 Chat RAG: {collection?.nome ?? '...'}</h1>
  <p class="page-subtitle">Pergunte sobre seus documentos</p>
</div>

<div style="display: grid; grid-template-columns: 240px 1fr; gap: var(--spacing-md); height: calc(100vh - 220px);">
  <!-- Sessions sidebar -->
  <div class="card" style="overflow-y: auto; padding: var(--spacing-sm);">
    <button class="btn btn-primary btn-sm" style="width: 100%; margin-bottom: var(--spacing-sm);" onclick={novaSessao}>
      + Nova Sessão
    </button>
    {#each sessoes as s}
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
        <button
          class="nav-item"
          class:active={sessaoAtual?.id === s.id}
          onclick={() => carregarSessao(s.id)}
          style="font-size: 0.78rem; padding: 8px; flex: 1; text-align: left; border: none; background: none; color: var(--text-secondary); cursor: pointer; border-radius: var(--radius-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
        >
          {s.title ?? 'Sem título'}
        </button>
        <button class="btn btn-ghost btn-sm" style="padding: 2px 6px; font-size: 0.65rem; flex-shrink: 0;" onclick={() => excluirSessao(s.id)}>✕</button>
      </div>
    {/each}
  </div>

  <!-- Chat area -->
  <div class="card chat-container" style="padding: 0;">
    <div style="padding: var(--spacing-sm) var(--spacing-md); border-bottom: 1px solid var(--border-primary); display: flex; align-items: center; gap: var(--spacing-sm);">
      <label class="form-label" for="rag-modelo" style="margin: 0; white-space: nowrap;">Modelo:</label>
      <select id="rag-modelo" class="select" style="max-width: 200px; padding: 6px 10px;" bind:value={modelo}>
        {#each modelosDisponiveis as m}
          <option value={m}>{m}</option>
        {/each}
      </select>
    </div>

    <div class="chat-messages">
      {#if mensagens.length === 0}
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div class="empty-state-title">Faça uma pergunta</div>
          <div class="empty-state-text">Pergunte sobre os documentos da coleção.</div>
        </div>
      {:else}
        {#each mensagens as msg}
          <div class="chat-bubble {msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}">
            <div>{msg.conteudo}</div>
            {#if msg.fontes_utilizadas && msg.fontes_utilizadas.length > 0}
              <div style="margin-top: 8px; font-size: 0.72rem; color: var(--text-tertiary);">
                📎 Fontes: {msg.fontes_utilizadas.join(', ')}
              </div>
            {/if}
          </div>
        {/each}
        {#if enviando}
          <div class="chat-bubble chat-bubble-assistant" style="opacity: 0.5;">
            <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
          </div>
        {/if}
      {/if}
    </div>

    <form class="chat-input-area" onsubmit={(e) => { e.preventDefault(); enviar(); }}>
      <input class="input chat-input" bind:value={pergunta} placeholder="Pergunte sobre seus documentos..." disabled={enviando} />
      <button class="btn btn-primary" disabled={enviando || !pergunta.trim()} type="submit">Enviar</button>
    </form>
  </div>
</div>
