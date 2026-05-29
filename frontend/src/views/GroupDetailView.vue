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
              <input v-model="editNameValue" class="edit-input" maxlength="100" @keyup.enter="saveGroupName"
                @keyup.escape="cancelEditName" />
              <button class="icon-btn confirm-btn" @click="saveGroupName" aria-label="Salva nome">✓</button>
              <button class="icon-btn cancel-btn" @click="cancelEditName" aria-label="Annulla">✕</button>
            </template>
            <template v-else>
              <h1 style="margin:0;">{{ group.name }}</h1>
              <button v-if="isOwner" class="icon-btn pencil-btn" @click="startEditName"
                aria-label="Modifica nome">✏️</button>
            </template>
          </div>

          <div class="editable-field">
            <template v-if="editingDescription">
              <textarea v-model="editDescriptionValue" class="edit-input edit-textarea" maxlength="500" rows="2"
                @keyup.escape="cancelEditDescription" />
              <button class="icon-btn confirm-btn" @click="saveGroupDescription"
                aria-label="Salva descrizione">✓</button>
              <button class="icon-btn cancel-btn" @click="cancelEditDescription" aria-label="Annulla">✕</button>
            </template>
            <template v-else>
              <p style="color:var(--color-on-surface-variant);margin:0.25rem 0 0;">{{ displayDescription }}</p>
              <button v-if="isOwner" class="icon-btn pencil-btn" @click="startEditDescription"
                aria-label="Modifica descrizione">✏️</button>
            </template>
          </div>

          <p style="font-size:0.8rem;color:var(--color-on-surface-variant);margin-top:0.4rem;">ID:
            <code>{{ group.id }}</code>
          </p>
        </div>

        <div style="display:flex;gap:0.5rem;align-items:center;">
          <RouterLink :to="`/groups/${groupId}/wishlists`" class="btn-primary">Visualizza le Wishlists</RouterLink>
          <button v-if="isMember" class="btn-secondary" @click="shareInviteLink"
            :aria-label="copied ? 'Link copiato' : 'Condividi invito'">
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

      <div class="card gift-ledger-card">
        <div class="gift-ledger-header">
          <div>
            <h3 style="margin:0;">Regali e debiti</h3>
            <p style="margin:0.25rem 0 0;color:var(--color-on-surface-variant);">
              Registra chi ha pagato, quanto devono gli altri e quando saldano.
            </p>
          </div>
          <button class="text-trigger-btn" type="button" @click="openGiftModal">
            + Inserisci regalo/debito
          </button>
        </div>

        <p v-if="giftActionMsg && !showGiftModal" style="color:var(--color-primary);margin:0.75rem 0 0;">{{
          giftActionMsg }}
        </p>
        <p v-if="giftActionError && !showGiftModal" class="error-message" style="margin:0.75rem 0 0;">{{ giftActionError
          }}
        </p>

        <div v-if="giftsLoading" style="text-align:center;padding:1.5rem 0;">
          <div class="spinner" />
        </div>
        <p v-else-if="giftsError" class="error-message" style="margin-top:1rem;">{{ giftsError }}</p>
        <p v-else-if="giftBatches.length === 0" class="empty-hint" style="margin-top:1rem;">
          Nessun regalo registrato in questo gruppo.
        </p>
        <div v-else class="gift-batches">
          <article v-for="batch in giftBatches" :key="batch.id" class="gift-batch">
            <div class="gift-batch-header">
              <div>
                <h4 style="margin:0;">{{ batch.title }}</h4>
                <p style="margin:0.25rem 0 0;color:var(--color-on-surface-variant);">
                  Pagato da {{ memberLabel(batch.paidBy) }} il {{ formatDate(batch.paidAt) }}
                </p>
              </div>
              <strong>{{ formatCurrency(batch.totalAmountCents) }}</strong>
            </div>

            <div class="gift-tags">
              <span v-for="gift in batch.giftNames" :key="gift" class="gift-tag">{{ gift }}</span>
            </div>

            <p v-if="batch.note" style="margin:0.75rem 0 0;">{{ batch.note }}</p>

            <p class="gift-meta">
              Beneficiari riservati:
              <span v-for="beneficiary in batch.beneficiaries" :key="beneficiary.id" class="gift-meta-chip">
                {{ memberLabel(beneficiary) }}
              </span>
            </p>

            <table class="gift-table">
              <thead>
                <tr>
                  <th>Persona</th>
                  <th>Importo</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="settlement in batch.settlements" :key="settlement.id">
                  <td>{{ memberLabel(settlement.debtor) }}</td>
                  <td>{{ formatCurrency(settlement.amountCents) }}</td>
                  <td>
                    <span v-if="settlement.settledAt">
                      Saldato il {{ formatDate(settlement.settledAt) }}
                      <template v-if="settlement.settledBy">da {{ memberLabel(settlement.settledBy) }}</template>
                    </span>
                    <span v-else>Da saldare</span>
                  </td>
                  <td>
                    <button class="btn-secondary" type="button" @click="toggleSettlement(batch, settlement)">
                      {{ settlement.settledAt ? 'Riporta da saldare' : 'Segna saldato' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </article>
        </div>
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
                <button v-if="m.userId !== authStore.user?.id" class="remove-btn"
                  @click="handleRemove(m)">Rimuovi</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;gap:0.75rem;">
        <button class="btn-secondary" @click="handleLeave">Lascia gruppo</button>
        <button v-if="isOwner" class="btn-danger" style="padding:0.5rem 1rem;" @click="handleDeleteGroup">Elimina
          gruppo</button>
      </div>

      <div v-if="isOwner" class="bottom-owner-actions">
        <button class="text-trigger-btn" type="button" @click="openTransferModal">
          Trasferisci proprietà
        </button>
      </div>

      <div v-if="showGiftModal" class="popup-overlay" @click.self="closeGiftModal">
        <div class="popup-card">
          <div class="popup-header">
            <h3 style="margin:0;">Inserisci regalo/debito</h3>
            <button class="icon-btn cancel-btn" type="button" @click="closeGiftModal" aria-label="Chiudi">✕</button>
          </div>

          <p v-if="giftActionMsg" style="color:var(--color-primary);margin:0 0 0.75rem 0;">{{ giftActionMsg }}</p>
          <p v-if="giftActionError" class="error-message" style="margin:0 0 0.75rem 0;">{{ giftActionError }}</p>

          <form class="gift-form" @submit.prevent="createGiftBatch">
            <label class="gift-field">
              <span>Titolo riepilogo</span>
              <input v-model="giftTitle" type="text" maxlength="120" placeholder="Compleanno Anna e Marco" />
            </label>

            <label class="gift-field gift-span-2">
              <span>Regali inclusi</span>
              <textarea v-model="giftNamesText" rows="2" maxlength="600"
                placeholder="Libro, bottiglia di vino, biglietto… separati da virgole o nuove righe" />
            </label>

            <label class="gift-field">
              <span>Pagato da</span>
              <select v-model="giftPaidByUserId">
                <option v-for="m in activeMembers" :key="m.userId" :value="m.userId">
                  {{ memberName(m) }}
                </option>
              </select>
            </label>

            <label class="gift-field">
              <span>Data pagamento</span>
              <input v-model="giftPaidAt" type="date" />
            </label>

            <label class="gift-field">
              <span>Importo totale (€)</span>
              <input v-model="giftTotalAmount" type="number" min="0" step="0.01" inputmode="decimal" />
            </label>

            <label class="gift-field gift-span-2">
              <span>Note</span>
              <textarea v-model="giftNote" rows="2" maxlength="500" placeholder="Dettagli opzionali" />
            </label>

            <div class="gift-span-2 gift-section">
              <p class="gift-section-title">Beneficiari riservati</p>
              <div class="member-pills">
                <label v-for="m in activeMembers" :key="m.userId" class="member-pill"
                  :class="{ 'member-pill-selected': giftBeneficiaryUserIds.includes(m.userId) }">
                  <input v-model="giftBeneficiaryUserIds" type="checkbox" :value="m.userId" />
                  <span>{{ memberName(m) }}</span>
                </label>
              </div>
            </div>

            <div class="gift-span-2 gift-section">
              <div class="gift-section-head">
                <p class="gift-section-title">Quote da saldare</p>
                <p class="gift-section-hint">Le persone selezionate come beneficiarie non compaiono qui.</p>
              </div>
              <div v-if="giftDebtors.length === 0" class="empty-hint">
                Seleziona almeno un beneficiario per mostrare chi deve contribuire.
              </div>
              <div v-else class="gift-debt-grid">
                <label v-for="member in giftDebtors" :key="member.userId" class="gift-debt-row">
                  <span>{{ memberName(member) }}</span>
                  <input v-model="giftSplitDraft[member.userId]" type="number" min="0" step="0.01" inputmode="decimal"
                    placeholder="0,00" />
                </label>
              </div>
            </div>

            <div class="gift-span-2 gift-form-footer">
              <p class="gift-summary">Totale quote: {{ formatCurrency(splitTotalCents) }}</p>
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <button class="btn-secondary" type="button" @click="fillGiftSplitsEqually">Dividi in parti
                  uguali</button>
                <button class="btn-primary" type="submit" :disabled="giftDebtors.length === 0">Registra regalo</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div v-if="showTransferModal" class="popup-overlay" @click.self="closeTransferModal">
        <div class="popup-card popup-card-sm">
          <div class="popup-header">
            <h3 style="margin:0;">Trasferisci proprietà</h3>
            <button class="icon-btn cancel-btn" type="button" @click="closeTransferModal" aria-label="Chiudi">✕</button>
          </div>
          <div class="transfer-container">
            <label for="transfer-owner-search">Cerca nuovo proprietario</label>
            <input id="transfer-owner-search" v-model="transferQuery" class="transfer-search" type="text"
              :placeholder="authStore.isAdmin ? 'Cerca per nome, cognome o email…' : 'Cerca per nome o cognome…'" />
            <ul class="transfer-suggestions">
              <li v-for="m in filteredTransferCandidates" :key="m.userId">
                <button type="button" class="transfer-suggestion-btn" @click="selectTransferCandidate(m)">
                  {{ transferCandidateLabel(m) }}
                </button>
              </li>
            </ul>
            <div style="display:flex;justify-content:flex-end;gap:0.5rem;">
              <button class="btn-secondary" type="button" @click="closeTransferModal">Annulla</button>
              <button class="btn-primary" :disabled="!resolvedTransferUserId"
                @click="handleTransfer">Trasferisci</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import NavBar from '../components/NavBar.vue';
import { groups as groupsApi, ApiError } from '../api/client';
import { useAuthStore } from '../stores/auth';
import { useSettingsStore } from '../stores/settings';
import type { Group, GroupGiftBatch, GroupGiftSettlement, GroupMember } from '../types';
import { useToast } from '../composables/useToast';

type SharePayload = {
  title: string;
  text?: string;
  url: string;
};
const PRINCESS_USER_ID_ENV = (import.meta.env.VITE_PRINCESS_USER_ID ?? '').trim();
const TESTER_USER_IDS_ENV = Array.from(
  new Set(
    (import.meta.env.VITE_TESTER_USER_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  )
);

function hasNativeShare(nav: Navigator): nav is Navigator & { share: (data: SharePayload) => Promise<void> } {
  // Narrow navigator to check Web Share API availability without relying on global lib types
  return (
    'share' in nav && typeof (nav as unknown as { share?: unknown }).share === 'function'
  );
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { showToast } = useToast();

const groupId = route.params['groupId'] as string;

const group = ref<Group | null>(null);
const giftBatches = ref<GroupGiftBatch[]>([]);
const loading = ref(true);
const giftsLoading = ref(true);
const error = ref<string | null>(null);
const giftsError = ref<string | null>(null);
const actionMsg = ref<string | null>(null);
const actionError = ref<string | null>(null);
const giftActionMsg = ref<string | null>(null);
const giftActionError = ref<string | null>(null);
const transferUserId = ref('');
const transferQuery = ref('');
const copied = ref(false);
const giftTitle = ref('');
const giftNamesText = ref('');
const giftNote = ref('');
const giftPaidByUserId = ref('');
const giftPaidAt = ref(todayIso());
const giftTotalAmount = ref('');
const giftBeneficiaryUserIds = ref<string[]>([]);
const giftSplitDraft = ref<Record<string, string>>({});
const showGiftModal = ref(false);
const showTransferModal = ref(false);

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseEuroValue(value: unknown): number {
  const rawValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = rawValue.trim().replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(new Date(dateStr));
}

function memberName(member: GroupMember): string {
  return `${member.user?.givenName ?? ''} ${member.user?.familyName ?? ''}`.trim() || 'Utente senza nome';
}

function memberLabel(user?: { givenName: string | null; familyName: string | null } | null): string {
  if (!user) return 'Sconosciuto';
  return `${user.givenName ?? ''} ${user.familyName ?? ''}`.trim() || 'Utente senza nome';
}

function daysUntilBirthday(dateStr: string): number {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const month = Number.parseInt(parts[1], 10) - 1;
  const day = Number.parseInt(parts[2], 10);
  let next = Date.UTC(today.getFullYear(), month, day);
  if (next < todayUtc) next = Date.UTC(today.getFullYear() + 1, month, day);
  return Math.floor((next - todayUtc) / 86400000);
}

const isOwner = computed(() => group.value?.ownerId === authStore.user?.id);
const activeMembers = computed<GroupMember[]>(() => group.value?.members?.filter((member: GroupMember) => member.removedAt === null) ?? []);
const isMember = computed(() => activeMembers.value.some((member: GroupMember) => member.userId === authStore.user?.id));
const displayDescription = computed(() =>
  group.value?.description || (isOwner.value ? 'Nessuna descrizione' : '')
);
const allBirthdays = computed<Array<{ userId: string; givenName: string | null; familyName: string | null; daysUntil: number }>>(() =>
  activeMembers.value
    .filter((member: GroupMember) => member.user?.birthdate)
    .map((member: GroupMember) => {
      const u = member.user!;
      return {
        userId: member.userId,
        givenName: u.givenName,
        familyName: u.familyName,
        daysUntil: daysUntilBirthday(u.birthdate!),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
);
const transferCandidates = computed(() =>
  activeMembers.value.filter((member: GroupMember) => member.userId !== authStore.user?.id)
);
const giftDebtors = computed(() =>
  activeMembers.value.filter((member: GroupMember) => !giftBeneficiaryUserIds.value.includes(member.userId))
);
const splitTotalCents = computed(() =>
  giftDebtors.value.reduce<number>((sum, member) => sum + parseEuroValue(giftSplitDraft.value[member.userId] ?? ''), 0)
);
const normalizedTransferQuery = computed(() => transferQuery.value.trim().toLowerCase());
const filteredTransferCandidates = computed(() => {
  const query = normalizedTransferQuery.value;
  if (!query) return transferCandidates.value;
  return transferCandidates.value.filter((member: GroupMember) => {
    const label = transferCandidateLabel(member).toLowerCase();
    const givenName = member.user?.givenName?.toLowerCase() ?? '';
    const familyName = member.user?.familyName?.toLowerCase() ?? '';
    const emailMatch = authStore.isAdmin && (member.user?.email?.toLowerCase() ?? '').includes(query);
    return givenName.includes(query) || familyName.includes(query) || emailMatch || label.includes(query);
  });
});
const selectedTransferMember = computed(() => {
  const query = normalizedTransferQuery.value;
  if (!query) return null;

  const selectedById = transferCandidates.value.find((member: GroupMember) => member.userId === transferUserId.value);
  if (!selectedById) return null;

  return transferCandidateLabel(selectedById).toLowerCase() === query ? selectedById : null;
});
const resolvedTransferUserId = computed(() => selectedTransferMember.value?.userId ?? '');

function transferCandidateLabel(member: GroupMember): string {
  const fullName = `${member.user?.givenName ?? ''} ${member.user?.familyName ?? ''}`.trim();
  const email = authStore.isAdmin ? (member.user?.email ?? '') : '';
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
  if (isTester(member)) return '⚙️';
  return '👤';
}

function memberRoleLabel(member: GroupMember): string {
  if (member.userId === group.value?.ownerId) return 'Proprietario';
  if (isPrincess(member)) return 'Principessa';
  if (isTester(member)) return 'Tester';
  return 'Membro';
}

function isPrincess(member: GroupMember): boolean {
  const id = settingsStore.princessUserId || PRINCESS_USER_ID_ENV;
  return Boolean(id) && member.userId === id;
}

function isTester(member: GroupMember): boolean {
  const ids = settingsStore.testerUserIds.length ? settingsStore.testerUserIds : TESTER_USER_IDS_ENV;
  return ids.includes(member.userId);
}

function syncGiftDraft(): void {
  const nextDraft: Record<string, string> = {};
  for (const member of giftDebtors.value) {
    nextDraft[member.userId] = giftSplitDraft.value[member.userId] ?? '';
  }
  giftSplitDraft.value = nextDraft;

  if (!giftPaidByUserId.value && activeMembers.value.length > 0) {
    giftPaidByUserId.value = authStore.user?.id ?? activeMembers.value[0].userId;
  }
}

function openGiftModal(): void {
  giftActionError.value = null;
  giftActionMsg.value = null;
  showGiftModal.value = true;
}

function closeGiftModal(): void {
  showGiftModal.value = false;
}

function openTransferModal(): void {
  actionError.value = null;
  actionMsg.value = null;
  showTransferModal.value = true;
}

function closeTransferModal(): void {
  showTransferModal.value = false;
}

function fillGiftSplitsEqually(): void {
  const total = parseEuroValue(giftTotalAmount.value);
  if (total <= 0) {
    giftActionError.value = 'Inserisci prima un importo totale valido.';
    giftActionMsg.value = null;
    return;
  }
  if (giftDebtors.value.length === 0) {
    giftActionError.value = 'Seleziona almeno un beneficiario per calcolare le quote.';
    giftActionMsg.value = null;
    return;
  }

  const base = Math.floor(total / giftDebtors.value.length);
  let remainder = total - base * giftDebtors.value.length;
  const nextDraft: Record<string, string> = {};

  for (const member of giftDebtors.value) {
    let amount = base;
    if (remainder > 0) {
      amount += 1;
      remainder -= 1;
    }
    nextDraft[member.userId] = (amount / 100).toFixed(2);
  }

  giftSplitDraft.value = nextDraft;
  giftActionError.value = null;
  giftActionMsg.value = 'Quote distribuite in parti uguali.';
}

watch(
  [giftTotalAmount, giftBeneficiaryUserIds],
  () => {
    if (giftDebtors.value.length === 0) {
      giftSplitDraft.value = {};
      return;
    }

    if (parseEuroValue(giftTotalAmount.value) <= 0) {
      giftSplitDraft.value = {};
      return;
    }

    fillGiftSplitsEqually();
  },
  { immediate: true }
);

function buildGiftNames(): string[] {
  return giftNamesText.value
    .split(/[\n,]/)
    .map((giftName: string) => giftName.trim())
    .filter(Boolean);
}

async function loadGiftBatches(): Promise<void> {
  giftsLoading.value = true;
  giftsError.value = null;
  try {
    giftBatches.value = await groupsApi.gifts.list(groupId);
  } catch (err) {
    giftsError.value = err instanceof ApiError ? err.message : 'Errore caricamento regali';
  } finally {
    giftsLoading.value = false;
  }
}

async function createGiftBatch(): Promise<void> {
  giftActionMsg.value = null;
  giftActionError.value = null;

  const title = giftTitle.value.trim();
  const giftNames = buildGiftNames();
  const totalAmountCents = parseEuroValue(giftTotalAmount.value);
  const paidByUserId = giftPaidByUserId.value.trim();
  const beneficiaryUserIds = giftBeneficiaryUserIds.value.filter(Boolean);

  if (title.length < 2) {
    giftActionError.value = 'Inserisci un titolo valido.';
    return;
  }
  if (giftNames.length === 0) {
    giftActionError.value = 'Inserisci almeno un regalo.';
    return;
  }
  if (beneficiaryUserIds.length === 0) {
    giftActionError.value = 'Seleziona almeno un beneficiario.';
    return;
  }
  if (!paidByUserId) {
    giftActionError.value = 'Seleziona chi ha pagato.';
    return;
  }
  if (totalAmountCents <= 0) {
    giftActionError.value = 'Inserisci un importo totale valido.';
    return;
  }

  const settlements = giftDebtors.value.map((member: GroupMember) => ({
    userId: member.userId,
    amountCents: parseEuroValue(giftSplitDraft.value[member.userId] ?? ''),
  }));

  if (settlements.length === 0) {
    giftActionError.value = 'Seleziona almeno un beneficiario diverso dal pagatore.';
    return;
  }

  if (settlements.some((settlement: { userId: string; amountCents: number }) => settlement.amountCents <= 0)) {
    giftActionError.value = 'Ogni quota deve essere maggiore di zero.';
    return;
  }

  const splitSum = settlements.reduce<number>((sum, settlement) => sum + settlement.amountCents, 0);
  if (splitSum !== totalAmountCents) {
    giftActionError.value = 'La somma delle quote deve coincidere con l\'importo totale.';
    return;
  }

  try {
    await groupsApi.gifts.create(groupId, {
      title,
      giftNames,
      note: giftNote.value.trim() || undefined,
      totalAmountCents,
      paidByUserId,
      paidAt: giftPaidAt.value,
      beneficiaryUserIds,
      settlements,
    });

    giftTitle.value = '';
    giftNamesText.value = '';
    giftNote.value = '';
    giftTotalAmount.value = '';
    giftBeneficiaryUserIds.value = [];
    giftSplitDraft.value = {};
    giftPaidByUserId.value = authStore.user?.id ?? giftPaidByUserId.value;
    giftActionMsg.value = 'Regalo registrato.';
    closeGiftModal();
    await loadGiftBatches();
  } catch (err) {
    giftActionError.value = err instanceof ApiError ? err.message : 'Errore durante il salvataggio del regalo';
  }
}

async function toggleSettlement(batch: GroupGiftBatch, settlement: GroupGiftSettlement): Promise<void> {
  try {
    await groupsApi.gifts.updateSettlement(groupId, batch.id, {
      settlementId: settlement.id,
      settled: !settlement.settledAt,
    });
    await loadGiftBatches();
    giftActionMsg.value = settlement.settledAt ? 'Quota riportata da saldare.' : 'Quota segnata come saldata.';
    giftActionError.value = null;
  } catch (err) {
    giftActionError.value = err instanceof ApiError ? err.message : 'Errore durante l\'aggiornamento del saldo';
  }
}

watch(
  () => giftDebtors.value.map((member: GroupMember) => member.userId).join(','),
  () => {
    syncGiftDraft();
  },
  { immediate: true }
);

function buildInviteLink(): string {
  const base = (import.meta.env as { BASE_URL?: string }).BASE_URL ?? '/';
  const url = new URL(base, globalThis.location.origin);
  url.searchParams.set('join', groupId);
  return url.toString();
}

function notifyToast(message: string): void {
  try {
    showToast(message, 'success');
  } catch {
    // ignore toast failures
  }
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
      notifyToast('Link condiviso');
      return;
    }

    await navigator.clipboard.writeText(payload.url);
    copied.value = true;
    notifyToast('Link copiato negli appunti');
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
  giftsLoading.value = true;
  try {
    const [loadedGroup, loadedGiftBatches] = await Promise.all([
      groupsApi.get(groupId),
      groupsApi.gifts.list(groupId),
      settingsStore.fetchSettings(),
    ]);
    group.value = loadedGroup;
    giftBatches.value = loadedGiftBatches;
    giftPaidByUserId.value = authStore.user?.id ?? loadedGroup.ownerId;
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore caricamento gruppo';
  } finally {
    loading.value = false;
    giftsLoading.value = false;
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
    closeTransferModal();
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

.gift-ledger-card {
  margin-bottom: 1.5rem;
}

.text-trigger-btn {
  border: none;
  background: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
  font-family: var(--font-body);
}

.text-trigger-btn:hover {
  opacity: 0.85;
}

.bottom-owner-actions {
  margin-top: 1rem;
}

.popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.popup-card {
  width: min(920px, 100%);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  background: var(--color-surface);
  border-radius: var(--radius-xl, 16px);
  border: 1px solid var(--color-outline-variant, rgba(0, 0, 0, 0.08));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 1rem;
}

.popup-card-sm {
  width: min(560px, 100%);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.gift-ledger-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.gift-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  margin-top: 0.5rem;
  padding: 1rem;
  border: 1px solid var(--color-outline-variant, rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-lg, 12px);
  background: color-mix(in srgb, var(--color-surface) 96%, var(--color-primary) 4%);
}

.gift-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.gift-field input,
.gift-field select,
.gift-field textarea {
  width: 100%;
}

.gift-span-2 {
  grid-column: span 2;
}

.gift-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.gift-section-title {
  margin: 0;
  font-weight: 600;
}

.gift-section-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
}

.gift-section-hint,
.gift-meta,
.gift-summary,
.empty-hint {
  color: var(--color-on-surface-variant);
  margin: 0;
}

.member-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.member-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid var(--color-outline-variant, rgba(0, 0, 0, 0.08));
  background: var(--color-surface-container, rgba(255, 255, 255, 0.7));
  transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
}

.member-pill input[type='checkbox'] {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.member-pill-selected {
  border-color: color-mix(in srgb, var(--color-primary) 60%, var(--color-outline-variant));
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface-container));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 35%, transparent) inset;
}

.member-pill:focus-within {
  outline: 2px solid color-mix(in srgb, var(--color-primary) 55%, transparent);
  outline-offset: 2px;
}

.gift-debt-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.gift-debt-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.gift-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.gift-batches {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.gift-batch {
  padding: 1rem;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-outline-variant, rgba(0, 0, 0, 0.08));
  background: var(--color-surface-container, rgba(255, 255, 255, 0.75));
}

.gift-batch-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.gift-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.75rem;
}

.gift-tag,
.gift-meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-on-surface);
  font-size: 0.875rem;
}

.gift-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.75rem;
}

.gift-table {
  width: 100%;
  margin-top: 0.9rem;
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

  .gift-ledger-header,
  .gift-batch-header,
  .gift-section-head,
  .gift-form-footer,
  .popup-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .gift-form,
  .gift-debt-grid {
    grid-template-columns: 1fr;
  }

  .gift-span-2 {
    grid-column: span 1;
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
