<template>
  <div>
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
      <input v-model="search" type="text" placeholder="Cerca per email o nome…" style="max-width:320px;" @keydown.enter="doSearch" />
      <button class="btn-primary" @click="doSearch">Cerca</button>
    </div>

    <p v-if="actionMsg" style="color:var(--color-primary);margin-bottom:0.5rem;">{{ actionMsg }}</p>
    <p v-if="error" class="error-message">{{ error }}</p>

    <div v-if="loading" class="spinner" />
    <template v-else>
      <p style="color:var(--color-on-surface-variant);font-size:0.875rem;margin-bottom:0.5rem;">{{ total }} utente{{ total !== 1 ? 'i' : '' }} in totale</p>
      <table>
        <thead><tr><th>Avatar</th><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Birthdate</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>
              <img v-if="safeAvatarUrl(u.avatarUrl)" :src="safeAvatarUrl(u.avatarUrl) ?? undefined" alt="Avatar utente" class="avatar-mini" />
              <div v-else class="avatar-mini fallback">{{ userInitials(u) }}</div>
            </td>
            <td>{{ u.email }}</td>
            <td>{{ u.givenName }} {{ u.familyName }}</td>
            <td>{{ u.role }}</td>
            <td><span :class="`badge ${u.status === 'ACTIVE' ? 'badge-disponibile' : 'badge-comprato'}`">{{ u.status }}</span></td>
            <td>{{ u.birthdate ? formatDate(u.birthdate) : '—' }}</td>
            <td>
              <div style="display:flex;gap:0.3rem;">
                <template v-if="u.status === 'ACTIVE'">
                  <button class="mini-btn danger" @click="doAction(u.id, 'ban')">Ban</button>
                  <button class="mini-btn muted" @click="doAction(u.id, 'disable')">Disable</button>
                </template>
                <button v-if="u.status === 'BANNED'" class="mini-btn success" @click="doAction(u.id, 'unban')">Unban</button>
                <button v-if="u.status === 'DISABLED'" class="mini-btn success" @click="doAction(u.id, 'enable')">Enable</button>
                <button class="mini-btn primary" @click="startEdit(u)">Modifica</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="editingUser" class="edit-card card" style="margin-top: 1rem;">
        <h3>Modifica utente</h3>
        <p style="margin-top: 0.2rem; color: var(--color-on-surface-variant);">{{ editingUser.email }}</p>
        <div class="edit-grid">
          <div class="form-group">
            <label>Nome</label>
            <input v-model="editGivenName" type="text" />
          </div>
          <div class="form-group">
            <label>Cognome</label>
            <input v-model="editFamilyName" type="text" />
          </div>
          <div class="form-group">
            <label>Data di nascita (YYYY-MM-DD)</label>
            <input v-model="editBirthdate" type="text" placeholder="1990-12-31" />
          </div>
          <div class="form-group">
            <label>Avatar URL</label>
            <input v-model="editAvatarUrl" type="url" placeholder="https://..." />
          </div>
          <div class="form-group">
            <label>Ruolo</label>
            <select v-model="editRole">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn-primary" @click="saveEdit">Salva utente</button>
          <button class="btn-secondary" @click="cancelEdit">Annulla</button>
        </div>
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;align-items:center;">
        <button class="btn-secondary" :disabled="page === 1" @click="page--; load()">← Indietro</button>
        <span style="font-size:0.875rem;">Pagina {{ page }}</span>
        <button class="btn-secondary" :disabled="page * 20 >= total" @click="page++; load()">Avanti →</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { admin as adminApi, ApiError } from '../../api/client';
import type { User } from '../../types';
import { formatDate } from '@/utils/formatDate';
import { sanitizeAvatarUrl } from '@/utils/avatarUrl';

const users = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const search = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const actionMsg = ref<string | null>(null);
const editingUser = ref<User | null>(null);
const editGivenName = ref('');
const editFamilyName = ref('');
const editBirthdate = ref('');
const editAvatarUrl = ref('');
const editRole = ref<'USER' | 'ADMIN'>('USER');

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.users.list({ page: page.value, limit: 20, search: search.value || undefined });
    users.value = res.users;
    total.value = res.total;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore';
  } finally {
    loading.value = false;
  }
}

function doSearch() { page.value = 1; load(); }

async function doAction(userId: string, action: 'ban' | 'unban' | 'disable' | 'enable') {
  const reason = action === 'ban' ? (prompt('Reason for ban (optional):') ?? undefined) : undefined;
  const actionLabels: Record<typeof action, string> = {
    ban: 'banned',
    unban: 'unbanned',
    disable: 'disabled',
    enable: 'enabled',
  };
  try {
    await adminApi.users.update(userId, { action, reason });
    actionMsg.value = `User ${actionLabels[action]} successfully.`;
    error.value = null;
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore';
    actionMsg.value = null;
  }
}

function userInitials(user: User): string {
  const g = (user.givenName ?? '').trim();
  const f = (user.familyName ?? '').trim();
  if (g || f) return `${g.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return user.email.charAt(0).toUpperCase();
}

function startEdit(user: User) {
  editingUser.value = user;
  editGivenName.value = user.givenName ?? '';
  editFamilyName.value = user.familyName ?? '';
  editBirthdate.value = user.birthdate ?? '';
  editAvatarUrl.value = user.avatarUrl ?? '';
  editRole.value = user.role;
}

function cancelEdit() {
  editingUser.value = null;
}

function isValidBirthdateIso(input: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return false;
  if (input !== date.toISOString().slice(0, 10)) return false;
  return date <= new Date();
}

async function saveEdit() {
  if (!editingUser.value) return;
  const birthdate = editBirthdate.value.trim();
  if (birthdate && !isValidBirthdateIso(birthdate)) {
    error.value = 'Data di nascita non valida. Usa YYYY-MM-DD.';
    return;
  }
  const givenName = editGivenName.value.trim();
  const familyName = editFamilyName.value.trim();
  const payload: {
    givenName?: string;
    familyName?: string;
    birthdate: string;
    avatarUrl: string;
    role: typeof editRole.value;
  } = {
    birthdate,
    avatarUrl: editAvatarUrl.value.trim(),
    role: editRole.value,
  };
  if (givenName) payload.givenName = givenName;
  if (familyName) payload.familyName = familyName;
  try {
    await adminApi.users.update(editingUser.value.id, payload);
    actionMsg.value = 'Utente aggiornato con successo.';
    error.value = null;
    cancelEdit();
    await load();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore';
    actionMsg.value = null;
  }
}

function safeAvatarUrl(url: string | null | undefined): string | null {
  return sanitizeAvatarUrl(url);
}
</script>

<style scoped>
.mini-btn { font-size: 0.7rem; padding: 0.2rem 0.4rem; border-radius: var(--radius-sm); border: none; cursor: pointer; color: white; font-family: var(--font-body); }
.mini-btn.danger  { background: var(--color-error); }
.mini-btn.muted   { background: var(--color-outline); }
.mini-btn.success { background: var(--color-success); }
.mini-btn.primary { background: var(--color-primary); }
.avatar-mini { width: 1.75rem; height: 1.75rem; border-radius: var(--radius-full); object-fit: cover; }
.avatar-mini.fallback {
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
}
.edit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; margin: 1rem 0; }
</style>
