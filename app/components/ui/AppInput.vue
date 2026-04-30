<script setup lang="ts">
defineProps<{
  modelValue?: string | number | null
  placeholder?: string
  type?: string
  label?: string
  error?: string
  disabled?: boolean
}>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>

<template>
  <label class="block">
    <span
      v-if="label"
      class="block text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-[0.14em] mb-1.5"
    >{{ label }}</span>
    <input
      :type="type ?? 'text'"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full bg-white border border-[var(--color-border)] rounded-lg px-3.5 py-2.5 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)] outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/12 transition-[border-color,box-shadow] duration-150 disabled:bg-[var(--color-surface-2)] disabled:opacity-70"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <span v-if="error" class="block mt-1 text-[11px] text-rose-600">{{ error }}</span>
  </label>
</template>
