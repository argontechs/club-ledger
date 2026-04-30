import { useAuthStore } from '~/stores/auth'

/**
 * Reactive GET wrapper. If the path getter returns an empty/falsy string the
 * request is skipped entirely (data stays null, no network call).
 *
 * Internally uses $fetch + a manual reactive ref to avoid useFetch's caching
 * and immediate-vs-watch edge cases that left some pages stuck on null data
 * when the URL transitioned from empty to valid after auth hydration.
 */
export function useAPI<T = unknown>(path: string | (() => string)) {
  const auth = useAuthStore()
  const url = computed(() => typeof path === 'function' ? path() : path)
  const data = ref<T | null>(null) as Ref<T | null>
  const pending = ref(false)
  const error = ref<unknown>(null)

  function authToken(): string | null {
    if (auth.token) return auth.token
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem('nono_auth_v1') ?? sessionStorage.getItem('nono_auth_v1')
        if (raw) return JSON.parse(raw)?.token ?? null
      } catch {}
    }
    return null
  }

  async function load() {
    const u = url.value
    if (!u) {
      data.value = null
      return
    }
    pending.value = true
    error.value = null
    try {
      const token = authToken()
      data.value = await $fetch<T>(`/api/v1${u}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      })
    } catch (e: any) {
      error.value = e
      data.value = null
      if (import.meta.client && (e?.status ?? e?.statusCode) === 401 && auth.isAuthenticated) {
        auth.clear()
        await navigateTo('/login')
      }
    } finally {
      pending.value = false
    }
  }

  watch(url, load, { immediate: true })

  return { data, pending, error, refresh: load }
}
