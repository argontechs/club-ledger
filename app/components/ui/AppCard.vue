<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label?: string
  value?: string | number
  prefix?: string
  tone?: 'default' | 'inverted' | 'brand'
  grain?: boolean
}>()

const tone = computed(() => props.tone ?? 'default')

const surface = computed(() => {
  if (tone.value === 'inverted') return 'bg-[var(--color-ink)] text-white border border-[var(--color-ink)]'
  if (tone.value === 'brand') return 'bg-[var(--color-brand)] text-white border border-[var(--color-brand-dark)] shadow-rose'
  return 'bg-[var(--color-card)] border border-[var(--color-border-2)] shadow-card'
})

const labelClass = computed(() => {
  if (tone.value === 'inverted') return 'text-white/55'
  if (tone.value === 'brand') return 'text-white/75'
  return 'text-[var(--color-muted-2)]'
})

const valueClass = computed(() => {
  if (tone.value === 'inverted' || tone.value === 'brand') return 'text-white'
  return 'text-[var(--color-ink)]'
})
</script>

<template>
  <div
    :class="[
      'relative rounded-2xl p-5 overflow-hidden transition-shadow duration-300',
      surface,
      grain ? 'grain' : '',
    ]"
  >
    <template v-if="label">
      <div class="flex items-start justify-between gap-2">
        <p
          :class="[
            'text-[10px] font-semibold uppercase tracking-[0.14em]',
            labelClass,
          ]"
        >{{ label }}</p>
        <slot name="icon" />
      </div>
      <p
        :class="[
          'num-display text-[22px] sm:text-[26px] lg:text-[30px] leading-none mt-3 font-semibold tabular-nums whitespace-nowrap',
          valueClass,
        ]"
      >
        <span v-if="prefix" class="text-[14px] sm:text-[16px] lg:text-[18px] mr-0.5 opacity-70 align-top tracking-normal">{{ prefix.trim() }}</span>{{ value }}
      </p>
      <slot />
    </template>
    <template v-else>
      <slot />
    </template>
  </div>
</template>
