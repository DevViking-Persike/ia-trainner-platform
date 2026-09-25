<script lang="ts">
  import { notifications } from '$lib/stores/notifications';

  let items = $derived($notifications);
</script>

{#if items.length > 0}
  <div class="notifications-container">
    {#each items as item (item.id)}
      <div class="alert alert-{item.type}" role="alert">
        <span>{item.message}</span>
        <button class="alert-close" onclick={() => notifications.remove(item.id)}>✕</button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .notifications-container {
    position: fixed;
    top: var(--spacing-md);
    right: var(--spacing-md);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    max-width: 420px;
    width: 100%;
  }

  .alert-close {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.6;
    font-size: 0.7rem;
    padding: 4px;
    margin-left: auto;
    transition: opacity var(--transition-fast);
  }

  .alert-close:hover { opacity: 1; }
</style>
