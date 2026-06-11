<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ logoUrl: string | null }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const m = useAPIMutation()
const toast = useToast()
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
// Refreshes the sidebar/header/favicon branding everywhere, instantly.
const brandingRev = useState('branding-rev', () => 0)

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
    toast.error('PNG, JPG, or SVG only'); return
  }
  if (file.size > 2 * 1024 * 1024) {
    toast.error('File too large (max 2 MB)'); return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    await m.post('/settings/logo', fd as any)
    brandingRev.value++
    emit('changed')
    toast.success('Logo uploaded')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Upload failed')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function remove() {
  uploading.value = true
  try {
    await m.del('/settings/logo')
    brandingRev.value++
    emit('changed')
    toast.success('Logo removed')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to remove')
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="logoUrl" class="flex items-center gap-4">
      <img :src="`${logoUrl}?v=${Date.now()}`" alt="Company logo" class="w-20 h-20 object-contain bg-[var(--color-surface-2)] rounded-lg border border-[var(--color-border-2)]" />
      <div class="flex flex-col gap-2">
        <AppButton size="sm" variant="secondary" :disabled="uploading" @click="fileInput?.click()">Replace</AppButton>
        <AppButton size="sm" variant="danger" :disabled="uploading" @click="remove">Delete</AppButton>
      </div>
    </div>
    <div v-else
      class="flex flex-col items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-[var(--color-border-2)] rounded-xl bg-[var(--color-surface-2)] text-center cursor-pointer"
      @click="fileInput?.click()"
    >
      <p class="text-[12px] text-[var(--color-muted)]">Click to upload a logo (PNG, JPG, SVG · max 2 MB)</p>
      <p class="text-[11px] text-[var(--color-muted-2)]">Used on login, header, and favicon.</p>
    </div>
    <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/svg+xml" class="hidden" @change="onPick" />
  </div>
</template>
