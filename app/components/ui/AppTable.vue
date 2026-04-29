<script setup lang="ts" generic="T">
defineProps<{ rows: T[]; loading?: boolean; emptyText?: string }>()
</script>
<template>
  <div class="overflow-x-auto rounded border bg-white">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-600 text-left">
        <tr><slot name="head" /></tr>
      </thead>
      <tbody>
        <tr v-if="loading"><td class="p-4 text-center text-slate-400" colspan="999">Loading…</td></tr>
        <tr v-else-if="rows.length === 0">
          <td class="p-4 text-center text-slate-400" colspan="999">{{ emptyText ?? 'No data' }}</td>
        </tr>
        <template v-else>
          <tr v-for="(r, i) in rows" :key="i" class="border-t">
            <slot name="row" :row="r" :index="i" />
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
