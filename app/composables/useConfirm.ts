export interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  tone: 'primary' | 'danger'
  resolve: ((v: boolean) => void) | null
}

export const useConfirmState = () => useState<ConfirmState>('confirm-state', () => ({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  tone: 'primary',
  resolve: null,
}))

export function useConfirm() {
  const state = useConfirmState()
  return (
    message: string,
    opts: Partial<Omit<ConfirmState, 'open' | 'resolve' | 'message'>> = {},
  ) =>
    new Promise<boolean>((resolve) => {
      state.value = {
        open: true,
        title: opts.title ?? 'Confirm',
        message,
        confirmText: opts.confirmText ?? 'Confirm',
        cancelText: opts.cancelText ?? 'Cancel',
        tone: opts.tone ?? 'primary',
        resolve,
      }
    })
}
