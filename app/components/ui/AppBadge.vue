<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  tone?: 'gray' | 'rose' | 'amber' | 'emerald' | 'slate'
  shape?: 'pill' | 'square'
  dot?: boolean
}>()

const toneMap: Record<string, string> = {
  gray:    'bg-[var(--color-surface-2)] text-[var(--color-ink-soft)] ring-1 ring-inset ring-[var(--color-border)]',
  rose:    'bg-[var(--color-brand-soft)] text-[var(--color-brand-dark)] ring-1 ring-inset ring-[var(--color-brand)]/20',
  amber:   'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70',
  emerald: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/70',
  slate:   'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/70',
}

const cls = computed(() => toneMap[props.tone ?? 'gray'])
const shapeCls = computed(() => props.shape === 'square' ? 'rounded-md' : 'rounded-full')
const showDot = computed(() => props.dot ?? true)
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tracking-tight"
    :class="[cls, shapeCls]"
  >
    <span v-if="showDot" class="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
    <slot />
  </span>
</template>
