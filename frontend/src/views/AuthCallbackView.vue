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
  const fragment = window.location.hash.slice(1);
  const fragParams = new URLSearchParams(fragment);

  const token = fragParams.get('token') ?? undefined;
  const needsBirthdate = fragParams.get('needsBirthdate') === 'true';

  // Errors are still delivered via query string (they are not sensitive)
  const err = route.query['error'] as string | undefined;

  if (err) {
    errorMsg.value = ERROR_MESSAGES[err] ?? `Authentication error: ${err}`;
    return;
  }

  if (!token) {
    errorMsg.value = 'No authentication token received.';
    return;
  }

  try {
    await auth.setTokenAndFetch(token);
  } catch {
    errorMsg.value = 'Failed to complete sign-in. Please try again.';
    return;
  }
  if (needsBirthdate || auth.needsBirthdate) {
    await router.replace('/complete-profile');
  } else {
    await router.replace('/');
  }
});
</script>
