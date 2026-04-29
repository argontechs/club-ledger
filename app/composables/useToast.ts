import type { Ref } from 'vue'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}

export const useToasts = () => useState<Toast[]>('toasts', () => [])

let _id = 0

function push(toasts: Ref<Toast[]>, message: string, tone: Toast['tone']) {
  const id = ++_id
  toasts.value = [...toasts.value, { id, message, tone }]
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 3500)
}

export function useToast() {
  const toasts = useToasts()
  return {
    success(message: string) { push(toasts, message, 'success') },
    error(message: string) { push(toasts, message, 'error') },
    info(message: string) { push(toasts, message, 'info') },
  }
}
