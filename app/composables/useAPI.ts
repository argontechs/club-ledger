import { useAuthStore } from '~/stores/auth'

export function useAPI<T = unknown>(path: string | (() => string), opts?: { lazy?: boolean }) {
  const auth = useAuthStore()
  const url = computed(() => typeof path === 'function' ? path() : path)
  return useFetch<T>(() => `/api/v1${url.value}`, {
    headers: () => ({ authorization: auth.token ? `Bearer ${auth.token}` : '' }),
    lazy: opts?.lazy ?? false,
    server: false,
  })
}
