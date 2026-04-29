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
  <div class="bg-white border border-[#E8E8EC] rounded-2xl p-4 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <p class="text-[13px] text-gray-500">
      <template v-if="total === 0">No results.</template>
      <template v-else>
        Showing <span class="font-medium text-[#0A0A0A]">{{ rangeStart }}</span>–<span class="font-medium text-[#0A0A0A]">{{ rangeEnd }}</span>
        of <span class="font-medium text-[#0A0A0A]">{{ total }}</span>
      </template>
    </p>
    <div class="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
      <select
        :value="perPage"
        class="rounded-lg border border-[#E0E0E0] px-2 py-1.5 text-[12px] bg-white"
        @change="changePerPage"
      >
        <option :value="25">25 per page</option>
        <option :value="50">50 per page</option>
        <option :value="100">100 per page</option>
      </select>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="w-8 h-8 rounded-lg border border-[#E0E0E0] bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-gray-500"
          :disabled="page <= 1"
          @click="go(page - 1)"
          aria-label="Previous page"
        >
          <ChevronLeftIcon class="w-4 h-4" />
        </button>
        <span class="text-[12px] text-gray-600 tabular-nums px-1">
          Page {{ page }} of {{ lastPage }}
        </span>
        <button
          type="button"
          class="w-8 h-8 rounded-lg border border-[#E0E0E0] bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-gray-500"
          :disabled="page >= lastPage"
          @click="go(page + 1)"
          aria-label="Next page"
        >
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
