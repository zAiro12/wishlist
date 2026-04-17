<script setup lang="ts">
</script>

<template>
  <RouterView />
  <InviteModal />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import InviteModal from './components/InviteModal.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { onMounted } from 'vue';
import { useConfirmState } from './composables/useConfirm';

onMounted(() => {
  if (import.meta.env.DEV) {
    const state = useConfirmState();
    console.log('[app] mounted - confirm state at startup:', state.request?.value ?? null);
    if (typeof window !== 'undefined') {
      const w = window as unknown as { __confirmDebug?: unknown; [k: string]: unknown };
      w.__confirmDebug = state;
    }
  }
});
</script>
