<template>
    <div class="page-container" style="text-align: center; padding-top: 4rem;">
        <div v-if="error" class="card">
            <h2 style="color: var(--color-danger);">Impossibile entrare nel gruppo</h2>
            <p style="color:var(--color-text-muted)">{{ error }}</p>
            <RouterLink to="/groups" class="btn-primary" style="margin-top:1rem;">Torna ai gruppi</RouterLink>
        </div>
        <div v-else class="card">
            <div v-if="loading">
                <div class="spinner" />
                <p style="margin-top:1rem;color:var(--color-text-muted);">Entrando nel gruppo…</p>
            </div>
            <div v-else>
                <p style="color:var(--color-text-muted);">Entrando nel gruppo…</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { groups as groupsApi, ApiError } from '../api/client';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
    const groupId = route.params['groupId'] as string | undefined;
    if (!groupId) {
        error.value = 'ID gruppo non valido';
        loading.value = false;
        return;
    }

    if (!auth.isAuthenticated) {
        // Redirect to login and include redirect back to this join URL
        await router.replace({ name: 'Login', query: { redirect: `/join/${groupId}` } });
        return;
    }

    if (auth.isAuthenticated && auth.needsBirthdate) {
        await router.replace({ name: 'SetupBirthdate', query: { redirect: `/join/${groupId}` } });
        return;
    }

    try {
        await groupsApi.join(groupId);
        await router.replace(`/groups/${groupId}`);
    } catch (err) {
        error.value = err instanceof ApiError ? err.message : 'Errore durante l\'ingresso nel gruppo';
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.page-container {
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 1rem;
}

.card {
    width: 100%;
    max-width: 480px;
    padding: 1.25rem;
}
</style>
