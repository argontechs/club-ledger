<script setup lang="ts">
const props = defineProps<{ variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; type?: 'button' | 'submit'; disabled?: boolean }>()
const v = computed(() => props.variant ?? 'primary')
const cls = computed(() => ({
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border bg-white hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'hover:bg-slate-100',
}[v.value]))
</script>
<template>
  <button :type="type ?? 'button'" :disabled="disabled"
    :class="['rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50', cls]">
    <slot />
  </button>
</template>
