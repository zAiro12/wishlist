import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useInviteStore } from '../stores/invite';

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
  // Diagnostic log for route guard decisions
  try {
    console.info('router.beforeEach:', { to: to.fullPath, name: to.name });
  } catch (e) { void e; }

  // Let the callback page handle its own token extraction
  if (to.name === 'AuthCallback') return true;

  const auth = useAuthStore();
  const invite = useInviteStore();

  // Ensure we attempt to fetch the session exactly once.
  if (!auth.initialized) {
    // Fetch the current user (silent on failure). fetchUser sets initialized.
    await auth.fetchUser().catch(() => {});
  }

  // If there's a join query param on the incoming route, handle invite flow.
  const joinParam = (to.query['join'] as string | undefined) ?? undefined;
  if (joinParam) {
    // If not authenticated, redirect to login and preserve the full path (includes ?join=)
    if (!auth.isAuthenticated) {
      console.info('Guard: unauthenticated and join param, redirect to Login', { joinParam, redirect: to.fullPath });
      return { name: 'Login', query: { redirect: to.fullPath } };
    }

    // If authenticated but needs birthdate, redirect to setup and preserve redirect
    if (auth.isAuthenticated && auth.needsBirthdate) {
      const safeRedirect = to.fullPath === '/setup-birthdate' ? '/' : to.fullPath;
      console.info('Guard: authenticated but needs birthdate -> redirect SetupBirthdate', {
        redirect: safeRedirect,
        initialized: auth.initialized,
        needsBirthdate: auth.needsBirthdate,
        birthdate: auth.user?.birthdate,
        birthdateConfirmed: auth.user?.birthdateConfirmed,
        user: auth.user,
      });
      return { name: 'SetupBirthdate', query: { redirect: safeRedirect } };
    }

    // Authenticated and ready: load preview and either redirect to group or show modal
    try {
      await invite.loadPreview(joinParam);
      if (invite.preview && invite.preview.isMember) {
        return { path: `/groups/${joinParam}` };
      }
      invite.showFor(joinParam);
      // Allow navigation to continue (e.g., Home) while modal is shown
      return true;
    } catch {
      // On preview load error, allow navigation and let modal/store show error
      return true;
    }
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
    console.info('Guard: not authenticated for protected route, redirect to Login', { to: to.fullPath });
    return { name: 'Login', query: { redirect: to.fullPath } };
  }
  // If the user is authenticated and no longer needs a birthdate, don't allow
  // them to be redirected back to the setup page. If they somehow land on
  // `/setup-birthdate` after completing it, forward them home immediately.
  if (auth.isAuthenticated && !auth.needsBirthdate && to.path === '/setup-birthdate') {
    console.info('Guard: user completed birthdate but is on setup route — redirecting Home', { user: auth.user });
    return { name: 'Home' };
  }

  if (auth.isAuthenticated && to.path !== '/setup-birthdate' && auth.needsBirthdate) {
    console.info('Guard: authenticated but still needs birthdate -> redirect SetupBirthdate', {
      initialized: auth.initialized,
      needsBirthdate: auth.needsBirthdate,
      birthdate: auth.user?.birthdate,
      birthdateConfirmed: auth.user?.birthdateConfirmed,
      user: auth.user,
    });
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
