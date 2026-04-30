<script setup lang="ts" generic="T extends { label: string; value: string | number; prefix?: string; tone?: 'default' | 'ink' | 'brand' }">
defineProps<{ stats: ReadonlyArray<T> }>()
</script>

<template>
  <ul class="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-[var(--color-border-2)] bg-[var(--color-border-2)]">
    <li
      v-for="(s, i) in stats"
      :key="i"
      :class="[
        'relative flex flex-col gap-2 p-4 lg:p-5',
        s.tone === 'ink' ? 'bg-[var(--color-ink)] text-white'
          : s.tone === 'brand' ? 'bg-[var(--color-brand)] text-white'
          : 'bg-[var(--color-card)]',
      ]"
    >
      <p
        :class="[
          'text-[10px] font-semibold uppercase tracking-[0.14em]',
          s.tone === 'ink' ? 'text-white/55'
            : s.tone === 'brand' ? 'text-white/75'
            : 'text-[var(--color-muted-2)]',
        ]"
      >{{ s.label }}</p>
      <p
        :class="[
          'num-display text-[18px] sm:text-[20px] lg:text-[24px] leading-none font-semibold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis',
          (s.tone === 'ink' || s.tone === 'brand') ? 'text-white' : 'text-[var(--color-ink)]',
        ]"
      >
        <span v-if="s.prefix" class="text-[12px] sm:text-[13px] lg:text-[14px] mr-0.5 opacity-70 align-top tracking-normal font-medium">{{ s.prefix.trim() }}</span>{{ s.value }}
      </p>
    </li>
  </ul>
</template>
