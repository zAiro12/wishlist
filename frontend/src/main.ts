import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './assets/main.css';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Initialise auth from storage so session is restored on page load
const authInit = async () => {
	const auth = useAuthStore();
	try {
		await auth.initFromStorage();
	} catch {
		// ignore
	}
};

// If a redirect path was saved by the GitHub Pages 404 fallback, navigate to it
const saved = sessionStorage.getItem('redirect');
if (saved) {
	sessionStorage.removeItem('redirect');
	router.isReady().then(() => router.replace(saved).catch(() => {}));
}

authInit().then(() => app.mount('#root'));
