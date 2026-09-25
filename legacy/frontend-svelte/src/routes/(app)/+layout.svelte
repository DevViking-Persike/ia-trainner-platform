<script lang="ts">
  import Sidebar from '$lib/design-system/organisms/Sidebar.svelte';

  let { children, data } = $props();
</script>

<div class="app-layout">
  <Sidebar session={data.session} />
  <main class="app-content">
    <div class="page-container">
      <div class="page-content">
        {@render children()}
      </div>
    </div>
  </main>
</div>
