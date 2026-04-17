<template>
    <div v-if="request" class="modal-overlay" @click.self="onCancel">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" ref="cardRef">
            <h3 :id="titleId">{{ request.title ?? 'Confirm' }}</h3>
            <p style="color:var(--color-text-muted); margin-top:0.5rem;">{{ request.message ?? 'Are you sure?' }}</p>

            <div style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;">
                <button class="btn-secondary" @click="onCancel">{{ request.cancelLabel ?? 'Cancel' }}</button>
                <button class="btn-danger" @click="onConfirm">{{ request.confirmLabel ?? 'Confirm' }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useConfirmState, confirmResolve } from '../composables/useConfirm';

const state = useConfirmState();
const request = computed(() => state.request.value);
const cardRef = ref<HTMLElement | null>(null);
const titleId = 'confirm-dialog-title';

function onConfirm(): void {
    confirmResolve(true);
}

function onCancel(): void {
    confirmResolve(false);
}

function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') onCancel();
}

onMounted(() => {
    window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
    window.removeEventListener('keydown', onKey);
});

watch(
    () => request.value,
    (r) => {
        if (r) {
            setTimeout(() => { cardRef.value?.focus(); }, 0);
        }
    }
);
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal-card {
    background: white;
    padding: 1.25rem;
    border-radius: 8px;
    width: 100%;
    max-width: 520px;
}
</style>
