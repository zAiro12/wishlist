<template>
    <div v-if="state.visible && state.options" class="modal-overlay" @click.self="onCancel">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" ref="cardRef">
            <h3 :id="titleId">{{ title }}</h3>
            <p style="color:var(--color-text-muted); margin-top:0.5rem;">{{ message }}</p>

            <div style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;">
                <button class="btn-secondary" @click="onCancel">{{ cancelLabel }}</button>
                <button class="btn-danger" @click="onConfirm">{{ confirmLabel }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useConfirmState, confirmResolve } from '../composables/useConfirm';

const state = useConfirmState();
const cardRef = ref<HTMLElement | null>(null);
const titleId = 'confirm-dialog-title';

const title = ref<string>('Confirm');
const message = ref<string>('Are you sure?');
const confirmLabel = ref<string>('Confirm');
const cancelLabel = ref<string>('Cancel');

watch(
    () => state.options.value,
    (opts) => {
        if (opts) {
            title.value = opts.title ?? 'Confirm';
            message.value = opts.message;
            confirmLabel.value = opts.confirmLabel ?? 'Confirm';
            cancelLabel.value = opts.cancelLabel ?? 'Cancel';
        }
    },
    { immediate: true }
);

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
    () => state.visible.value,
    (v) => {
        if (v) setTimeout(() => { cardRef.value?.focus(); }, 0);
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
