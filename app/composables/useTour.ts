import { useAuthStore } from '~/stores/auth'
import { tourChapters, type TourChapter } from '~/config/tours'

interface TourState {
  chapter: TourChapter | null
  stepIndex: number
}

/**
 * Guided-tour controller — same global pattern as toasts/confirm: shared
 * useState + a globally mounted TourPopover. Progress is per-user on the
 * server (users.onboarding_state) so it follows the account across devices.
 */
export function useTour() {
  const state = useState<TourState>('tour-state', () => ({ chapter: null, stepIndex: 0 }))
  const progress = useState<Record<string, 'done' | 'skipped'> | null>('tour-progress', () => null)
  const auth = useAuthStore()

  async function loadProgress() {
    if (progress.value !== null || !auth.token) return
    try {
      progress.value = await $fetch<Record<string, 'done' | 'skipped'>>('/api/v1/me/onboarding', {
        headers: { authorization: `Bearer ${auth.token}` },
      })
    } catch {
      progress.value = {}
    }
  }

  function chapterForRoute(path: string): TourChapter | undefined {
    const tier = (auth.user?.tier ?? 'ambassador') as 'admin' | 'ambassador'
    return tourChapters.find(c => c.route === path && c.tiers.includes(tier))
  }

  function start(chapter: TourChapter) {
    state.value = { chapter, stepIndex: 0 }
  }

  /** Auto-start the route's chapter if the user hasn't seen it. */
  async function maybeStart(path: string) {
    await loadProgress()
    const chapter = chapterForRoute(path)
    if (!chapter || state.value.chapter) return
    if (progress.value && progress.value[chapter.id]) return
    start(chapter)
  }

  /** Replay the current route's chapter regardless of progress. */
  function restart(path: string) {
    const chapter = chapterForRoute(path)
    if (chapter) start(chapter)
  }

  async function record(result: 'done' | 'skipped') {
    const chapter = state.value.chapter
    if (!chapter) return
    progress.value = { ...(progress.value ?? {}), [chapter.id]: result }
    state.value = { chapter: null, stepIndex: 0 }
    try {
      await ($fetch as any)('/api/v1/me/onboarding', {
        method: 'PATCH',
        headers: { authorization: auth.token ? `Bearer ${auth.token}` : '' },
        body: { [chapter.id]: result },
      })
    } catch {
      // optimistic local state stands; server sync retries on next chapter
    }
  }

  function next() {
    const c = state.value.chapter
    if (!c) return
    if (state.value.stepIndex >= c.steps.length - 1) { void record('done'); return }
    state.value = { chapter: c, stepIndex: state.value.stepIndex + 1 }
  }

  function back() {
    if (state.value.stepIndex > 0) {
      state.value = { ...state.value, stepIndex: state.value.stepIndex - 1 }
    }
  }

  const skip = () => void record('skipped')

  return { state, maybeStart, restart, next, back, skip, hasChapterFor: chapterForRoute }
}
