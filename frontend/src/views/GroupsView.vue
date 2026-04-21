<template>
  <NavBar />
  <div class="page-container">
    <div class="page-header">
      <h1 style="margin:0;">I miei gruppi</h1>
      <button class="btn-primary" @click="showCreate = !showCreate">+ Crea gruppo</button>
    </div>

    <!-- Create form -->
    <div v-if="showCreate" class="card" style="margin-bottom:1.5rem;">
      <h3>Crea nuovo gruppo</h3>
      <form @submit.prevent="handleCreate">
        <div class="form-group">
          <label>Nome gruppo *</label>
          <input v-model="createForm.name" type="text" required minlength="2" maxlength="100" />
        </div>
        <div class="form-group">
          <label>Descrizione</label>
          <textarea v-model="createForm.description" rows="2" maxlength="500" />
        </div>
        <p v-if="createError" class="error-message">{{ createError }}</p>
        <div style="display:flex;gap:0.5rem;">
          <button type="submit" class="btn-primary" :disabled="creating">{{ creating ? 'Creazione…' : 'Crea' }}</button>
          <button type="button" class="btn-secondary" @click="showCreate = false">Annulla</button>
        </div>
      </form>
    </div>

    <!-- Join form -->
    <div class="card" style="margin-bottom:1.5rem;">
      <h3>Entra in un gruppo</h3>
      <form @submit.prevent="handleJoin" style="display:flex;gap:0.5rem;">
        <input v-model="joinId" type="text" placeholder="Inserisci ID gruppo" style="flex:1;" />
        <button type="submit" class="btn-primary" :disabled="joining || !joinId.trim()">{{ joining ? 'Entrando…' : 'Entra' }}</button>
      </form>
      <p v-if="joinError" class="error-message" style="margin-top:0.5rem;">{{ joinError }}</p>
    </div>

    <div v-if="loading" style="text-align:center;padding:3rem;"><div class="spinner" /></div>
    <p v-else-if="error" class="error-message">{{ error }}</p>
    <div v-else-if="myGroups.length === 0" class="card" style="text-align:center;color:var(--color-text-muted);">
      <p>Non sei ancora in nessun gruppo.</p>
    </div>
    <div v-else class="groups-grid">
      <RouterLink v-for="group in myGroups" :key="group.id" :to="`/groups/${group.id}`" class="card-link">
        <div class="card group-card">
          <h3 style="margin-bottom:0.25rem;">{{ group.name }}</h3>
          <p v-if="group.description" style="color:var(--color-text-muted);font-size:0.875rem;margin-bottom:0.5rem;">{{ group.description }}</p>
          <p style="font-size:0.8rem;color:var(--color-text-muted);">{{ group.memberCount ?? 0 }} membro{{ (group.memberCount ?? 0) !== 1 ? 'i' : '' }}</p>
          <p style="font-size:0.75rem;color:var(--color-text-muted);margin-top:0.25rem;">ID: <code style="font-size:0.7rem;">{{ group.id }}</code></p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import NavBar from '../components/NavBar.vue';
import { groups as groupsApi, ApiError } from '../api/client';
import type { Group } from '../types';

const myGroups = ref<Group[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const showCreate = ref(false);
const createForm = reactive({ name: '', description: '' });
const createError = ref<string | null>(null);
const creating = ref(false);

const joinId = ref('');
const joining = ref(false);
const joinError = ref<string | null>(null);

onMounted(loadGroups);

async function loadGroups() {
  loading.value = true;
  try {
    myGroups.value = await groupsApi.list();
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : 'Errore nel caricamento dei gruppi';
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  creating.value = true;
  createError.value = null;
  try {
    const group = await groupsApi.create({ name: createForm.name, description: createForm.description || undefined });
    myGroups.value = [group, ...myGroups.value];
    showCreate.value = false;
    Object.assign(createForm, { name: '', description: '' });
  } catch (err) {
    createError.value = err instanceof ApiError ? err.message : 'Errore durante la creazione del gruppo';
  } finally {
    creating.value = false;
  }
}

async function handleJoin() {
  joining.value = true;
  joinError.value = null;
  try {
    await groupsApi.members.join(joinId.value.trim());
    await loadGroups();
    joinId.value = '';
  } catch (err) {
    joinError.value = err instanceof ApiError ? err.message : 'Errore durante l\'ingresso nel gruppo';
  } finally {
    joining.value = false;
  }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.groups-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.card-link { text-decoration: none; }
.group-card { cursor: pointer; height: 100%; }
</style>
