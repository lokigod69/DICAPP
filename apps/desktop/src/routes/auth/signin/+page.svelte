<script lang="ts">
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase';
  import { LogIn, Mail } from 'lucide-svelte';

  let loading = false;
  let error = '';
  let email = '';
  let magicLinkSent = false;

  async function signInWithGoogle() {
    loading = true;
    error = '';

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      error = authError.message;
      loading = false;
    }
    // If successful, browser will redirect to Google
  }

  async function signInWithMagicLink() {
    if (!email.trim()) {
      error = 'Please enter your email address';
      return;
    }

    loading = true;
    error = '';

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      error = authError.message;
      loading = false;
    } else {
      magicLinkSent = true;
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center p-8" style="background: var(--bg)">
  <div class="max-w-md w-full">
    <!-- Logo -->
    <div class="text-center mb-8">
      <h1 class="text-5xl font-display font-bold mb-2" style="color: var(--accent-1)">
        DIC APP
      </h1>
      <p class="text-lg" style="color: var(--muted)">
        Advanced vocabulary training
      </p>
    </div>

    <!-- Card -->
    <div class="rounded-lg p-8 shadow-xl" style="background: var(--card-bg); border: 1px solid var(--card-border)">
      {#if magicLinkSent}
        <!-- Magic Link Sent -->
        <div class="text-center">
          <div class="mb-4">
            <Mail size={48} class="mx-auto" style="color: var(--accent-2)" />
          </div>
          <h2 class="text-2xl font-bold mb-2">Check Your Email</h2>
          <p class="mb-6" style="color: var(--muted)">
            We've sent a magic link to <strong>{email}</strong>
          </p>
          <p class="text-sm" style="color: var(--muted)">
            Click the link in the email to sign in. You can close this page.
          </p>
          <button
            on:click={() => { magicLinkSent = false; email = ''; }}
            class="mt-6 text-sm underline"
            style="color: var(--accent-1)"
          >
            Try a different email
          </button>
        </div>
      {:else}
        <h2 class="text-2xl font-bold mb-6 text-center">Sign In</h2>

        {#if error}
          <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-4">
            <p class="text-sm text-red-400">{error}</p>
          </div>
        {/if}

        <!-- Google Sign In -->
        <button
          on:click={signInWithGoogle}
          disabled={loading}
          class="w-full py-3 px-4 rounded-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          style="background: white; color: #333; box-shadow: var(--shadow-lg); border: 1px solid #ddd"
        >
          <div class="flex items-center justify-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
          </div>
        </button>

        <!-- Divider -->
        <div class="relative my-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t" style="border-color: var(--card-border)"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-2 text-sm" style="background: var(--card-bg); color: var(--muted)">
              or continue with email
            </span>
          </div>
        </div>

        <!-- Magic Link -->
        <form on:submit|preventDefault={signInWithMagicLink}>
          <input
            type="email"
            bind:value={email}
            placeholder="your@email.com"
            disabled={loading}
            class="w-full px-4 py-3 rounded-lg mb-3 border"
            style="background: var(--bg); border-color: var(--card-border); color: var(--fg)"
          />
          <button
            type="submit"
            disabled={loading}
            class="w-full py-3 px-4 rounded-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            style="background: var(--accent-2); color: var(--bg); box-shadow: var(--shadow-lg)"
          >
            <div class="flex items-center justify-center gap-2">
              <Mail size={20} />
              <span>{loading ? 'Sending...' : 'Send Magic Link'}</span>
            </div>
          </button>
        </form>

        <p class="text-xs text-center mt-6" style="color: var(--muted)">
          By signing in, you agree to use this app responsibly and awesomely.
        </p>
      {/if}
    </div>

    <!-- Footer -->
    <div class="text-center mt-6">
      <button
        on:click={() => goto('/')}
        class="text-sm underline"
        style="color: var(--muted)"
      >
        ← Back to home
      </button>
    </div>
  </div>
</div>
