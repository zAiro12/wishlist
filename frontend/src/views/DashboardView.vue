<template>
  <NavBar />
  <div class="page-container">
    <h1>Benvenuto, {{ auth.user?.givenName ?? auth.user?.email }}!</h1>

    <div class="grid">
      <RouterLink to="/wishlist" class="card-link">
        <div class="card dashboard-card">
          <div class="icon">🎁</div>
          <h3>La Wishlist</h3>
          <p>Gestisci gli elementi della tua Wishlist</p>
        </div>
      </RouterLink>

      <RouterLink to="/groups" class="card-link">
        <div class="card dashboard-card">
          <div class="icon">👥</div>
          <h3>Gruppi</h3>
          <p>Entra o gestisci i gruppi di amici</p>
        </div>
      </RouterLink>

      <RouterLink v-if="auth.isAdmin" to="/admin" class="card-link">
        <div class="card dashboard-card">
          <div class="icon">🛠</div>
          <h3>Admin</h3>
          <p>Gestisci utenti e dati</p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '../components/NavBar.vue';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}
.card-link { text-decoration: none; }
.dashboard-card { text-align: center; cursor: pointer; }
.icon { font-size: 2.5rem; }
.dashboard-card h3 { margin-top: 0.5rem; }
.dashboard-card p { color: var(--color-text-muted); font-size: 0.875rem; }
</style>
