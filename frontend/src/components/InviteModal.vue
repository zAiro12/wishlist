<template>
    <div v-if="store.visible" class="modal-overlay" @click.self="onCancel">
        <div class="modal-card">
            <h3>{{ store.preview?.name ?? 'Group' }}</h3>
            <p v-if="store.preview?.description" style="color:var(--color-text-muted)">{{ store.preview?.description }}
            </p>
            <p style="margin-top:1rem;">Vuoi entrare?</p>

            <p v-if="store.error" class="error-message">{{ store.error }}</p>

            <div style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;">
                <button class="btn-secondary" @click="onCancel">Annulla</button>
                <button class="btn-primary" :disabled="store.loading" @click="onConfirm">{{ store.loading ? 'Joining…' :
                    'Entra' }}</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useInviteStore } from '../stores/invite';

const store = useInviteStore();
const router = useRouter();

function onCancel(): void {
    store.hide();
    router.replace('/groups').catch(() => { });
}

async function onConfirm(): Promise<void> {
    await store.confirmJoin(router);
}
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
