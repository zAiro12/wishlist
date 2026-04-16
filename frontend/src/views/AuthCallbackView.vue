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
  // Read non-sensitive params from the query string
  const needsBirthdate = route.query.needsBirthdate === 'true';
  const err = route.query['error'] as string | undefined;

  if (err) {
    errorMsg.value = ERROR_MESSAGES[err] ?? `Authentication error: ${err}`;
    return;
  }

  try {
    // Rely on server-set HttpOnly cookie; fetch current user to populate store
    await auth.fetchUser();
  } catch (_e) {
    // ignore fetch errors here; we'll redirect based on what we know
  }

  if (needsBirthdate || auth.needsBirthdate) {
    await router.replace({ name: 'SetupBirthdate' });
  } else {
    await router.replace({ name: 'Home' });
  }
});
</script>
