<script lang="ts">
  import { goto } from '$app/navigation';
  import { themeStore, settingsStore } from '$lib/stores/settings';
  import { getDataStore } from '$lib/stores/database';
  import { exportToCsv } from '@runedeck/core/csv';
  import { ArrowLeft, Download, Sun, Moon } from 'lucide-svelte';

  let exporting = false;

  function toggleTheme() {
    themeStore.toggle();
  }

  function updateSettings() {
    settingsStore.update((s) => ({ ...s }));
    alert('Settings saved!');
  }

  async function exportCsv() {
    exporting = true;
    try {
      const dataStore = await getDataStore();
      const { words } = await dataStore.exportAll();
      const csv = exportToCsv(words);

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `runedeck-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      exporting = false;
    }
  }

  async function exportJson() {
    exporting = true;
    try {
      const dataStore = await getDataStore();
      const data = await dataStore.exportAll();
      const json = JSON.stringify(data, null, 2);

      // Download
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `runedeck-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      exporting = false;
    }
  }

  function goHome() {
    goto('/');
  }
</script>

<div class="min-h-screen p-8">
  <div class="max-w-3xl mx-auto">
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

      <h1 class="text-3xl font-display font-bold" style="color: var(--accent-1)">
        Settings
      </h1>

      <div class="w-24"></div>
    </div>

    <div class="space-y-6">
      <!-- Theme -->
      <div class="p-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="text-lg font-semibold mb-4">Theme</h2>
        <button
          on:click={toggleTheme}
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:scale-105"
          style="background: var(--accent-1); color: var(--bg)"
        >
          {#if $themeStore === 'dark'}
            <Sun size={20} />
            <span>Switch to Light Mode</span>
          {:else}
            <Moon size={20} />
            <span>Switch to Dark Mode</span>
          {/if}
        </button>
      </div>

      <!-- Study Mode -->
      <div class="p-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="text-lg font-semibold mb-4">Study Mode</h2>

        <div class="space-y-4">
          <!-- Study Orientation -->
          <div>
            <label class="block text-sm font-medium mb-2">Study Orientation</label>
            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-opacity-50" style="background: rgba(191, 167, 106, 0.05)">
                <input
                  type="radio"
                  bind:group={$settingsStore.studyOrientation}
                  value="word-to-def"
                  class="w-4 h-4"
                  style="accent-color: var(--accent-1)"
                />
                <div>
                  <div class="font-semibold">Word → Definition</div>
                  <div class="text-xs" style="color: var(--muted)">See the headword, recall its meaning</div>
                </div>
              </label>
              <label class="flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-opacity-50" style="background: rgba(191, 167, 106, 0.05)">
                <input
                  type="radio"
                  bind:group={$settingsStore.studyOrientation}
                  value="def-to-word"
                  class="w-4 h-4"
                  style="accent-color: var(--accent-1)"
                />
                <div>
                  <div class="font-semibold">Definition → Word</div>
                  <div class="text-xs" style="color: var(--muted)">See the definition, recall the headword</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Learning Reveal Policy -->
          <div>
            <label class="block text-sm font-medium mb-2">Learning Reveal Policy</label>
            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-opacity-50" style="background: rgba(191, 167, 106, 0.05)">
                <input
                  type="radio"
                  bind:group={$settingsStore.learningReveal}
                  value="minimal"
                  class="w-4 h-4"
                  style="accent-color: var(--accent-1)"
                />
                <div>
                  <div class="font-semibold">Minimal (Recall-first)</div>
                  <div class="text-xs" style="color: var(--muted)">Hide answer until reveal, even for new cards</div>
                </div>
              </label>
              <label class="flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-opacity-50" style="background: rgba(191, 167, 106, 0.05)">
                <input
                  type="radio"
                  bind:group={$settingsStore.learningReveal}
                  value="rich"
                  class="w-4 h-4"
                  style="accent-color: var(--accent-1)"
                />
                <div>
                  <div class="font-semibold">Rich (Study-first)</div>
                  <div class="text-xs" style="color: var(--muted)">Show full details on new cards for learning</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Study limits -->
      <div class="p-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="text-lg font-semibold mb-4">Study Limits</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">
              New Cards Per Day: {$settingsStore.newPerDay}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              bind:value={$settingsStore.newPerDay}
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              Due Cards Limit: {$settingsStore.dueLimit}
            </label>
            <input
              type="range"
              min="5"
              max="100"
              bind:value={$settingsStore.dueLimit}
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">
              Leech Threshold: {$settingsStore.leechThreshold}
            </label>
            <input
              type="range"
              min="3"
              max="20"
              bind:value={$settingsStore.leechThreshold}
              class="w-full"
            />
            <p class="text-xs mt-1" style="color: var(--muted)">
              Cards with this many lapses are marked as leeches
            </p>
          </div>

          <button
            on:click={updateSettings}
            class="w-full py-3 px-4 rounded-lg font-semibold transition-all hover:scale-105"
            style="background: var(--accent-1); color: var(--bg)"
          >
            Save Settings
          </button>
        </div>
      </div>

      <!-- Export -->
      <div class="p-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="text-lg font-semibold mb-4">Export Data</h2>

        <div class="space-y-3">
          <button
            on:click={exportCsv}
            disabled={exporting}
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50"
            style="background: var(--accent-2); color: white"
          >
            <Download size={18} />
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </button>

          <button
            on:click={exportJson}
            disabled={exporting}
            class="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50"
            style="background: var(--accent-2); color: white"
          >
            <Download size={18} />
            {exporting ? 'Exporting...' : 'Export as JSON'}
          </button>
        </div>
      </div>

      <!-- About -->
      <div class="p-6 rounded-lg text-center" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="font-display text-2xl font-bold mb-2" style="color: var(--accent-1)">RuneDeck</h2>
        <p class="text-sm" style="color: var(--muted)">Version 1.0.0 "Tent MVP"</p>
        <p class="text-xs mt-2" style="color: var(--muted); opacity: 0.7">
          Advanced vocabulary training with SM-2 spaced repetition
        </p>
      </div>
    </div>
  </div>
</div>

<style>
  input[type='range'] {
    accent-color: var(--accent-1);
  }
</style>
