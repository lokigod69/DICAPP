<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { authStore } from '$lib/stores/auth';
  import { createDeck, uuid } from '@runedeck/core/models';
  import Header from '$lib/components/Header.svelte';
  import { ArrowLeft, Copy, BookOpen, Eye, User as UserIcon } from 'lucide-svelte';

  let slug = $page.params.slug;
  let deck: any = null;
  let words: any[] = [];
  let loading = true;
  let cloning = false;
  let error = '';

  onMount(async () => {
    await authStore.init();
    await loadDeck();
  });

  async function loadDeck() {
    loading = true;
    error = '';

    try {
      // Get public deck by slug
      const { data: deckData, error: deckError } = await supabase
        .from('decks')
        .select('*, profiles(display_name)')
        .eq('slug', slug)
        .eq('visibility', 'public')
        .single();

      if (deckError || !deckData) {
        error = 'Deck not found or is private';
        loading = false;
        return;
      }

      deck = deckData;

      // Get words (first 20 for preview)
      const { data: wordsData, error: wordsError } = await supabase
        .from('words')
        .select('headword, definition, pos, tags')
        .eq('deck_id', deck.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(20);

      if (wordsError) {
        console.error('Failed to load words:', wordsError);
      } else {
        words = wordsData || [];
      }
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  async function cloneDeck() {
    if (!$authStore.user) {
      goto('/auth/signin');
      return;
    }

    cloning = true;

    try {
      // Fetch all words from source deck
      const { data: allWords, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .eq('deck_id', deck.id)
        .is('deleted_at', null);

      if (wordsError) throw new Error(`Failed to fetch words: ${wordsError.message}`);

      // Create new deck for user
      const newDeckId = uuid();
      const newSlug = `${deck.slug}-${Date.now()}`;

      const { error: newDeckError } = await supabase.from('decks').insert({
        id: newDeckId,
        name: `${deck.name} (Clone)`,
        slug: newSlug,
        profile: deck.profile,
        visibility: 'private',
        config: deck.config,
      });

      if (newDeckError) throw new Error(`Failed to create deck: ${newDeckError.message}`);

      // Clone words with new IDs and deck_id
      const clonedWords = (allWords || []).map((word) => ({
        id: uuid(),
        deck_id: newDeckId,
        headword: word.headword,
        pos: word.pos,
        ipa: word.ipa,
        definition: word.definition,
        example: word.example,
        gloss_de: word.gloss_de,
        etymology: word.etymology,
        mnemonic: word.mnemonic,
        tags: word.tags,
        freq: word.freq,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: wordsInsertError } = await supabase.from('words').insert(clonedWords);

      if (wordsInsertError) throw new Error(`Failed to clone words: ${wordsInsertError.message}`);

      // Create initial scheduling for cloned words
      const scheduling = clonedWords.map((word) => ({
        word_id: word.id,
        due_ts: Date.now(),
        interval: 0,
        ease: 2.5,
        lapses: 0,
        is_new: 1,
      }));

      const { error: schedError } = await supabase.from('scheduling').insert(scheduling);

      if (schedError) throw new Error(`Failed to create scheduling: ${schedError.message}`);

      // Success! Redirect to decks page
      alert(`Successfully cloned "${deck.name}"! You now have your own copy.`);
      goto('/decks');
    } catch (err: any) {
      alert(`Clone failed: ${err.message}`);
    } finally {
      cloning = false;
    }
  }

  function goBack() {
    goto('/explore');
  }
</script>

<Header />

<div class="min-h-screen p-8" style="background: var(--bg)">
  <div class="max-w-4xl mx-auto">
    <!-- Back Button -->
    <button
      on:click={goBack}
      class="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
      style="color: var(--muted)"
    >
      <ArrowLeft size={20} />
      <span>Back to Explore</span>
    </button>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--accent-1)"></div>
        <p class="mt-4" style="color: var(--muted)">Loading deck...</p>
      </div>
    {:else if error}
      <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-8 text-center">
        <h2 class="text-2xl font-bold mb-2 text-red-400">Error</h2>
        <p style="color: var(--muted)">{error}</p>
      </div>
    {:else if deck}
      <!-- Deck Header -->
      <div class="rounded-lg p-6 mb-6" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl font-bold">{deck.name}</h1>
              <span class="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1" style="background: rgba(255,255,255,0.1)">
                <Eye size={14} />
                PUBLIC
              </span>
            </div>
            <div class="flex items-center gap-2 text-sm" style="color: var(--muted)">
              <UserIcon size={16} />
              <span>by {deck.profiles?.display_name || 'Anonymous'}</span>
            </div>
          </div>

          {#if $authStore.user}
            <button
              on:click={cloneDeck}
              disabled={cloning}
              class="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
              style="background: var(--accent-1); color: var(--bg); box-shadow: var(--shadow-lg)"
            >
              <Copy size={20} />
              <span>{cloning ? 'Cloning...' : 'Clone Deck'}</span>
            </button>
          {:else}
            <button
              on:click={() => goto('/auth/signin')}
              class="px-6 py-3 rounded-lg font-semibold hover:opacity-80 transition-opacity"
              style="background: var(--accent-2); color: var(--bg)"
            >
              Sign In to Clone
            </button>
          {/if}
        </div>

        <!-- Deck Info -->
        <div class="flex items-center gap-6 text-sm">
          <div class="flex items-center gap-2">
            <BookOpen size={16} style="color: var(--muted)" />
            <span style="color: var(--muted)">{words.length}+ words</span>
          </div>
          <div>
            <span
              class="px-2 py-1 rounded text-xs font-semibold"
              style="background: {deck.profile === 'simple' ? 'var(--accent-2)' : 'var(--accent-1)'}; color: var(--bg)"
            >
              {deck.profile.toUpperCase()} PROFILE
            </span>
          </div>
        </div>
      </div>

      <!-- Words Preview -->
      <div class="rounded-lg p-6" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="text-xl font-bold mb-4">Word Preview</h2>
        {#if words.length === 0}
          <p style="color: var(--muted)">No words in this deck yet.</p>
        {:else}
          <div class="space-y-3">
            {#each words as word}
              <div class="p-4 rounded-lg" style="background: var(--bg)">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="font-bold text-lg">{word.headword}</div>
                    {#if word.pos}
                      <div class="text-sm" style="color: var(--muted)">{word.pos}</div>
                    {/if}
                  </div>
                  {#if word.tags}
                    <div class="text-xs" style="color: var(--muted)">{word.tags}</div>
                  {/if}
                </div>
                <div class="mt-2" style="color: var(--muted)">{word.definition}</div>
              </div>
            {/each}
          </div>
          {#if words.length >= 20}
            <p class="mt-4 text-sm text-center" style="color: var(--muted)">
              Showing first 20 words. Clone to see all.
            </p>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</div>
