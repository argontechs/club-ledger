<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  size?: 'sm' | 'md'
}>()

const v = computed(() => props.variant ?? 'primary')
const s = computed(() => props.size ?? 'md')

const padding = computed(() => s.value === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2.5 text-[13px]')

const variantClass = computed(() => {
  switch (v.value) {
    case 'primary':
      return 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-dark)] text-white font-semibold shadow-rose hover:-translate-y-px'
    case 'secondary':
      return 'bg-white hover:bg-[var(--color-hairline)] text-[var(--color-ink)] font-medium border border-[var(--color-border)] shadow-card hover:-translate-y-px'
    case 'danger':
      return 'bg-white hover:bg-rose-50 text-rose-600 font-medium border border-rose-200/70 shadow-card'
    case 'ghost':
      return 'bg-transparent hover:bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-ink)] font-medium'
    default:
      return ''
  }
})
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled"
    :class="[
      'press rounded-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 inline-flex items-center justify-center gap-1.5 tracking-tight',
      padding,
      variantClass,
    ]"
  >
    <slot />
  </button>
</template>
