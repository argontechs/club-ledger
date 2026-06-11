<script setup lang="ts">
import { computed, provide, watch } from 'vue'
import { useClub } from '~/composables/useClub'
import { setCurrencySymbol } from '~/utils/currency'

const { activeClubId } = useClub()
// Bumped after logo uploads / club renames so every branding consumer
// (sidebar, header, favicon, settings preview) refreshes instantly.
const brandingRev = useState('branding-rev', () => 0)
const { data: branding } = useAPI<{ logoUrl: string | null; venueName: string; currencySymbol?: string }>(
  () => activeClubId.value ? `/branding?club=${activeClubId.value}&_=${brandingRev.value}` : `/branding?_=${brandingRev.value}`,
)
watch(branding, (b) => setCurrencySymbol(b?.currencySymbol), { immediate: true })
const faviconHref = computed(() => branding.value?.logoUrl ?? '/favicon.png')
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
