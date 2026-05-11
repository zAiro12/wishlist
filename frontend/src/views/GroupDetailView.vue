<template>
  <NavBar />
  <div class="page-container with-sidebar">
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
          <div class="editable-field">
            <template v-if="editingName">
              <input
                v-model="editNameValue"
                class="edit-input"
                maxlength="100"
                @keyup.enter="saveGroupName"
                @keyup.escape="cancelEditName"
              />
              <button class="icon-btn confirm-btn" @click="saveGroupName" aria-label="Salva nome">✓</button>
              <button class="icon-btn cancel-btn" @click="cancelEditName" aria-label="Annulla">✕</button>
            </template>
            <template v-else>
              <h1 style="margin:0;">{{ group.name }}</h1>
              <button v-if="isOwner" class="icon-btn pencil-btn" @click="startEditName" aria-label="Modifica nome">✏️</button>
            </template>
          </div>

          <div class="editable-field">
            <template v-if="editingDescription">
              <textarea
                v-model="editDescriptionValue"
                class="edit-input edit-textarea"
                maxlength="500"
                rows="2"
                @keyup.escape="cancelEditDescription"
              />
              <button class="icon-btn confirm-btn" @click="saveGroupDescription" aria-label="Salva descrizione">✓</button>
              <button class="icon-btn cancel-btn" @click="cancelEditDescription" aria-label="Annulla">✕</button>
            </template>
            <template v-else>
              <p style="color:var(--color-on-surface-variant);margin:0.25rem 0 0;">{{ displayDescription }}</p>
              <button v-if="isOwner" class="icon-btn pencil-btn" @click="startEditDescription" aria-label="Modifica descrizione">✏️</button>
            </template>
          </div>

          <p style="font-size:0.8rem;color:var(--color-on-surface-variant);margin-top:0.4rem;">ID: <code>{{ group.id }}</code></p>
        </div>

        <div style="display:flex;gap:0.5rem;align-items:center;">
          <RouterLink :to="`/groups/${groupId}/wishlists`" class="btn-primary">Visualizza le Wishlists</RouterLink>
          <button
            v-if="isMember"
            class="btn-secondary"
            @click="shareInviteLink"
            :aria-label="copied ? 'Link copiato' : 'Condividi invito'"
          >
            {{ copied ? '✓ Link copiato!' : 'Condividi invito' }}
          </button>
        </div>
      </div>

      <div v-if="allBirthdays.length > 0" class="card birthday-banner">
        <p style="font-weight:600;margin-bottom:0.5rem;">🎂 Compleanni</p>
        <ul class="birthday-list">
          <li v-for="b in allBirthdays" :key="b.userId">
            <span class="birthday-name">{{ b.givenName }} {{ b.familyName }}</span>
            <span v-if="b.daysUntil === 0" class="birthday-days today">🎉 oggi!</span>
            <span v-else class="birthday-days">tra {{ b.daysUntil }} giorn{{ b.daysUntil !== 1 ? 'i' : 'o' }}</span>
          </li>
        </ul>
      </div>

      <p v-if="actionMsg" style="color:var(--color-primary);margin-bottom:1rem;">{{ actionMsg }}</p>
      <p v-if="actionError" class="error-message" style="margin-bottom:1rem;">{{ actionError }}</p>

      <div class="card" style="margin-bottom:1.5rem;">
        <h3>Membri ({{ activeMembers.length }})</h3>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th v-if="authStore.isAdmin">Email</th>
              <th v-if="isOwner">Azioni</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in activeMembers" :key="m.id">
              <td>
                <span class="member-role-icon" :title="memberRoleLabel(m)">{{ memberRoleIcon(m) }}</span>
                {{ m.user?.givenName }} {{ m.user?.familyName }}
                <span v-if="m.user?.birthdate" class="member-birthdate">
                  ({{ formatBirthday(m.user.birthdate) }})
                </span>
              </td>
              <td v-if="authStore.isAdmin">{{ m.user?.email }}</td>
              <td v-if="isOwner">
                <button v-if="m.userId !== authStore.user?.id" class="remove-btn" @click="handleRemove(m)">Rimuovi</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isOwner" class="card" style="margin-bottom:1.5rem;">
        <h3>Trasferisci proprietà</h3>
        <div class="transfer-container">
          <input
            v-model="transferQuery"
            class="transfer-search"
            type="text"
            placeholder="Cerca per nome, cognome o email…"
          />
          <ul class="transfer-suggestions">
            <li v-for="m in filteredTransferCandidates" :key="m.userId">
              <button type="button" class="transfer-suggestion-btn" @click="selectTransferCandidate(m)">
                {{ transferCandidateLabel(m) }}
              </button>
            </li>
          </ul>
          <button class="btn-primary" :disabled="!resolvedTransferUserId" @click="handleTransfer">Trasferisci</button>
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
import type { Group, GroupMember } from '../types';
import { useToast } from '../composables/useToast';

type SharePayload = {
  title: string;
  text?: string;
  url: string;
};
const PRINCESS_EMAIL = 'giada.galli18@hotmail.com';

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
const loading = ref(true);
const error = ref<string | null>(null);
const actionMsg = ref<string | null>(null);
const actionError = ref<string | null>(null);
const transferUserId = ref('');
const transferQuery = ref('');
const copied = ref(false);

const editingName = ref(false);
const editNameValue = ref('');
const editingDescription = ref(false);
const editDescriptionValue = ref('');

function startEditName() {
  editNameValue.value = group.value?.name ?? '';
  editingName.value = true;
}

function cancelEditName() {
  editingName.value = false;
}

async function saveGroupName() {
  const name = editNameValue.value.trim();
  if (!name || name.length < 2) {
    actionError.value = 'Il nome deve contenere almeno 2 caratteri';
    actionMsg.value = null;
    return;
  }
  try {
    const updated = await groupsApi.update(groupId, { name });
    if (group.value) group.value.name = updated.name;
    editingName.value = false;
    actionMsg.value = 'Nome aggiornato.';
    actionError.value = null;
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Errore durante il salvataggio del nome';
    actionMsg.value = null;
  }
}

function startEditDescription() {
  editDescriptionValue.value = group.value?.description ?? '';
  editingDescription.value = true;
}

function cancelEditDescription() {
  editingDescription.value = false;
}

async function saveGroupDescription() {
  const description = editDescriptionValue.value.trim();
  try {
    const updated = await groupsApi.update(groupId, { description });
    if (group.value) group.value.description = updated.description;
    editingDescription.value = false;
    actionMsg.value = 'Descrizione aggiornata.';
    actionError.value = null;
  } catch (err) {
    actionError.value = err instanceof ApiError ? err.message : 'Errore durante il salvataggio della descrizione';
    actionMsg.value = null;
  }
}

function formatBirthday(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return dateStr;
  const [, , month, day] = match;
  return `${day}/${month}`;
}

function daysUntilBirthday(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  let next = Date.UTC(today.getFullYear(), month, day);
  if (next < todayUtc) next = Date.UTC(today.getFullYear() + 1, month, day);
  return Math.floor((next - todayUtc) / 86400000);
}

const isOwner = computed(() => group.value?.ownerId === authStore.user?.id);
const activeMembers = computed(() => group.value?.members?.filter((m) => m.removedAt === null) ?? []);
const isMember = computed(() => activeMembers.value.some((m) => m.userId === authStore.user?.id));
const displayDescription = computed(() =>
  group.value?.description || (isOwner.value ? 'Nessuna descrizione' : '')
);
const allBirthdays = computed(() =>
  activeMembers.value
    .filter((m) => m.user?.birthdate)
    .map((m) => {
      const u = m.user!;
      return {
        userId: m.userId,
        givenName: u.givenName,
        familyName: u.familyName,
        daysUntil: daysUntilBirthday(u.birthdate!),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
);
const transferCandidates = computed(() =>
  activeMembers.value.filter((m) => m.userId !== authStore.user?.id)
);
const normalizedTransferQuery = computed(() => transferQuery.value.trim().toLowerCase());
const filteredTransferCandidates = computed(() => {
  const query = normalizedTransferQuery.value;
  if (!query) return transferCandidates.value;
  return transferCandidates.value.filter((m) => {
    const label = transferCandidateLabel(m).toLowerCase();
    const givenName = m.user?.givenName?.toLowerCase() ?? '';
    const familyName = m.user?.familyName?.toLowerCase() ?? '';
    const email = m.user?.email?.toLowerCase() ?? '';
    return givenName.includes(query) || familyName.includes(query) || email.includes(query) || label.includes(query);
  });
});
const selectedTransferMember = computed(() => {
  const query = normalizedTransferQuery.value;
  const selectedById = transferCandidates.value.find((m) => m.userId === transferUserId.value);
  if (selectedById && transferCandidateLabel(selectedById).toLowerCase() === query) return selectedById;
  return transferCandidates.value.find((m) => transferCandidateLabel(m).toLowerCase() === query) ?? null;
});
const resolvedTransferUserId = computed(() => selectedTransferMember.value?.userId ?? '');

function transferCandidateLabel(member: GroupMember): string {
  const fullName = `${member.user?.givenName ?? ''} ${member.user?.familyName ?? ''}`.trim();
  const email = member.user?.email ?? '';
  if (fullName && email) return `${fullName} (${email})`;
  if (fullName) return fullName;
  if (email) return email;
  return 'Utente senza nome';
}

function selectTransferCandidate(member: GroupMember): void {
  transferUserId.value = member.userId;
  transferQuery.value = transferCandidateLabel(member);
}

function memberRoleIcon(member: GroupMember): string {
  if (member.userId === group.value?.ownerId) return '👑';
  if (isPrincess(member)) return '👸';
  return '👤';
}

function memberRoleLabel(member: GroupMember): string {
  if (member.userId === group.value?.ownerId) return 'Proprietario';
  if (isPrincess(member)) return 'Principessa';
  return 'Membro';
}

function isPrincess(member: GroupMember): boolean {
  return member.user?.email === PRINCESS_EMAIL;
}

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
  const selected = selectedTransferMember.value;
  if (!selected) {
    transferUserId.value = '';
    actionError.value = 'Seleziona un membro valido da trasferire.';
    actionMsg.value = null;
    return;
  }

  try {
    const updated = await groupsApi.transfer(groupId, selected.userId);
    if (group.value) group.value.ownerId = updated.ownerId;
    transferUserId.value = '';
    transferQuery.value = '';
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
  border-left: 4px solid var(--color-tertiary-fixed-dim);
}

.remove-btn {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: var(--color-error);
  color: var(--color-on-error);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
}

@media (max-width: 767px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}

.member-birthdate {
  color: var(--color-on-surface-variant);
  font-size: 0.8rem;
}

.member-role-icon {
  display: inline-block;
  margin-right: 0.35rem;
}

.birthday-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.birthday-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.birthday-name {
  font-weight: 500;
}

.birthday-days {
  color: var(--color-on-surface-variant);
  font-size: 0.875rem;
}

.birthday-days.today {
  color: var(--color-primary);
  font-weight: 600;
}

.editable-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.pencil-btn {
  font-size: 0.85rem;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.pencil-btn:hover {
  opacity: 1;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  font-family: var(--font-body);
  font-size: 0.9rem;
  line-height: 1;
  border-radius: var(--radius-sm, 4px);
}

.confirm-btn {
  color: var(--color-primary);
  font-weight: 700;
}

.cancel-btn {
  color: var(--color-error);
  font-weight: 700;
}

.edit-input {
  border: 1px solid var(--color-outline, #aaa);
  border-radius: var(--radius-md, 6px);
  padding: 0.25rem 0.5rem;
  font-family: var(--font-body);
  font-size: 1rem;
  background: var(--color-surface, #fff);
  color: var(--color-on-surface, #000);
  min-width: 12rem;
}

.edit-textarea {
  font-size: 0.9rem;
  min-width: 16rem;
  resize: vertical;
}

.transfer-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.transfer-search {
  width: 100%;
}

.transfer-suggestions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 10rem;
  overflow-y: auto;
}

.transfer-suggestion-btn {
  width: 100%;
  text-align: left;
  border: 1px solid var(--color-outline, #ccc);
  border-radius: var(--radius-md, 6px);
  background: var(--color-surface, #fff);
  color: var(--color-on-surface, #000);
  padding: 0.35rem 0.5rem;
  cursor: pointer;
  font-family: var(--font-body);
}
</style>
