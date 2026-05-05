<template>
  <!-- Mobile overlay -->
  <div v-if="isMobileMenuOpen" class="overlay" aria-hidden="true" @click="closeMenu"></div>

  <!-- Sidebar -->
  <aside class="sidebar" :class="{ open: isMobileMenuOpen }">
    <div class="sidebar-header">
      <RouterLink to="/" class="sidebar-brand" @click="closeMenu">Wishlist</RouterLink>
      <button class="close-btn icon-btn" aria-label="Chiudi menu" @click="closeMenu">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <nav class="sidebar-nav">
      <RouterLink to="/" class="nav-item" :class="{ active: route.path === '/' }" @click="closeMenu">
        <span class="material-symbols-outlined nav-icon">home</span>
        <span>Home</span>
      </RouterLink>
      <RouterLink to="/wishlist" class="nav-item" :class="{ active: route.path === '/wishlist' }" @click="closeMenu">
        <span class="material-symbols-outlined nav-icon">card_giftcard</span>
        <span>La Wishlist</span>
      </RouterLink>
      <RouterLink to="/groups" class="nav-item" :class="{ active: route.path.startsWith('/groups') }" @click="closeMenu">
        <span class="material-symbols-outlined nav-icon">group</span>
        <span>Gruppi</span>
      </RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/admin" class="nav-item" :class="{ active: route.path === '/admin' }" @click="closeMenu">
        <span class="material-symbols-outlined nav-icon">admin_panel_settings</span>
        <span>Admin</span>
      </RouterLink>
    </nav>

    <div class="sidebar-cta">
      <button class="cta-btn" @click="navigateToWishlist">
        <span class="material-symbols-outlined">add</span>
        Aggiungi desiderio
      </button>
    </div>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="user-avatar">{{ initials }}</div>
        <span class="user-name">{{ displayName }}</span>
      </div>
      <button class="icon-btn" title="Esci" aria-label="Esci" @click="auth.logout()">
        <span class="material-symbols-outlined">logout</span>
      </button>
    </div>
  </aside>

  <!-- Top header -->
  <div class="top-header">
    <button class="hamburger-btn icon-btn" aria-label="Apri menu" @click="isMobileMenuOpen = true">
      <span class="material-symbols-outlined">menu</span>
    </button>
    <span class="header-brand">Wishlist</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const isMobileMenuOpen = ref(false);

const displayName = computed(() => auth.user?.givenName ?? auth.user?.email ?? '');

const initials = computed(() => {
  const g = auth.user?.givenName ?? '';
  const f = auth.user?.familyName ?? '';
  if (g || f) return `${g.charAt(0)}${f.charAt(0)}`.toUpperCase();
  return (auth.user?.email ?? '?').charAt(0).toUpperCase();
});

function closeMenu() {
  isMobileMenuOpen.value = false;
}

function navigateToWishlist() {
  router.push('/wishlist');
  closeMenu();
}
</script>

<style scoped>
/* ─── Sidebar ─── */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;   /* fallback for older browsers */
  height: 100dvh;  /* fix iOS Safari: dynamic viewport height excludes browser chrome */
  width: 16rem;
  padding-bottom: env(safe-area-inset-bottom, 1rem); /* clears iPhone home indicator */
  background: var(--color-surface-container);
  border-radius: 0 var(--radius-2xl) var(--radius-2xl) 0;
  display: flex;
  flex-direction: column;
  z-index: 100;
  padding: 1.5rem 0 1rem;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  min-height: 44px;
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
  flex-shrink: 0;
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

/* ─── Close button (mobile only) ─── */
.close-btn {
  display: none;
}

/* ─── Top header ─── */
.top-header {
  position: fixed;
  top: 0;
  left: 16rem;
  right: 0;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 1rem;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background: rgba(251, 249, 244, 0.8);
  border-bottom: 1px solid rgba(192, 200, 199, 0.15);
  z-index: 99;
}

/* ─── Hamburger button (hidden on desktop) ─── */
.hamburger-btn {
  display: none;
}

/* ─── Header brand text (hidden on desktop, shown on mobile) ─── */
.header-brand {
  display: none;
  font-family: var(--font-headline);
  font-style: italic;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
}

/* ─── Mobile overlay ─── */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 150;
}

/* ─── Mobile breakpoint ─── */
@media (max-width: 767px) {
  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 200;
    visibility: hidden;
    pointer-events: none;
  }

  .sidebar.open {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
  }

  .close-btn {
    display: flex;
  }

  .top-header {
    left: 0;
    width: 100%;
  }

  .hamburger-btn {
    display: flex;
  }

  .header-brand {
    display: block;
  }
}
</style>

