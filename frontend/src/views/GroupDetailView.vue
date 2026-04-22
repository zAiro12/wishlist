<template>
  <NavBar />
  <div class="page-container">
    <div style="margin-bottom:1rem;">
      <RouterLink to="/groups">← Torna ai gruppi</RouterLink>
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
          <RouterLink :to="`/groups/${groupId}/wishlists`" class="btn-primary">Visualizza le Wishlists</RouterLink>
          <button
            v-if="isMember"
            class="btn-secondary"
            @click="shareInviteLink"
            :aria-label="copied ? 'Link copiato' : 'Condividi invito'"
            style="padding:0.5rem 0.75rem;"
          >
            {{ copied ? '✓ Link copiato!' : 'Condividi invito' }}
          </button>
        </div>
      </div>

      <div v-if="nextCelebrated.users.length > 0" class="card birthday-banner">
        <p style="font-weight:600;">
          <span v-if="nextCelebrated.daysUntil === 0">🎂 Oggi è il compleanno di {{ nextCelebrated.users[0].givenName }}! 🎉</span>
          <span v-else>
            🎂 Prossimo compleanno: {{ nextCelebrated.users[0].givenName }} {{ nextCelebrated.users[0].familyName }}
            tra {{ nextCelebrated.daysUntil }} giorn{{ nextCelebrated.daysUntil !== 1 ? 'i' : 'o' }}
          </span>
        </p>
        <p v-if="nextCelebrated.users.length > 1" style="color:var(--color-text-muted);font-size:0.875rem;">
          Altri festeggiati:
          <span
            v-for="(u, idx) in nextCelebrated.users.slice(1)"
            :key="u.id"
          >
            {{ u.givenName }} {{ u.familyName }}<span v-if="idx < nextCelebrated.users.slice(1).length - 1">, </span>
          </span>
        </p>
      </div>

      <p v-if="actionMsg" style="color:var(--color-primary);margin-bottom:1rem;">{{ actionMsg }}</p>
      <p v-if="actionError" class="error-message" style="margin-bottom:1rem;">{{ actionError }}</p>

      <div class="card" style="margin-bottom:1.5rem;">
        <h3>Membri ({{ activeMembers.length }})</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Ruolo</th>
              <th v-if="isOwner">Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in activeMembers" :key="m.id">
              <td>{{ m.user?.givenName }} {{ m.user?.familyName }}</td>
              <td>{{ m.user?.email }}</td>
              <td>{{ m.userId === group.ownerId ? '👑 Proprietario' : 'Membro' }}</td>
              <td v-if="isOwner">
                <button v-if="m.userId !== authStore.user?.id" class="remove-btn" @click="handleRemove(m)">Rimuovi</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isOwner" class="card" style="margin-bottom:1.5rem;">
        <h3>Trasferisci proprietà</h3>
        <div style="display:flex;gap:0.5rem;">
          <select v-model="transferUserId" style="flex:1;">
            <option value="">Seleziona nuovo proprietario…</option>
            <option
              v-for="m in activeMembers.filter(m => m.userId !== authStore.user?.id)"
              :key="m.userId"
              :value="m.userId"
            >
              {{ m.user?.givenName }} {{ m.user?.familyName }} ({{ m.user?.email }})
            </option>
          </select>
          <button class="btn-primary" :disabled="!transferUserId" @click="handleTransfer">Trasferisci</button>
        </div>
      </div>

      <div style="display:flex;gap:0.75rem;">
        <button class="btn-secondary" @click="handleLeave">Lascia gruppo</button>
        <button v-if="isOwner" class="btn-danger" style="padding:0.5rem 1rem;" @click="handleDeleteGroup">Elimina gruppo</button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import { groups as groupsApi, ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import type { Group, GroupMember, User } from '../types';
import { useToast } from '../composables/useToast';

type SharePayload = {
  title: string;
  text?: string;
  url: string;
};

function hasNativeShare(nav: Navigator): nav is Navigator & { share: (data: SharePayload) => Promise<void> } {
  // Narrow navigator to check Web Share API availability without relying on global lib types
  return (
    'share' in nav && typeof (nav as unknown as { share?: unknown }).share === 'function'
  );
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { showToast } = useToast();

const groupId = route.params['groupId'] as string;

const group = ref<Group | null>(null);
const nextCelebrated = ref<{ users: User[]; daysUntil: number | null }>({ users: [], daysUntil: null });
const loading = ref(true);
const error = ref<string | null>(null);
const actionMsg = ref<string | null>(null);
const actionError = ref<string | null>(null);
const transferUserId = ref('');
const copied = ref(false);

const isOwner = computed(() => group.value?.ownerId === authStore.user?.id);
const activeMembers = computed(() => group.value?.members?.filter((m) => m.removedAt === null) ?? []);
const isMember = computed(() => activeMembers.value.some((m) => m.userId === authStore.user?.id));

function buildInviteLink(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const url = new URL(base, window.location.origin);
  url.searchParams.set('join', groupId);
  return url.toString();
}

function getShareText(): { title: string; text: string; url: string } {
  const url = buildInviteLink();
  const title = group.value?.name ?? 'Unisciti al mio gruppo su Wishlist';
  const text = group.value
    ? `Unisciti a ${group.value.name} su Wishlist!`
    : 'Unisciti al mio gruppo su Wishlist!';
  return { title, text, url };
}

async function shareInviteLink(): Promise<void> {
  const payload = getShareText();

  try {
    if (hasNativeShare(navigator)) {
      await navigator.share(payload);
      try { showToast('Link condiviso', 'success'); } catch (e: unknown) { if (e instanceof Error) { void e; } }
      return;
    }

    await navigator.clipboard.writeText(payload.url);
    copied.value = true;
    try { showToast('Link copiato negli appunti', 'success'); } catch (e: unknown) { if (e instanceof Error) { void e; } }
    setTimeout(() => { copied.value = false; }, 2000);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError' || err.name === 'NotAllowedError') return;
      actionError.value = err.message || 'Errore durante la condivisione del link';
    } else {
      actionError.value = 'Errore durante la condivisione del link';
    }
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    group.value = await groupsApi.get(groupId);
    try {
      const nc = await groupsApi.nextCelebrated(groupId);
      nextCelebrated.value = { users: nc.nextCelebrated, daysUntil: nc.daysUntil };
    } catch {
      nextCelebrated.value = { users: [], daysUntil: null };
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore caricamento gruppo';
  } finally {
    loading.value = false;
  }
});

async function handleLeave() {
  try {
    const ok = await (await import('../composables/useConfirm')).openConfirm({
      message: 'Sei sicuro di voler lasciare questo gruppo?',
      confirmLabel: 'Lascia',
      cancelLabel: 'Annulla',
    });
    if (!ok) return;
    await groupsApi.members.leave(groupId);
    await router.replace('/groups');
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : "Errore durante l'abbandono del gruppo";
  }
}

async function handleRemove(member: GroupMember) {
  try {
    const ok = await (await import('../composables/useConfirm')).openConfirm({
      message: 'Rimuovere questo membro dal gruppo?',
      confirmLabel: 'Rimuovi',
      cancelLabel: 'Annulla',
    });
    if (!ok) return;
    await groupsApi.members.remove(groupId, member.userId);
    group.value!.members = group.value!.members?.filter((m) => m.userId !== member.userId) ?? [];
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Errore durante la rimozione del membro';
  }
}

async function handleTransfer() {
  if (!transferUserId.value) return;

  try {
    const updated = await groupsApi.transfer(groupId, transferUserId.value);
    if (group.value) group.value.ownerId = updated.ownerId;
    transferUserId.value = '';
    actionMsg.value = 'Proprietà trasferita con successo.';
    actionError.value = null;
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Errore durante il trasferimento della proprietà';
    actionMsg.value = null;
  }
}

async function handleDeleteGroup() {
  try {
    const ok = await (await import('../composables/useConfirm')).openConfirm({
      message: 'Eliminare questo gruppo? Questa azione non può essere annullata.',
      confirmLabel: 'Elimina',
      cancelLabel: 'Annulla',
    });
    if (!ok) return;
    await groupsApi.delete(groupId);
    await router.replace('/groups');
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : "Errore durante l'eliminazione del gruppo";
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