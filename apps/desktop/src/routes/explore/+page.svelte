<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import Header from '$lib/components/Header.svelte';
  import { Search, Eye, BookOpen } from 'lucide-svelte';

  interface PublicDeck {
    id: string;
    name: string;
    slug: string;
    profile: string;
    created_at: string;
    word_count: number;
  }

  let decks: PublicDeck[] = [];
  let loading = true;
  let searchQuery = '';
  let filteredDecks: PublicDeck[] = [];

  onMount(async () => {
    await loadPublicDecks();
  });

  async function loadPublicDecks() {
    loading = true;
    try {
      const { data, error } = await supabase
        .from('decks')
        .select('id, name, slug, profile, created_at')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get word counts for each deck
      const decksWithCounts = await Promise.all(
        (data || []).map(async (deck) => {
          const { count } = await supabase
            .from('words')
            .select('*', { count: 'exact', head: true })
            .eq('deck_id', deck.id)
            .is('deleted_at', null);

          return { ...deck, word_count: count || 0 };
        })
      );

      decks = decksWithCounts;
      filteredDecks = decks;
    } catch (err: any) {
      console.error('Failed to load public decks:', err);
    } finally {
      loading = false;
    }
  }

  function handleSearch() {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      filteredDecks = decks;
      return;
    }

    filteredDecks = decks.filter((deck) => deck.name.toLowerCase().includes(query));
  }

  function viewDeck(slug: string) {
    goto(`/deck/${slug}`);
  }

  $: handleSearch(), searchQuery;
</script>

<Header />

<div class="min-h-screen p-8" style="background: var(--bg)">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-8 text-center">
      <h1 class="text-5xl font-display font-bold mb-4" style="color: var(--accent-1)">
        Explore Public Decks
      </h1>
      <p class="text-xl" style="color: var(--muted)">
        Browse and clone community-created vocabulary decks
      </p>
    </div>

    <!-- Search Bar -->
    <div class="mb-8 max-w-2xl mx-auto">
      <div class="relative">
        <Search size={20} class="absolute left-4 top-1/2 transform -translate-y-1/2" style="color: var(--muted)" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search decks..."
          class="w-full pl-12 pr-4 py-3 rounded-lg border"
          style="background: var(--card-bg); border-color: var(--card-border); color: var(--fg)"
        />
      </div>
    </div>

    {#if loading}
      <!-- Loading State -->
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--accent-1)"></div>
        <p class="mt-4" style="color: var(--muted)">Loading public decks...</p>
      </div>
    {:else if filteredDecks.length === 0}
      <!-- Empty State -->
      <div class="text-center py-12">
        <BookOpen size={64} class="mx-auto mb-4" style="color: var(--muted); opacity: 0.5" />
        {#if searchQuery}
          <h2 class="text-2xl font-bold mb-2">No decks found</h2>
          <p style="color: var(--muted)">Try a different search term</p>
        {:else}
          <h2 class="text-2xl font-bold mb-2">No public decks yet</h2>
          <p style="color: var(--muted)">Be the first to create and share a deck!</p>
        {/if}
      </div>
    {:else}
      <!-- Deck Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredDecks as deck}
          <button
            on:click={() => viewDeck(deck.slug)}
            class="text-left p-6 rounded-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            style="background: var(--card-bg); border: 1px solid var(--card-border)"
          >
            <!-- Deck Name -->
            <h3 class="text-xl font-bold mb-2">{deck.name}</h3>

            <!-- Profile Badge -->
            <div class="mb-3">
              <span
                class="px-2 py-1 rounded text-xs font-semibold"
                style="background: {deck.profile === 'simple' ? 'var(--accent-2)' : 'var(--accent-1)'}; color: var(--bg)"
              >
                {deck.profile.toUpperCase()}
              </span>
            </div>

            <!-- Stats -->
            <div class="flex items-center gap-4 text-sm" style="color: var(--muted)">
              <div class="flex items-center gap-1">
                <BookOpen size={16} />
                <span>{deck.word_count} words</span>
              </div>
              <div class="flex items-center gap-1">
                <Eye size={16} />
                <span>Public</span>
              </div>
            </div>

            <!-- Created Date -->
            <div class="mt-3 text-xs" style="color: var(--muted)">
              Created {new Date(deck.created_at).toLocaleDateString()}
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
