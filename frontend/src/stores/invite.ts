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
      error.value = err instanceof Error ? err.message : 'Failed to load preview';
      preview.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function confirmJoin(router: Router): Promise<void> {
    if (!currentGroupId) return;
    loading.value = true;
    try {
      await groupsApi.join(currentGroupId);
      hide();
      await router.replace(`/groups/${currentGroupId}`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to join group';
    } finally {
      loading.value = false;
    }
  }

  return { visible, loading, preview, error, showFor, hide, loadPreview, confirmJoin };
});
