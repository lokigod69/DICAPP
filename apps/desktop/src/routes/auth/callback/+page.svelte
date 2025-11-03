<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';

  let status = 'processing';
  let error = '';

  onMount(async () => {
    // Handle the OAuth callback
    const { data, error: authError } = await supabase.auth.getSession();

    if (authError) {
      error = authError.message;
      status = 'error';
      return;
    }

    if (data.session) {
      // Check if user has a profile, create if not
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.session.user.id)
        .single();

      if (!profile) {
        // Create profile for new user
        await supabase.from('profiles').insert({
          user_id: data.session.user.id,
          display_name: data.session.user.user_metadata.full_name || data.session.user.email?.split('@')[0],
          avatar_url: data.session.user.user_metadata.avatar_url,
        });
      }

      // Success - redirect to decks page
      status = 'success';
      setTimeout(() => {
        goto('/decks');
      }, 1000);
    } else {
      error = 'No session found';
      status = 'error';
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center p-8" style="background: var(--bg)">
  <div class="text-center">
    {#if status === 'processing'}
      <div class="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4" style="border-color: var(--accent-1)"></div>
      <h2 class="text-2xl font-bold mb-2">Signing you in...</h2>
      <p style="color: var(--muted)">Just a moment</p>
    {:else if status === 'success'}
      <div class="text-6xl mb-4">✓</div>
      <h2 class="text-2xl font-bold mb-2" style="color: var(--accent-1)">Welcome!</h2>
      <p style="color: var(--muted)">Redirecting to your decks...</p>
    {:else if status === 'error'}
      <div class="text-6xl mb-4">⚠</div>
      <h2 class="text-2xl font-bold mb-2 text-red-400">Sign In Failed</h2>
      <p class="mb-4" style="color: var(--muted)">{error}</p>
      <a href="/auth/signin" class="underline" style="color: var(--accent-1)">Try again</a>
    {/if}
  </div>
</div>
