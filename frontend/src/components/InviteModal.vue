<template>
    <div v-if="store.visible" class="modal-overlay" @click.self="onCancel">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" ref="cardRef">
            <h3 :id="titleId">{{ store.preview?.name ?? 'Gruppo' }}</h3>
            <p v-if="store.preview?.description" style="color:var(--color-on-surface-variant)">{{ store.preview?.description }}
            </p>
            <p style="margin-top:1rem;">Vuoi entrare in questo gruppo?</p>

            <p v-if="store.error" class="error-message">{{ store.error }}</p>

            <div style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;">
                <button class="btn-secondary" @click="onCancel">Annulla</button>
                <button class="btn-primary" :disabled="store.loading" @click="onConfirm">{{ store.loading ? 'Entrando…' :
                    'Entra nel gruppo' }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter, type LocationQueryRaw } from 'vue-router';
import { useInviteStore } from '../stores/invite';

const store = useInviteStore();
const router = useRouter();
const cardRef = ref<HTMLDivElement | null>(null);
const titleId = `invite-modal-title`;

function removeJoinQueryAndReplace(): void {
    const route = router.currentRoute.value;
    const raw: LocationQueryRaw = {};
    for (const [k, v] of Object.entries(route.query)) {
        if (k === 'join') continue;
        if (v === undefined) continue;
        if (Array.isArray(v)) raw[k] = v as string[];
        else raw[k] = String(v);
    }
    router.replace({ path: route.path, query: raw }).catch((e) => { void e; });
}

function onCancel(): void {
    store.hide();
    // Remove the `join` query param but otherwise keep the current path
    removeJoinQueryAndReplace();
}

async function onConfirm(): Promise<void> {
    await store.confirmJoin(router);
}

function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
        onCancel();
    }
}

onMounted(() => {
    window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
    window.removeEventListener('keydown', onKey);
});

watch(
    () => store.visible,
    (v) => {
        if (v) {
            setTimeout(() => { cardRef.value?.focus(); }, 0);
        }
    }
);
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(27, 28, 25, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal-card {
    background: var(--color-surface-container-lowest);
    padding: 1.75rem;
    border-radius: var(--radius-2xl);
    width: 100%;
    max-width: 520px;
    border: none;
    box-shadow: 0px 12px 32px rgba(27, 28, 25, 0.1);
    outline: 1px solid rgba(192, 200, 199, 0.15);
}
</style>
