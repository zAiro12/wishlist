<template>
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <RouterLink to="/" class="sidebar-brand">Wishlist</RouterLink>
    </div>

    <nav class="sidebar-nav">
      <RouterLink to="/" class="nav-item" :class="{ active: route.path === '/' }">
        <span class="material-symbols-outlined nav-icon">home</span>
        <span>Home</span>
      </RouterLink>
      <RouterLink to="/wishlist" class="nav-item" :class="{ active: route.path === '/wishlist' }">
        <span class="material-symbols-outlined nav-icon">card_giftcard</span>
        <span>La Wishlist</span>
      </RouterLink>
      <RouterLink to="/groups" class="nav-item" :class="{ active: route.path.startsWith('/groups') }">
        <span class="material-symbols-outlined nav-icon">group</span>
        <span>Gruppi</span>
      </RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-item" :class="{ active: route.path === '/admin' }">
        <span class="material-symbols-outlined nav-icon">admin_panel_settings</span>
        <span>Admin</span>
      </RouterLink>
    </nav>

    <div class="sidebar-cta">
      <button class="cta-btn" @click="$router.push('/wishlist')">
        <span class="material-symbols-outlined">add</span>
        Aggiungi desiderio
      </button>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar">{{ initials }}</div>
        <span class="user-name">{{ displayName }}</span>
      </div>
      <button class="icon-btn" @click="auth.logout()" title="Esci" aria-label="Esci">
        <span class="material-symbols-outlined">logout</span>
      </button>
    </div>
  </aside>

  <!-- Top header -->
  <div class="top-header"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();

const displayName = computed(() => auth.user?.givenName ?? auth.user?.email ?? '');

const initials = computed(() => {
  const g = auth.user?.givenName ?? '';
  const f = auth.user?.familyName ?? '';
  if (g || f) return `${g.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return (auth.user?.email ?? '?').charAt(0).toUpperCase();
});
</script>

<style scoped>
/* ─── Sidebar ─── */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 16rem;
  background: var(--color-surface-container);
  border-radius: 0 var(--radius-2xl) var(--radius-2xl) 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  padding: 1.5rem 0 1rem;
}

.sidebar-header {
  padding: 0 1.25rem 1.5rem;
}

.sidebar-brand {
  font-family: var(--font-headline);
  font-style: italic;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
  text-decoration: none;
}
.sidebar-brand:hover { text-decoration: none; opacity: 0.85; }

/* ─── Nav links ─── */
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.75rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-xl);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-outline);
  transition: background 0.15s, color 0.15s;
}

.nav-item:hover {
  background: var(--color-surface-container-high);
  color: var(--color-primary);
  text-decoration: none;
}

.nav-item.active {
  background: var(--color-surface-container-high);
  color: var(--color-primary);
  font-weight: 700;
}

.nav-item.active .nav-icon {
  font-variation-settings: 'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24;
}

.nav-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

/* ─── CTA button ─── */
.sidebar-cta {
  padding: 1rem 0.75rem;
}

.cta-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-xl);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  font-family: var(--font-body);
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.cta-btn:hover { opacity: 0.9; }

/* ─── Footer ─── */
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem 0;
  border-top: 1px solid var(--color-surface-container-highest);
  margin-top: auto;
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-full);
  background: var(--color-primary-container);
  color: var(--color-on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.user-name {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-on-surface-variant);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-btn {
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);
  padding: 0.4rem;
  color: var(--color-outline);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.icon-btn:hover {
  background: var(--color-surface-container-high);
  color: var(--color-primary);
}

/* ─── Top header ─── */
.top-header {
  position: fixed;
  top: 0;
  left: 16rem;
  right: 0;
  height: 64px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(251, 249, 244, 0.8);
  border-bottom: 1px solid rgba(192, 200, 199, 0.15);
  z-index: 99;
}
</style>

