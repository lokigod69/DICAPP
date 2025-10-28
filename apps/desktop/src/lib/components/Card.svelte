<script lang="ts">
  import type { Word } from '@runedeck/core/models';
  import { frequencyToRarity } from '@runedeck/core/models';
  import { modeOf, type SchedulingData } from '@runedeck/core/scheduler';
  import { settingsStore } from '$lib/stores/settings';

  export let word: Word;
  export let scheduling: SchedulingData;
  export let revealed = false;

  $: rarity = frequencyToRarity(word.freq);
  $: actualMode = modeOf(scheduling);

  // Determine if we should show the answer
  $: frontShowsAnswer =
    revealed ||
    (actualMode === 'learning' && $settingsStore.learningReveal === 'rich') ||
    actualMode === 'clinic';

  // Study orientation
  $: orientation = $settingsStore.studyOrientation;

  const rarityGems: Record<string, string> = {
    mythic: '◆',
    rare: '●',
    uncommon: '▲',
    common: '○',
  };

  const rarityColors: Record<string, string> = {
    mythic: '#ff6b9d',
    rare: '#8b5cf6',
    uncommon: '#3b82f6',
    common: '#6b7280',
  };
</script>

<div
  class="card-frame"
  style="
    width: var(--card-w);
    max-width: 95vw;
    height: var(--card-h);
    max-height: 85vh;
    background: var(--card-bg);
    border-radius: var(--radius);
    box-shadow: var(--shadow-card);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  "
>
  <!-- Foil sweep effect on hover -->
  <div class="foil-sweep"></div>

  <!-- Header: Show headword only for word-to-def orientation -->
  {#if orientation === 'word-to-def'}
    <div class="card-header" style="padding: 2rem 2rem 1rem; border-bottom: 1px solid var(--card-border)">
      <h1
        class="text-4xl font-display font-bold mb-2"
        style="color: var(--accent-1); text-align: center; letter-spacing: 0.02em"
      >
        {word.headword}
      </h1>
      <div class="text-center space-x-3 text-sm" style="color: var(--muted)">
        {#if word.pos}
          <span class="font-medium">{word.pos}</span>
        {/if}
        {#if word.ipa}
          <span class="font-mono">{word.ipa}</span>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Body -->
  <div class="card-body" style="flex: 1; padding: 2rem; overflow-y: auto; position: relative" data-revealed={frontShowsAnswer}>
    {#if orientation === 'def-to-word'}
      <!-- DEF → WORD: Show definition first, reveal headword -->
      <div class="space-y-6">
        <!-- PROMPT: Always visible -->
        <section class="prompt">
          <div class="text-xs font-semibold mb-2" style="color: var(--muted)">DEFINITION</div>
          <p class="text-xl leading-relaxed" style="color: var(--fg)">
            {word.definition}
          </p>
        </section>

        <!-- ANSWER: Only when revealed -->
        {#if frontShowsAnswer}
          <section class="answer reveal">
            <div class="text-xs font-semibold mb-2" style="color: var(--accent-1)">WORD</div>
            <h2 class="text-3xl font-display font-bold mb-4" style="color: var(--accent-1)">
              {word.headword}
            </h2>
            <div class="text-sm mb-4" style="color: var(--muted)">
              {#if word.pos}<span class="font-medium">{word.pos}</span>{/if}
              {#if word.ipa}<span class="font-mono ml-2">{word.ipa}</span>{/if}
            </div>

            {#if word.example}
              <p class="text-base italic mb-4" style="color: var(--muted)">"{word.example}"</p>
            {/if}

            {#if word.etymology}
              <div class="pl-4 py-2 italic text-sm mb-4" style="border-left: 3px solid var(--accent-1); color: var(--muted)">
                {word.etymology}
              </div>
            {/if}

            {#if word.mnemonic}
              <div class="p-3 rounded text-sm mb-4" style="background: rgba(191, 167, 106, 0.1); color: var(--fg)">
                <div class="font-semibold mb-1" style="color: var(--accent-1)">Mnemonic</div>
                {word.mnemonic}
              </div>
            {/if}

            {#if word.gloss_de}
              <div class="text-sm" style="color: var(--muted)">
                <span class="font-semibold">DE:</span> {word.gloss_de}
              </div>
            {/if}
          </section>
        {/if}
      </div>
    {:else}
      <!-- WORD → DEF: Show headword in header (already visible), reveal definition -->
      <div class="space-y-6">
        <!-- ANSWER: Only when revealed -->
        {#if frontShowsAnswer}
          <section class="answer reveal">
            <div class="text-xs font-semibold mb-2" style="color: var(--accent-1)">DEFINITION</div>
            <p class="text-xl leading-relaxed mb-4" style="color: var(--fg)">
              {word.definition}
            </p>

            {#if word.example}
              <p class="text-base italic mb-4" style="color: var(--muted)">"{word.example}"</p>
            {/if}

            {#if word.etymology}
              <div class="pl-4 py-2 italic text-sm mb-4" style="border-left: 3px solid var(--accent-1); color: var(--muted)">
                {word.etymology}
              </div>
            {/if}

            {#if word.mnemonic}
              <div class="p-3 rounded text-sm mb-4" style="background: rgba(191, 167, 106, 0.1); color: var(--fg)">
                <div class="font-semibold mb-1" style="color: var(--accent-1)">Mnemonic</div>
                {word.mnemonic}
              </div>
            {/if}

            {#if word.gloss_de}
              <div class="text-sm" style="color: var(--muted)">
                <span class="font-semibold">DE:</span> {word.gloss_de}
              </div>
            {/if}
          </section>
        {/if}
      </div>
    {/if}

    <!-- Small hint (doesn't block content) -->
    {#if !frontShowsAnswer}
      <div class="reveal-hint">Press R to reveal</div>
    {/if}
  </div>

  <!-- Footer -->
  <div
    class="card-footer"
    style="padding: 1rem 2rem; border-top: 1px solid var(--card-border); display: flex; justify-content: space-between; align-items: center"
  >
    <div class="text-xs" style="color: var(--muted)">
      {#if word.tags.length > 0}
        {word.tags.join(' • ')}
      {:else}
        <span style="opacity: 0.5">No tags</span>
      {/if}
    </div>
    <div
      class="rarity-gem text-2xl"
      style="color: {rarityColors[rarity]}"
      title="{rarity} (freq: {word.freq})"
    >
      {rarityGems[rarity]}
    </div>
  </div>
</div>

<style>
  .card-frame {
    transition: transform 0.2s ease;
  }

  .card-frame:hover {
    transform: translateY(-4px);
  }

  .foil-sweep {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(
      110deg,
      transparent 0%,
      transparent 40%,
      rgba(191, 167, 106, 0.15) 50%,
      transparent 60%,
      transparent 100%
    );
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .card-frame:hover .foil-sweep {
    opacity: 1;
    animation: sweep 2s ease-in-out infinite;
  }

  @keyframes sweep {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(100%);
    }
  }

  /* Reveal animation */
  .reveal {
    transform: rotateY(90deg);
    opacity: 0;
    transition: transform 0.25s ease, opacity 0.25s ease;
  }

  [data-revealed="true"] .reveal {
    transform: rotateY(0deg);
    opacity: 1;
  }

  /* Small hint (doesn't block content) */
  .reveal-hint {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    opacity: 0.65;
    font-size: 0.8rem;
    pointer-events: none; /* CRITICAL: doesn't block clicks or content */
    color: var(--muted);
  }

  .card-body::-webkit-scrollbar {
    width: 6px;
  }

  .card-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .card-body::-webkit-scrollbar-thumb {
    background: var(--card-border);
    border-radius: 3px;
  }
</style>
