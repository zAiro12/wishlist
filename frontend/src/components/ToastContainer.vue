<template>
  <div :class="['toast-root', { 'no-motion': noMotion }]" role="status">
    <TransitionGroup name="toast" tag="div">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="t.variant"
      >
        <div class="toast-message">{{ t.message }}</div>
        <button class="toast-dismiss" @click="dismissToast(t.id)" aria-label="Chiudi">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from '../composables/useToast'

const { toasts, dismissToast } = useToast()

const noMotion = ref(false)

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    try {
      noMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      noMotion.value = false
    }
  }
})

// use composable's `dismissToast` directly in template
</script>

<style scoped>
.toast-root {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  pointer-events: none;
}

.toast-item {
  min-width: 260px;
  max-width: 380px;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.12);
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toast-item .toast-message {
  font-size: 0.95rem;
}

.toast-dismiss {
  margin-left: auto;
  background: transparent;
  border: none;
  border-radius: 9999px;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.6;
}
.toast-dismiss:hover { opacity: 1; }

/* Variant colors */
.success { background: #dcfce7; color: #166534; }
.error   { background: #fee2e2; color: #991b1b; }
.warning { background: #fef9c3; color: #854d0e; }
.info    { background: #e0e7ff; color: #3730a3; }

/* Transition */
.toast-enter-active, .toast-leave-active {
  transition: transform 250ms ease, opacity 250ms ease;
}
.toast-enter-from { transform: translateY(8px); opacity: 0; }
.toast-enter-to { transform: translateY(0); opacity: 1; }
.toast-leave-from { opacity: 1; }
.toast-leave-to { opacity: 0; }

.no-motion .toast-enter-active, .no-motion .toast-leave-active {
  transition: none !important;
}

</style>
