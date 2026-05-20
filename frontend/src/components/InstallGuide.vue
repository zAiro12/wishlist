<template>
  <section class="card install-guide">
    <h2>Installa Wishlist</h2>

    <div v-if="isStandalone">
      <p class="status-ok">App già installata ✓</p>
      <p class="hint">Le notifiche vengono proposte automaticamente all'apertura dell'app installata.</p>
    </div>

    <div v-else-if="isIOS">
      <p class="hint">Per iPhone/iPad segui questi passaggi:</p>
      <ol>
        <li>Apri questa pagina in <strong>Safari</strong> (se non lo sei già)</li>
        <li>Tocca l'icona <strong>Condividi</strong> (□↑) in basso nella barra di Safari</li>
        <li>Scorri e tocca <strong>"Aggiungi a schermata Home"</strong></li>
        <li>Conferma toccando <strong>"Aggiungi"</strong> in alto a destra</li>
        <li>Apri l'app dalla schermata Home e attiva le notifiche quando richiesto</li>
      </ol>
    </div>

    <div v-else-if="isAndroid">
      <p class="hint">Per Android segui questi passaggi:</p>
      <ol>
        <li>Apri questa pagina in <strong>Chrome</strong></li>
        <li>Tocca il menu <strong>⋮</strong> in alto a destra</li>
        <li>Tocca <strong>"Aggiungi a schermata Home"</strong> (o "Installa app")</li>
        <li>Conferma toccando <strong>"Aggiungi"</strong></li>
        <li>Apri l'app e attiva le notifiche quando richiesto</li>
      </ol>

      <div class="actions">
        <button v-if="deferredPrompt" class="btn-primary" @click="install">Installa</button>
      </div>
    </div>

    <div v-else>
      <p>Apri questa pagina da smartphone per installare l'app</p>
    </div>

    <p v-if="error" class="error-message">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { usePushNotifications } from '@/composables/usePushNotifications';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

const ua = navigator.userAgent;
const isIOS = ref(/iphone|ipad|ipod/i.test(ua));
const isAndroid = ref(/android/i.test(ua));
const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');

function readStandaloneState(): boolean {
  return standaloneMediaQuery.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const isStandalone = ref(readStandaloneState());

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);

const { subscribe, isSupported, isSubscribed, permissionState, error } = usePushNotifications();

const onBeforeInstallPrompt = (e: Event) => {
  e.preventDefault();
  deferredPrompt.value = e as BeforeInstallPromptEvent;
};

const onAppInstalled = () => {
  isStandalone.value = readStandaloneState();
  deferredPrompt.value = null;
  void maybePromptNotifications();
};

const onDisplayModeChange = () => {
  isStandalone.value = readStandaloneState();
};

async function install(): Promise<void> {
  if (!deferredPrompt.value) return;
  await deferredPrompt.value.prompt();
  isStandalone.value = readStandaloneState();
  deferredPrompt.value = null;
  void maybePromptNotifications();
}

async function maybePromptNotifications(): Promise<void> {
  if (!isStandalone.value || !isSupported.value) return;
  if (isSubscribed.value || permissionState.value !== 'default') return;
  await subscribe();
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
  standaloneMediaQuery.addEventListener('change', onDisplayModeChange);
  void maybePromptNotifications();
});

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.removeEventListener('appinstalled', onAppInstalled);
  standaloneMediaQuery.removeEventListener('change', onDisplayModeChange);
});
</script>

<style scoped>
.install-guide {
  margin-top: 1.5rem;
}

.install-guide ol {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
}

.install-guide li {
  margin-bottom: 0.5rem;
}

.hint {
  color: var(--color-on-surface-variant);
}

.status-ok {
  color: var(--color-success);
  font-weight: 700;
}

.actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
