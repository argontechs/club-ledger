<script setup lang="ts" generic="T extends string | number">
defineProps<{
  modelValue: T
  options: ReadonlyArray<{ value: T; label: string }>
  label?: string
}>()
defineEmits<{ (e: 'update:modelValue', v: T): void }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      v-if="label"
      class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)] mr-2"
    >{{ label }}</span>
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="press px-3 py-1.5 rounded-full text-[12px] font-medium border tabular"
      :class="modelValue === opt.value
        ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-card'
        : 'bg-white/80 backdrop-blur text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)]/30 hover:text-[var(--color-ink)]'"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
