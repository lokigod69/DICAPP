<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { themeStore } from '$lib/stores/settings';

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
