<template>
  <div class="complete-wrapper">
    <div class="card" style="width: 100%; max-width: 480px;">
      <h2>Set Your Birthdate</h2>
      <p style="color: var(--color-text-muted); margin-bottom: 1.5rem;">We need your birthdate to complete your profile.</p>

      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Birthdate <span style="color: var(--color-danger);">*</span></label>
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <input v-model="day" type="number" min="1" max="31" placeholder="DD" style="width:4.5rem;" required />
            <input v-model="month" type="number" min="1" max="12" placeholder="MM" style="width:4.5rem;" required />
            <input v-model="year" type="number" min="1900" max="2099" placeholder="YYYY" style="width:6.5rem;" required />
          </div>
          <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.25rem;">
            Your birthdate is used to calculate who to celebrate in groups.
          </p>
          <p v-if="day && month && year" style="font-size:0.9rem;color:var(--color-text);margin-top:0.25rem;">Displayed: {{ formatDate(composedIso) }}</p>
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { users as usersApi, ApiError } from '../api/client';
import { formatDate } from '@/utils/formatDate';

const router = useRouter();
const auth = useAuthStore();

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
