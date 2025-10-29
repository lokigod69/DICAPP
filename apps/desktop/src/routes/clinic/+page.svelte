<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getDataStore } from '$lib/stores/database';
  import { deckStore } from '$lib/stores/deck';
  import { settingsStore } from '$lib/stores/settings';
  import type { WordWithScheduling } from '@runedeck/core/models';
  import type { IDataStore } from '@runedeck/data';
  import { ArrowLeft, Save } from 'lucide-svelte';

  let leeches: WordWithScheduling[] = [];
  let selectedLeech: WordWithScheduling | null = null;
  let editedMnemonic = '';
  let loading = true;
  let saving = false;
  let error = '';
  let dataStore: IDataStore | null = null;

  onMount(async () => {
    try {
      await deckStore.load();
      const currentDeckId = $deckStore.currentDeckId;

      if (!currentDeckId) {
        error = 'No deck selected.';
        loading = false;
        return;
      }

      dataStore = await getDataStore();
      leeches = await dataStore.getLeeches(currentDeckId, $settingsStore.leechThreshold);
      loading = false;
    } catch (err: any) {
      console.error('Failed to load leeches:', err);
      error = err.message;
      loading = false;
    }
  });

  function selectLeech(leech: WordWithScheduling) {
    selectedLeech = leech;
    editedMnemonic = leech.word.mnemonic || '';
  }

  async function saveMnemonic() {
    if (!selectedLeech || !dataStore) return;

    saving = true;
    try {
      const updated = {
        ...selectedLeech.word,
        mnemonic: editedMnemonic,
        updated_at: Date.now(),
      };

      await dataStore.updateWord(updated);

      // Update local state
      selectedLeech.word.mnemonic = editedMnemonic;
      leeches = leeches.map((l) =>
        l.word.id === selectedLeech!.word.id ? { ...l, word: updated } : l
      );

      alert('Mnemonic saved!');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      saving = false;
    }
  }

  function goHome() {
    goto('/');
  }
</script>

<div class="min-h-screen p-8">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <button
        on:click={goHome}
        class="flex items-center gap-2 px-3 py-2 rounded"
        style="color: var(--muted)"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <h1 class="text-3xl font-display font-bold" style="color: var(--danger)">
        Clinic - Leech Management
      </h1>

      <div class="w-24"></div>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--danger)"></div>
        <p class="mt-4" style="color: var(--muted)">Loading leeches...</p>
      </div>
    {:else if leeches.length === 0}
      <div class="text-center py-12">
        <p class="text-xl mb-4" style="color: var(--muted)">No leeches found!</p>
        <p style="color: var(--muted); opacity: 0.7">
          Cards with {$settingsStore.leechThreshold}+ lapses will appear here.
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Leech list -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold mb-4">
            Leeches ({leeches.length})
          </h2>
          <div class="space-y-2 max-h-[70vh] overflow-y-auto">
            {#each leeches as leech}
              <button
                on:click={() => selectLeech(leech)}
                class="w-full p-4 rounded-lg text-left transition-all hover:scale-[1.02]"
                style="
                  background: var(--card-bg);
                  border: 2px solid {selectedLeech?.word.id === leech.word.id ? 'var(--danger)' : 'var(--card-border)'};
                "
              >
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-display font-bold text-lg" style="color: var(--accent-1)">
                    {leech.word.headword}
                  </h3>
                  <span
                    class="px-2 py-1 rounded text-xs font-semibold"
                    style="background: var(--danger); color: white"
                  >
                    {leech.scheduling.lapses} lapses
                  </span>
                </div>
                <p class="text-sm line-clamp-2" style="color: var(--muted)">
                  {leech.word.definition}
                </p>
              </button>
            {/each}
          </div>
        </div>

        <!-- Selected leech details -->
        {#if selectedLeech}
          <div class="p-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
            <h2 class="font-display font-bold text-2xl mb-4" style="color: var(--accent-1)">
              {selectedLeech.word.headword}
            </h2>

            <div class="space-y-4 mb-6">
              <div>
                <div class="text-xs font-semibold mb-1" style="color: var(--muted)">DEFINITION</div>
                <p>{selectedLeech.word.definition}</p>
              </div>

              {#if selectedLeech.word.example}
                <div>
                  <div class="text-xs font-semibold mb-1" style="color: var(--muted)">EXAMPLE</div>
                  <p class="italic" style="color: var(--muted)">"{selectedLeech.word.example}"</p>
                </div>
              {/if}

              {#if selectedLeech.word.etymology}
                <div>
                  <div class="text-xs font-semibold mb-1" style="color: var(--muted)">ETYMOLOGY</div>
                  <p class="italic text-sm" style="color: var(--muted)">{selectedLeech.word.etymology}</p>
                </div>
              {/if}
            </div>

            <!-- Mnemonic editor -->
            <div class="mb-4">
              <label class="block text-xs font-semibold mb-2" style="color: var(--muted)">
                MNEMONIC (Edit to help remember)
              </label>
              <textarea
                bind:value={editedMnemonic}
                rows="4"
                class="w-full p-3 rounded border font-body"
                style="
                  background: rgba(191, 167, 106, 0.05);
                  border-color: var(--card-border);
                  color: var(--fg);
                  resize: vertical;
                "
                placeholder="Add a mnemonic to help you remember this word..."
              ></textarea>
            </div>

            <button
              on:click={saveMnemonic}
              disabled={saving}
              class="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:opacity-50"
              style="background: var(--accent-1); color: var(--bg)"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Mnemonic'}
            </button>
          </div>
        {:else}
          <div class="flex items-center justify-center p-12 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
            <p style="color: var(--muted)">Select a leech to edit</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
