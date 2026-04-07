<template>
  <div>
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;">
      <input v-model="search" type="text" placeholder="Search by email or name…" style="max-width:320px;" @keydown.enter="doSearch" />
      <button class="btn-primary" @click="doSearch">Search</button>
    </div>

    <p v-if="actionMsg" style="color:var(--color-primary);margin-bottom:0.5rem;">{{ actionMsg }}</p>
    <p v-if="error" class="error-message">{{ error }}</p>

    <div v-if="loading" class="spinner" />
    <template v-else>
      <p style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:0.5rem;">{{ total }} user{{ total !== 1 ? 's' : '' }} total</p>
      <table>
        <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Birthdate</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.email }}</td>
            <td>{{ u.givenName }} {{ u.familyName }}</td>
            <td>{{ u.role }}</td>
            <td><span :class="`badge ${u.status === 'ACTIVE' ? 'badge-disponibile' : 'badge-comprato'}`">{{ u.status }}</span></td>
            <td>{{ u.birthdate ?? '—' }}</td>
            <td>
              <div style="display:flex;gap:0.3rem;">
                <template v-if="u.status === 'ACTIVE'">
                  <button class="mini-btn danger" @click="doAction(u.id, 'ban')">Ban</button>
                  <button class="mini-btn muted" @click="doAction(u.id, 'disable')">Disable</button>
                </template>
                <button v-if="u.status === 'BANNED'" class="mini-btn success" @click="doAction(u.id, 'unban')">Unban</button>
                <button v-if="u.status === 'DISABLED'" class="mini-btn success" @click="doAction(u.id, 'enable')">Enable</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;align-items:center;">
        <button class="btn-secondary" :disabled="page === 1" @click="page--; load()">← Prev</button>
        <span style="font-size:0.875rem;">Page {{ page }}</span>
        <button class="btn-secondary" :disabled="page * 20 >= total" @click="page++; load()">Next →</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { admin as adminApi, ApiError } from '../../api/client';
import type { User } from '../../types';

const users = ref<User[]>([]);
const total = ref(0);
const page = ref(1);
const search = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const actionMsg = ref<string | null>(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.users.list({ page: page.value, limit: 20, search: search.value || undefined });
    users.value = res.users;
    total.value = res.total;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed';
  } finally {
    loading.value = false;
  }
}

function doSearch() { page.value = 1; load(); }

async function doAction(userId: string, action: 'ban' | 'unban' | 'disable' | 'enable') {
  const reason = action === 'ban' ? (prompt('Reason for ban (optional):') ?? undefined) : undefined;
  try {
    await adminApi.users.update(userId, { action, reason });
    actionMsg.value = `User ${action}ned successfully.`;
    await load();
  } catch (err) {
    actionMsg.value = err instanceof ApiError ? err.message : 'Failed';
  }
}
</script>

<style scoped>
.mini-btn { font-size: 0.7rem; padding: 0.2rem 0.4rem; border-radius: 4px; border: none; cursor: pointer; color: white; }
.mini-btn.danger  { background: var(--color-danger); }
.mini-btn.muted   { background: #6b7280; }
.mini-btn.success { background: var(--color-success); }
</style>
