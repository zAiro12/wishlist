<template>
  <NavBar />
  <div class="page-container">
    <div style="margin-bottom:1rem;">
      <RouterLink to="/groups">← Back to Groups</RouterLink>
    </div>

    <div v-if="loading" style="text-align:center;padding:3rem;">
      <div class="spinner" />
    </div>
    <p v-else-if="error" class="error-message">{{ error }}</p>
    <template v-else-if="group">
      <div class="page-header">
        <div>
          <h1 style="margin:0;">{{ group.name }}</h1>
          <p v-if="group.description" style="color:var(--color-text-muted);">{{ group.description }}</p>
          <p style="font-size:0.8rem;color:var(--color-text-muted);">ID: <code>{{ group.id }}</code></p>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center;">
          <RouterLink :to="`/groups/${groupId}/wishlists`" class="btn-primary">View Wishlists</RouterLink>
          <button v-if="isMember" class="btn-secondary" @click="copyInviteLink"
            :aria-label="copied ? 'Link copied' : 'Copy invite link'" style="padding:0.5rem 0.75rem;">
            {{ copied ? '✓ Link copiato!' : 'Copy invite link' }}
          </button>
        </div>
      </div>

      <div v-if="nextCelebrated.users.length > 0" class="card birthday-banner">
        <p style="font-weight:600;">
          <span v-if="nextCelebrated.daysUntil === 0">🎂 Oggi è il compleanno di {{ nextCelebrated.users[0].givenName
            }}! 🎉</span>
          <span v-else>🎂 Prossimo compleanno: {{ nextCelebrated.users[0].givenName }} {{
            nextCelebrated.users[0].familyName }} tra {{ nextCelebrated.daysUntil }} giorn{{ nextCelebrated.daysUntil
              !== 1 ? 'i' : 'o' }}</span>
        </p>
        <p v-if="nextCelebrated.users.length > 1" style="color:var(--color-text-muted);font-size:0.875rem;">
          Altri festeggiati: <span v-for="(u, idx) in nextCelebrated.users.slice(1)" :key="u.id">{{ u.givenName }} {{
            u.familyName }}<span v-if="idx < nextCelebrated.users.slice(1).length - 1">, </span></span>
        </p>
      </div>

      <p v-if="actionMsg" style="color:var(--color-primary);margin-bottom:1rem;">{{ actionMsg }}</p>
      <p v-if="actionError" class="error-message" style="margin-bottom:1rem;">{{ actionError }}</p>

      <div class="card" style="margin-bottom:1.5rem;">
        <h3>Members ({{ activeMembers.length }})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th v-if="isOwner">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in activeMembers" :key="m.id">
              <td>{{ m.user?.givenName }} {{ m.user?.familyName }}</td>
              <td>{{ m.user?.email }}</td>
              <td>{{ m.userId === group.ownerId ? '👑 Owner' : 'Member' }}</td>
              <td v-if="isOwner">
                <button v-if="m.userId !== authStore.user?.id" class="remove-btn"
                  @click="handleRemove(m)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isOwner" class="card" style="margin-bottom:1.5rem;">
        <h3>Transfer Ownership</h3>
        <div style="display:flex;gap:0.5rem;">
          <select v-model="transferUserId" style="flex:1;">
            <option value="">Select new owner…</option>
            <option v-for="m in activeMembers.filter(m => m.userId !== authStore.user?.id)" :key="m.userId"
              :value="m.userId">
              {{ m.user?.givenName }} {{ m.user?.familyName }} ({{ m.user?.email }})
            </option>
          </select>
          <button class="btn-primary" :disabled="!transferUserId" @click="handleTransfer">Transfer</button>
        </div>
      </div>

      <div style="display:flex;gap:0.75rem;">
        <button class="btn-secondary" @click="handleLeave">Leave Group</button>
        <button v-if="isOwner" class="btn-danger" style="padding:0.5rem 1rem;" @click="handleDeleteGroup">Delete
          Group</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import { groups as groupsApi, ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import type { Group, GroupMember, User } from '../types';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const groupId = route.params['groupId'] as string;

const group = ref<Group | null>(null);
const nextCelebrated = ref<{ users: User[]; daysUntil: number | null }>({ users: [], daysUntil: null });
const loading = ref(true);
const error = ref<string | null>(null);
const actionMsg = ref<string | null>(null);
const actionError = ref<string | null>(null);
const transferUserId = ref('');

const isOwner = computed(() => group.value?.ownerId === authStore.user?.id);
const activeMembers = computed(() => group.value?.members?.filter((m) => m.removedAt === null) ?? []);
const isMember = computed(() => activeMembers.value.some((m) => m.userId === authStore.user?.id));
const copied = ref(false);

async function copyInviteLink(): Promise<void> {
  try {
    const inviteLink = `${window.location.origin}/join/${groupId}`;
    await navigator.clipboard.writeText(inviteLink);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    actionError.value = 'Failed to copy invite link';
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    group.value = await groupsApi.get(groupId);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load group';
    loading.value = false;
    return;
  }

  // Fetch next-celebrated separately and fail silently if it errors
  try {
    const nc = await groupsApi.nextCelebrated(groupId);
    nextCelebrated.value = { users: nc.nextCelebrated, daysUntil: nc.daysUntil };
  } catch (err) {
    // silent fail: leave nextCelebrated empty
    nextCelebrated.value = { users: [], daysUntil: null };
  } finally {
    loading.value = false;
  }
});

async function handleLeave() {
  if (!confirm('Are you sure you want to leave this group?')) return;
  try {
    await groupsApi.members.leave(groupId);
    await router.replace('/groups');
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Failed to leave group';
  }
}

async function handleRemove(member: GroupMember) {
  if (!confirm('Remove this member from group?')) return;
  try {
    await groupsApi.members.remove(groupId, member.userId);
    if (group.value?.members) {
      group.value.members = group.value.members.filter((m) => m.userId !== member.userId);
    }
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Failed to remove member';
  }
}

async function handleTransfer() {
  if (!transferUserId.value) return;
  try {
    const updated = await groupsApi.transfer(groupId, transferUserId.value);
    if (group.value) group.value.ownerId = updated.ownerId;
    transferUserId.value = '';
    actionMsg.value = 'Ownership transferred successfully.';
    actionError.value = null;
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Failed to transfer ownership';
    actionMsg.value = null;
  }
}

async function handleDeleteGroup() {
  if (!confirm('Delete this group? This action cannot be undone.')) return;
  try {
    await groupsApi.delete(groupId);
    await router.replace('/groups');
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Failed to delete group';
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.birthday-banner {
  margin-bottom: 1.5rem;
  border-left: 4px solid var(--color-warning);
}

.remove-btn {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: var(--color-danger);
  color: white;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}
</style>
