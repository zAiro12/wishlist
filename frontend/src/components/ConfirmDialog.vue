<template>
    <div v-if="state.request" class="modal-overlay" @click.self="onCancel">
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
    () => state.request.value,
    (req) => {
        if (import.meta.env.DEV) console.log('[confirm][ConfirmDialog] watcher request changed:', req);
        if (req) {
            if (import.meta.env.DEV) console.log('[confirm][ConfirmDialog] using request to populate labels');
            title.value = req.title ?? 'Confirm';
            // if message missing, log fallback usage
            if (!req.message && import.meta.env.DEV) console.warn('[confirm][ConfirmDialog] request.message is empty, using fallback');
            message.value = req.message ?? 'Are you sure?';
            confirmLabel.value = req.confirmLabel ?? 'Confirm';
            cancelLabel.value = req.cancelLabel ?? 'Cancel';
        } else {
            if (import.meta.env.DEV) console.log('[confirm][ConfirmDialog] request is null; dialog should not render');
        }
    }
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
    if (import.meta.env.DEV) console.log('[confirm][ConfirmDialog] mounted, current request:', state.request.value);
    window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
    window.removeEventListener('keydown', onKey);
});

watch(
    () => state.request.value,
    (r) => {
        if (r) {
            if (import.meta.env.DEV) console.log('[confirm][ConfirmDialog] request non-null, focusing card');
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
