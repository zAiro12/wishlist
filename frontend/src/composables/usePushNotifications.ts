import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type DeferredSubscription = PushSubscriptionJSON & {
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray.buffer as ArrayBuffer;
}

async function resolveVapidPublicKey(): Promise<string> {
  const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
  if (fromEnv) return fromEnv;

  const response = await fetch(`${API_BASE}/api/push/vapid-public-key`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Impossibile recuperare la VAPID public key');
  }

  const data = (await response.json()) as { publicKey?: string };
  if (!data.publicKey) {
    throw new Error('VAPID public key non disponibile');
  }

  return data.publicKey;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  return navigator.serviceWorker.ready;
}

export function usePushNotifications() {
  const auth = useAuthStore();
  const isSupported = ref<boolean>('serviceWorker' in navigator && 'PushManager' in window);
  const isSubscribed = ref(false);
  const permissionState = ref<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'default'
  );
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function refreshSubscriptionState(): Promise<void> {
    if (!isSupported.value) return;
    const registration = await getServiceWorkerRegistration();
    const existing = await registration.pushManager.getSubscription();
    isSubscribed.value = existing !== null;
    permissionState.value = Notification.permission;
  }

  async function subscribe(): Promise<void> {
    error.value = null;
    if (!isSupported.value) {
      error.value = 'Push notifications non supportate su questo browser.';
      return;
    }

    if (!auth.user?.id) {
      error.value = 'Utente non autenticato.';
      return;
    }

    isLoading.value = true;
    try {
      const permission = await Notification.requestPermission();
      permissionState.value = permission;
      if (permission !== 'granted') {
        error.value = 'Permesso notifiche non concesso.';
        return;
      }

      const registration = await getServiceWorkerRegistration();
      const vapidPublicKey = await resolveVapidPublicKey();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const bodyPayload = {
        subscription: subscription.toJSON() as DeferredSubscription,
        userId: auth.user.id,
      };

      const response = await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        throw new Error('Registrazione push fallita');
      }

      isSubscribed.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Errore durante la sottoscrizione push';
    } finally {
      isLoading.value = false;
    }
  }

  async function unsubscribe(): Promise<void> {
    error.value = null;
    if (!isSupported.value || !auth.user?.id) return;

    isLoading.value = true;
    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        isSubscribed.value = false;
        return;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const response = await fetch(`${API_BASE}/api/push/unsubscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, userId: auth.user.id }),
      });

      if (!response.ok) {
        throw new Error('Disiscrizione push fallita');
      }

      isSubscribed.value = false;
      permissionState.value = Notification.permission;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Errore durante la disiscrizione push';
    } finally {
      isLoading.value = false;
    }
  }

  void refreshSubscriptionState().catch(() => {
    /* ignore init errors */
  });

  return {
    isSupported,
    isSubscribed,
    permissionState,
    isLoading,
    error,
    refreshSubscriptionState,
    subscribe,
    unsubscribe,
  };
}
