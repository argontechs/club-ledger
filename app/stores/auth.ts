import { defineStore } from 'pinia'

interface User { id: number; email: string; name: string; role: 'owner'|'admin'|'leader'|'ambassador'; ambassadorId: number | null }
interface State { token: string | null; user: User | null }

const KEY = 'nono_auth_v1'

export const useAuthStore = defineStore('auth', {
  state: (): State => {
    if (import.meta.client) {
      try {
        const raw = localStorage.getItem(KEY)
        if (raw) return JSON.parse(raw) as State
      } catch {}
    }
    return { token: null, user: null }
  },
  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isAdminOrOwner: (s) => s.user?.role === 'owner' || s.user?.role === 'admin',
  },
  actions: {
    setSession(token: string, user: User) {
      this.token = token; this.user = user
      if (import.meta.client) localStorage.setItem(KEY, JSON.stringify({ token, user }))
    },
    clear() {
      this.token = null; this.user = null
      if (import.meta.client) localStorage.removeItem(KEY)
    },
  },
})
