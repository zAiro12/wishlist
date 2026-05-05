import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Router } from 'vue-router';
import { groups as groupsApi } from '../api/client';

export const useInviteStore = defineStore('invite', () => {
  const visible = ref(false);
  const loading = ref(false);
  const preview = ref<{
    id: string;
    name: string;
    description: string | null;
    owner: { id: string; givenName: string | null; familyName: string | null } | null;
    memberCount: number;
    isMember: boolean;
  } | null>(null);
  const error = ref<string | null>(null);
  let currentGroupId: string | null = null;

  function showFor(groupId: string) {
    currentGroupId = groupId;
    visible.value = true;
  }

  function hide() {
    visible.value = false;
    preview.value = null;
    error.value = null;
    currentGroupId = null;
  }

  async function loadPreview(groupId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const p = await groupsApi.invitePreview(groupId);
      preview.value = p;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Errore caricamento anteprima';
      preview.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function confirmJoin(router: Router): Promise<void> {
    if (!currentGroupId) return;
    const targetGroupId = currentGroupId; // capture before any async gap or hide()
    loading.value = true;
    error.value = null; // reset errore precedente
    try {
      await groupsApi.join(targetGroupId);
      if (!visible.value || currentGroupId !== targetGroupId) return;
      hide();
      await router.replace(`/groups/${targetGroupId}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Errore durante l'ingresso nel gruppo";
    } finally {
      loading.value = false;
    }
  }

  return { visible, loading, preview, error, showFor, hide, loadPreview, confirmJoin };
});
