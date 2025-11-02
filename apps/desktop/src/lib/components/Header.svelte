<script lang="ts">
  import { goto } from '$app/navigation';
  import { deckStore } from '$lib/stores/deck';
  import { scopeStore } from '$lib/stores/scope';
  import { Home, Menu } from 'lucide-svelte';

  let showScopeMenu = false;

  function goHome() {
    goto('/');
  }

  function toggleScopeMenu() {
    showScopeMenu = !showScopeMenu;
  }

  function selectScope(type: 'current' | 'all') {
    if (type === 'current') {
      scopeStore.setCurrent();
    } else {
      scopeStore.setAll();
    }
    showScopeMenu = false;
  }

  function selectDeck(deckId: string) {
    deckStore.setCurrent(deckId);
    scopeStore.setCurrent(); // Auto-switch to current deck scope
  }

  $: currentDeck = $deckStore.decks.find(d => d.id === $deckStore.currentDeckId);
  $: scopeLabel = $scopeStore.type === 'all'
    ? 'All Decks'
    : $scopeStore.type === 'current'
    ? currentDeck?.name || 'No Deck'
    : `${$scopeStore.deckIds.length} Decks`;
</script>

<header class="border-b py-4 px-6" style="border-color: var(--card-border)">
  <div class="flex items-center justify-between max-w-7xl mx-auto">
    <!-- Logo / Home -->
    <button
      on:click={goHome}
      class="flex items-center gap-3 hover:opacity-80 transition-opacity"
    >
      <Home size={24} style="color: var(--accent-1)" />
      <span class="text-xl font-display font-bold" style="color: var(--accent-1)">
        DIC APP
      </span>
    </button>

    <!-- Deck/Scope Switcher -->
    <div class="relative">
      <button
        on:click={toggleScopeMenu}
        class="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-80 transition-all"
        style="background: var(--card-bg); border: 1px solid var(--card-border)"
      >
        <Menu size={18} />
        <span class="font-medium">{scopeLabel}</span>
        <span class="text-xs" style="color: var(--muted)">
          {$scopeStore.type === 'all' ? `(${$deckStore.decks.length})` : ''}
        </span>
      </button>

      {#if showScopeMenu}
        <!-- Dropdown Menu -->
        <div
          class="absolute right-0 mt-2 w-64 rounded-lg shadow-xl z-50"
          style="background: var(--card-bg); border: 1px solid var(--card-border)"
        >
          <!-- Scope Options -->
          <div class="p-3 border-b" style="border-color: var(--card-border)">
            <div class="text-xs font-semibold mb-2" style="color: var(--muted)">STUDY SCOPE</div>
            <button
              on:click={() => selectScope('current')}
              class="w-full text-left px-3 py-2 rounded hover:opacity-80 transition-opacity mb-1"
              style="background: {$scopeStore.type === 'current' ? 'var(--accent-2)' : 'transparent'}; color: {$scopeStore.type === 'current' ? 'var(--bg)' : 'var(--fg)'}"
            >
              Current Deck Only
            </button>
            <button
              on:click={() => selectScope('all')}
              class="w-full text-left px-3 py-2 rounded hover:opacity-80 transition-opacity"
              style="background: {$scopeStore.type === 'all' ? 'var(--accent-1)' : 'transparent'}; color: {$scopeStore.type === 'all' ? 'var(--bg)' : 'var(--fg)'}"
            >
              All Decks ({$deckStore.decks.length})
            </button>
          </div>

          <!-- Deck List (when in current mode) -->
          {#if $scopeStore.type === 'current'}
            <div class="p-3 max-h-64 overflow-y-auto">
              <div class="text-xs font-semibold mb-2" style="color: var(--muted)">SELECT DECK</div>
              {#each $deckStore.decks as deck}
                <button
                  on:click={() => selectDeck(deck.id)}
                  class="w-full text-left px-3 py-2 rounded hover:opacity-80 transition-opacity mb-1 text-sm"
                  style="background: {deck.id === $deckStore.currentDeckId ? 'rgba(191, 167, 106, 0.2)' : 'transparent'}"
                >
                  <div class="flex items-center justify-between">
                    <span>{deck.name}</span>
                    {#if deck.id === $deckStore.currentDeckId}
                      <span class="text-xs px-2 py-0.5 rounded" style="background: var(--accent-1); color: var(--bg)">
                        CURRENT
                      </span>
                    {/if}
                  </div>
                  <div class="text-xs mt-1" style="color: var(--muted)">
                    {deck.profile} profile
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</header>

<!-- Click outside to close -->
{#if showScopeMenu}
  <div
    class="fixed inset-0 z-40"
    on:click={() => showScopeMenu = false}
    on:keydown={(e) => e.key === 'Escape' && (showScopeMenu = false)}
    role="button"
    tabindex="0"
  ></div>
{/if}

<style>
  header {
    backdrop-filter: blur(10px);
  }
</style>
