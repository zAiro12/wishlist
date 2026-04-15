<template>
  <div>
    <p style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:0.5rem;">{{ total }} items total</p>
    <p v-if="error" class="error-message">{{ error }}</p>
    <div v-if="loading" class="spinner" />
    <template v-else>
      <table>
        <thead><tr><th>Title</th><th>Owner</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>{{ item.title }}</td>
            <td>{{ item.owner?.email ?? item.ownerId }}</td>
            <td>{{ item.status?.status ?? 'DISPONIBILE' }}</td>
            <td>{{ formatDate(item.createdAt) }}</td>
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
import type { WishlistItem } from '../../types';
import { formatDate } from '@/utils/formatDate';

const items = ref<WishlistItem[]>([]);
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const res = await adminApi.wishlists.list({ page: page.value, limit: 20 });
    items.value = res.items;
    total.value = res.total;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load wishlists';
  } finally {
    loading.value = false;
  }
}
</script>
