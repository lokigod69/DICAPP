<script lang="ts">
  import { goto } from '$app/navigation';
  import { getDataStore } from '$lib/stores/database';
  import { deckStore } from '$lib/stores/deck';
  import { createDeck } from '@runedeck/core/models';

  export let open = false;
  export let onClose: () => void;

  let name = '';
  let profile: 'simple' | 'full' = 'full';
  let visibility: 'private' | 'public' = 'private';
  let creating = false;
  let error = '';

  async function handleSubmit() {
    if (!name.trim()) {
      error = 'Please enter a deck name';
      return;
    }

    creating = true;
    error = '';

    try {
      const deck = createDeck({
        name: name.trim(),
        profile,
      });

      if (visibility === 'public') {
        (deck as any).visibility = 'public';
      }

      const dataStore = await getDataStore();
      await dataStore.createDeck(deck);
      await deckStore.refresh();
      deckStore.setCurrent(deck.id);

      // Reset form
      name = '';
      profile = 'full';
      visibility = 'private';
      onClose();

      // Navigate to import
      goto(`/import?deck=${deck.id}`);
    } catch (err: any) {
      error = err.message || 'Failed to create deck';
    } finally {
      creating = false;
    }
  }

  function handleClose() {
    if (!creating) {
      error = '';
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !creating) {
      handleClose();
    } else if (e.key === 'Enter' && !creating) {
      handleSubmit();
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    role="button"
    tabindex="0"
    on:click={handleClose}
    on:keydown={handleKeydown}
  >
    <div
      class="rounded-lg p-6 max-w-md w-full"
      style="background: var(--card-bg); border: 1px solid var(--card-border)"
      role="dialog"
      aria-labelledby="new-deck-title"
      on:click={(e) => e.stopPropagation()}
      on:keydown={(e) => e.key === 'Enter' && handleSubmit()}
    >
      <h2 id="new-deck-title" class="text-2xl font-bold mb-6" style="color: var(--accent-1)">
        Create New Deck
      </h2>

      {#if error}
        <div
          class="mb-4 p-3 rounded-lg text-sm"
          style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: rgb(239, 68, 68)"
        >
          {error}
        </div>
      {/if}

      <div class="space-y-4 mb-6">
        <div>
          <label for="deck-name" class="block mb-2 font-semibold">Deck Name</label>
          <input
            id="deck-name"
            type="text"
            bind:value={name}
            placeholder="e.g., Spanish Vocabulary"
            disabled={creating}
            class="w-full px-4 py-2 rounded border"
            style="background: var(--bg); border-color: var(--card-border); color: var(--fg)"
            autofocus
          />
        </div>

        <div>
          <label for="deck-profile" class="block mb-2 font-semibold">Profile</label>
          <div class="space-y-2">
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                id="profile-simple"
                type="radio"
                bind:group={profile}
                value="simple"
                disabled={creating}
                class="mt-1"
              />
              <div>
                <div class="font-medium">Simple</div>
                <div class="text-sm" style="color: var(--muted)">Headword + Definition only</div>
              </div>
            </label>
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                id="profile-full"
                type="radio"
                bind:group={profile}
                value="full"
                disabled={creating}
                class="mt-1"
              />
              <div>
                <div class="font-medium">Full</div>
                <div class="text-sm" style="color: var(--muted)">
                  All fields: etymology, examples, mnemonics, etc.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label for="deck-visibility" class="block mb-2 font-semibold">Visibility</label>
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                id="visibility-private"
                type="radio"
                bind:group={visibility}
                value="private"
                disabled={creating}
              />
              <span>Private (only you can see)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                id="visibility-public"
                type="radio"
                bind:group={visibility}
                value="public"
                disabled={creating}
              />
              <span>Public (anyone can clone)</span>
            </label>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          type="button"
          on:click={handleSubmit}
          disabled={creating || !name.trim()}
          class="flex-1 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: var(--accent-1); color: var(--bg)"
        >
          {creating ? 'Creating...' : 'Create & Import'}
        </button>
        <button
          type="button"
          on:click={handleClose}
          disabled={creating}
          class="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--fg)"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
