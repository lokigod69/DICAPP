<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getDataStore } from '$lib/stores/database';
  import { deckStore } from '$lib/stores/deck';
  import { Home } from 'lucide-svelte';

  let stats = {
    total: 0,
    new: 0,
    due: 0,
    learning: 0,
    retention: 0,
    leeches: 0,
  };
  let loading = true;
  let error = '';

  onMount(async () => {
    try {
      // Load decks and select current/default
      await deckStore.load();

      const currentDeckId = $deckStore.currentDeckId;
      if (!currentDeckId) {
        error = 'No deck selected. Please create a deck first.';
        loading = false;
        return;
      }

      const dataStore = await getDataStore();
      stats = await dataStore.getDeckStats(currentDeckId);
      loading = false;
    } catch (err: any) {
      error = err.message;
      loading = false;
    }
  });

  function startReview() {
    goto('/study');
  }

  function goToImport() {
    goto('/import');
  }

  function goToClinic() {
    goto('/clinic');
  }

  function goToSettings() {
    goto('/settings');
  }

  function goToDecks() {
    goto('/decks');
  }
</script>

<div class="min-h-screen flex items-center justify-center p-8">
  <div class="max-w-2xl w-full">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-6xl font-display font-bold mb-4" style="color: var(--accent-1)">
        DIC APP
      </h1>
      <p class="text-xl" style="color: var(--muted)">
        Advanced vocabulary training with spaced repetition
      </p>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--accent-1)"></div>
        <p class="mt-4" style="color: var(--muted)">Loading deck...</p>
      </div>
    {:else if error}
      <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-8">
        <p class="text-red-400">Error: {error}</p>
      </div>
    {:else}
      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-card-bg border rounded-lg p-4 text-center" style="border-color: var(--card-border)">
          <div class="text-3xl font-bold mb-1" style="color: var(--accent-1)">{stats.new}</div>
          <div class="text-sm" style="color: var(--muted)">New</div>
        </div>
        <div class="bg-card-bg border rounded-lg p-4 text-center" style="border-color: var(--card-border)">
          <div class="text-3xl font-bold mb-1" style="color: var(--accent-2)">{stats.learning}</div>
          <div class="text-sm" style="color: var(--muted)">Learning</div>
        </div>
        <div class="bg-card-bg border rounded-lg p-4 text-center" style="border-color: var(--card-border)">
          <div class="text-3xl font-bold mb-1" style="color: var(--g-good)">{stats.retention}</div>
          <div class="text-sm" style="color: var(--muted)">Retention</div>
        </div>
        <div class="bg-card-bg border rounded-lg p-4 text-center" style="border-color: var(--card-border)">
          <div class="text-3xl font-bold mb-1" style="color: var(--danger)">{stats.leeches}</div>
          <div class="text-sm" style="color: var(--muted)">Leeches</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-4">
        <button
          on:click={startReview}
          class="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          style="background: var(--accent-1); color: var(--bg); box-shadow: var(--shadow-lg)"
        >
          Start Review
        </button>

        <div class="grid grid-cols-2 gap-4">
          <button
            on:click={goToDecks}
            class="py-3 px-4 rounded-lg font-medium transition-all hover:scale-[1.02]"
            style="background: var(--accent-2); color: var(--bg)"
          >
            Manage Decks
          </button>

          <button
            on:click={goToImport}
            class="py-3 px-4 rounded-lg font-medium transition-all hover:scale-[1.02]"
            style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--fg)"
          >
            Import CSV
          </button>

          {#if stats.leeches > 0}
            <button
              on:click={goToClinic}
              class="py-3 px-4 rounded-lg font-medium transition-all hover:scale-[1.02]"
              style="background: var(--danger); color: white"
            >
              Clinic ({stats.leeches})
            </button>
          {/if}

          <button
            on:click={goToSettings}
            class="py-3 px-4 rounded-lg font-medium transition-all hover:scale-[1.02]"
            style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--fg)"
          >
            Settings
          </button>
        </div>
      </div>

      <!-- Total count -->
      <div class="text-center mt-8">
        <p class="text-sm" style="color: var(--muted)">
          {stats.total} {stats.total === 1 ? 'word' : 'words'} in deck
        </p>
      </div>
    {/if}
  </div>
</div>
