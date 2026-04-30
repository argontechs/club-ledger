<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  total: number
  page: number
  perPage: number
}>()
const emit = defineEmits<{
  (e: 'update:page', v: number): void
  (e: 'update:perPage', v: number): void
}>()

const lastPage = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const rangeStart = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.perPage + 1)
const rangeEnd = computed(() => Math.min(props.page * props.perPage, props.total))

function go(p: number) {
  const next = Math.max(1, Math.min(p, lastPage.value))
  if (next !== props.page) emit('update:page', next)
}

function changePerPage(e: Event) {
  const v = Number((e.target as HTMLSelectElement).value)
  emit('update:perPage', v)
  emit('update:page', 1)
}
</script>

<template>
  <div class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl px-4 py-3 shadow-card flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <p class="text-[13px] text-[var(--color-muted)] tabular">
      <template v-if="total === 0">No results.</template>
      <template v-else>
        Showing <span class="font-semibold text-[var(--color-ink)]">{{ rangeStart }}</span>–<span class="font-semibold text-[var(--color-ink)]">{{ rangeEnd }}</span>
        of <span class="font-semibold text-[var(--color-ink)]">{{ total }}</span>
      </template>
    </p>
    <div class="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
      <div class="relative">
        <select
          :value="perPage"
          class="appearance-none rounded-lg border border-[var(--color-border)] pl-3 pr-8 py-1.5 text-[12px] bg-white tabular focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[var(--color-brand)]/12 transition-[border-color,box-shadow]"
          @change="changePerPage"
        >
          <option :value="25">25 per page</option>
          <option :value="50">50 per page</option>
          <option :value="100">100 per page</option>
        </select>
        <svg
          aria-hidden="true"
          class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-muted-2)]"
          viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
        >
          <path d="M6 8l4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="press w-8 h-8 rounded-lg border border-[var(--color-border)] bg-white hover:bg-[var(--color-hairline)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[var(--color-muted)]"
          :disabled="page <= 1"
          aria-label="Previous page"
          @click="go(page - 1)"
        >
          <ChevronLeftIcon class="w-4 h-4" />
        </button>
        <span class="text-[12px] text-[var(--color-ink-soft)] tabular px-2 font-medium">
          {{ page }} <span class="text-[var(--color-muted-2)] mx-0.5">/</span> {{ lastPage }}
        </span>
        <button
          type="button"
          class="press w-8 h-8 rounded-lg border border-[var(--color-border)] bg-white hover:bg-[var(--color-hairline)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-[var(--color-muted)]"
          :disabled="page >= lastPage"
          aria-label="Next page"
          @click="go(page + 1)"
        >
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
