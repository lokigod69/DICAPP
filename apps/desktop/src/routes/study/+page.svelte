<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { studyStore, isComplete } from '$lib/stores/study';
  import { getDataStore } from '$lib/stores/database';
  import { settingsStore } from '$lib/stores/settings';
  import { buildQueue } from '@runedeck/core/queue';
  import { gradeCard, modeOf } from '@runedeck/core/scheduler';
  import { uuid } from '@runedeck/core/models';
  import type { Grade } from '@runedeck/core/models';
  import type { IDataStore } from '@runedeck/data';
  import Card from '$lib/components/Card.svelte';
  import GradeButtons from '$lib/components/GradeButtons.svelte';
  import { ArrowLeft } from 'lucide-svelte';

  let loading = true;
  let error = '';
  let keyboardEnabled = true;
  let dataStore: IDataStore | null = null;

  onMount(async () => {
    try {
      dataStore = await getDataStore();

      // Build study queue
      const config = {
        dueLimit: $settingsStore.dueLimit,
        newPerDay: $settingsStore.newPerDay,
        leechThreshold: $settingsStore.leechThreshold,
      };

      const { cards } = await buildQueue(dataStore, config);

      if (cards.length === 0) {
        error = 'No cards due for review. Check back later!';
        loading = false;
        return;
      }

      studyStore.startSession(cards);
      loading = false;

      // Add keyboard listener
      window.addEventListener('keydown', handleKeyboard);
    } catch (err: any) {
      error = err.message;
      loading = false;
    }
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyboard);
  });

  function handleKeyboard(e: KeyboardEvent) {
    if (!keyboardEnabled) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    const key = e.key.toLowerCase();

    if (key === 'r') {
      e.preventDefault();
      reveal();
    } else if (key === '1') {
      e.preventDefault();
      handleGrade(1);
    } else if (key === '2') {
      e.preventDefault();
      handleGrade(2);
    } else if (key === '3') {
      e.preventDefault();
      handleGrade(3);
    } else if (key === '4') {
      e.preventDefault();
      handleGrade(4);
    } else if (key === 'escape') {
      e.preventDefault();
      goHome();
    }
  }

  function reveal() {
    studyStore.reveal();
  }

  async function handleGrade(grade: Grade) {
    const state = $studyStore;
    if (!state.session || !state.currentCard || !dataStore) return;
    if (!state.revealed && modeOf(state.currentCard.scheduling) === 'retention') return;

    try {
      const card = state.currentCard;
      const elapsed = state.session.elapsed();

      // Update scheduling
      const newScheduling = gradeCard(card.scheduling, grade);
      await dataStore.upsertScheduling(newScheduling);

      // Save review
      await dataStore.addReview({
        id: uuid(),
        word_id: card.word.id,
        ts: Date.now(),
        grade,
        elapsed_ms: elapsed,
      });

      // Move to next card
      studyStore.nextCard();
    } catch (err: any) {
      console.error('Failed to grade card:', err);
      error = err.message;
    }
  }

  function goHome() {
    studyStore.reset();
    goto('/');
  }

  $: if ($isComplete && !loading) {
    setTimeout(() => {
      studyStore.reset();
      goto('/complete');
    }, 500);
  }
</script>

<div class="min-h-screen flex flex-col">
  <!-- Header -->
  <div class="p-4 flex items-center justify-between" style="background: var(--bg); border-bottom: 1px solid var(--card-border)">
    <button
      on:click={goHome}
      class="flex items-center gap-2 px-3 py-2 rounded hover:bg-opacity-10"
      style="color: var(--muted); transition: all 0.2s"
    >
      <ArrowLeft size={20} />
      <span>Home</span>
    </button>

    {#if $studyStore.session}
      <div class="flex-1 max-w-md mx-4">
        <div class="flex justify-between text-sm mb-1" style="color: var(--muted)">
          <span>{$studyStore.progress.current} / {$studyStore.progress.total}</span>
          <span>{$studyStore.progress.percent}%</span>
        </div>
        <div class="w-full h-2 rounded-full" style="background: rgba(191, 167, 106, 0.2)">
          <div
            class="h-full rounded-full transition-all duration-300"
            style="width: {$studyStore.progress.percent}%; background: var(--accent-1)"
          ></div>
        </div>
      </div>
    {/if}

    <div class="w-24"></div>
  </div>

  <!-- Main content -->
  <div class="flex-1 flex items-center justify-center p-8">
    {#if loading}
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style="border-color: var(--accent-1)"></div>
        <p style="color: var(--muted)">Loading cards...</p>
      </div>
    {:else if error}
      <div class="text-center max-w-md">
        <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-6 mb-4">
          <p class="text-red-400">{error}</p>
        </div>
        <button
          on:click={goHome}
          class="px-6 py-2 rounded-lg"
          style="background: var(--accent-1); color: var(--bg)"
        >
          Return Home
        </button>
      </div>
    {:else if $studyStore.currentCard}
      <div class="space-y-6">
        <!-- Card -->
        <div class="flex justify-center">
          <Card
            word={$studyStore.currentCard.word}
            scheduling={$studyStore.currentCard.scheduling}
            revealed={$studyStore.revealed}
          />
        </div>

        <!-- Reveal button (only for unrevealed retention cards) -->
        {#if !$studyStore.revealed && modeOf($studyStore.currentCard.scheduling) === 'retention'}
          <div class="flex justify-center">
            <button
              on:click={reveal}
              class="px-8 py-3 rounded-lg font-semibold transition-all hover:scale-105"
              style="background: var(--accent-2); color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3)"
            >
              Reveal (R)
            </button>
          </div>
        {/if}

        <!-- Grade buttons -->
        {#if $studyStore.revealed || modeOf($studyStore.currentCard.scheduling) !== 'retention'}
          <div class="max-w-3xl mx-auto">
            <GradeButtons onGrade={handleGrade} disabled={false} />
          </div>
        {/if}

        <!-- Keyboard hints -->
        <div class="text-center text-xs" style="color: var(--muted); opacity: 0.6">
          Keyboard: R=Reveal • 1-4=Grade • Esc=Exit
        </div>
      </div>
    {/if}
  </div>
</div>
