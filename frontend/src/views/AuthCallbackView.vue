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
  // Token is delivered via URL fragment (#token=...) to keep it out of server logs
  // Prefer the router-provided hash when available, and fallback to window.location.hash.
  const rawHash = (route.hash && route.hash.length) ? route.hash : window.location.hash || '';
  const fragment = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  const fragParams = new URLSearchParams(fragment);

  const token = fragParams.get('token') ?? undefined;
  // Prefer needsBirthdate delivered as a query param from backend redirect
  const needsBirthdateQuery = route.query['needsBirthdate'] === 'true';
  let needsBirthdate = needsBirthdateQuery || fragParams.get('needsBirthdate') === 'true';

  // Also handle cases where the redirect was provided as a query param (e.g. /login?redirect=/#needsBirthdate=true)
  if (!needsBirthdate && route.query && route.query.redirect) {
    try {
      const redirectStr = String(route.query.redirect);
      const decoded = decodeURIComponent(redirectStr);
      if (decoded.includes('#needsBirthdate=true')) needsBirthdate = true;
    } catch (e) {
      // ignore decode errors
    }
  }

  // Errors are still delivered via query string (they are not sensitive)
  const err = route.query['error'] as string | undefined;

  if (err) {
    errorMsg.value = ERROR_MESSAGES[err] ?? `Authentication error: ${err}`;
    return;
  }

  if (token) {
    try {
      await auth.setTokenAndFetch(token);
    } catch {
      errorMsg.value = 'Failed to complete sign-in. Please try again.';
      return;
    }
  } else {
    // No token in fragment: try cookie-based session (server-set HttpOnly cookie)
    try {
      await auth.refreshUser();
    } catch {
      errorMsg.value = 'No authentication token received.';
      return;
    }
  }
  if (needsBirthdate || auth.needsBirthdate) {
    await router.replace('/setup-birthdate');
  } else {
    await router.replace('/');
  }
});
</script>
