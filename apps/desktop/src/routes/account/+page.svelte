<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase';
  import { getDataStore } from '$lib/stores/database';
  import Header from '$lib/components/Header.svelte';
  import { ArrowLeft, Download, Mail, User as UserIcon } from 'lucide-svelte';

  let loading = true;
  let exporting = false;

  onMount(async () => {
    await authStore.init();
    if (!$authStore.user) {
      goto('/auth/signin');
      return;
    }
    loading = false;
  });

  async function exportData() {
    exporting = true;
    try {
      const dataStore = await getDataStore();
      const data = await dataStore.exportAll();

      // Create JSON blob
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Download
      const a = document.createElement('a');
      a.href = url;
      a.download = `dicapp-export-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      exporting = false;
    }
  }

  function goBack() {
    goto('/');
  }
</script>

<Header />

<div class="min-h-screen p-8" style="background: var(--bg)">
  <div class="max-w-3xl mx-auto">
    <!-- Back Button -->
    <button
      on:click={goBack}
      class="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
      style="color: var(--muted)"
    >
      <ArrowLeft size={20} />
      <span>Back to Home</span>
    </button>

    {#if loading}
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style="border-color: var(--accent-1)"></div>
        <p class="mt-4" style="color: var(--muted)">Loading account...</p>
      </div>
    {:else if $authStore.user}
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-display font-bold mb-2" style="color: var(--accent-1)">Account</h1>
        <p style="color: var(--muted)">Manage your profile and data</p>
      </div>

      <!-- Profile Card -->
      <div class="rounded-lg p-6 mb-6" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="text-xl font-bold mb-4">Profile</h2>

        <div class="space-y-4">
          <!-- Avatar -->
          <div class="flex items-center gap-4">
            <div class="w-20 h-20 rounded-full flex items-center justify-center" style="background: var(--accent-1); color: var(--bg)">
              {#if $authStore.user.user_metadata?.avatar_url}
                <img src={$authStore.user.user_metadata.avatar_url} alt="Avatar" class="w-full h-full rounded-full" />
              {:else}
                <UserIcon size={32} />
              {/if}
            </div>
            <div>
              <div class="text-lg font-semibold">{$authStore.user.user_metadata?.full_name || 'User'}</div>
              <div class="text-sm" style="color: var(--muted)">{$authStore.user.email}</div>
            </div>
          </div>

          <!-- Provider Badge -->
          <div>
            <div class="text-sm mb-2" style="color: var(--muted)">Sign-in Method:</div>
            <div class="flex items-center gap-2">
              {#if $authStore.user.app_metadata?.provider === 'google'}
                <div class="flex items-center gap-2 px-3 py-1 rounded text-sm" style="background: rgba(255,255,255,0.1)">
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Google</span>
                </div>
              {:else if $authStore.user.app_metadata?.provider === 'email'}
                <div class="flex items-center gap-2 px-3 py-1 rounded text-sm" style="background: rgba(255,255,255,0.1)">
                  <Mail size={16} />
                  <span>Email</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>

      <!-- Data Export Card -->
      <div class="rounded-lg p-6" style="background: var(--card-bg); border: 1px solid var(--card-border)">
        <h2 class="text-xl font-bold mb-4">Data Export</h2>
        <p class="mb-4" style="color: var(--muted)">
          Download all your decks, words, and review history as JSON.
        </p>
        <button
          on:click={exportData}
          disabled={exporting}
          class="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
          style="background: var(--accent-2); color: var(--bg); box-shadow: var(--shadow-lg)"
        >
          <Download size={20} />
          <span>{exporting ? 'Exporting...' : 'Export My Data'}</span>
        </button>
      </div>

      <!-- Footer Info -->
      <div class="mt-8 text-center text-sm" style="color: var(--muted)">
        <p>Your data is stored securely in the cloud and synced across devices.</p>
      </div>
    {/if}
  </div>
</div>
