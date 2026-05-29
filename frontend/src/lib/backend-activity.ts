import { computed, ref } from 'vue';

const backendPendingCount = ref(0);
const isBackendBusy = computed(() => backendPendingCount.value > 0);

function shouldTrackRequest(input: RequestInfo | URL): boolean {
  let rawUrl = '';

  if (typeof input === 'string') {
    rawUrl = input;
  } else if (input instanceof URL) {
    rawUrl = input.toString();
  } else {
    rawUrl = input.url;
  }

  if (!rawUrl) return false;
  if (rawUrl.startsWith('/api/')) return true;

  try {
    const parsed = new URL(rawUrl, globalThis.location.href);
    return parsed.pathname.includes('/api/');
  } catch {
    return false;
  }
}

export function installBackendFetchTracker(): void {
  const globalAny = globalThis as typeof globalThis & { __wishlistBackendFetchTrackerInstalled?: boolean };
  if (globalAny.__wishlistBackendFetchTrackerInstalled) return;
  globalAny.__wishlistBackendFetchTrackerInstalled = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!shouldTrackRequest(input)) {
      return originalFetch(input, init);
    }

    backendPendingCount.value += 1;
    try {
      return await originalFetch(input, init);
    } finally {
      backendPendingCount.value = Math.max(0, backendPendingCount.value - 1);
    }
  }) as typeof fetch;
}

export const backendActivity = {
  pendingCount: backendPendingCount,
  isBusy: isBackendBusy,
};