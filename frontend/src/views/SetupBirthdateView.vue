<template>
  <div class="complete-wrapper">
    <div class="card" style="width: 100%; max-width: 480px;">
      <h2>Set Your Birthdate</h2>
      <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">We need your birthdate to complete your profile.
      </p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Birthdate <span style="color: var(--color-danger);">*</span></label>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <input v-model="day" type="number" min="1" max="31" placeholder="DD" style="width:4.5rem;" required />
            <input v-model="month" type="number" min="1" max="12" placeholder="MM" style="width:4.5rem;" required />
            <input v-model="year" type="number" min="1900" max="2099" placeholder="YYYY" style="width:6.5rem;"
              required />
          </div>
          <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem;">
            Your birthdate is used to calculate who to celebrate in groups.
          </p>
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="saving"
          style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">
          {{ saving ? 'Saving…' : 'Confirm' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { users as usersApi, ApiError } from '../api/client';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

function sanitizeRedirectTarget(r?: string | undefined): string {
  if (!r) return '/';
  const v = r.trim();
  if (v === '/setup-birthdate' || v.startsWith('/setup-birthdate') || v.includes('/setup-birthdate')) return '/';
  if (v.includes('redirect=/setup-birthdate')) return '/';
  return v;
}

const initialIso = auth.user?.birthdate ?? '';
const day = ref(initialIso ? initialIso.split('-')[2] : '');
const month = ref(initialIso ? initialIso.split('-')[1] : '');
const year = ref(initialIso ? initialIso.split('-')[0] : '');
const composedIso = computed(() => {
  if (!day.value || !month.value || !year.value) return '';
  const d = String(day.value).padStart(2, '0');
  const m = String(month.value).padStart(2, '0');
  const y = String(year.value);
  return `${y}-${m}-${d}`;
});
const saving = ref(false);
const error = ref<string | null>(null);

async function handleSubmit() {
  if (!composedIso.value) {
    error.value = 'Birthdate is required.';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await usersApi.updateBirthdate(composedIso.value);
  } catch (err) {
    // If the PATCH failed with an API error, show that; otherwise log and
    // present a generic error.
    console.error('updateBirthdate failed', err);
    if (err instanceof ApiError) {
      error.value = err.data?.error ?? err.message;
    } else {
      error.value = 'An unexpected error occurred while saving your birthdate.';
    }
    saving.value = false;
    return;
  }

  // At this point the PATCH returned 2xx (treated as success). Attempt to
  // refresh the user profile but handle errors separately so the user still
  // sees that their birthdate was saved.
  try {
    // Optimistically update the local user so computed guards see the new birthdate
    try {
      if (auth.user) {
        (auth.user as unknown as Record<string, unknown>).birthdate = composedIso.value;
        (auth.user as unknown as Record<string, unknown>).birthdateConfirmed = true;
        console.info('Optimistic auth.user update', { birthdate: composedIso.value });
      }
    } catch (optErr) {
      console.warn('Optimistic update failed', optErr);
    }

    // Force refetch the current user so auth.needsBirthdate is updated from server.
    await auth.fetchUser(true);
    // Log the updated user state for debugging
    console.info('User after refresh', auth.user);
  } catch (err) {
    console.error('fetchUser(true) failed after birthdate update', err);
    // Do not mark save as failed; inform user to reload if necessary
    error.value = 'Profile updated but failed to refresh. Please reload the page.';
  }

  try {
    const rawRedirect = route.query.redirect as string | string[] | null | undefined;
    let redirect: string | undefined;
    if (Array.isArray(rawRedirect)) redirect = rawRedirect[0];
    else if (typeof rawRedirect === 'string') redirect = rawRedirect?.trim() || undefined;

    const target = sanitizeRedirectTarget(redirect);
    console.info('Computed navigation target after save', { rawRedirect, redirect, target });

    try {
      // Use replace so the setup page is not kept in history
      const failure = await router.replace(target);
      // Log navigation diagnostics
      console.info('Navigation diagnostics:', {
        target,
        failure,
        currentFullPath: router.currentRoute.value.fullPath,
        currentName: router.currentRoute.value.name,
        redirectedFrom: (router.currentRoute.value as unknown as Record<string, unknown>).redirectedFrom,
      });

      // If navigation failed, attempt fallback to '/'
      if (failure) {
        console.warn('Navigation returned failure, attempting fallback to /', failure);
        try {
          const fallbackFailure = await router.replace('/');
          console.info('Fallback navigation result', { fallbackFailure, currentFullPath: router.currentRoute.value.fullPath });
        } catch (fallbackErr) {
          console.error('Fallback navigation to / failed', fallbackErr);
        }
      }
    } catch (navErr) {
      // Catch unexpected promise rejections
      console.error('Navigation threw after birthdate update, target:', target, navErr);
      if (target !== '/') {
        try {
          await router.replace('/');
        } catch (fallbackErr) {
          console.error('Fallback navigation to / failed', fallbackErr);
        }
      }
    }
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.complete-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
</style>
