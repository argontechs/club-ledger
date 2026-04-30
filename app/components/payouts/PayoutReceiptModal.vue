<script setup lang="ts">
import { ArrowDownTrayIcon, TrashIcon, PaperClipIcon } from '@heroicons/vue/24/outline'
import { downloadAuthed } from '~/utils/download'
import { useAuthStore } from '~/stores/auth'

const props = defineProps<{ open: boolean; payout: any | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'updated', receipts: any[]): void }>()

const file = ref<File | null>(null)
const uploading = ref(false)
const error = ref('')
const m = useAPIMutation()
const toast = useToast()
const confirm = useConfirm()

const receipts = computed<any[]>(() => (props.payout?.receiptPaths ?? []) as any[])

function pickFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0] ?? null
  file.value = f
  error.value = ''
}

async function upload() {
  if (!file.value || !props.payout) return
  if (file.value.size > 10 * 1024 * 1024) { error.value = 'Max 10MB'; return }
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.value.type)) {
    error.value = 'Only PDF, PNG, JPG'; return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.set('receipt', file.value)
    const auth = useAuthStore()
    const r = await $fetch<{ receipts: any[] }>(`/api/v1/payouts/${props.payout.id}/receipt`, {
      method: 'POST', body: fd,
      headers: { authorization: auth.token ? `Bearer ${auth.token}` : '' },
    })
    file.value = null
    toast.success('Receipt uploaded')
    emit('updated', r.receipts)
  } catch (e: any) {
    error.value = e?.data?.error?.message ?? 'Upload failed'
    toast.error(error.value)
  } finally { uploading.value = false }
}

async function download(index: number) {
  if (!props.payout) return
  await downloadAuthed(`/payouts/${props.payout.id}/receipt/${index}`)
}

async function remove(index: number) {
  if (!props.payout) return
  if (!await confirm('Delete this receipt?', { tone: 'danger', confirmText: 'Delete' })) return
  try {
    await m.del(`/payouts/${props.payout.id}/receipt/${index}`)
    const next = receipts.value.slice()
    next.splice(index, 1)
    emit('updated', next)
    toast.success('Receipt deleted')
  } catch (e: any) {
    toast.error(e?.data?.error?.message ?? 'Delete failed')
  }
}

function formatBytes(n: number) {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}
</script>
<template>
  <AppModal :open="open" title="Receipts" @close="emit('close')">
    <div class="space-y-4">
      <div v-if="receipts.length" class="space-y-2">
        <div
          v-for="(r, i) in receipts"
          :key="i"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-border-2)] bg-[var(--color-hairline)]/40 hover:bg-[var(--color-hairline)] transition-colors"
        >
          <span class="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-muted)] shrink-0">
            <PaperClipIcon class="w-4 h-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-medium text-[var(--color-ink)] truncate">{{ r.name }}</p>
            <p class="text-[11px] text-[var(--color-muted-2)] tabular">{{ formatBytes(r.size) }} · {{ r.mime }}</p>
          </div>
          <button
            class="press w-8 h-8 rounded-lg hover:bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            title="Download"
            @click="download(i)"
          >
            <ArrowDownTrayIcon class="w-4 h-4" />
          </button>
          <button
            class="press w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-rose-500 hover:text-rose-700"
            title="Delete"
            @click="remove(i)"
          >
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        v-else
        class="text-[12px] text-[var(--color-muted-2)] italic px-3 py-6 text-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-hairline)]/40"
      >
        No receipts uploaded yet.
      </div>

      <div class="border-t border-[var(--color-hairline)] pt-4 space-y-2">
        <p class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Upload new receipt</p>
        <input
          type="file"
          accept=".pdf,image/png,image/jpeg"
          class="block w-full text-[12px] text-[var(--color-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-ink)] file:text-white file:px-3 file:py-1.5 file:text-[12px] file:font-medium hover:file:bg-[var(--color-ink-soft)] file:cursor-pointer cursor-pointer"
          @change="pickFile"
        >
        <p v-if="error" class="text-[12px] text-rose-700">{{ error }}</p>
        <p class="text-[11px] text-[var(--color-muted-2)]">PDF, PNG, JPG · max 10 MB · max 10 files per payout</p>
      </div>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">Close</AppButton>
      <AppButton :disabled="!file || uploading" @click="upload">
        {{ uploading ? 'Uploading…' : 'Upload' }}
      </AppButton>
    </template>
  </AppModal>
</template>
