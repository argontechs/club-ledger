<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import { useTour } from '~/composables/useTour'

const { state, next, back, skip } = useTour()

const targetRect = ref<DOMRect | null>(null)
const popEl = ref<HTMLElement | null>(null)
const popStyle = ref<Record<string, string>>({})

const step = computed(() => {
  const c = state.value.chapter
  return c ? c.steps[state.value.stepIndex] ?? null : null
})
const stepCount = computed(() => state.value.chapter?.steps.length ?? 0)
const isLast = computed(() => state.value.stepIndex === stepCount.value - 1)

function findTarget(): HTMLElement | null {
  if (!step.value) return null
  return document.querySelector<HTMLElement>(`[data-tour="${step.value.target}"]`)
}

async function position() {
  await nextTick()
  const el = findTarget()
  if (!el) {
    // Target not on screen (e.g. collapsed mobile nav) — center the card.
    targetRect.value = null
    popStyle.value = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    return
  }
  el.scrollIntoView({ block: 'nearest', behavior: 'instant' as ScrollBehavior })
  const r = el.getBoundingClientRect()
  targetRect.value = r
  const pop = popEl.value
  const pw = pop?.offsetWidth ?? 320
  const ph = pop?.offsetHeight ?? 160
  const margin = 12
  // Prefer below the target; flip above when there's no room.
  let top = r.bottom + margin
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - margin)
  let left = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8)
  popStyle.value = { top: `${top}px`, left: `${left}px`, transform: 'none' }
}

function onKey(e: KeyboardEvent) {
  if (!state.value.chapter) return
  if (e.key === 'Escape') skip()
  if (e.key === 'ArrowRight' || e.key === 'Enter') next()
  if (e.key === 'ArrowLeft') back()
}

let raf = 0
function onReposition() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => void position())
}

watch([() => state.value.chapter?.id, () => state.value.stepIndex], async ([id]) => {
  if (id) {
    await position()
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)
  } else {
    document.removeEventListener('keydown', onKey)
    window.removeEventListener('resize', onReposition)
    window.removeEventListener('scroll', onReposition, true)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onReposition)
  window.removeEventListener('scroll', onReposition, true)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="state.chapter && step" class="fixed inset-0 z-[55]" role="dialog" aria-modal="true" :aria-label="`Tour: ${step.title}`">
      <!-- Dim layer; clicking it skips, like closing a modal -->
      <div class="absolute inset-0 bg-[#1a120c]/40 motion-safe:transition-opacity" @click="skip" />

      <!-- Highlight ring around the target -->
      <div
        v-if="targetRect"
        aria-hidden="true"
        class="absolute rounded-xl ring-2 ring-[var(--color-brand)] ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(26,18,12,0.40)] pointer-events-none motion-safe:transition-all motion-safe:duration-200"
        :style="{
          top: `${targetRect.top - 4}px`,
          left: `${targetRect.left - 4}px`,
          width: `${targetRect.width + 8}px`,
          height: `${targetRect.height + 8}px`,
        }"
      />

      <!-- Step card -->
      <div
        ref="popEl"
        class="absolute z-[56] w-[320px] max-w-[calc(100vw-16px)] bg-[var(--color-card)] rounded-2xl border border-[var(--color-border-2)] shadow-lift p-4 space-y-2.5"
        :style="popStyle"
        aria-live="polite"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-muted-2)]">
              Step {{ state.stepIndex + 1 }} of {{ stepCount }}
            </p>
            <h3 class="font-display text-[15px] font-semibold text-[var(--color-ink)] tracking-tight mt-0.5">{{ step.title }}</h3>
          </div>
          <button
            type="button"
            class="press w-7 h-7 -mt-1 -mr-1 inline-flex items-center justify-center rounded-lg text-[var(--color-muted-2)] hover:bg-[var(--color-hairline)] hover:text-[var(--color-ink)] shrink-0"
            aria-label="Close tour"
            @click="skip"
          >
            <XMarkIcon class="w-4 h-4" />
          </button>
        </div>
        <p class="text-[12.5px] leading-relaxed text-[var(--color-muted)]">{{ step.body }}</p>
        <div class="flex items-center justify-between pt-1.5">
          <button type="button" class="press text-[12px] font-medium text-[var(--color-muted-2)] hover:text-[var(--color-ink)]" @click="skip">
            Skip tour
          </button>
          <div class="flex items-center gap-1.5">
            <AppButton v-if="state.stepIndex > 0" size="sm" variant="ghost" @click="back">Back</AppButton>
            <AppButton size="sm" @click="next">{{ isLast ? 'Done' : 'Next' }}</AppButton>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
