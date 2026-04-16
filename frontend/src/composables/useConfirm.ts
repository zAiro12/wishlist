import { ref } from 'vue';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

// Single nullable request object as source of truth
const request = ref<ConfirmOptions | null>(null);
let resolver: ((v: boolean) => void) | null = null;

export function openConfirm(opts: ConfirmOptions): Promise<boolean> {
  if (import.meta.env.DEV) {
    // debug trace where openConfirm is called from
    console.log('[confirm][openConfirm] called with opts:', opts);
    console.trace('[confirm][openConfirm] stack trace');
  }
  request.value = { ...opts };
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    // expose for quick inspection in browser console
    // eslint-disable-next-line no-undef
    (window as any).__confirmDebug = { request };
  }
  return new Promise<boolean>((res) => {
    resolver = (v: boolean) => {
      if (import.meta.env.DEV) console.log('[confirm][resolver] resolving:', v);
      // reset state
      request.value = null;
      if (import.meta.env.DEV) console.log('[confirm][resolver] request reset to null');
      res(v);
      resolver = null;
    };
  });
}

export function confirmResolve(value: boolean): void {
  if (import.meta.env.DEV) console.log('[confirm][confirmResolve] called with', value);
  if (resolver) resolver(value);
}

export function useConfirmState() {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    // expose current request ref for debugging
    // eslint-disable-next-line no-undef
    (window as any).__confirmDebug = { request };
  }
  return { request };
}

export default openConfirm;
