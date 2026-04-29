<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  tone?: 'gray' | 'rose' | 'amber' | 'emerald' | 'slate'
}>()

const toneMap: Record<string, string> = {
  gray:    'bg-gray-100 text-gray-600',
  rose:    'bg-[#E11D481A] text-[#BE123C]',
  amber:   'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  slate:   'bg-slate-100 text-slate-500',
}

const cls = computed(() => toneMap[props.tone ?? 'gray'])
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
    :class="cls"
  >
    <span class="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
    <slot />
  </span>
</template>
