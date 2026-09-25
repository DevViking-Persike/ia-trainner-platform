<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/theme';
  import { authStore } from '$lib/stores/auth';
  import { isTauri } from '$lib/services/platform';
  import Notifications from '$lib/design-system/organisms/Notifications.svelte';

  let { children, data } = $props();

  onMount(async () => {
    themeStore.init();

    if (isTauri()) {
      // Tauri mode: restore session from native store
      await authStore.restore();
    } else {
      // Web mode: session comes from SSR server data
      authStore.setFromServerSession(data.session ?? null);
    }
  });
</script>

{@render children()}
<Notifications />
