<template>
  <div>
    <p style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:0.5rem;">{{ total }} audit entries</p>
    <p v-if="error" class="error-message">{{ error }}</p>
    <div v-if="loading" class="spinner" />
    <template v-else>
      <table>
        <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Date</th></tr></thead>
        <tbody>
          <tr v-for="a in actions" :key="a.id">
            <td><code style="font-size:0.8rem;">{{ a.action }}</code></td>
            <td>{{ a.actor?.email ?? a.actorId }}</td>
            <td>{{ a.targetUser?.email ?? a.targetUserId ?? '—' }}</td>
                  <td>{{ formatDate(a.createdAt) }}</td>
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
import type { AdminAction } from '../../types';
import { formatDate } from '@/utils/formatDate';

const actions = ref<AdminAction[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.audit.list({ page: page.value, limit: 20 });
    actions.value = res.actions;
    total.value = res.total;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load audit log';
  } finally {
    loading.value = false;
  }
}
</script>
