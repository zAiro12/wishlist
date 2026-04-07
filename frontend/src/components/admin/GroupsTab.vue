<template>
  <div>
    <p style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:0.5rem;">{{ total }} groups total</p>
    <p v-if="error" class="error-message">{{ error }}</p>
    <div v-if="loading" class="spinner" />
    <template v-else>
      <table>
        <thead><tr><th>Name</th><th>Owner</th><th>Members</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>
          <tr v-for="g in groups" :key="g.id">
            <td>{{ g.name }}</td>
            <td>{{ g.owner?.email ?? g.ownerId }}</td>
            <td>{{ (g as any)._count?.members ?? '?' }}</td>
            <td>
              <span v-if="g.deletedAt" class="badge badge-comprato">Deleted</span>
              <span v-else class="badge badge-disponibile">Active</span>
            </td>
            <td>{{ new Date(g.createdAt).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
      <div style="display:flex;gap:0.5rem;margin-top:1rem;">
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
import type { Group } from '../../types';

const groups = ref<Group[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.groups.list({ page: page.value, limit: 20 });
    groups.value = res.groups;
    total.value = res.total;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load groups';
  } finally {
    loading.value = false;
  }
}
</script>
