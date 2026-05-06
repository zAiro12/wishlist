<template>
  <NavBar />
  <div class="page-container with-sidebar">

    <!-- Guest: invite to login -->
    <div v-if="!auth.user" class="guest-hero">
      <div class="guest-hero-icon">
        <span class="material-symbols-outlined">card_giftcard</span>
      </div>
      <h1 class="guest-title">Benvenuto su <span class="serif-italic">Wishlist</span></h1>
      <p class="guest-subtitle">
        Crea la tua lista dei desideri, condividila con gli amici e scopri cosa regalare a chi ami.
      </p>
      <RouterLink to="/login" class="btn-primary">
        <span class="material-symbols-outlined">login</span>
        Accedi per iniziare
      </RouterLink>
      <p class="guest-hint">Accesso con Google, GitHub o Microsoft — nessuna password.</p>
    </div>
    <template v-else>
      <!-- Authenticated: existing content -->
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
    </template>

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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.card-link { text-decoration: none; display: flex; }
.dashboard-card { text-align: center; cursor: pointer; flex: 1; }
.icon { font-size: 2.5rem; }
.dashboard-card h3 { margin-top: 0.5rem; }
.dashboard-card p { color: var(--color-on-surface-variant); font-size: 0.875rem; }

@media (max-width: 767px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.guest-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1rem 2rem;
  gap: 1.25rem;
  max-width: 480px;
  margin: 0 auto;
}

.guest-hero-icon {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-2xl);
  background: var(--color-primary-fixed);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.guest-hero-icon .material-symbols-outlined {
  font-size: 2rem;
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48;
}

.guest-title {
  font-family: var(--font-headline);
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 400;
  color: var(--color-on-background);
  line-height: 1.2;
}

.serif-italic {
  font-family: var(--font-headline);
  font-style: italic;
  color: var(--color-primary);
}

.guest-subtitle {
  font-size: 1rem;
  color: var(--color-on-surface-variant);
  line-height: 1.6;
  max-width: 36ch;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 0.9375rem;
  padding: 0.875rem 2rem;
  border-radius: var(--radius-xl);
  text-decoration: none;
  transition: opacity 0.15s;
  min-height: 52px;
}
.btn-primary:hover { opacity: 0.9; text-decoration: none; }

.guest-hint {
  font-size: 0.8125rem;
  color: var(--color-outline);
  margin-top: -0.25rem;
}

@media (max-width: 767px) {
  .guest-hero { padding: 2rem 0 1rem; }
}
</style>
