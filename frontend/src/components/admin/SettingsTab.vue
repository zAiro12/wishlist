<template>
  <div>
    <h2 style="margin-top:0;">Impostazioni applicazione</h2>

    <!-- Princess user section -->
    <div class="setting-card card">
      <h3>👸 Principessa</h3>
      <p style="color:var(--color-on-surface-variant);font-size:0.875rem;margin-bottom:0.75rem;">
        L'utente selezionato apparirà con il ruolo "Principessa" (icona 👸) in tutti i gruppi.
        Lascia vuoto per disabilitare il ruolo speciale.
      </p>

      <div v-if="currentPrincess" class="current-princess">
        <span>Attuale: <strong>{{ currentPrincess.givenName }} {{ currentPrincess.familyName }}</strong> ({{
          currentPrincess.email }})</span>
        <button class="mini-btn danger" style="margin-left:0.75rem;" @click="clearPrincess">Rimuovi</button>
      </div>
      <div v-else style="color:var(--color-on-surface-variant);font-size:0.875rem;margin-bottom:0.5rem;">
        Nessuna principessa impostata.
      </div>

      <div style="margin-top:0.75rem;">
        <label for="princess-search" style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem;">
          Cerca utente da impostare come principessa
        </label>
        <div style="display:flex;gap:0.5rem;">
          <input id="princess-search" v-model="searchQuery" type="text" placeholder="Cerca per nome, cognome o email…"
            style="flex:1;max-width:380px;" @input="onSearchInput" />
          <button class="btn-secondary" @click="doSearch">Cerca</button>
        </div>
        <div v-if="searchResults.length" class="suggestions">
          <button v-for="u in searchResults" :key="u.id" type="button" class="suggestion-item"
            :class="{ selected: selectedUserId === u.id }" @click="selectUser(u)">
            <strong>{{ u.givenName }} {{ u.familyName }}</strong>
            <span style="color:var(--color-on-surface-variant);font-size:0.8rem;margin-left:0.4rem;">({{ u.email
            }})</span>
          </button>
        </div>
        <p v-if="searchPerformed && searchResults.length === 0"
          style="font-size:0.875rem;color:var(--color-on-surface-variant);margin-top:0.5rem;">
          Nessun utente trovato.
        </p>
      </div>

      <div v-if="selectedUserId" style="margin-top:0.75rem;display:flex;align-items:center;gap:0.75rem;">
        <span style="font-size:0.875rem;">Selezionato: <strong>{{ selectedUserLabel }}</strong></span>
        <button class="btn-primary" :disabled="saving" @click="savePrincess">
          {{ saving ? 'Salvataggio…' : 'Imposta come principessa' }}
        </button>
        <button class="btn-secondary" @click="clearSelection">Annulla</button>
      </div>

      <p v-if="successMsg" style="color:var(--color-success);margin-top:0.5rem;font-size:0.875rem;">{{ successMsg }}</p>
      <p v-if="errorMsg" class="error-message" style="margin-top:0.5rem;">{{ errorMsg }}</p>
    </div>

    <div class="setting-card card">
      <h3>📣 Wizard notifica push</h3>
      <p style="color:var(--color-on-surface-variant);font-size:0.875rem;margin-bottom:0.75rem;">
        Invia una notifica a tutti gli utenti con notifiche attive subito oppure pianificata.
      </p>

      <div class="wizard-step">
        <strong>1. Contenuto notifica</strong>
        <input v-model="broadcastTitle" type="text" placeholder="Titolo notifica" style="margin-top:0.5rem;" />
        <textarea
          v-model="broadcastBody"
          placeholder="Testo notifica"
          style="margin-top:0.5rem;min-height:90px;"
        />
        <input
          v-model="broadcastUrl"
          type="text"
          placeholder="URL opzionale (es: /groups)"
          style="margin-top:0.5rem;"
        />
      </div>

      <div class="wizard-step" style="margin-top:0.75rem;">
        <strong>2. Quando inviare</strong>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.5rem;">
          <label style="display:flex;align-items:center;gap:0.4rem;">
            <input v-model="broadcastMode" type="radio" value="now" />
            Subito
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;">
            <input v-model="broadcastMode" type="radio" value="scheduled" />
            A una data/ora specifica
          </label>
        </div>
        <input
          v-if="broadcastMode === 'scheduled'"
          v-model="broadcastScheduledAt"
          type="datetime-local"
          style="margin-top:0.5rem;max-width:260px;"
        />
      </div>

      <div class="wizard-step" style="margin-top:0.75rem;">
        <strong>3. Conferma</strong>
        <p style="font-size:0.875rem;color:var(--color-on-surface-variant);margin-top:0.4rem;">
          Titolo: <strong>{{ broadcastTitle || '—' }}</strong><br />
          Testo: {{ broadcastBody || '—' }}<br />
          Invio: {{ broadcastMode === 'now' ? 'Subito' : (broadcastScheduledAt || 'Seleziona data/ora') }}
        </p>
        <button class="btn-primary" :disabled="sendingBroadcast" style="margin-top:0.5rem;" @click="sendBroadcast">
          {{ sendingBroadcast ? 'Invio…' : 'Invia notifica a tutti' }}
        </button>
      </div>

      <p v-if="broadcastSuccessMsg" style="color:var(--color-success);margin-top:0.5rem;font-size:0.875rem;">{{ broadcastSuccessMsg }}</p>
      <p v-if="broadcastErrorMsg" class="error-message" style="margin-top:0.5rem;">{{ broadcastErrorMsg }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { admin as adminApi, ApiError } from '../../api/client';
import type { User } from '../../types';

const searchQuery = ref('');
const searchResults = ref<User[]>([]);
const searchPerformed = ref(false);
const selectedUserId = ref('');
const selectedUserLabel = ref('');
const saving = ref(false);
const successMsg = ref<string | null>(null);
const errorMsg = ref<string | null>(null);
const currentPrincess = ref<User | null>(null);
const sendingBroadcast = ref(false);
const broadcastTitle = ref('');
const broadcastBody = ref('');
const broadcastUrl = ref('');
const broadcastMode = ref<'now' | 'scheduled'>('now');
const broadcastScheduledAt = ref('');
const broadcastSuccessMsg = ref<string | null>(null);
const broadcastErrorMsg = ref<string | null>(null);

onMounted(load);
onUnmounted(() => { if (searchTimer) clearTimeout(searchTimer); });

async function load() {
  try {
    console.info('🎯 SettingsTab.load(): starting - checking token availability');
    try {
      const token = localStorage.getItem('token');
      console.info('🔍 SettingsTab: token in localStorage:', token ? token.slice(0, 30) + '...' : 'NULL');
    } catch (e) {
      console.error('❌ SettingsTab: error accessing localStorage:', e);
    }

    console.info('📡 SettingsTab: calling adminApi.settings.get()');
    const s = await adminApi.settings.get();
    const princessId = s?.['princess_user_id'] ?? '';
    if (princessId) {
      currentPrincess.value = (await adminApi.users.getById(princessId)) ?? null;
    } else {
      currentPrincess.value = null;
    }
    console.info('✅ SettingsTab: settings loaded successfully');
  } catch (e) {
    console.error('❌ SettingsTab.load() error:', e);
    // non-critical
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => doSearch(), 400);
}

async function doSearch() {
  const q = searchQuery.value.trim();
  if (!q) { searchResults.value = []; searchPerformed.value = false; return; }
  try {
    const res = await adminApi.users.list({ search: q, limit: 10 });
    searchResults.value = res.users;
    searchPerformed.value = true;
  } catch {
    searchResults.value = [];
  }
}

function selectUser(u: User) {
  selectedUserId.value = u.id;
  selectedUserLabel.value = `${u.givenName ?? ''} ${u.familyName ?? ''}`.trim() || u.email;
  searchResults.value = [];
  searchQuery.value = selectedUserLabel.value;
  successMsg.value = null;
  errorMsg.value = null;
}

function clearSelection() {
  selectedUserId.value = '';
  selectedUserLabel.value = '';
  searchQuery.value = '';
  searchResults.value = [];
  searchPerformed.value = false;
}

async function savePrincess() {
  if (!selectedUserId.value) return;
  saving.value = true;
  errorMsg.value = null;
  successMsg.value = null;
  try {
    await adminApi.settings.set('princess_user_id', selectedUserId.value);
    successMsg.value = `Principessa impostata: ${selectedUserLabel.value}`;
    await load();
    clearSelection();
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : 'Errore durante il salvataggio';
  } finally {
    saving.value = false;
  }
}

async function clearPrincess() {
  saving.value = true;
  errorMsg.value = null;
  successMsg.value = null;
  try {
    await adminApi.settings.set('princess_user_id', '');
    currentPrincess.value = null;
    successMsg.value = 'Ruolo principessa rimosso.';
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : 'Errore durante la rimozione';
  } finally {
    saving.value = false;
  }
}

async function sendBroadcast() {
  const title = broadcastTitle.value.trim();
  const body = broadcastBody.value.trim();
  const url = broadcastUrl.value.trim();
  broadcastErrorMsg.value = null;
  broadcastSuccessMsg.value = null;

  if (!title || !body) {
    broadcastErrorMsg.value = 'Titolo e testo sono obbligatori.';
    return;
  }

  let scheduledFor: string | undefined;
  if (broadcastMode.value === 'scheduled') {
    if (!broadcastScheduledAt.value) {
      broadcastErrorMsg.value = 'Seleziona data e ora di invio.';
      return;
    }
    const parsedDate = new Date(broadcastScheduledAt.value);
    if (Number.isNaN(parsedDate.getTime())) {
      broadcastErrorMsg.value = 'Data/ora non valida.';
      return;
    }
    scheduledFor = parsedDate.toISOString();
  }

  sendingBroadcast.value = true;
  try {
    const result = await adminApi.push.sendBroadcast({
      payload: { title, body, ...(url ? { url } : {}) },
      ...(scheduledFor ? { scheduledFor } : {}),
    });
    if (result.scheduled && result.scheduledFor) {
      broadcastSuccessMsg.value = `Notifica pianificata per ${new Date(result.scheduledFor).toLocaleString()}.`;
    } else {
      broadcastSuccessMsg.value = 'Notifica inviata a tutti gli utenti con notifiche attive.';
    }
    broadcastTitle.value = '';
    broadcastBody.value = '';
    broadcastUrl.value = '';
    broadcastMode.value = 'now';
    broadcastScheduledAt.value = '';
  } catch (err) {
    if (err instanceof ApiError) {
      broadcastErrorMsg.value = err.message;
    } else if (broadcastMode.value === 'scheduled') {
      broadcastErrorMsg.value = 'Errore durante la pianificazione della notifica';
    } else {
      broadcastErrorMsg.value = 'Errore durante l\'invio della notifica';
    }
  } finally {
    sendingBroadcast.value = false;
  }
}
</script>

<style scoped>
.setting-card {
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.wizard-step {
  border-top: 1px dashed var(--color-surface-container-highest);
  padding-top: 0.75rem;
}

.current-princess {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.suggestions {
  border: 1px solid var(--color-surface-container-highest);
  border-radius: var(--radius-sm);
  margin-top: 0.25rem;
  max-width: 380px;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.suggestion-item:hover,
.suggestion-item.selected {
  background: var(--color-surface-container-high);
}

.mini-btn {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  color: white;
  font-family: var(--font-body);
}

.mini-btn.danger {
  background: var(--color-error);
}
</style>
