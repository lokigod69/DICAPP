<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/settings';
  import { COMMIT, BRANCH, BUILD } from '$lib/buildInfo';

  onMount(() => {
    // Apply theme on mount
    const theme = $themeStore;
    document.documentElement.setAttribute('data-theme', theme);
  });

  // Reactive theme update
  $: {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', $themeStore);
    }
  }
</script>

<slot />

<footer class="fixed bottom-0 right-0 text-xs px-4 py-2" style="color: var(--muted); opacity: 0.5">
  DIC APP · {BUILD} · {BRANCH}@{COMMIT}
</footer>
