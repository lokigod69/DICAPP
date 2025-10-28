<script lang="ts">
  import type { Grade } from '@runedeck/core/models';

  export let onGrade: (grade: Grade) => void;
  export let disabled = false;

  const grades: Array<{ grade: Grade; label: string; key: string; color: string }> = [
    { grade: 1, label: 'Again', key: '1', color: 'var(--g-again)' },
    { grade: 2, label: 'Hard', key: '2', color: 'var(--g-hard)' },
    { grade: 3, label: 'Good', key: '3', color: 'var(--g-good)' },
    { grade: 4, label: 'Easy', key: '4', color: 'var(--g-easy)' },
  ];

  function handleGrade(grade: Grade) {
    if (!disabled) {
      onGrade(grade);
    }
  }
</script>

<div class="grade-buttons flex gap-4 justify-center">
  {#each grades as { grade, label, key, color }}
    <button
      on:click={() => handleGrade(grade)}
      {disabled}
      class="grade-btn flex-1 py-4 px-6 rounded-lg font-semibold text-base transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      style="background: {color}; color: white; box-shadow: 0 4px 12px rgba(0,0,0,0.3)"
    >
      <div class="text-lg">{label}</div>
      <div class="text-xs opacity-75">{key}</div>
    </button>
  {/each}
</div>

<style>
  .grade-btn:disabled {
    transform: none !important;
  }
</style>
