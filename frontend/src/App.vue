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
      // eslint-disable-next-line no-undef
      (window as any).__confirmDebug = state;
    }
  }
});
</script>
