import { defineStore } from 'pinia'

interface User {
  id: number
  email: string
  name: string
  role: string                          // free-form name now
  tier: 'admin' | 'ambassador'          // NEW
  ambassadorId: number | null
}
interface State { token: string | null; user: User | null; remember: boolean }

const KEY = 'nono_auth_v1'

function decodeExp(token: string): number | null {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof json.exp === 'number' ? json.exp : null
  } catch { return null }
}

function readStored(): State | null {
  if (!import.meta.client) return null
  try {
    let raw = localStorage.getItem(KEY)
    let remember = true
    if (!raw) {
      raw = sessionStorage.getItem(KEY)
      remember = false
    }
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token: string; user: User }
    if (!parsed?.token) return null
    const exp = decodeExp(parsed.token)
    if (exp && exp * 1000 < Date.now()) {
      localStorage.removeItem(KEY)
      sessionStorage.removeItem(KEY)
      return null
    }
    return { token: parsed.token, user: parsed.user, remember }
  } catch { return null }
}

export const useAuthStore = defineStore('auth', {
  state: (): State => {
    const stored = readStored()
    return stored ?? { token: null, user: null, remember: false }
  },
  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isAdminOrOwner: (s) => s.user?.tier === 'admin',
  },
  actions: {
    setSession(token: string, user: User, remember = false) {
      this.token = token; this.user = user; this.remember = remember
      if (import.meta.client) {
        const payload = JSON.stringify({ token, user })
        if (remember) {
          localStorage.setItem(KEY, payload)
          sessionStorage.removeItem(KEY)
        } else {
          sessionStorage.setItem(KEY, payload)
          localStorage.removeItem(KEY)
        }
      }
    },
    clear() {
      this.token = null; this.user = null; this.remember = false
      if (import.meta.client) {
        localStorage.removeItem(KEY)
        sessionStorage.removeItem(KEY)
      }
    },
  },
})
