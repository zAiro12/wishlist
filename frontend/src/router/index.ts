import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  // Public
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/auth/callback', component: () => import('../views/AuthCallbackView.vue'), meta: { public: true } },
  { path: '/setup-birthdate', component: () => import('../views/SetupBirthdateView.vue'), meta: { requiresAuth: true } },
  { path: '/forbidden', component: () => import('../views/ForbiddenView.vue'), meta: { public: true } },

  // Protected – birthdate bypass
  { path: '/complete-profile', component: () => import('../views/CompleteProfileView.vue'), meta: { requiresAuth: true } },

  // Protected
  { path: '/', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
  { path: '/wishlist', component: () => import('../views/MyWishlistView.vue'), meta: { requiresAuth: true } },
  { path: '/groups', component: () => import('../views/GroupsView.vue'), meta: { requiresAuth: true } },
  { path: '/groups/:groupId', component: () => import('../views/GroupDetailView.vue'), meta: { requiresAuth: true } },
  { path: '/groups/:groupId/wishlists', component: () => import('../views/FriendsWishlistsView.vue'), meta: { requiresAuth: true } },

  // Admin
  { path: '/admin', component: () => import('../views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },

  // Catch-all
  { path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue'), meta: { public: true } },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

let authInitialized = false;

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (!authInitialized) {
    await auth.initFromStorage();
    authInitialized = true;
  }

  const requiresAuth = to.meta['requiresAuth'] === true;

  if (requiresAuth) {
    if (!auth.isAuthenticated) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }

  if (auth.isAuthenticated && to.path !== '/setup-birthdate' && auth.needsBirthdate) {
    return { path: '/setup-birthdate' };
  }

  if (to.meta['requiresAdmin'] && !auth.isAdmin) {
    return { path: '/forbidden' };
  }

  if (auth.isAuthenticated && to.path === '/login') {
    return { path: '/' };
  }

  return true;
});
