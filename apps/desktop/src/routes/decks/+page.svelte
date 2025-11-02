<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { deckStore } from '$lib/stores/deck';
  import { getDataStore } from '$lib/stores/database';
  import { Plus, BookOpen, Upload, Download, ArrowLeft } from 'lucide-svelte';
  import type { Deck } from '@runedeck/core/models';

  interface DeckWithStats extends Deck {
    stats: {
      total: number;
      new: number;
      due: number;
      learning: number;
      retention: number;
      leeches: number;
    };
  }

  let decksWithStats: DeckWithStats[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    await loadDecks();
  });

  async function loadDecks() {
    loading = true;
    error = '';
    try {
      await deckStore.load();
      const dataStore = await getDataStore();

      // Load stats for each deck
      const statsPromises = $deckStore.decks.map(async (deck) => {
        const stats = await dataStore.getDeckStats(deck.id);
        return { ...deck, stats };
      });

      decksWithStats = await Promise.all(statsPromises);
      loading = false;
    } catch (err: any) {
      error = err.message;
      loading = false;
    }
  }

  function selectDeck(deckId: string) {
    deckStore.selectDeck(deckId);
    goto('/');
  }

  function studyDeck(deckId: string) {
    deckStore.selectDeck(deckId);
    goto('/study');
  }

  function importToDeck(deckId: string) {
    deckStore.selectDeck(deckId);
    goto('/import');
  }

  async function createNewDeck() {
    const name = prompt('Enter deck name:');
    if (!name) return;

    try {
      const { createDeck } = await import('@runedeck/core/models');
      const deck = createDeck({
        name,
        profile: 'full', // Default to full profile
      });

      const dataStore = await getDataStore();
      await dataStore.createDeck(deck);
      await deckStore.refresh();
      await loadDecks();
    } catch (err: any) {
      alert('Failed to create deck: ' + err.message);
    }
  }

  async function deleteDeck(deck: DeckWithStats) {
    if (deck.stats.total > 0) {
      const confirm = window.confirm(
        `Delete "${deck.name}"? This will permanently delete ${deck.stats.total} words.`
      );
      if (!confirm) return;
    }

    try {
      const dataStore = await getDataStore();
      await dataStore.deleteDeck(deck.id);
      await deckStore.refresh();
      await loadDecks();
    } catch (err: any) {
      alert('Failed to delete deck: ' + err.message);
    }
  }

  function goHome() {
    goto('/');
  }

  $: currentDeckId = $deckStore.currentDeckId;
</script>

<div class="min-h-screen p-8">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <button
        on:click={goHome}
        class="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5"
        style="color: var(--muted)"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <h1 class="text-4xl font-display font-bold" style="color: var(--accent-1)">
        Decks
      </h1>

      <button
        on:click={createNewDeck}
        class="flex items-center gap-2 px-4 py-2 rounded font-semibold transition-all hover:scale-105"
        style="background: var(--accent-1); color: var(--bg)"
      >
        <Plus size={20} />
        New Deck
      </button>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--accent-1)"></div>
        <p class="mt-4" style="color: var(--muted)">Loading decks...</p>
      </div>
    {:else if error}
      <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <p class="text-red-400">Error: {error}</p>
      </div>
    {:else if decksWithStats.length === 0}
      <!-- Empty state -->
      <div class="text-center py-16">
        <BookOpen size={64} class="mx-auto mb-4 opacity-30" style="color: var(--muted)" />
        <h2 class="text-2xl font-bold mb-2">No Decks Yet</h2>
        <p class="mb-6" style="color: var(--muted)">Create your first deck to get started</p>
        <button
          on:click={createNewDeck}
          class="px-6 py-3 rounded font-semibold"
          style="background: var(--accent-1); color: var(--bg)"
        >
          Create Deck
        </button>
      </div>
    {:else}
      <!-- Decks grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each decksWithStats as deck}
          <div
            class="rounded-lg overflow-hidden transition-all hover:scale-[1.02] relative"
            style="background: var(--card-bg); border: 2px solid {deck.id === currentDeckId ? 'var(--accent-1)' : 'var(--card-border)'}; box-shadow: var(--shadow-card)"
          >
            <!-- Current deck badge -->
            {#if deck.id === currentDeckId}
              <div class="absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold" style="background: var(--accent-1); color: var(--bg)">
                CURRENT
              </div>
            {/if}

            <!-- Header -->
            <div class="p-6 pb-4">
              <div class="flex items-start justify-between mb-2">
                <h3 class="text-xl font-display font-bold truncate flex-1 mr-2">
                  {deck.name}
                </h3>
                <span
                  class="px-2 py-1 rounded text-xs font-semibold flex-shrink-0"
                  style="background: {deck.profile === 'simple' ? 'var(--accent-2)' : 'var(--accent-1)'}; color: var(--bg)"
                >
                  {deck.profile.toUpperCase()}
                </span>
              </div>
              <p class="text-sm opacity-70" style="color: var(--muted)">
                {deck.slug}
              </p>
            </div>

            <!-- Stats grid -->
            <div class="px-6 pb-4">
              <div class="grid grid-cols-3 gap-3">
                <div class="text-center">
                  <div class="text-2xl font-bold" style="color: var(--accent-1)">
                    {deck.stats.due}
                  </div>
                  <div class="text-xs" style="color: var(--muted)">Due</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold" style="color: var(--accent-2)">
                    {deck.stats.new}
                  </div>
                  <div class="text-xs" style="color: var(--muted)">New</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold" style="color: var(--danger)">
                    {deck.stats.leeches}
                  </div>
                  <div class="text-xs" style="color: var(--muted)">Leeches</div>
                </div>
              </div>

              <div class="mt-3 text-center text-sm" style="color: var(--muted)">
                {deck.stats.total} total · {deck.stats.learning} learning · {deck.stats.retention} retention
              </div>
            </div>

            <!-- Actions -->
            <div class="p-4 pt-0 flex gap-2">
              <button
                on:click={() => studyDeck(deck.id)}
                class="flex-1 py-2 px-3 rounded font-medium text-sm transition-all hover:scale-105"
                style="background: var(--accent-1); color: var(--bg)"
                disabled={deck.stats.due === 0 && deck.stats.new === 0}
              >
                Study
              </button>
              <button
                on:click={() => importToDeck(deck.id)}
                class="px-3 py-2 rounded transition-all hover:bg-white/10"
                style="border: 1px solid var(--card-border); color: var(--fg)"
                title="Import CSV"
              >
                <Upload size={16} />
              </button>
              <button
                on:click={() => selectDeck(deck.id)}
                class="px-3 py-2 rounded transition-all hover:bg-white/10"
                style="border: 1px solid var(--card-border); color: var(--fg)"
                title="Select as current deck"
              >
                <BookOpen size={16} />
              </button>
              {#if deck.id !== 'default'}
                <button
                  on:click={() => deleteDeck(deck)}
                  class="px-3 py-2 rounded transition-all hover:bg-red-500/20"
                  style="border: 1px solid var(--danger); color: var(--danger)"
                  title="Delete deck"
                >
                  ✕
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
