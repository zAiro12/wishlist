<template>
  <nav>
    <div style="font-weight: 700; font-size: 1.1rem;">
      <RouterLink to="/" style="color: var(--color-text); text-decoration: none;">🎁 Wishlist</RouterLink>
    </div>
    <div class="nav-links">
      <RouterLink to="/wishlist">My Wishlist</RouterLink>
      <RouterLink to="/groups">Groups</RouterLink>
      <RouterLink v-if="auth.isAdmin" to="/admin">Admin</RouterLink>
      <span style="color: var(--color-text-muted); font-size: 0.875rem;">
        {{ auth.user?.givenName ?? auth.user?.email }}
      </span>
      <button
        v-if="!auth.user"
        class="btn-primary"
        style="font-size: 0.8rem; padding: 0.3rem 0.75rem;"
        @click="$router.push('/login')"
      >
        Login
      </button>
      <button
        v-else
        class="btn-secondary"
        style="font-size: 0.8rem; padding: 0.3rem 0.75rem;"
        @click="auth.logout()"
      >
        Logout
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>
