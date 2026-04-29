import { useAuthStore } from '~/stores/auth'

/**
 * Reactive GET wrapper. If the path getter returns an empty/falsy string the
 * request is skipped entirely (returns null data, no network call).
 */
export function useAPI<T = unknown>(path: string | (() => string), opts?: { lazy?: boolean }) {
  const auth = useAuthStore()
  const url = computed(() => typeof path === 'function' ? path() : path)
  return useFetch<T>(() => url.value ? `/api/v1${url.value}` : '', {
    immediate: !!url.value,
    onRequest({ options }) {
      if (auth.token) {
        const h = new Headers(options.headers as HeadersInit | undefined)
        h.set('authorization', `Bearer ${auth.token}`)
        options.headers = h
      }
    },
    lazy: opts?.lazy ?? false,
    server: false,
    watch: [url],
  })
}
