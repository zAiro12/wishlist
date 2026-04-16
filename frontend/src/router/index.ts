import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  // Public
  { name: 'Login', path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { name: 'AuthCallback', path: '/auth/callback', component: () => import('../views/AuthCallbackView.vue'), meta: { public: true } },
  { name: 'SetupBirthdate', path: '/setup-birthdate', component: () => import('../views/SetupBirthdateView.vue'), meta: { requiresAuth: true } },
  { name: 'Forbidden', path: '/forbidden', component: () => import('../views/ForbiddenView.vue'), meta: { public: true } },

  // Protected – birthdate bypass
  { name: 'CompleteProfile', path: '/complete-profile', component: () => import('../views/CompleteProfileView.vue'), meta: { requiresAuth: true } },

  // Protected
  { name: 'Home', path: '/', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
  { name: 'MyWishlist', path: '/wishlist', component: () => import('../views/MyWishlistView.vue'), meta: { requiresAuth: true } },
  { name: 'Groups', path: '/groups', component: () => import('../views/GroupsView.vue'), meta: { requiresAuth: true } },
  { name: 'GroupDetail', path: '/groups/:groupId', component: () => import('../views/GroupDetailView.vue'), meta: { requiresAuth: true } },
  { name: 'JoinGroup', path: '/join/:groupId', component: () => import('../views/JoinGroupView.vue'), meta: { requiresAuth: true } },
  { name: 'FriendsWishlists', path: '/groups/:groupId/wishlists', component: () => import('../views/FriendsWishlistsView.vue'), meta: { requiresAuth: true } },

  // Admin
  { name: 'Admin', path: '/admin', component: () => import('../views/AdminView.vue'), meta: { requiresAuth: true, requiresAdmin: true } },

  // Catch-all
  { name: 'NotFound', path: '/:pathMatch(.*)*', component: () => import('../views/NotFoundView.vue'), meta: { public: true } },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(async (to) => {
  // Let the callback page handle its own token extraction
  if (to.name === 'AuthCallback') return true;

  const auth = useAuthStore();

  // Ensure we attempt to fetch the session exactly once.
  if (!auth.initialized) {
    // Fetch the current user (silent on failure). fetchUser sets initialized.
    await auth.fetchUser().catch(() => {});
  }

  // Explicitly allow public routes by name (ensure AuthCallback is never intercepted)
  const publicRoutes = ['Login', 'AuthCallback', 'Home'];
  if (publicRoutes.includes(to.name as string)) return true;

  const requiresAuth = to.meta['requiresAuth'] === true;
  // Only check auth for routes that explicitly require it
  if (!requiresAuth) return true;

  if (!auth.isAuthenticated) {
    // Preserve the intended destination as a `redirect` query param so the
    // login flow can forward the user back after authenticating.
    return { name: 'Login', query: { redirect: to.fullPath } };
  }

  if (auth.isAuthenticated && to.path !== '/setup-birthdate' && auth.needsBirthdate) {
    return { name: 'SetupBirthdate' };
  }

  if (to.meta['requiresAdmin'] && !auth.isAdmin) {
    return { name: 'Forbidden' };
  }

  if (auth.isAuthenticated && to.name === 'Login') {
    // If login page included a redirect param, honour it after successful auth.
    const redirect = to.query['redirect'] as string | undefined;
    if (redirect && typeof redirect === 'string') return { path: redirect };
    return { name: 'Home' };
  }

  return true;
});
