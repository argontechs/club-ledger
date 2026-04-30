<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  modelValue: string
  allowEmpty?: boolean
  label?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const open = ref(false)
const today = new Date()

const currentYM = computed(() => {
  if (props.modelValue) {
    const [y, m] = props.modelValue.split('-').map(Number)
    return { year: y, month: m }
  }
  return { year: today.getFullYear(), month: today.getMonth() + 1 }
})

const viewYear = ref(currentYM.value.year)

watch(() => props.modelValue, () => { viewYear.value = currentYM.value.year })
watch(open, (v) => { if (v) viewYear.value = currentYM.value.year })

const monthLabel = computed(() => {
  if (!props.modelValue) return 'All time'
  const [y, m] = props.modelValue.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
})

function pick(monthIdx0: number) {
  const m = String(monthIdx0 + 1).padStart(2, '0')
  emit('update:modelValue', `${viewYear.value}-${m}`)
  open.value = false
}
function thisMonth() {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  emit('update:modelValue', `${y}-${m}`)
  open.value = false
}
function clear() {
  emit('update:modelValue', '')
  open.value = false
}

const root = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative inline-block">
    <label v-if="label" class="block text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[0.14em] mb-1.5">{{ label }}</label>
    <button
      type="button"
      class="press flex items-center gap-2 px-3.5 py-2.5 border border-[var(--color-border)] rounded-lg text-[13px] bg-white hover:border-[var(--color-ink)]/30 focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/12 transition-[border-color,box-shadow] min-w-[180px]"
      @click="open = !open"
    >
      <CalendarIcon class="w-4 h-4 text-[var(--color-muted-2)]" />
      <span class="text-[var(--color-ink)] font-medium tabular">{{ monthLabel }}</span>
      <svg
        aria-hidden="true"
        class="ml-auto w-3.5 h-3.5 text-[var(--color-muted-2)]"
        viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
      >
        <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <Transition name="fade">
      <div
        v-if="open"
        class="absolute z-50 mt-2 left-0 w-[280px] bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl shadow-lift p-3"
      >
        <div class="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            class="press w-7 h-7 rounded-lg hover:bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-muted)]"
            @click="viewYear--"
          >
            <ChevronLeftIcon class="w-4 h-4" />
          </button>
          <span class="font-display text-[14px] font-semibold text-[var(--color-ink)] tabular tracking-tight">{{ viewYear }}</span>
          <button
            type="button"
            class="press w-7 h-7 rounded-lg hover:bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-muted)]"
            @click="viewYear++"
          >
            <ChevronRightIcon class="w-4 h-4" />
          </button>
        </div>
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="(m, i) in SHORT_MONTHS"
            :key="m"
            type="button"
            class="press px-2 py-2 rounded-lg text-[12px] font-medium transition-colors"
            :class="(currentYM.year === viewYear && currentYM.month === i + 1 && modelValue)
              ? 'bg-[var(--color-ink)] text-white shadow-card'
              : 'text-[var(--color-muted)] hover:bg-[var(--color-hairline)] hover:text-[var(--color-ink)]'"
            @click="pick(i)"
          >
            {{ m }}
          </button>
        </div>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-hairline)] px-1">
          <button
            v-if="allowEmpty"
            type="button"
            class="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors"
            @click="clear"
          >
            Clear
          </button>
          <span v-else />
          <button
            type="button"
            class="text-[11px] font-semibold text-[var(--color-brand-dark)] hover:text-[var(--color-brand)] transition-colors"
            @click="thisMonth"
          >
            This month
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
