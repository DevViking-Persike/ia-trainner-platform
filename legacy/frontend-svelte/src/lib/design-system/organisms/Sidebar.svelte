<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { themeStore } from '$lib/stores/theme';

  let { session }: { session: any } = $props();
  let collapsed = $state(false);

  const navItems = [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/training', icon: '🧠', label: 'Treinamento' },
    { href: '/models', icon: '🤖', label: 'Modelos' },
    { href: '/rag', icon: '📚', label: 'RAG' },
    { href: '/teams', icon: '👥', label: 'Equipes' },
    { href: '/server', icon: '🖥️', label: 'Servidor' },
  ];

  function isActive(href: string, currentPath: string): boolean {
    if (href === '/') return currentPath === '/';
    return currentPath.startsWith(href);
  }

  async function handleToggleTheme() {
    await themeStore.toggle();
  }
</script>

<aside class="sidebar" class:collapsed>
  <div class="sidebar-header">
    <div class="sidebar-logo">
      {#if !collapsed}
        <span class="logo-text">IA Trainner</span>
        <span class="logo-badge">v2</span>
      {:else}
        <span class="logo-icon">🧬</span>
      {/if}
    </div>
    <button class="sidebar-toggle" onclick={() => collapsed = !collapsed} aria-label="Toggle sidebar">
      {collapsed ? '→' : '←'}
    </button>
  </div>

  <nav class="sidebar-nav">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-item"
        class:active={isActive(item.href, $page.url.pathname)}
      >
        <span class="nav-icon">{item.icon}</span>
        {#if !collapsed}
          <span class="nav-label">{item.label}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <button class="nav-item" onclick={handleToggleTheme}>
      <span class="nav-icon">{$themeStore === 'dark' ? '☀️' : '🌙'}</span>
      {#if !collapsed}
        <span class="nav-label">Tema</span>
      {/if}
    </button>

    <a href="/profile" class="nav-item" class:active={$page.url.pathname === '/profile'}>
      <span class="nav-icon">👤</span>
      {#if !collapsed}
        <span class="nav-label">Perfil</span>
      {/if}
    </a>

    <form method="POST" action="/logout" use:enhance>
      <button class="nav-item nav-logout" type="submit" style="width: 100%;">
        <span class="nav-icon">🚪</span>
        {#if !collapsed}
          <span class="nav-label">Sair</span>
        {/if}
      </button>
    </form>
  </div>
</aside>

<style>
  .sidebar {
    width: var(--sidebar-width);
    height: 100vh;
    background: var(--gradient-sidebar);
    border-right: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    transition: width var(--transition-base);
    overflow: hidden;
    flex-shrink: 0;
    position: relative;
  }

  .sidebar.collapsed {
    width: var(--sidebar-collapsed);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg) var(--spacing-md);
    border-bottom: 1px solid var(--border-primary);
    min-height: var(--header-height);
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    overflow: hidden;
  }

  .logo-text {
    font-size: 1.1rem;
    font-weight: 800;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    white-space: nowrap;
  }

  .logo-badge {
    font-size: 0.6rem;
    font-weight: 700;
    padding: 2px 6px;
    background: var(--color-primary-bg);
    color: var(--color-primary);
    border-radius: var(--radius-full);
    border: 1px solid var(--border-accent);
  }

  .logo-icon {
    font-size: 1.5rem;
  }

  .sidebar-toggle {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-primary);
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .sidebar-toggle:hover {
    border-color: var(--border-accent);
    color: var(--color-primary);
  }

  .sidebar-nav {
    flex: 1;
    padding: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 10px 12px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    background: transparent;
    width: 100%;
    text-align: left;
    transition: all var(--transition-fast);
    white-space: nowrap;
    font-family: var(--font-sans);
  }

  .nav-item:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .nav-item.active {
    background: var(--color-primary-bg);
    color: var(--color-primary);
    border-color: var(--border-accent);
  }

  .nav-icon {
    font-size: 1.1rem;
    width: 24px;
    text-align: center;
    flex-shrink: 0;
  }

  .nav-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-footer {
    padding: var(--spacing-sm);
    border-top: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-logout:hover {
    color: var(--color-error);
    background: var(--color-error-bg);
  }
</style>
