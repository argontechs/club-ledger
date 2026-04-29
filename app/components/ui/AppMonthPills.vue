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

// Show up to 12 most recent months. If the active selection isn't in the list,
// prepend it so it stays visible.
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
    <span v-if="label" class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mr-2">{{ label }}</span>
    <template v-if="displayMonths.length">
      <button
        v-for="m in displayMonths"
        :key="m"
        type="button"
        class="px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors border"
        :class="modelValue === m
          ? 'bg-[#E11D48] text-white border-[#E11D48]'
          : 'bg-white text-gray-600 border-[#E0E0E0] hover:border-[#E11D48]/40 hover:text-[#BE123C]'"
        @click="pick(m)"
      >
        {{ pillLabel(m) }}
      </button>
    </template>
    <span v-else class="text-[12px] text-gray-400 italic">{{ emptyText ?? 'No months yet' }}</span>
  </div>
</template>
