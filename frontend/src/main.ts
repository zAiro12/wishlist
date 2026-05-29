import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './assets/design.css';
import './assets/main.css';
import { useAuthStore } from './stores/auth';
import { registerSW } from 'virtual:pwa-register';

function normalizeGithubPagesRedirect(rawRedirect: string): string {
  try {
    const redirectUrl = new URL(rawRedirect, globalThis.location.href);
    const appBase = import.meta.env.BASE_URL || '/';
    const normalizedBase = appBase.endsWith('/') ? appBase.slice(0, -1) : appBase;

    let pathname = redirectUrl.pathname;
    if (normalizedBase && normalizedBase !== '/' && pathname.startsWith(`${normalizedBase}/`)) {
      pathname = pathname.slice(normalizedBase.length);
    }

    return `${pathname}${redirectUrl.search}${redirectUrl.hash}` || '/';
  } catch {
    return '/';
  }
}

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Initialise auth so session is restored on page load
const authInit = async () => {
  const auth = useAuthStore();
  console.info('⚙️ main.ts: authInit starting - calling auth.fetchUser()');
  try {
    // Attempt to fetch user silently. fetchUser sets initialized.
    await auth.fetchUser().catch(() => {
      console.warn('⚠️ main.ts: auth.fetchUser() failed');
    });
  } catch (e) {
    console.error('❌ main.ts: authInit error:', e);
  }
  console.info('✅ main.ts: authInit complete');
};

// If a redirect path was saved by the GitHub Pages 404 fallback, navigate to it
const saved = sessionStorage.getItem('redirect');
if (saved) {
	sessionStorage.removeItem('redirect');
  router.isReady().then(() => router.replace(normalizeGithubPagesRedirect(saved)).catch(() => {}));
}

authInit().then(() => app.mount('#root'));

if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
