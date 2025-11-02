<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getDataStore } from '$lib/stores/database';
  import { deckStore } from '$lib/stores/deck';
  import { parseCsv, previewCsv, type CsvError } from '@runedeck/core/csv';
  import { createDeck } from '@runedeck/core/models';
  import { ArrowLeft, Upload, CheckCircle, AlertCircle } from 'lucide-svelte';

  let fileInput: HTMLInputElement;
  let csvContent = '';
  let preview: any[] = [];
  let totalRows = 0;
  let errors: CsvError[] = [];
  let importing = false;
  let imported = false;
  let validCount = 0;
  let invalidCount = 0;
  let selectedDeckId = '';
  let loading = true;
  let detectedProfile: 'simple' | 'full' | null = null;
  let warnings: string[] = [];
  let fileName = '';
  let createNewDeck = false;
  let newDeckName = '';

  onMount(async () => {
    await deckStore.load();
    selectedDeckId = $deckStore.currentDeckId || '';
    loading = false;
  });

  async function handleFileSelect(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    try {
      csvContent = await file.text();
      fileName = file.name.replace(/\.csv$/i, ''); // Remove .csv extension
      newDeckName = fileName; // Default new deck name to file name

      const { preview: previewData, total } = previewCsv(csvContent, 20);
      preview = previewData;
      totalRows = total;
      errors = [];
      imported = false;
    } catch (err: any) {
      alert('Failed to read file: ' + err.message);
    }
  }

  async function importCsv() {
    if (!csvContent) {
      alert('No CSV loaded');
      return;
    }

    if (!createNewDeck && !selectedDeckId) {
      alert('Please select a deck or choose to create a new one');
      return;
    }

    importing = true;

    try {
      const dataStore = await getDataStore();
      let targetDeckId = selectedDeckId;

      // Create new deck if requested
      if (createNewDeck) {
        if (!newDeckName.trim()) {
          alert('Please enter a deck name');
          importing = false;
          return;
        }

        const newDeck = createDeck({
          name: newDeckName.trim(),
          profile: detectedProfile || 'full',
        });

        await dataStore.createDeck(newDeck);
        targetDeckId = newDeck.id;

        // Reload decks and set as current
        await deckStore.load();
        await deckStore.setCurrent(targetDeckId);
      }

      // Parse with profile detection and deck assignment
      const result = parseCsv(csvContent, targetDeckId);
      validCount = result.valid;
      invalidCount = result.invalid;
      errors = result.errors;
      detectedProfile = result.profile;
      warnings = result.warnings;

      if (result.words.length > 0) {
        await dataStore.batchImportWords(result.words);
        imported = true;

        // Redirect home after success
        setTimeout(() => {
          goto('/');
        }, 2000);
      }
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    } finally {
      importing = false;
    }
  }

  function reset() {
    csvContent = '';
    preview = [];
    totalRows = 0;
    errors = [];
    imported = false;
    validCount = 0;
    invalidCount = 0;
    if (fileInput) fileInput.value = '';
  }

  function goHome() {
    goto('/');
  }
</script>

<div class="min-h-screen p-8">
  <div class="max-w-5xl mx-auto">
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
        Import CSV
      </h1>

      <div class="w-24"></div>
    </div>

    <!-- Deck Selector -->
    {#if !loading && !imported}
      <div class="mb-6 p-4 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <label class="block mb-3 font-semibold">Target Deck:</label>

        <!-- Radio buttons for deck selection mode -->
        <div class="flex gap-6 mb-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              bind:group={createNewDeck}
              value={false}
              class="accent-current"
            />
            <span class="text-sm">Import to existing deck</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              bind:group={createNewDeck}
              value={true}
              class="accent-current"
            />
            <span class="text-sm">Create new deck from file</span>
          </label>
        </div>

        {#if createNewDeck}
          <!-- New deck name input -->
          <div>
            <label class="block mb-2 text-sm" style="color: var(--muted)">New Deck Name:</label>
            <input
              type="text"
              bind:value={newDeckName}
              placeholder="Enter deck name..."
              class="w-full px-4 py-2 rounded border"
              style="background: var(--bg); border-color: var(--card-border); color: var(--fg)"
            />
            <p class="text-xs mt-1" style="color: var(--muted)">
              Default: "{fileName}"
            </p>
          </div>
        {:else}
          <!-- Existing deck selector -->
          <select
            bind:value={selectedDeckId}
            class="w-full px-4 py-2 rounded border"
            style="background: var(--bg); border-color: var(--card-border); color: var(--fg)"
          >
            {#each $deckStore.decks as deck}
              <option value={deck.id}>{deck.name}</option>
            {/each}
          </select>
        {/if}
      </div>
    {/if}

    {#if imported}
      <!-- Success message -->
      <div class="bg-green-900/20 border border-green-500/50 rounded-lg p-8 text-center">
        <CheckCircle size={48} class="mx-auto mb-4 text-green-400" />
        <h2 class="text-2xl font-bold mb-2 text-green-400">Import Successful!</h2>
        <p class="text-lg mb-4" style="color: var(--muted)">
          Imported {validCount} {validCount === 1 ? 'word' : 'words'}
        </p>
        <p class="text-sm" style="color: var(--muted)">Redirecting to home...</p>
      </div>
    {:else if !csvContent}
      <!-- File upload -->
      <div
        class="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-opacity-70 transition-all"
        style="border-color: var(--card-border)"
        on:click={() => fileInput.click()}
        on:keydown={(e) => e.key === 'Enter' && fileInput.click()}
        role="button"
        tabindex="0"
      >
        <input
          type="file"
          accept=".csv"
          bind:this={fileInput}
          on:change={handleFileSelect}
          class="hidden"
        />

        <Upload size={48} class="mx-auto mb-4" style="color: var(--muted)" />
        <h2 class="text-xl font-semibold mb-2">Upload CSV File</h2>
        <p class="mb-4" style="color: var(--muted)">
          Click to browse or drag and drop
        </p>
        <p class="text-sm" style="color: var(--muted); opacity: 0.7">
          Supports two profiles: <strong>Simple</strong> (headword, translation) or <strong>Full</strong> (all fields)
        </p>
      </div>

      <!-- Format examples -->
      <div class="mt-8 space-y-4">
        <div class="p-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
          <h3 class="font-semibold mb-2 flex items-center gap-2">
            <span class="px-2 py-1 rounded text-xs" style="background: var(--accent-2); color: var(--bg)">SIMPLE</span>
            Minimal Format (2 columns)
          </h3>
          <pre class="text-xs font-mono overflow-x-auto mt-3" style="color: var(--muted)">headword,translation
hello,Hallo
goodbye,Auf Wiedersehen</pre>
        </div>

        <div class="p-6 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
          <h3 class="font-semibold mb-2 flex items-center gap-2">
            <span class="px-2 py-1 rounded text-xs" style="background: var(--accent-1); color: var(--bg)">FULL</span>
            Rich Format (10 columns)
          </h3>
          <pre class="text-xs font-mono overflow-x-auto mt-3" style="color: var(--muted)">headword,pos,ipa,definition,example,gloss_de,etymology,mnemonic,tags,freq
susurrus,n.,/suˈsʌr.əs/,a soft murmuring,A susurrus rose,Flüstern,&lt;Latin&gt;,ssss snakes,poetic;nature,2.8</pre>
        </div>
      </div>
    {:else}
      <!-- Preview -->
      <div class="space-y-6">
        <!-- Profile Badge and Warnings -->
        {#if detectedProfile}
          <div class="p-4 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
            <div class="flex items-center gap-3 mb-2">
              <span class="px-3 py-1 rounded text-xs font-semibold" style="background: {detectedProfile === 'simple' ? 'var(--accent-2)' : 'var(--accent-1)'}; color: var(--bg)">
                {detectedProfile.toUpperCase()} PROFILE
              </span>
              {#if detectedProfile === 'simple'}
                <span class="text-sm" style="color: var(--muted)">Headword + Translation (minimal fields)</span>
              {:else}
                <span class="text-sm" style="color: var(--muted)">Full schema with all fields</span>
              {/if}
            </div>
            {#if warnings.length > 0}
              <div class="mt-2 space-y-1">
                {#each warnings as warning}
                  <div class="text-sm flex items-start gap-2" style="color: var(--muted)">
                    <AlertCircle size={16} class="mt-0.5 flex-shrink-0" />
                    <span>{warning}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- Stats -->
        <div class="flex gap-4">
          <div class="flex-1 p-4 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
            <div class="text-2xl font-bold" style="color: var(--accent-1)">{totalRows}</div>
            <div class="text-sm" style="color: var(--muted)">Total Rows</div>
          </div>
          <div class="flex-1 p-4 rounded-lg" style="background: var(--card-bg); border: 1px solid var(--card-border)">
            <div class="text-2xl font-bold" style="color: var(--accent-2)">{preview.length}</div>
            <div class="text-sm" style="color: var(--muted)">Preview</div>
          </div>
        </div>

        <!-- Preview table -->
        <div class="overflow-x-auto rounded-lg" style="border: 1px solid var(--card-border)">
          <table class="w-full text-sm">
            <thead style="background: var(--card-bg); border-bottom: 1px solid var(--card-border)">
              <tr>
                <th class="p-3 text-left">Headword</th>
                <th class="p-3 text-left">POS</th>
                <th class="p-3 text-left">Definition</th>
                <th class="p-3 text-left">Tags</th>
              </tr>
            </thead>
            <tbody>
              {#each preview as row, idx}
                <tr style="border-bottom: 1px solid var(--card-border)">
                  <td class="p-3 font-semibold">{row.headword || '-'}</td>
                  <td class="p-3" style="color: var(--muted)">{row.pos || '-'}</td>
                  <td class="p-3" style="color: var(--muted)">{(row.definition || '').substring(0, 60)}...</td>
                  <td class="p-3 text-xs" style="color: var(--muted)">{row.tags || '-'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Errors (if any after import attempt) -->
        {#if errors.length > 0}
          <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <AlertCircle size={20} class="text-red-400" />
              <h3 class="font-semibold text-red-400">Validation Errors ({errors.length})</h3>
            </div>
            <div class="space-y-2 text-sm">
              {#each errors.slice(0, 10) as error}
                <div style="color: var(--muted)">
                  Row {error.row}{error.field ? ` (${error.field})` : ''}: {error.message}
                </div>
              {/each}
              {#if errors.length > 10}
                <div style="color: var(--muted); opacity: 0.7">
                  ... and {errors.length - 10} more errors
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex gap-4">
          <button
            on:click={reset}
            class="flex-1 py-3 px-6 rounded-lg font-semibold transition-all hover:scale-105"
            style="background: var(--card-bg); border: 1px solid var(--card-border); color: var(--fg)"
            disabled={importing}
          >
            Cancel
          </button>
          <button
            on:click={importCsv}
            class="flex-1 py-3 px-6 rounded-lg font-semibold transition-all hover:scale-105 disabled:opacity-50"
            style="background: var(--accent-1); color: var(--bg); box-shadow: var(--shadow-lg)"
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Import Words'}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
