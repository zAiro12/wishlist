<template>
    <Transition name="dialog">
        <div v-if="request" class="modal-overlay" @click.self="onCancel">
            <div
                class="modal-card"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="titleId"
                tabindex="-1"
                ref="cardRef"
            >
                <h3 :id="titleId" class="modal-title">{{ request.title ?? 'Conferma' }}</h3>
                <p class="modal-message">{{ request.message ?? 'Sei sicuro?' }}</p>

                <div class="modal-actions">
                    <button class="btn-secondary" @click="onCancel">{{ request.cancelLabel ?? 'Annulla' }}</button>
                    <button class="btn-danger" @click="onConfirm">{{ request.confirmLabel ?? 'Conferma' }}</button>
                </div>
            </div>
        </div>
    </Transition>
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
            setTimeout(() => {
                cardRef.value?.focus();
            }, 0);
        }
    }
);
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
}

.modal-card {
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: calc(var(--radius) * 1.5);
    padding: 1.75rem;
    width: 100%;
    max-width: 420px;
    box-shadow: 0 8px 32px rgb(0 0 0 / 0.18), 0 2px 8px rgb(0 0 0 / 0.08);
}

.modal-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 0.5rem 0;
}

.modal-message {
    color: var(--color-text-muted);
    font-size: 0.925rem;
    line-height: 1.5;
    margin: 0 0 1.5rem 0;
}

.modal-actions {
    display: flex;
    gap: 0.625rem;
    justify-content: flex-end;
}

/* Transition */
.dialog-enter-active,
.dialog-leave-active {
    transition: opacity 180ms ease;
}
.dialog-enter-active .modal-card,
.dialog-leave-active .modal-card {
    transition: transform 180ms ease, opacity 180ms ease;
}
.dialog-enter-from,
.dialog-leave-to {
    opacity: 0;
}
.dialog-enter-from .modal-card {
    transform: scale(0.96) translateY(6px);
    opacity: 0;
}
.dialog-leave-to .modal-card {
    transform: scale(0.96);
    opacity: 0;
}
</style>
