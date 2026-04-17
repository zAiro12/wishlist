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
  request.value = { ...opts };
  return new Promise<boolean>((res) => {
    resolver = (v: boolean) => {
      // reset state
      request.value = null;
      res(v);
      resolver = null;
    };
  });
}

export function confirmResolve(value: boolean): void {
  if (resolver) resolver(value);
}

export function useConfirmState() {
  return { request };
}

export default openConfirm;
