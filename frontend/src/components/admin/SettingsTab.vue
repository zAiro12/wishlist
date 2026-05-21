<template>
  <div>
    <h2 style="margin-top:0;">Impostazioni applicazione</h2>

    <div class="setting-card card">
      <h3>👸 Principessa</h3>
      <p style="color:var(--color-on-surface-variant);font-size:0.875rem;margin-bottom:0.75rem;">
        L'utente selezionato apparirà con il ruolo "Principessa" (icona 👸) in tutti i gruppi.
        Lascia vuoto per disabilitare il ruolo speciale.
      </p>

      <div v-if="currentPrincess" class="current-role">
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
          <input id="princess-search" v-model="princessSearchQuery" type="text"
            placeholder="Cerca per nome, cognome o email…" style="flex:1;max-width:380px;" @input="onPrincessSearchInput" />
          <button class="btn-secondary" @click="doPrincessSearch">Cerca</button>
        </div>
        <div v-if="princessSearchResults.length" class="suggestions">
          <button v-for="u in princessSearchResults" :key="u.id" type="button" class="suggestion-item"
            :class="{ selected: selectedPrincessUserId === u.id }" @click="selectPrincessUser(u)">
            <strong>{{ u.givenName }} {{ u.familyName }}</strong>
            <span style="color:var(--color-on-surface-variant);font-size:0.8rem;margin-left:0.4rem;">({{ u.email
            }})</span>
          </button>
        </div>
        <p v-if="princessSearchPerformed && princessSearchResults.length === 0"
          style="font-size:0.875rem;color:var(--color-on-surface-variant);margin-top:0.5rem;">
          Nessun utente trovato.
        </p>
      </div>

      <div v-if="selectedPrincessUserId" style="margin-top:0.75rem;display:flex;align-items:center;gap:0.75rem;">
        <span style="font-size:0.875rem;">Selezionato: <strong>{{ selectedPrincessUserLabel }}</strong></span>
        <button class="btn-primary" :disabled="saving" @click="savePrincess">
          {{ saving ? 'Salvataggio…' : 'Imposta come principessa' }}
        </button>
        <button class="btn-secondary" @click="clearPrincessSelection">Annulla</button>
      </div>

      <p v-if="princessSuccessMsg" style="color:var(--color-success);margin-top:0.5rem;font-size:0.875rem;">{{ princessSuccessMsg }}</p>
      <p v-if="princessErrorMsg" class="error-message" style="margin-top:0.5rem;">{{ princessErrorMsg }}</p>
    </div>

    <div class="setting-card card">
      <h3>⚙️ Tester</h3>
      <p style="color:var(--color-on-surface-variant);font-size:0.875rem;margin-bottom:0.75rem;">
        Gli utenti selezionati appariranno con il ruolo "Tester" (icona ⚙️) in tutti i gruppi.
        Puoi associare più persone.
      </p>

      <div v-if="currentTesters.length" style="margin-bottom:0.5rem;">
        <div v-for="u in currentTesters" :key="u.id" class="current-role" style="margin-bottom:0.35rem;">
          <span><strong>{{ userLabel(u) }}</strong> ({{ u.email }})</span>
          <button class="mini-btn danger" style="margin-left:0.75rem;" @click="removeTester(u.id)">Rimuovi</button>
        </div>
      </div>
      <div v-else style="color:var(--color-on-surface-variant);font-size:0.875rem;margin-bottom:0.5rem;">
        Nessun tester impostato.
      </div>

      <div style="margin-top:0.75rem;">
        <label for="tester-search" style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem;">
          Cerca utente da aggiungere come tester
        </label>
        <div style="display:flex;gap:0.5rem;">
          <input id="tester-search" v-model="testerSearchQuery" type="text" placeholder="Cerca per nome, cognome o email…"
            style="flex:1;max-width:380px;" @input="onTesterSearchInput" />
          <button class="btn-secondary" @click="doTesterSearch">Cerca</button>
        </div>
        <div v-if="testerSearchResults.length" class="suggestions">
          <button v-for="u in testerSearchResults" :key="u.id" type="button" class="suggestion-item"
            :class="{ selected: selectedTesterUserId === u.id }" @click="selectTesterUser(u)">
            <strong>{{ u.givenName }} {{ u.familyName }}</strong>
            <span style="color:var(--color-on-surface-variant);font-size:0.8rem;margin-left:0.4rem;">({{ u.email
            }})</span>
          </button>
        </div>
        <p v-if="testerSearchPerformed && testerSearchResults.length === 0"
          style="font-size:0.875rem;color:var(--color-on-surface-variant);margin-top:0.5rem;">
          Nessun utente trovato.
        </p>
      </div>

      <div v-if="selectedTesterUserId" style="margin-top:0.75rem;display:flex;align-items:center;gap:0.75rem;">
        <span style="font-size:0.875rem;">Selezionato: <strong>{{ selectedTesterUserLabel }}</strong></span>
        <button class="btn-primary" :disabled="savingTesters" @click="addTester">
          {{ savingTesters ? 'Salvataggio…' : 'Aggiungi tester' }}
        </button>
        <button class="btn-secondary" @click="clearTesterSelection">Annulla</button>
      </div>

      <p v-if="testerSuccessMsg" style="color:var(--color-success);margin-top:0.5rem;font-size:0.875rem;">{{ testerSuccessMsg }}</p>
      <p v-if="testerErrorMsg" class="error-message" style="margin-top:0.5rem;">{{ testerErrorMsg }}</p>
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
        <strong>2. Destinatari</strong>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.5rem;">
          <label style="display:flex;align-items:center;gap:0.4rem;">
            <input v-model="recipientsMode" type="radio" value="all" />
            Tutti gli utenti
          </label>
          <label style="display:flex;align-items:center;gap:0.4rem;">
            <input v-model="recipientsMode" type="radio" value="selected" />
            Utenti specifici
          </label>
        </div>

        <div v-if="recipientsMode === 'selected'" style="margin-top:0.5rem;">
          <label for="recipient-search" style="display:block;font-size:0.875rem;font-weight:500;margin-bottom:0.25rem;">Cerca utenti da aggiungere</label>
          <div style="display:flex;gap:0.5rem;">
            <input id="recipient-search" v-model="recipientSearchQuery" type="text" placeholder="Cerca per nome, cognome o email…" style="flex:1;max-width:380px;" @input="onRecipientSearchInput" />
            <button class="btn-secondary" @click="doRecipientSearch">Cerca</button>
          </div>
          <div v-if="recipientSearchResults.length" class="suggestions">
            <button v-for="u in recipientSearchResults" :key="u.id" type="button" class="suggestion-item" @click="addRecipient(u)">
              <strong>{{ u.givenName }} {{ u.familyName }}</strong>
              <span style="color:var(--color-on-surface-variant);font-size:0.8rem;margin-left:0.4rem;">({{ u.email }})</span>
            </button>
          </div>

          <div v-if="selectedRecipients.length" style="margin-top:0.5rem;">
            <div v-for="u in selectedRecipients" :key="u.id" style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
              <span>{{ userLabel(u) }} <small style="color:var(--color-on-surface-variant);">({{ u.email }})</small></span>
              <button class="mini-btn danger" @click="removeRecipient(u.id)">Rimuovi</button>
            </div>
          </div>
        </div>
      </div>

      <div class="wizard-step" style="margin-top:0.75rem;">
        <strong>3. Quando inviare</strong>
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
        <strong>4. Conferma</strong>
        <p style="font-size:0.875rem;color:var(--color-on-surface-variant);margin-top:0.4rem;">
          Titolo: <strong>{{ broadcastTitle || '—' }}</strong><br />
          Testo: {{ broadcastBody || '—' }}<br />
          Destinatari: {{ recipientsMode === 'all' ? 'Tutti' : (selectedRecipients.length ? selectedRecipients.length + ' utenti selezionati' : 'Nessuno selezionato') }}<br />
          Invio: {{ broadcastMode === 'now' ? 'Subito' : (broadcastScheduledAt || 'Seleziona data/ora') }}
        </p>
        <button class="btn-primary" :disabled="sendingBroadcast" style="margin-top:0.5rem;" @click="sendBroadcast">
          {{ sendingBroadcast ? 'Invio…' : (recipientsMode === 'all' ? 'Invia notifica a tutti' : 'Invia notifica ai selezionati') }}
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

const saving = ref(false);
const princessSuccessMsg = ref<string | null>(null);
const princessErrorMsg = ref<string | null>(null);
const currentPrincess = ref<User | null>(null);
const princessSearchQuery = ref('');
const princessSearchResults = ref<User[]>([]);
const princessSearchPerformed = ref(false);
const selectedPrincessUserId = ref('');
const selectedPrincessUserLabel = ref('');

const savingTesters = ref(false);
const testerSuccessMsg = ref<string | null>(null);
const testerErrorMsg = ref<string | null>(null);
const currentTesters = ref<User[]>([]);
const testerSearchQuery = ref('');
const testerSearchResults = ref<User[]>([]);
const testerSearchPerformed = ref(false);
const selectedTesterUserId = ref('');
const selectedTesterUserLabel = ref('');

const sendingBroadcast = ref(false);
const broadcastTitle = ref('');
const broadcastBody = ref('');
const broadcastUrl = ref('');
const broadcastMode = ref<'now' | 'scheduled'>('now');
const broadcastScheduledAt = ref('');
const broadcastSuccessMsg = ref<string | null>(null);
const broadcastErrorMsg = ref<string | null>(null);

const recipientsMode = ref<'all' | 'selected'>('all');
const recipientSearchQuery = ref('');
const recipientSearchResults = ref<User[]>([]);
const recipientSearchPerformed = ref(false);
let recipientSearchTimer: ReturnType<typeof setTimeout> | null = null;
const selectedRecipients = ref<User[]>([]);

onMounted(load);
onUnmounted(() => {
  if (princessSearchTimer) clearTimeout(princessSearchTimer);
  if (testerSearchTimer) clearTimeout(testerSearchTimer);
  if (recipientSearchTimer) clearTimeout(recipientSearchTimer);
});

function parseUserIds(value: string | undefined): string[] {
  if (!value) return [];
  return Array.from(new Set(value.split(',').map((id) => id.trim()).filter(Boolean)));
}

function userLabel(user: User): string {
  return `${user.givenName ?? ''} ${user.familyName ?? ''}`.trim() || user.email;
}

async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const users = await Promise.all(
    userIds.map(async (userId) => {
      try {
        return await adminApi.users.getById(userId);
      } catch {
        return null;
      }
    })
  );
  return users.filter((user): user is User => Boolean(user));
}

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
    const testerIds = parseUserIds(s?.['tester_user_ids']);

    if (princessId) {
      currentPrincess.value = (await adminApi.users.getById(princessId)) ?? null;
    } else {
      currentPrincess.value = null;
    }
    currentTesters.value = await getUsersByIds(testerIds);
    console.info('✅ SettingsTab: settings loaded successfully');
  } catch (e) {
    console.error('❌ SettingsTab.load() error:', e);
    // non-critical
  }
}

let princessSearchTimer: ReturnType<typeof setTimeout> | null = null;
function onPrincessSearchInput() {
  if (princessSearchTimer) clearTimeout(princessSearchTimer);
  princessSearchTimer = setTimeout(() => doPrincessSearch(), 400);
}

async function doPrincessSearch() {
  const q = princessSearchQuery.value.trim();
  if (!q) {
    princessSearchResults.value = [];
    princessSearchPerformed.value = false;
    return;
  }
  try {
    const res = await adminApi.users.list({ search: q, limit: 10 });
    princessSearchResults.value = res.users;
    princessSearchPerformed.value = true;
  } catch {
    princessSearchResults.value = [];
  }
}

function selectPrincessUser(u: User) {
  selectedPrincessUserId.value = u.id;
  selectedPrincessUserLabel.value = userLabel(u);
  princessSearchResults.value = [];
  princessSearchQuery.value = selectedPrincessUserLabel.value;
  princessSuccessMsg.value = null;
  princessErrorMsg.value = null;
}

function clearPrincessSelection() {
  selectedPrincessUserId.value = '';
  selectedPrincessUserLabel.value = '';
  princessSearchQuery.value = '';
  princessSearchResults.value = [];
  princessSearchPerformed.value = false;
}

async function savePrincess() {
  if (!selectedPrincessUserId.value) return;
  saving.value = true;
  princessErrorMsg.value = null;
  princessSuccessMsg.value = null;
  try {
    await adminApi.settings.set('princess_user_id', selectedPrincessUserId.value);
    princessSuccessMsg.value = `Principessa impostata: ${selectedPrincessUserLabel.value}`;
    await load();
    clearPrincessSelection();
  } catch (err) {
    princessErrorMsg.value = err instanceof ApiError ? err.message : 'Errore durante il salvataggio';
  } finally {
    saving.value = false;
  }
}

async function clearPrincess() {
  saving.value = true;
  princessErrorMsg.value = null;
  princessSuccessMsg.value = null;
  try {
    await adminApi.settings.set('princess_user_id', '');
    currentPrincess.value = null;
    princessSuccessMsg.value = 'Ruolo principessa rimosso.';
  } catch (err) {
    princessErrorMsg.value = err instanceof ApiError ? err.message : 'Errore durante la rimozione';
  } finally {
    saving.value = false;
  }
}

let testerSearchTimer: ReturnType<typeof setTimeout> | null = null;
function onTesterSearchInput() {
  if (testerSearchTimer) clearTimeout(testerSearchTimer);
  testerSearchTimer = setTimeout(() => doTesterSearch(), 400);
}

async function doTesterSearch() {
  const q = testerSearchQuery.value.trim();
  if (!q) {
    testerSearchResults.value = [];
    testerSearchPerformed.value = false;
    return;
  }
  try {
    const res = await adminApi.users.list({ search: q, limit: 10 });
    testerSearchResults.value = res.users;
    testerSearchPerformed.value = true;
  } catch {
    testerSearchResults.value = [];
  }
}

function onRecipientSearchInput() {
  if (recipientSearchTimer) clearTimeout(recipientSearchTimer);
  recipientSearchTimer = setTimeout(() => doRecipientSearch(), 400);
}

async function doRecipientSearch() {
  const q = recipientSearchQuery.value.trim();
  if (!q) {
    recipientSearchResults.value = [];
    recipientSearchPerformed.value = false;
    return;
  }
  try {
    const res = await adminApi.users.list({ search: q, limit: 10 });
    recipientSearchResults.value = res.users;
    recipientSearchPerformed.value = true;
  } catch {
    recipientSearchResults.value = [];
  }
}

function addRecipient(u: User) {
  if (selectedRecipients.value.find((x) => x.id === u.id)) return;
  selectedRecipients.value.push(u);
  recipientSearchQuery.value = '';
  recipientSearchResults.value = [];
}

function removeRecipient(userId: string) {
  selectedRecipients.value = selectedRecipients.value.filter((u) => u.id !== userId);
}

function selectTesterUser(user: User) {
  selectedTesterUserId.value = user.id;
  selectedTesterUserLabel.value = userLabel(user);
  testerSearchResults.value = [];
  testerSearchQuery.value = selectedTesterUserLabel.value;
  testerSuccessMsg.value = null;
  testerErrorMsg.value = null;
}

function clearTesterSelection() {
  selectedTesterUserId.value = '';
  selectedTesterUserLabel.value = '';
  testerSearchQuery.value = '';
  testerSearchResults.value = [];
  testerSearchPerformed.value = false;
}

async function saveTesterIds(ids: string[]): Promise<void> {
  await adminApi.settings.set('tester_user_ids', ids.join(','));
}

async function addTester() {
  if (!selectedTesterUserId.value) return;
  savingTesters.value = true;
  testerErrorMsg.value = null;
  testerSuccessMsg.value = null;
  try {
    const nextIds = Array.from(new Set([...currentTesters.value.map((u) => u.id), selectedTesterUserId.value]));
    await saveTesterIds(nextIds);
    testerSuccessMsg.value = `Tester aggiunto: ${selectedTesterUserLabel.value}`;
    await load();
    clearTesterSelection();
  } catch (err) {
    testerErrorMsg.value = err instanceof ApiError ? err.message : 'Errore durante il salvataggio';
  } finally {
    savingTesters.value = false;
  }
}

async function removeTester(userId: string) {
  savingTesters.value = true;
  testerErrorMsg.value = null;
  testerSuccessMsg.value = null;
  try {
    const nextIds = currentTesters.value.map((u) => u.id).filter((id) => id !== userId);
    await saveTesterIds(nextIds);
    testerSuccessMsg.value = 'Ruolo tester aggiornato.';
    await load();
  } catch (err) {
    testerErrorMsg.value = err instanceof ApiError ? err.message : 'Errore durante la rimozione';
  } finally {
    savingTesters.value = false;
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
    const data: { payload: Record<string, unknown>; scheduledFor?: string; userIds?: string[] } = {
      payload: { title, body, ...(url ? { url } : {}) },
      ...(scheduledFor ? { scheduledFor } : {}),
    };
    if (recipientsMode.value === 'selected' && selectedRecipients.value.length > 0) {
      data.userIds = selectedRecipients.value.map((u) => u.id);
    }

    const result = await adminApi.push.sendBroadcast(data);
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

.current-role {
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
