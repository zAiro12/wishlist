<template>
  <NavBar />
  <div class="page-container">
    <div class="page-header">
      <h1 style="margin:0;">My Wishlist</h1>
      <button class="btn-primary" @click="openCreate">+ Add Item</button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="card" style="margin-bottom:1.5rem;">
      <h3>{{ editItem ? 'Edit Item' : 'New Item' }}</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label>Title *</label>
          <input v-model="form.title" type="text" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="form.description" rows="3" />
        </div>
        <div class="form-group">
          <label>Link (URL)</label>
          <input v-model="form.url" type="url" placeholder="https://…" />
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select v-model.number="form.priority">
            <option v-for="(l, i) in PRIORITY_LABELS" :key="i" :value="i">{{ l }}</option>
          </select>
        </div>
        <p v-if="formError" class="error-message">{{ formError }}</p>
        <div style="display:flex;gap:0.5rem;">
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="btn-secondary" @click="showForm = false">Cancel</button>
        </div>
      </form>
    </div>

    <!-- List -->
    <div v-if="loading" style="text-align:center;padding:3rem;">
      <div class="spinner" />
    </div>
    <p v-else-if="error" class="error-message">{{ error }}</p>
    <div v-else-if="items.length === 0" class="card" style="text-align:center;color:var(--color-text-muted);">
      <p>Your wishlist is empty. Add your first item!</p>
    </div>
    <div v-else style="display:flex;flex-direction:column;gap:0.75rem;">
      <div v-for="item in items" :key="item.id" class="card item-row">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
            <span style="font-weight:600;">{{ item.title }}</span>
            <StatusBadge :status="item.status?.status ?? 'DISPONIBILE'" />
            <span v-if="item.priority > 0" style="font-size:0.75rem;color:var(--color-text-muted);">
              [{{ PRIORITY_LABELS[item.priority] }}]
            </span>
          </div>
          <p v-if="item.description" style="color:var(--color-text-muted);font-size:0.875rem;">{{ item.description }}
          </p>
          <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" style="font-size:0.875rem;">View
            Link</a>
        </div>
        <div style="display:flex;gap:0.5rem;margin-left:1rem;">
          <button class="btn-secondary" style="font-size:0.8rem;" @click="openEdit(item)">Edit</button>
          <button class="btn-danger" style="font-size:0.8rem;padding:0.3rem 0.75rem;"
            @click="handleDelete(item)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import NavBar from '../components/NavBar.vue';
import StatusBadge from '../components/StatusBadge.vue';
import { wishlist as wishlistApi, ApiError } from '../api/client';
import type { WishlistItem } from '../types';
import { useToast } from '../composables/useToast'

const PRIORITY_LABELS = ['Low', 'Normal', 'Medium', 'High', 'Very High', 'Must Have'];

const items = ref<WishlistItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const { showToast } = useToast()

const showForm = ref(false);
const editItem = ref<WishlistItem | null>(null);
const form = reactive({ title: '', description: '', url: '', priority: 0 });
const formError = ref<string | null>(null);
const saving = ref(false);

onMounted(loadItems);

async function loadItems() {
  loading.value = true;
  try {
    items.value = await wishlistApi.list();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to load items';
    showToast(error.value ?? 'Errore caricamento', 'error')
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editItem.value = null;
  Object.assign(form, { title: '', description: '', url: '', priority: 0 });
  formError.value = null;
  showForm.value = true;
}

function openEdit(item: WishlistItem) {
  editItem.value = item;
  Object.assign(form, { title: item.title, description: item.description ?? '', url: item.url ?? '', priority: item.priority });
  formError.value = null;
  showForm.value = true;
}

async function handleSubmit() {
  saving.value = true;
  formError.value = null;
  try {
    const data = { title: form.title, description: form.description || undefined, url: form.url || undefined, priority: form.priority };
    if (editItem.value) {
      const updated = await wishlistApi.update(editItem.value.id, data);
      items.value = items.value.map((i) => (i.id === editItem.value!.id ? updated : i));
      showToast('Item aggiornato', 'success')
    } else {
      const created = await wishlistApi.create(data);
      items.value = [created, ...items.value];
      showToast('Item aggiunto alla wishlist', 'success')
    }
    showForm.value = false;
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : 'Failed to save item';
    showToast(formError.value ?? 'Errore salvataggio', 'error')
  } finally {
    saving.value = false;
  }
}

import openConfirm from '../composables/useConfirm';

async function handleDelete(item: WishlistItem) {
  const ok = await openConfirm({ message: `Delete "${item.title}"?`, confirmLabel: 'Delete', cancelLabel: 'Annulla' });
  if (!ok) return;
  try {
    await wishlistApi.delete(item.id);
    items.value = items.value.filter((i) => i.id !== item.id);
    showToast('Item eliminato', 'info')
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Failed to delete item';
    showToast(error.value ?? 'Errore eliminazione', 'error')
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
</style>
