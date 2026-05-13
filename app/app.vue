<script setup lang="ts">
import { computed, provide } from 'vue'

const { data: branding } = useAPI<{ logoUrl: string | null; venueName: string }>('/branding')
const faviconHref = computed(() =>
  branding.value?.logoUrl ? `${branding.value.logoUrl}?v=${Date.now()}` : '/favicon.png'
)
useHead({
  link: [{ rel: 'icon', type: 'image/png', href: faviconHref }],
})
provide('branding', branding)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
