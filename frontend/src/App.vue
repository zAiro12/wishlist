<template>
  <RouterView />
  <output v-if="isBackendBusy" class="backend-busy-indicator" aria-live="polite">
    <span class="backend-busy-spinner" aria-hidden="true" />
    <span>
      {{ backendPendingCount > 1 ? `${backendPendingCount} operazioni in corso` : 'Operazione in corso' }}
    </span>
  </output>
  <InviteModal />
  <ConfirmDialog />
  <ToastContainer />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { backendActivity } from './lib/backend-activity';
import InviteModal from './components/InviteModal.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ToastContainer from './components/ToastContainer.vue';

const isBackendBusy = computed(() => backendActivity.isBusy.value);
const backendPendingCount = computed(() => backendActivity.pendingCount.value);
</script>

<style scoped>
.backend-busy-indicator {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 2100;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.9rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-primary) 32%, transparent);
  background: color-mix(in srgb, var(--color-surface) 92%, var(--color-primary) 8%);
  color: var(--color-on-surface);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(10px);
}

.backend-busy-spinner {
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: backend-spin 0.7s linear infinite;
}

@keyframes backend-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
