<template>
  <NavBar />
  <div class="page-container with-sidebar">
    <h1>Modifica profilo</h1>
    <form class="card form" @submit.prevent="save">
      <div class="avatar-preview">
        <img v-if="safeAvatarUrl" :src="safeAvatarUrl" alt="Avatar utente" />
        <div v-else class="avatar-fallback">{{ initials }}</div>
      </div>

      <div class="form-group">
        <label for="givenName">Nome</label>
        <input id="givenName" v-model="givenName" type="text" required />
      </div>

      <div class="form-group">
        <label for="familyName">Cognome</label>
        <input id="familyName" v-model="familyName" type="text" required />
      </div>

      <div class="form-group">
        <label for="avatarUrl">Avatar (URL immagine)</label>
        <input id="avatarUrl" v-model="avatarUrl" type="url" placeholder="https://..." />
      </div>

      <div class="form-group">
        <label>Data di nascita</label>
        <input
          :value="dateInput"
          type="text"
          inputmode="numeric"
          placeholder="GG/MM/AAAA"
          maxlength="10"
          @input="handleDateInput"
          required
        />
      </div>

      <p v-if="error" class="error-message">{{ error }}</p>
      <p v-if="success" style="color: var(--color-success);">{{ success }}</p>

      <button class="btn-primary" type="submit" :disabled="saving">
        {{ saving ? 'Salvataggio…' : 'Salva profilo' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import NavBar from '../components/NavBar.vue';
import { users as usersApi, ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useDateInput } from '../composables/useDateInput';
import { sanitizeAvatarUrl } from '../utils/avatarUrl';

const auth = useAuthStore();
const givenName = ref(auth.user?.givenName ?? '');
const familyName = ref(auth.user?.familyName ?? '');
const avatarUrl = ref(auth.user?.avatarUrl ?? '');
const { day, month, year, dateInput, composedIso, handleDateInput, validateDate } = useDateInput(auth.user?.birthdate ?? '');
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const safeAvatarUrl = computed(() => sanitizeAvatarUrl(avatarUrl.value));

const initials = computed(() => {
  const g = givenName.value.trim();
  const f = familyName.value.trim();
  if (g || f) return `${g.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return (auth.user?.email ?? '?').charAt(0).toUpperCase();
});

async function save() {
  if (!givenName.value.trim() || !familyName.value.trim()) {
    error.value = 'Nome e cognome sono obbligatori.';
    return;
  }
  if (!day.value || !month.value || !year.value) {
    error.value = 'La data di nascita è obbligatoria.';
    return;
  }
  const dateErr = validateDate();
  if (dateErr) {
    error.value = dateErr;
    return;
  }

  error.value = null;
  success.value = null;
  saving.value = true;
  try {
    await usersApi.updateProfile({
      givenName: givenName.value.trim(),
      familyName: familyName.value.trim(),
      avatarUrl: avatarUrl.value.trim(),
      birthdate: composedIso.value,
    });
    await auth.fetchUser(true);
    success.value = 'Profilo aggiornato con successo.';
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore imprevisto.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form { max-width: 560px; display: grid; gap: 0.8rem; }
.avatar-preview { display: flex; justify-content: center; margin-bottom: 0.5rem; }
.avatar-preview img,
.avatar-fallback {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  object-fit: cover;
}
.avatar-fallback {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}
</style>
