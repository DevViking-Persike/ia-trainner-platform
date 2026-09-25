<script lang="ts">
  import { page } from '$app/stores';
  import { models as modelsApi } from '$lib/tauri';

  let modelName = $derived($page.url.searchParams.get('model') ?? 'smart');
  let input = $state('');
  let enviando = $state(false);
  let mensagens = $state<{content: string; isUser: boolean; time: Date}[]>([]);

  async function enviar() {
    if (!input.trim() || enviando) return;
    const pergunta = input.trim();
    input = '';
    mensagens = [...mensagens, { content: pergunta, isUser: true, time: new Date() }];
    enviando = true;
    try {
      const history: [string, string][] = mensagens
        .filter(m => m.content !== pergunta || !m.isUser)
        .map(m => [m.isUser ? 'user' : 'assistant', m.content]);
      const resposta = await modelsApi.chat(modelName, pergunta, history);
      mensagens = [...mensagens, { content: resposta, isUser: false, time: new Date() }];
    } catch (e: any) {
      mensagens = [...mensagens, { content: `Erro: ${e}`, isUser: false, time: new Date() }];
    } finally {
      enviando = false;
    }
  }
</script>

<svelte:head><title>Chat — {modelName} — IA Trainner</title></svelte:head>

<div class="page-header">
  <h1 class="page-title">💬 Chat com {modelName}</h1>
  <p class="page-subtitle">Converse diretamente com o modelo</p>
</div>

<div class="card chat-container">
  <div class="chat-messages">
    {#if mensagens.length === 0}
      <div class="empty-state">
        <div class="empty-state-icon">💬</div>
        <div class="empty-state-title">Comece uma conversa</div>
        <div class="empty-state-text">Envie uma mensagem para falar com {modelName}.</div>
      </div>
    {:else}
      {#each mensagens as msg}
        <div class="chat-bubble {msg.isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}">
          {msg.content}
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
    <input class="input chat-input" bind:value={input} placeholder="Digite sua mensagem..." disabled={enviando} />
    <button class="btn btn-primary" disabled={enviando || !input.trim()} type="submit">Enviar</button>
  </form>
</div>
