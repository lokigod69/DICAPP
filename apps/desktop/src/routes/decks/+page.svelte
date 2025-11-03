<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { deckStore } from '$lib/stores/deck';
  import { getDataStore } from '$lib/stores/database';
  import { supabase } from '$lib/supabase';
  import { Plus, BookOpen, Upload, Download, ArrowLeft, Eye, EyeOff } from 'lucide-svelte';
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
  let showMergeDialog = false;
  let mergeFromDeckId = '';
  let mergeToDeckId = '';
  let mergePreview: any = null;
  let mergeStrategy: 'skip-duplicates' | 'merge-fields' | 'force-move' = 'skip-duplicates';
  let merging = false;
  let previewing = false;

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

  async function toggleVisibility(deck: any) {
    try {
      const newVisibility = deck.visibility === 'public' ? 'private' : 'public';

      const { error } = await supabase
        .from('decks')
        .update({ visibility: newVisibility })
        .eq('id', deck.id);

      if (error) throw error;

      await loadDecks();
    } catch (err: any) {
      alert(`Failed to toggle visibility: ${err.message}`);
    }
  }

  function goHome() {
    goto('/');
  }

  function openMergeDialog() {
    showMergeDialog = true;
    mergeFromDeckId = '';
    mergeToDeckId = '';
    mergePreview = null;
    mergeStrategy = 'skip-duplicates';
  }

  function closeMergeDialog() {
    showMergeDialog = false;
    mergeFromDeckId = '';
    mergeToDeckId = '';
    mergePreview = null;
  }

  async function previewMerge() {
    if (!mergeFromDeckId || !mergeToDeckId) {
      alert('Please select both source and target decks');
      return;
    }

    if (mergeFromDeckId === mergeToDeckId) {
      alert('Cannot merge deck into itself');
      return;
    }

    previewing = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('/api/merge/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fromDeckId: mergeFromDeckId,
          toDeckId: mergeToDeckId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Preview failed');
      }

      mergePreview = result;
    } catch (err: any) {
      alert(`Preview failed: ${err.message}`);
    } finally {
      previewing = false;
    }
  }

  async function commitMerge() {
    if (!mergePreview) {
      alert('Please preview the merge first');
      return;
    }

    merging = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Not authenticated');
        return;
      }

      const response = await fetch('/api/merge/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fromDeckId: mergeFromDeckId,
          toDeckId: mergeToDeckId,
          strategy: mergeStrategy,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Merge failed');
      }

      alert(
        `Merge complete!\nMoved: ${result.report.movedWords}\nSkipped: ${result.report.skippedDuplicates}\nMerged: ${result.report.mergedFields}`
      );

      closeMergeDialog();
      await deckStore.refresh();
      await loadDecks();
    } catch (err: any) {
      alert(`Merge failed: ${err.message}`);
    } finally {
      merging = false;
    }
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

      <div class="flex gap-3">
        <button
          on:click={openMergeDialog}
          class="flex items-center gap-2 px-4 py-2 rounded font-semibold transition-all hover:scale-105"
          style="background: var(--accent-2); color: var(--bg)"
          disabled={decksWithStats.length < 2}
        >
          Merge Decks
        </button>
        <button
          on:click={createNewDeck}
          class="flex items-center gap-2 px-4 py-2 rounded font-semibold transition-all hover:scale-105"
          style="background: var(--accent-1); color: var(--bg)"
        >
          <Plus size={20} />
          New Deck
        </button>
      </div>
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
              <button
                on:click={() => toggleVisibility(deck)}
                class="px-3 py-2 rounded transition-all hover:bg-white/10"
                style="border: 1px solid var(--card-border); color: var(--fg)"
                title="{deck.visibility === 'public' ? 'Make private' : 'Make public'}"
              >
                {#if deck.visibility === 'public'}
                  <Eye size={16} />
                {:else}
                  <EyeOff size={16} />
                {/if}
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

  <!-- Merge Dialog -->
  {#if showMergeDialog}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" on:click={closeMergeDialog}>
      <div class="rounded-lg p-6 max-w-2xl w-full" style="background: var(--card-bg); border: 1px solid var(--card-border)" on:click={(e) => e.stopPropagation()}>
        <h2 class="text-2xl font-bold mb-6" style="color: var(--accent-1)">Merge Decks</h2>

        <!-- Deck Selection -->
        <div class="space-y-4 mb-6">
          <div>
            <label class="block mb-2 font-semibold">Source Deck (merge from):</label>
            <select
              bind:value={mergeFromDeckId}
              class="w-full px-4 py-2 rounded border"
              style="background: var(--bg); border-color: var(--card-border); color: var(--fg)"
              disabled={merging}
            >
              <option value="">Select a deck...</option>
              {#each decksWithStats as deck}
                <option value={deck.id}>{deck.name} ({deck.stats.total} words)</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block mb-2 font-semibold">Target Deck (merge into):</label>
            <select
              bind:value={mergeToDeckId}
              class="w-full px-4 py-2 rounded border"
              style="background: var(--bg); border-color: var(--card-border); color: var(--fg)"
              disabled={merging}
            >
              <option value="">Select a deck...</option>
              {#each decksWithStats as deck}
                <option value={deck.id}>{deck.name} ({deck.stats.total} words)</option>
              {/each}
            </select>
          </div>

          <button
            on:click={previewMerge}
            class="w-full py-2 px-4 rounded font-semibold transition-all hover:scale-105 disabled:opacity-50"
            style="background: var(--accent-2); color: var(--bg)"
            disabled={!mergeFromDeckId || !mergeToDeckId || previewing || merging}
          >
            {previewing ? 'Analyzing...' : 'Preview Merge'}
          </button>
        </div>

        <!-- Preview Results -->
        {#if mergePreview}
          <div class="mb-6 p-4 rounded-lg" style="background: var(--bg); border: 1px solid var(--card-border)">
            <h3 class="font-semibold mb-3">Merge Preview</h3>
            <div class="grid grid-cols-3 gap-3 text-center mb-4">
              <div>
                <div class="text-2xl font-bold" style="color: var(--accent-1)">{mergePreview.totalWords}</div>
                <div class="text-xs" style="color: var(--muted)">Total Words</div>
              </div>
              <div>
                <div class="text-2xl font-bold" style="color: var(--accent-2)">{mergePreview.uniqueWords}</div>
                <div class="text-xs" style="color: var(--muted)">Unique</div>
              </div>
              <div>
                <div class="text-2xl font-bold" style="color: var(--danger)">{mergePreview.duplicates}</div>
                <div class="text-xs" style="color: var(--muted)">Duplicates</div>
              </div>
            </div>

            {#if mergePreview.duplicates > 0}
              <div class="mb-4">
                <label class="block mb-2 text-sm font-semibold">Duplicate Handling:</label>
                <div class="space-y-2">
                  <label class="flex items-start gap-2 cursor-pointer">
                    <input type="radio" bind:group={mergeStrategy} value="skip-duplicates" class="mt-1" />
                    <div>
                      <div class="font-medium">Skip Duplicates</div>
                      <div class="text-xs" style="color: var(--muted)">Keep only unique words from source deck</div>
                    </div>
                  </label>
                  <label class="flex items-start gap-2 cursor-pointer">
                    <input type="radio" bind:group={mergeStrategy} value="merge-fields" class="mt-1" />
                    <div>
                      <div class="font-medium">Merge Fields</div>
                      <div class="text-xs" style="color: var(--muted)">Fill empty fields in target with source data</div>
                    </div>
                  </label>
                  <label class="flex items-start gap-2 cursor-pointer">
                    <input type="radio" bind:group={mergeStrategy} value="force-move" class="mt-1" />
                    <div>
                      <div class="font-medium">Force Move</div>
                      <div class="text-xs" style="color: var(--muted)">Move all words, including duplicates</div>
                    </div>
                  </label>
                </div>
              </div>

              {#if mergePreview.duplicateList && mergePreview.duplicateList.length > 0}
                <div class="text-xs" style="color: var(--muted)">
                  <div class="font-semibold mb-1">Sample duplicates:</div>
                  <ul class="list-disc list-inside space-y-1">
                    {#each mergePreview.duplicateList.slice(0, 5) as dup}
                      <li>{dup.headword} {dup.pos ? `(${dup.pos})` : ''}</li>
                    {/each}
                  </ul>
                </div>
              {/if}
            {/if}
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            on:click={closeMergeDialog}
            class="flex-1 py-2 px-4 rounded font-semibold transition-all hover:scale-105"
            style="background: var(--bg); border: 1px solid var(--card-border); color: var(--fg)"
            disabled={merging}
          >
            Cancel
          </button>
          <button
            on:click={commitMerge}
            class="flex-1 py-2 px-4 rounded font-semibold transition-all hover:scale-105 disabled:opacity-50"
            style="background: var(--accent-1); color: var(--bg)"
            disabled={!mergePreview || merging}
          >
            {merging ? 'Merging...' : 'Commit Merge'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
