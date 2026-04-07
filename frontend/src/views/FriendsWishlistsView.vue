<template>
  <NavBar />
  <div class="page-container">
    <div style="margin-bottom:1rem;">
      <RouterLink :to="`/groups/${groupId}`">← Back to Group</RouterLink>
    </div>
    <h1>Group Wishlists</h1>

    <div v-if="actionError" class="card" style="margin-bottom:1rem;border-left:4px solid var(--color-danger);">
      <p class="error-message" style="margin:0;">{{ actionError }}</p>
    </div>

    <div v-if="loading" style="text-align:center;padding:3rem;"><div class="spinner" /></div>
    <p v-else-if="error" class="error-message">{{ error }}</p>
    <div v-else-if="Object.keys(byOwner).length === 0" class="card" style="text-align:center;color:var(--color-text-muted);">
      <p>No wishlist items found in this group.</p>
    </div>
    <template v-else>
      <div v-for="[ownerId, ownerItems] in Object.entries(byOwner)" :key="ownerId" class="card" style="margin-bottom:1.5rem;">
        <h3 style="margin-bottom:1rem;">
          <span v-if="ownerId === currentUserId">🎁 My Wishlist</span>
          <span v-else>{{ ownerName(ownerItems[0]) }}</span>
          <span v-if="ownerId === currentUserId" style="font-size:0.75rem;color:var(--color-text-muted);margin-left:0.5rem;">
            (your items — status hidden)
          </span>
        </h3>

        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          <div v-for="item in ownerItems" :key="item.id" class="item-row">
            <div style="flex:1;">
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="font-weight:500;">{{ item.title }}</span>
                <StatusBadge :status="item.status?.status ?? 'DISPONIBILE'" />
              </div>
              <p v-if="item.description" style="font-size:0.8rem;color:var(--color-text-muted);margin-top:0.2rem;">{{ item.description }}</p>
              <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" style="font-size:0.8rem;">View Link</a>
            </div>

            <div v-if="ownerId !== currentUserId" style="display:flex;gap:0.4rem;flex-shrink:0;">
              <template v-if="itemStatus(item) === 'DISPONIBILE'">
                <button class="action-btn reserve" @click="setStatus(item, 'PRENOTATO')">Reserve</button>
                <button class="action-btn buy" @click="setStatus(item, 'COMPRATO')">Mark Bought</button>
              </template>
              <template v-else-if="!isReservedByOtherGroup(item)">
                <button v-if="itemStatus(item) === 'PRENOTATO'" class="action-btn buy" @click="setStatus(item, 'COMPRATO')">Mark Bought</button>
                <button class="action-btn clear" @click="clearStatus(item)">Clear</button>
              </template>
              <span v-else style="font-size:0.75rem;color:var(--color-text-muted);">Reserved by another group</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { groups as groupsApi, wishlistStatus, ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import type { WishlistItem } from '../types';

const route = useRoute();
const authStore = useAuthStore();
const groupId = route.params['groupId'] as string;
const currentUserId = computed(() => authStore.user?.id ?? '');

const items = ref<WishlistItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const actionError = ref<string | null>(null);

const byOwner = computed(() => {
  const map: Record<string, WishlistItem[]> = {};
  for (const item of items.value) {
    if (!map[item.ownerId]) map[item.ownerId] = [];
    map[item.ownerId].push(item);
  }
  return map;
});

function ownerName(item: WishlistItem): string {
  const o = item.owner;
  if (!o) return item.ownerId;
  return `${o.givenName ?? ''} ${o.familyName ?? ''}`.trim() || o.email;
}

function itemStatus(item: WishlistItem): string {
  return item.status?.status ?? 'DISPONIBILE';
}

function isReservedByOtherGroup(item: WishlistItem): boolean {
  return itemStatus(item) !== 'DISPONIBILE' && item.status?.statusGroupId !== groupId;
}

onMounted(async () => {
  loading.value = true;
  try {
    items.value = await groupsApi.wishlists(groupId);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load wishlists';
  } finally {
    loading.value = false;
  }
});

async function setStatus(item: WishlistItem, status: 'PRENOTATO' | 'COMPRATO') {
  actionError.value = null;
  const version = item.status?.version ?? 0;
  try {
    const updated = await wishlistStatus.set(item.id, { status, groupId, version });
    items.value = items.value.map((i) => (i.id === item.id ? { ...i, status: updated } : i));
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Failed to update status';
  }
}

async function clearStatus(item: WishlistItem) {
  if (!item.status) return;
  actionError.value = null;
  try {
    const updated = await wishlistStatus.clear(item.id, {
      groupId: item.status.statusGroupId!,
      version: item.status.version,
    });
    items.value = items.value.map((i) => (i.id === item.id ? { ...i, status: updated } : i));
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Failed to clear status';
  }
}
</script>

<style scoped>
.item-row {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.action-btn {
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid;
  cursor: pointer;
}
.action-btn.reserve { background: #fef9c3; color: #854d0e; border-color: #fde047; }
.action-btn.buy     { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }
.action-btn.clear   { background: var(--color-border); color: var(--color-text); border-color: var(--color-border); }
</style>
