<script setup lang="ts">
defineProps<{ modelValue?: string | number; label?: string; options: Array<{ value: string | number; label: string }> }>()
defineEmits<{ (e: 'update:modelValue', v: string): void }>()
</script>
<template>
  <label class="block text-sm">
    <span v-if="label" class="block mb-1 font-medium text-slate-700">{{ label }}</span>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      class="w-full rounded border px-3 py-1.5"
    >
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
  </label>
</template>
