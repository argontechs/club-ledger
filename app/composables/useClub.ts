import { useAuthStore } from '~/stores/auth'

const KEY = 'nono_club_v1'

export interface ClubRow { id: number; name: string; logoPath: string | null }

/**
 * Active-club context (EngageLab-style switcher). The selected club id is
 * shared app-wide via useState and persisted to localStorage; useAPI and
 * useAPIMutation attach it as the X-Club-Id header on every request.
 */
export function useClub() {
  const clubs = useState<ClubRow[]>('clubs', () => [])
  const activeClubId = useState<number | null>('active-club-id', () => null)

  function persist(id: number) {
    if (import.meta.client) { try { localStorage.setItem(KEY, String(id)) } catch {} }
  }
  function restore(): number | null {
    if (import.meta.client) {
      try {
        const v = Number(localStorage.getItem(KEY))
        if (Number.isInteger(v) && v > 0) return v
      } catch {}
    }
    return null
  }

  async function refreshClubs() {
    const auth = useAuthStore()
    if (!auth.token) return
    try {
      const rows = await $fetch<ClubRow[]>('/api/v1/clubs', {
        headers: { authorization: `Bearer ${auth.token}` },
      })
      clubs.value = rows
      const wanted = activeClubId.value ?? restore()
      const valid = rows.find(c => c.id === wanted)
      activeClubId.value = valid?.id ?? rows[0]?.id ?? null
      if (activeClubId.value) persist(activeClubId.value)
    } catch {
      // auth/network failures are handled by the calling surface
    }
  }

  function setClub(id: number) {
    if (clubs.value.some(c => c.id === id)) {
      activeClubId.value = id
      persist(id)
    }
  }

  const activeClub = computed(() => clubs.value.find(c => c.id === activeClubId.value) ?? null)

  return { clubs, activeClubId, activeClub, setClub, refreshClubs }
}
