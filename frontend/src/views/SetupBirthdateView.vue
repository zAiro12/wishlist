<template>
  <div class="complete-wrapper">
    <div class="card" style="width: 100%; max-width: 480px;">
      <h2>Imposta la tua data di nascita</h2>
      <p style="color: var(--color-on-surface-variant); margin-bottom: 1.5rem;">Abbiamo bisogno della tua data di nascita per completare il profilo.
      </p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Data di nascita <span style="color: var(--color-error);">*</span></label>
          <input
            :value="dateInput"
            type="text"
            inputmode="numeric"
            placeholder="GG/MM/AAAA"
            maxlength="10"
            @input="handleDateInput"
            required
          />
            <p style="font-size: 0.8rem; color: var(--color-on-surface-variant); margin-top: 0.25rem;">
            La tua data di nascita è usata per calcolare chi festeggiare nei gruppi.
          </p>
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="saving"
          style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">
          {{ saving ? 'Salvataggio…' : 'Conferma' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { users as usersApi, ApiError } from '../api/client';
import sanitizeRedirectTarget from '../utils/sanitizeRedirect';
import { useDateInput } from '../composables/useDateInput';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

// use shared sanitizeRedirectTarget from utils

const initialIso = auth.user?.birthdate ?? '';
const { dateInput, composedIso, handleDateInput, validateDate } = useDateInput(initialIso);
const saving = ref(false);
const error = ref<string | null>(null);

async function handleSubmit() {
  const dateErr = validateDate();
  if (dateErr) {
    error.value = dateErr;
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
      error.value = 'Errore imprevisto durante il salvataggio della data di nascita.';
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
      }
    } catch (optErr) { void optErr; }

    // Force refetch the current user so auth.needsBirthdate is updated from server.
    await auth.fetchUser(true);
    // updated user state is used by guards; no debug log
  } catch (err) {
    console.error('fetchUser(true) failed after birthdate update', err);
    // Do not mark save as failed; inform user to reload if necessary
    error.value = 'Profilo aggiornato ma aggiornamento fallito. Ricarica la pagina.';
  }

  try {
    const rawRedirect = route.query.redirect as string | string[] | null | undefined;
    let redirect: string | undefined;
    if (Array.isArray(rawRedirect)) redirect = rawRedirect[0];
    else if (typeof rawRedirect === 'string') redirect = rawRedirect?.trim() || undefined;

    const target = sanitizeRedirectTarget(redirect);
    try {
      await router.replace(target);
    } catch (navErr) {
      console.error('Navigation after birthdate update failed, attempting / as fallback', navErr);
      if (target !== '/') {
        try { await router.replace('/'); } catch { /* swallow */ }
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
  background: var(--color-background);
}

@media (max-width: 767px) {
  .complete-wrapper {
    align-items: flex-start;
    padding-top: 2rem;
  }
}
</style>
