<script setup lang="ts">
defineProps<{
  modelValue?: string | number | null
  label?: string
  options: Array<{ value: string | number | null; label: string }>
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
    <div class="relative">
      <select
        :value="modelValue ?? ''"
        :disabled="disabled"
        class="appearance-none w-full bg-white border border-[var(--color-border)] rounded-lg pl-3.5 pr-9 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/12 transition-[border-color,box-shadow] duration-150 disabled:bg-[var(--color-surface-2)] disabled:opacity-70"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="o in options" :key="String(o.value)" :value="o.value ?? ''">{{ o.label }}</option>
      </select>
      <svg
        aria-hidden="true"
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-2)]"
        viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
      >
        <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
  </label>
</template>
