<script lang="ts">
  let { children } = $props();
</script>

<div class="auth-layout">
  <div class="auth-card">
    <div class="auth-logo">
      <h1>🧬 IA Trainner</h1>
      <p>Plataforma de IA para Acadêmicos</p>
    </div>
    {@render children()}
  </div>
</div>
