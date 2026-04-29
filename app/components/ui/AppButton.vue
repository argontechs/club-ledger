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

const padding = computed(() => s.value === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]')

const variantClass = computed(() => {
  switch (v.value) {
    case 'primary':
      return 'bg-[#E11D48] hover:bg-[#BE123C] text-white font-semibold'
    case 'secondary':
      return 'bg-white hover:bg-gray-50 text-gray-700 font-medium border border-[#E0E0E0]'
    case 'danger':
      return 'bg-white hover:bg-red-50 text-red-500 font-medium border border-red-100'
    case 'ghost':
      return 'bg-transparent hover:bg-gray-100 text-gray-600 font-medium'
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
      'rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5',
      padding,
      variantClass,
    ]"
  >
    <slot />
  </button>
</template>
