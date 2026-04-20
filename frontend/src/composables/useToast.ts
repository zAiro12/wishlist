import { ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export type Toast = {
  id: number
  message: string
  variant: ToastVariant
}

const toasts = ref<Toast[]>([])

export function useToast() {
  function showToast(message: string, variant: ToastVariant = 'info') {
    const id = Date.now()
    toasts.value.push({ id, message, variant })
    setTimeout(() => dismissToast(id), 3500)
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, showToast, dismissToast }
}
