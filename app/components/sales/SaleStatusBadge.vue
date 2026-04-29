<script setup lang="ts">
defineProps<{ status: 'draft' | 'confirmed' | 'voided' }>()
const map = { draft: 'bg-amber-100 text-amber-800', confirmed: 'bg-emerald-100 text-emerald-800', voided: 'bg-slate-200 text-slate-600' }
</script>
<template>
  <span :class="['px-2 py-0.5 rounded text-xs font-medium', map[status]]">{{ status }}</span>
</template>
