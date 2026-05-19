<template>
  <NavBar />
  <div class="page-container with-sidebar">
    <div style="margin-bottom:1rem;">
      <RouterLink to="/wishlist">← Torna alla mia wishlist</RouterLink>
    </div>

    <h1>Wishlist condivisa</h1>
    <p v-if="ownerLabel" style="color:var(--color-on-surface-variant);margin-top:-0.5rem;margin-bottom:1rem;">
      {{ ownerLabel }}
    </p>

    <div v-if="loading" style="text-align:center;padding:3rem;"><div class="spinner" /></div>
    <p v-else-if="error" class="error-message">{{ error }}</p>
    <div v-else-if="items.length === 0" class="card" style="text-align:center;color:var(--color-on-surface-variant);">
      <p>Questa wishlist non contiene ancora elementi.</p>
    </div>
    <div v-else style="display:flex;flex-direction:column;gap:0.75rem;">
      <div v-for="item in items" :key="item.id" class="card">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
          <span style="font-weight:600;">{{ item.title }}</span>
        </div>
        <p v-if="item.description" style="color:var(--color-on-surface-variant);font-size:0.875rem;">{{ item.description }}</p>
        <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" style="font-size:0.875rem;">Apri link</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import { users, ApiError } from '../api/client';
import type { GroupUserSummary, SharedWishlistItem } from '../types';

const route = useRoute();
const userId = route.params['userId'] as string;

const loading = ref(true);
const error = ref<string | null>(null);
const items = ref<SharedWishlistItem[]>([]);
const owner = ref<GroupUserSummary | null>(null);

const ownerLabel = computed(() => {
  if (!owner.value) return '';
  const fullName = `${owner.value.givenName ?? ''} ${owner.value.familyName ?? ''}`.trim();
  return fullName || '';
});

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await users.sharedWishlist(userId);
    owner.value = response.owner;
    items.value = response.items;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore nel caricamento della wishlist condivisa';
  } finally {
    loading.value = false;
  }
});
</script>
