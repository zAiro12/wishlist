<template>
  <NavBar />
  <div class="page-container">
    <h1>Admin Dashboard</h1>

    <div class="tabs">
      <button
        v-for="t in TABS"
        :key="t"
        :class="['tab-btn', { active: tab === t }]"
        @click="tab = t"
      >
        {{ t.charAt(0).toUpperCase() + t.slice(1) }}
      </button>
    </div>

    <UsersTab v-if="tab === 'users'" />
    <GroupsTab v-else-if="tab === 'groups'" />
    <WishlistsTab v-else-if="tab === 'wishlists'" />
    <AuditTab v-else-if="tab === 'audit'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import NavBar from '../components/NavBar.vue';
import UsersTab from '../components/admin/UsersTab.vue';
import GroupsTab from '../components/admin/GroupsTab.vue';
import WishlistsTab from '../components/admin/WishlistsTab.vue';
import AuditTab from '../components/admin/AuditTab.vue';

const TABS = ['users', 'groups', 'wishlists', 'audit'] as const;
type Tab = (typeof TABS)[number];
const tab = ref<Tab>('users');
</script>

<style scoped>
.tabs { display: flex; border-bottom: 1px solid var(--color-border); margin-bottom: 1.5rem; }
.tab-btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-bottom: 2px solid transparent;
  background: none;
  cursor: pointer;
  border-radius: 0;
}
.tab-btn.active { border-bottom-color: var(--color-primary); color: var(--color-primary); font-weight: 600; }
</style>
