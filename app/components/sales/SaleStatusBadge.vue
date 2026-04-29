<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status: 'draft' | 'confirmed' | 'voided' }>()

const toneMap = { draft: 'amber', confirmed: 'emerald', voided: 'slate' } as const
const tone = computed(() => toneMap[props.status])
</script>

<template>
  <AppBadge :tone="tone">{{ status }}</AppBadge>
</template>
