<script setup lang="ts">
const props = defineProps<{
  modelValue: string                  // YYYY-MM
  months: ReadonlyArray<string>        // months with data, server-supplied; latest first
  emptyText?: string
  label?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function pillLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return `${MONTH_NAMES[mo - 1]} ${String(y).slice(2)}`
}

const displayMonths = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  if (props.modelValue && !props.months.includes(props.modelValue)) {
    out.push(props.modelValue); seen.add(props.modelValue)
  }
  for (const m of props.months) {
    if (seen.has(m)) continue
    seen.add(m); out.push(m)
    if (out.length >= 12) break
  }
  return out
})

function pick(m: string) { emit('update:modelValue', m) }
</script>

<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span
      v-if="label"
      class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)] mr-2"
    >{{ label }}</span>
    <template v-if="displayMonths.length">
      <button
        v-for="m in displayMonths"
        :key="m"
        type="button"
        class="press relative px-3 py-1.5 rounded-full text-[12px] font-medium border tabular"
        :class="modelValue === m
          ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)] shadow-card'
          : 'bg-white/80 backdrop-blur text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-ink)]/30 hover:text-[var(--color-ink)]'"
        @click="pick(m)"
      >
        {{ pillLabel(m) }}
      </button>
    </template>
    <span v-else class="text-[12px] text-[var(--color-muted-2)] italic">{{ emptyText ?? 'No months yet' }}</span>
  </div>
</template>
