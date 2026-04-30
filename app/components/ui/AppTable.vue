<script setup lang="ts" generic="T">
import { InboxIcon } from '@heroicons/vue/24/outline'

defineProps<{ rows: T[]; loading?: boolean; emptyText?: string }>()
</script>

<template>
  <div class="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border-2)] shadow-card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px] tabular">
        <thead>
          <tr class="bg-[var(--color-hairline)] border-b border-[var(--color-border-2)] text-left">
            <slot name="head" />
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="n in 4" :key="`sk-${n}`" class="border-b border-[var(--color-hairline)] last:border-b-0">
              <td colspan="999" class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="h-3 w-3 rounded-full bg-[var(--color-surface-2)] animate-pulse" />
                  <div class="h-3 flex-1 max-w-[40%] bg-[var(--color-surface-2)] rounded animate-pulse" />
                  <div class="h-3 w-24 bg-[var(--color-surface-2)] rounded animate-pulse" />
                </div>
              </td>
            </tr>
          </template>
          <tr v-else-if="rows.length === 0">
            <td colspan="999" class="p-14 text-center">
              <div class="flex flex-col items-center gap-3 text-[var(--color-muted-2)]">
                <div class="w-12 h-12 rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center">
                  <InboxIcon class="w-6 h-6" />
                </div>
                <p class="text-[13px] font-medium text-[var(--color-muted)]">{{ emptyText ?? 'No data yet' }}</p>
              </div>
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(r, i) in rows"
              :key="i"
              class="border-b border-[var(--color-hairline)] last:border-b-0 hover:bg-[var(--color-hairline)]/60 transition-colors"
            >
              <slot name="row" :row="r" :index="i" />
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
