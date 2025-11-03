<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getDataStore } from '$lib/stores/database';
  import { deckStore } from '$lib/stores/deck';
  import { scopeStore } from '$lib/stores/scope';
  import { authStore } from '$lib/stores/auth';
  import Header from '$lib/components/Header.svelte';
  import { Plus, FileUp, Compass, LogIn } from 'lucide-svelte';

  let stats = {
    total: 0,
    new: 0,
    due: 0,
    learning: 0,
    retention: 0,
    leeches: 0,
  };
  let loading = true;

  async function loadStats() {
    try {
      const currentDeckId = $deckStore.currentDeckId;
      if (!currentDeckId) {
        loading = false;
        return;
      }

      const dataStore = await getDataStore();
      stats = await dataStore.getStatsByScope($scopeStore, currentDeckId);
      loading = false;
    } catch (err: any) {
      console.error('Failed to load stats:', err);
      loading = false;
    }
  }

  onMount(async () => {
    await authStore.init();

    // Only load decks/stats if authenticated
    if ($authStore.user) {
      await deckStore.load();
      await loadStats();
    } else {
      loading = false;
    }
  });

  // Reload stats when scope changes
  $: if ($authStore.user && $scopeStore && $deckStore.currentDeckId) {
    loadStats();
  }

  function startReview() {
    if (!$deckStore.currentDeckId) {
      alert('Create a deck first to start studying.');
      return;
    }
    goto('/study');
  }

  function goToImport() {
    goto('/import');
  }

  function goToClinic() {
    if (!$deckStore.currentDeckId) {
      alert('Create a deck first.');
      return;
    }
    goto('/clinic');
  }

  function goToSettings() {
    goto('/settings');
  }

  function goToDecks() {
    goto('/decks');
  }

  function goToExplore() {
    goto('/explore');
  }

  function goToSignIn() {
    goto('/auth/signin');
  }
</script>

<Header />

<div class="min-h-screen flex items-center justify-center p-8">
  <div class="max-w-2xl w-full">
    <!-- Title Section -->
    <div class="text-center mb-12">
      <h1 class="text-6xl font-display font-bold mb-4" style="color: var(--accent-1)">
        DIC APP
      </h1>
      <p class="text-xl" style="color: var(--muted)">
        Advanced vocabulary training with spaced repetition
      </p>
      {#if $authStore.user && $scopeStore.type === 'all'}
        <p class="text-sm mt-2" style="color: var(--accent-2)">
          Studying across all {$deckStore.decks.length} decks
        </p>
      {/if}
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--accent-1)"></div>
        <p class="mt-4" style="color: var(--muted)">Loading...</p>
      </div>
    {:else if !$authStore.user}
      <!-- Signed Out State -->
      <div class="space-y-6">
        <div class="text-center py-8 px-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
          <p class="text-lg mb-6" style="color: var(--muted)">
            Sign in to create decks and start learning
          </p>
          <button
            on:click={goToSignIn}
            class="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 inline-flex items-center gap-2"
            style="background: var(--accent-1); color: var(--bg)"
          >
            <LogIn size={20} />
            Sign In with Google
          </button>
        </div>

        <div class="text-center">
          <p class="mb-4" style="color: var(--muted)">Or browse public decks</p>
          <button
            on:click={goToExplore}
            class="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 inline-flex items-center gap-2"
            style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--fg)"
          >
            <Compass size={20} />
            Explore Public Decks
          </button>
        </div>
      </div>
    {:else if $deckStore.decks.length === 0}
      <!-- Empty State (No Decks) -->
      <div class="space-y-6">
        <div class="text-center py-8 px-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
          <p class="text-lg mb-6" style="color: var(--muted)">
            Get started by creating your first deck
          </p>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              on:click={goToDecks}
              class="py-4 px-6 rounded-lg font-medium transition-all hover:scale-105 flex flex-col items-center gap-2"
              style="background: var(--accent-1); color: var(--bg)"
            >
              <Plus size={24} />
              <span>Create Deck</span>
            </button>
            <button
              on:click={goToImport}
              class="py-4 px-6 rounded-lg font-medium transition-all hover:scale-105 flex flex-col items-center gap-2"
              style="background: var(--accent-2); color: var(--bg)"
            >
              <FileUp size={24} />
              <span>Import CSV</span>
            </button>
            <button
              on:click={goToExplore}
              class="py-4 px-6 rounded-lg font-medium transition-all hover:scale-105 flex flex-col items-center gap-2"
              style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--fg)"
            >
              <Compass size={24} />
              <span>Explore & Clone</span>
            </button>
          </div>
        </div>
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

          <button
            on:click={goToExplore}
            class="py-3 px-4 rounded-lg font-medium transition-all hover:scale-[1.02]"
            style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--fg)"
          >
            Explore Decks
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
          {stats.total} {stats.total === 1 ? 'word' : 'words'} in {$scopeStore.type === 'all' ? 'all decks' : 'current deck'}
        </p>
      </div>
    {/if}
  </div>
</div>
