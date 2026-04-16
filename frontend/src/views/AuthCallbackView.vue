<template>
  <div class="page-container" style="text-align: center; padding-top: 5rem;">
    <div v-if="errorMsg" class="card">
      <h2 style="color: var(--color-danger);">Authentication Failed</h2>
      <p style="margin-top: 0.5rem; color: var(--color-text-muted);">{{ errorMsg }}</p>
      <button class="btn-primary" style="margin-top: 1.5rem;" @click="router.push('/login')">
        Back to Login
      </button>
    </div>
    <div v-else>
      <div class="spinner" />
      <p style="margin-top: 1rem; color: var(--color-text-muted);">Signing you in…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { LocationQueryRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const errorMsg = ref<string | null>(null);

const ERROR_MESSAGES: Record<string, string> = {
  account_banned: 'Your account has been banned. Please contact support.',
  account_disabled: 'Your account has been disabled.',
  no_email: 'Could not retrieve your email address from the provider.',
  invalid_provider: 'Invalid authentication provider.',
  state_mismatch: 'Authentication session mismatch. Please try again.',
  state_expired: 'Authentication session expired. Please try again.',
  server_error: 'A server error occurred. Please try again.',
};

onMounted(async () => {
  // Debug logging to help diagnose missing token issues
  const hash = window.location.hash;
  console.log('[CALLBACK] hash:', hash);
  console.log('[CALLBACK] token in localStorage:', localStorage.getItem('token') ?? localStorage.getItem('auth_token'));

  // Prefer token delivered as a query param (safer with some hosting setups)
  const tokenFromQuery = (route.query.token as string | undefined) ?? undefined;
  // Fallback to fragment for backward compatibility
  const rawHash = (route.hash && route.hash.length) ? route.hash : window.location.hash || '';
  const fragment = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  const fragParams = new URLSearchParams(fragment);
  const tokenFromFragment = fragParams.get('token') ?? undefined;

  const token = tokenFromQuery ?? tokenFromFragment;
  // Read needsBirthdate from query param (do not wait for user fetch)
  const needsBirthdate = route.query.needsBirthdate === 'true';

  // Errors are still delivered via query string (they are not sensitive)
  const err = route.query['error'] as string | undefined;

  if (err) {
    errorMsg.value = ERROR_MESSAGES[err] ?? `Authentication error: ${err}`;
    return;
  }

  // If the identity provider returned a token in the fragment, persist it now
  // but do NOT wait for a user fetch before redirecting. The backend-set
  // HttpOnly cookie may not yet be present; redirect immediately based on
  // the query param so the UX is fast and deterministic.
  if (token) {
    try {
      localStorage.setItem('token', token);
      // update store token synchronously
      auth.token = token;
      // Clean the URL to avoid exposing the token in browser history
      const keepQuery: LocationQueryRaw = {};
      if (route.query.needsBirthdate === 'true') keepQuery.needsBirthdate = 'true';
      await router.replace({ name: 'AuthCallback', query: keepQuery }).catch(() => {});
    } catch (e) {
      // ignore
    }
  }

  // Redirect immediately based on the query param
  if (needsBirthdate) {
    await router.replace({ name: 'SetupBirthdate' });
  } else {
    await router.replace({ name: 'Home' });
  }

  // In background, fetch the current user to populate the store.
  // Do this silently: failures should not trigger navigation here.
  void auth.fetchUser().catch(() => {});
});
</script>
