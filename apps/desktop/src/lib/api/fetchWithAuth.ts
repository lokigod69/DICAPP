import { supabase } from '$lib/supabaseClient';

/**
 * Fetch wrapper that automatically includes the Supabase access token
 * in the Authorization header for server API calls.
 *
 * On 401, automatically refreshes the session and retries once.
 */
export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  // Get current session and token
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // First attempt
  let response = await fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });

  // If 401, try refreshing session and retry once
  if (response.status === 401) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

    if (!refreshError && refreshData.session) {
      const newToken = refreshData.session.access_token;
      const newHeaders = new Headers(init.headers || {});
      if (newToken) {
        newHeaders.set('Authorization', `Bearer ${newToken}`);
      }

      response = await fetch(input, {
        ...init,
        headers: newHeaders,
        credentials: 'include',
      });
    }
  }

  return response;
}
