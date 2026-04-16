import { ref } from 'vue';

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

const visible = ref(false);
const options = ref<ConfirmOptions | null>(null);
let resolver: ((v: boolean) => void) | null = null;

export function openConfirm(opts: ConfirmOptions): Promise<boolean> {
  options.value = opts;
  visible.value = true;
  return new Promise<boolean>((res) => {
    resolver = (v: boolean) => {
      visible.value = false;
      options.value = null;
      res(v);
      resolver = null;
    };
  });
}

export function confirmResolve(value: boolean): void {
  if (resolver) resolver(value);
}

export function useConfirmState() {
  return { visible, options };
}

export default openConfirm;
