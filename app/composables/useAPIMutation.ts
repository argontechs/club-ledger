import { useAuthStore } from '~/stores/auth'

export function useAPIMutation() {
  const auth = useAuthStore()
  async function call<T = unknown>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
    return await $fetch<T>(`/api/v1${path}`, {
      method,
      headers: { authorization: auth.token ? `Bearer ${auth.token}` : '' },
      body: body as any,
    })
  }
  return {
    post: <T>(p: string, b?: unknown) => call<T>('POST', p, b),
    put:  <T>(p: string, b?: unknown) => call<T>('PUT',  p, b),
    del:  <T>(p: string)              => call<T>('DELETE', p),
  }
}
