<template>
  <section class="card install-guide">
    <h2>Installa Wishlist come app</h2>

    <p class="hint intro">
      Puoi installarla su Windows, macOS, Android e iPhone/iPad con i browser moderni come Chrome,
      Edge, Brave e Safari. Quando il browser supporta l'installazione diretta, il pulsante qui sotto
      apparirà automaticamente.
    </p>

    <div v-if="isStandalone">
      <p class="status-ok">App già installata ✓</p>
      <p class="hint">Le notifiche vengono proposte automaticamente all'apertura dell'app installata.</p>
    </div>

    <div v-else class="install-grid">
      <article class="install-card">
        <h3>Windows, macOS e Linux</h3>
        <ol>
          <li>Apri Wishlist in <strong>Chrome</strong>, <strong>Edge</strong> o <strong>Brave</strong></li>
          <li>Usa l'icona di installazione nella barra degli indirizzi oppure il menu del browser</li>
          <li>Scegli <strong>Installa app</strong>, <strong>Aggiungi a schermata Home</strong> o <strong>Crea collegamento</strong></li>
          <li>Se disponibile, abilita <strong>Apri come finestra</strong> per usarla come app dedicata</li>
        </ol>
      </article>

      <article class="install-card">
        <h3>Android</h3>
        <ol>
          <li>Apri la pagina in <strong>Chrome</strong>, <strong>Edge</strong> o <strong>Brave</strong></li>
          <li>Tocca il menu <strong>⋮</strong> oppure l'icona di installazione</li>
          <li>Seleziona <strong>Installa app</strong> o <strong>Aggiungi a schermata Home</strong></li>
          <li>Conferma e poi apri Wishlist dalla schermata Home</li>
        </ol>
      </article>

      <article class="install-card">
        <h3>iPhone e iPad</h3>
        <ol>
          <li>Apri Wishlist in <strong>Safari</strong></li>
          <li>Tocca il pulsante <strong>Condividi</strong></li>
          <li>Scorri e scegli <strong>Aggiungi a schermata Home</strong></li>
          <li>Conferma con <strong>Aggiungi</strong> e apri l'app dalla Home</li>
        </ol>
      </article>
    </div>

    <div class="actions">
      <button v-if="deferredPrompt" class="btn-primary" @click="install">Installa ora</button>
    </div>

    <p class="hint browser-note">
      Se il tuo browser non mostra il pulsante di installazione, prova il menu principale oppure usa
      una versione aggiornata di Chrome, Edge, Brave o Safari.
    </p>

    <p v-if="error" class="error-message">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { usePushNotifications } from '@/composables/usePushNotifications';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

const standaloneMediaQuery = window.matchMedia('(display-mode: standalone)');
const notificationPromptKey = 'wishlist-notification-prompted';

function readStandaloneState(): boolean {
  return standaloneMediaQuery.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function hasPromptedNotificationsBefore(): boolean {
  try {
    return window.localStorage.getItem(notificationPromptKey) === '1';
  } catch {
    return false;
  }
}

function markNotificationsPrompted(): void {
  try {
    window.localStorage.setItem(notificationPromptKey, '1');
  } catch {
    // Ignore storage failures and keep the install flow working.
  }
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
  void promptNotificationsImmediately();
};

const onDisplayModeChange = () => {
  isStandalone.value = readStandaloneState();
};

async function install(): Promise<void> {
  if (!deferredPrompt.value) return;
  await deferredPrompt.value.prompt();
  isStandalone.value = readStandaloneState();
  deferredPrompt.value = null;
  void promptNotificationsImmediately();
}

async function promptNotificationsImmediately(): Promise<void> {
  if (!isSupported.value) return;
  if (isSubscribed.value || permissionState.value !== 'default') return;
  markNotificationsPrompted();
  await subscribe();
}

async function maybePromptNotifications(): Promise<void> {
  if (!isStandalone.value || hasPromptedNotificationsBefore()) return;
  await promptNotificationsImmediately();
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

.intro {
  margin-bottom: 1rem;
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

.install-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 1rem;
}

.install-card {
  padding: 1rem;
  border-radius: var(--radius-xl);
  background: var(--color-surface-container-highest);
}

.install-card h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.browser-note {
  margin-top: 1rem;
}
</style>
