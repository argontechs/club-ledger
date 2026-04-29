<script setup lang="ts" generic="T">
import { InboxIcon } from '@heroicons/vue/24/outline'

defineProps<{ rows: T[]; loading?: boolean; emptyText?: string }>()
</script>

<template>
  <div class="bg-white rounded-2xl border border-[#E8E8EC] shadow-sm overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px]">
        <thead>
          <tr class="bg-[#FAFAFA] border-b border-[#F0F0F0] text-left">
            <slot name="head" />
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="n in 3" :key="`sk-${n}`" class="border-b border-[#F8F8F8] last:border-b-0">
              <td colspan="999" class="px-4 py-3">
                <div class="h-4 bg-gray-100 rounded animate-pulse" />
              </td>
            </tr>
          </template>
          <tr v-else-if="rows.length === 0">
            <td colspan="999" class="p-12 text-center">
              <div class="flex flex-col items-center gap-2 text-gray-400">
                <InboxIcon class="w-8 h-8" />
                <p class="text-[13px] font-medium">{{ emptyText ?? 'No data' }}</p>
              </div>
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="(r, i) in rows"
              :key="i"
              class="border-b border-[#F8F8F8] last:border-b-0 hover:bg-[#FAFCFC] transition-colors"
            >
              <slot name="row" :row="r" :index="i" />
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
