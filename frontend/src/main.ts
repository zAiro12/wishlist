import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './assets/main.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
// If a redirect path was saved by the GitHub Pages 404 fallback, navigate to it
const saved = sessionStorage.getItem('redirect');
if (saved) {
	sessionStorage.removeItem('redirect');
	router.isReady().then(() => router.replace(saved).catch(() => {}));
}

app.mount('#root');
