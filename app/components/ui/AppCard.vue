<script setup lang="ts">
defineProps<{
  label?: string
  value?: string | number
  prefix?: string
}>()
</script>

<template>
  <div class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
    <template v-if="label">
      <div class="flex items-center justify-between gap-2">
        <p class="text-[11px] font-bold uppercase tracking-wide text-gray-400">{{ label }}</p>
        <slot name="icon" />
      </div>
      <p class="text-2xl font-bold text-[#0A0A0A] mt-1">
        <span v-if="prefix" class="text-[#0A0A0A]">{{ prefix }}</span>{{ value }}
      </p>
      <slot />
    </template>
    <template v-else>
      <slot />
    </template>
  </div>
</template>
