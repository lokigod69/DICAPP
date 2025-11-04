<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { deckStore } from '$lib/stores/deck';
  import { scopeStore } from '$lib/stores/scope';
  import { authStore } from '$lib/stores/auth';
  import { Home, Menu, User, LogOut, Settings as SettingsIcon } from 'lucide-svelte';

  let showScopeMenu = false;
  let showAccountMenu = false;

  onMount(() => {
    authStore.init();
  });

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

  function toggleAccountMenu() {
    showAccountMenu = !showAccountMenu;
  }

  async function handleSignOut() {
    await authStore.signOut();
    showAccountMenu = false;
    // Hard navigation to force SSR + CSR to agree
    goto('/?signedout=1', { replaceState: true, invalidateAll: true });
  }

  function goToAccount() {
    showAccountMenu = false;
    goto('/account');
  }

  function goToSignIn() {
    goto('/auth/signin');
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

    <!-- Right Side -->
    <div class="flex items-center gap-3">
      <!-- Deck/Scope Switcher -->
      {#if $authStore.user}
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
      {/if}

      <!-- Account Menu -->
      {#if $authStore.loading}
        <div class="w-8 h-8 rounded-full animate-pulse" style="background: var(--card-bg)"></div>
      {:else if $authStore.user}
        <div class="relative">
          <button
            on:click={toggleAccountMenu}
            class="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-all"
            style="background: var(--accent-1); color: var(--bg)"
            title={$authStore.user.email}
          >
            {#if $authStore.user.user_metadata?.avatar_url}
              <img src={$authStore.user.user_metadata.avatar_url} alt="Avatar" class="w-full h-full rounded-full" />
            {:else}
              <User size={20} />
            {/if}
          </button>

          {#if showAccountMenu}
            <div
              class="absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-50"
              style="background: var(--card-bg); border: 1px solid var(--card-border)"
            >
              <div class="p-3 border-b" style="border-color: var(--card-border)">
                <div class="text-sm font-semibold truncate">{$authStore.user.user_metadata?.full_name || 'User'}</div>
                <div class="text-xs truncate" style="color: var(--muted)">{$authStore.user.email}</div>
                {#if $authStore.user.app_metadata?.provider}
                  <div class="text-xs mt-1 capitalize" style="color: var(--muted)">via {$authStore.user.app_metadata.provider}</div>
                {/if}
              </div>
              <div class="p-2">
                <button
                  on:click={goToAccount}
                  class="w-full text-left px-3 py-2 rounded hover:opacity-80 transition-opacity flex items-center gap-2"
                >
                  <SettingsIcon size={16} />
                  <span>Account</span>
                </button>
                <button
                  on:click={handleSignOut}
                  class="w-full text-left px-3 py-2 rounded hover:opacity-80 transition-opacity flex items-center gap-2 text-red-400"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <button
          on:click={goToSignIn}
          class="px-4 py-2 rounded-lg font-medium hover:opacity-80 transition-all"
          style="background: var(--accent-1); color: var(--bg)"
        >
          Sign In
        </button>
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

{#if showAccountMenu}
  <div
    class="fixed inset-0 z-40"
    on:click={() => showAccountMenu = false}
    on:keydown={(e) => e.key === 'Escape' && (showAccountMenu = false)}
    role="button"
    tabindex="0"
  ></div>
{/if}

<style>
  header {
    backdrop-filter: blur(10px);
  }
</style>
