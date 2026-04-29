import { useAuthStore } from '~/stores/auth'

export function useAPI<T = unknown>(path: string | (() => string), opts?: { lazy?: boolean }) {
  const auth = useAuthStore()
  const url = computed(() => typeof path === 'function' ? path() : path)
  return useFetch<T>(() => `/api/v1${url.value}`, {
    onRequest({ options }) {
      if (auth.token) {
        const h = new Headers(options.headers as HeadersInit | undefined)
        h.set('authorization', `Bearer ${auth.token}`)
        options.headers = h
      }
    },
    lazy: opts?.lazy ?? false,
    server: false,
  })
}
