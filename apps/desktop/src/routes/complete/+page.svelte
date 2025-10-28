<script lang="ts">
  import { goto } from '$app/navigation';
  import { PartyPopper } from 'lucide-svelte';

  function goHome() {
    goto('/');
  }
</script>

<div class="min-h-screen flex items-center justify-center p-8">
  <div class="text-center max-w-md">
    <div class="mb-6 flex justify-center">
      <div class="text-6xl" style="color: var(--accent-1)">
        <PartyPopper size={64} />
      </div>
    </div>

    <h1 class="text-4xl font-display font-bold mb-4" style="color: var(--accent-1)">
      Session Complete!
    </h1>

    <p class="text-lg mb-8" style="color: var(--muted)">
      Excellent work! You've reviewed all due cards for now.
    </p>

    <button
      on:click={goHome}
      class="px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105"
      style="background: var(--accent-1); color: var(--bg); box-shadow: var(--shadow-lg)"
    >
      Return Home
    </button>
  </div>
</div>
