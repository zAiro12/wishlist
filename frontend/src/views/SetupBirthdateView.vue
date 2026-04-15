<template>
  <div class="complete-wrapper">
    <div class="card" style="width: 100%; max-width: 480px;">
      <h2>Set Your Birthdate</h2>
      <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">We need your birthdate to complete your profile.</p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="birthdate">Birthdate <span style="color: var(--color-danger);">*</span></label>
          <input id="birthdate" v-model="birthdate" type="date" :max="today" required />
          <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem;">
            Your birthdate is used to calculate who to celebrate in groups.
          </p>
          <p v-if="birthdate" style="font-size:0.9rem;color:var(--color-text);margin-top:0.25rem;">Displayed: {{ formatDate(birthdate) }}</p>
        </div>

        <p v-if="error" class="error-message">{{ error }}</p>

        <button type="submit" class="btn-primary" :disabled="saving" style="width: 100%; padding: 0.75rem; margin-top: 0.5rem;">
          {{ saving ? 'Saving…' : 'Confirm' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { users as usersApi, ApiError } from '../api/client';
import { formatDate } from '../utils/formatDate';

const router = useRouter();
const auth = useAuthStore();

const birthdate = ref(auth.user?.birthdate ?? '');
const today = new Date().toISOString().slice(0, 10);
const saving = ref(false);
const error = ref<string | null>(null);

async function handleSubmit() {
  if (!birthdate.value) {
    error.value = 'Birthdate is required.';
    return;
  }
  saving.value = true;
  error.value = null;
  try {
    await usersApi.updateProfile({ birthdate: birthdate.value });
    await auth.refreshUser();
    await router.replace('/');
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'An unexpected error occurred.';
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
