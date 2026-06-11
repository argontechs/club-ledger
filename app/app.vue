<script setup lang="ts">
import { computed, provide, watch } from 'vue'
import { useClub } from '~/composables/useClub'
import { setCurrencySymbol } from '~/utils/currency'

const { activeClubId } = useClub()
const { data: branding } = useAPI<{ logoUrl: string | null; venueName: string; currencySymbol?: string }>(
  () => activeClubId.value ? `/branding?club=${activeClubId.value}` : '/branding',
)
watch(branding, (b) => setCurrencySymbol(b?.currencySymbol), { immediate: true })
const faviconHref = computed(() =>
  branding.value?.logoUrl ? `${branding.value.logoUrl}&v=${Date.now()}` : '/favicon.png'
)
useHead({
  title: computed(() => branding.value?.venueName ?? undefined),
  link: [{ rel: 'icon', type: 'image/png', href: faviconHref }],
})
provide('branding', branding)
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
