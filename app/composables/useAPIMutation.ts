import { useAuthStore } from '~/stores/auth'

export function useAPIMutation() {
  const auth = useAuthStore()
  const activeClubId = useState<number | null>('active-club-id', () => null)
  async function call<T = unknown>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
    try {
      return await $fetch<T>(`/api/v1${path}`, {
        method,
        headers: {
          authorization: auth.token ? `Bearer ${auth.token}` : '',
          ...(activeClubId.value ? { 'x-club-id': String(activeClubId.value) } : {}),
        },
        body: body as any,
      })
    } catch (e: any) {
      if (import.meta.client && (e?.status ?? e?.statusCode) === 401 && auth.isAuthenticated) {
        auth.clear()
        await navigateTo('/login')
      }
      throw e
    }
  }
  return {
    post: <T>(p: string, b?: unknown) => call<T>('POST', p, b),
    put:  <T>(p: string, b?: unknown) => call<T>('PUT',  p, b),
    del:  <T>(p: string)              => call<T>('DELETE', p),
  }
}
