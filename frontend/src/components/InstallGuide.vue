<template>
  <section class="card install-guide">
    <h2>Installa Wishlist</h2>

    <div v-if="isStandalone">
      <p class="status-ok">App già installata ✓</p>
      <p class="hint">Puoi attivare subito le notifiche push.</p>
      <div class="actions">
        <button
          class="btn-primary"
          :disabled="isLoading || permissionState === 'denied'"
          @click="subscribe"
        >
          {{ isSubscribed ? 'Notifiche attive' : 'Attiva notifiche' }}
        </button>
        <button
          v-if="isSubscribed"
          class="btn-secondary"
          :disabled="isLoading"
          @click="unsubscribe"
        >
          Disattiva notifiche
        </button>
      </div>
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
const isStandalone = ref(
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
);

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);

const { subscribe, unsubscribe, isLoading, isSubscribed, permissionState, error } = usePushNotifications();

const onBeforeInstallPrompt = (e: Event) => {
  e.preventDefault();
  deferredPrompt.value = e as BeforeInstallPromptEvent;
};

async function install(): Promise<void> {
  if (!deferredPrompt.value) return;
  await deferredPrompt.value.prompt();
  deferredPrompt.value = null;
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
});

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
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
