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
        <div v-for="(r, i) in receipts" :key="i" class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E8E8EC]">
          <PaperClipIcon class="w-4 h-4 text-gray-400 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-medium text-[#0A0A0A] truncate">{{ r.name }}</p>
            <p class="text-[11px] text-gray-400">{{ formatBytes(r.size) }} · {{ r.mime }}</p>
          </div>
          <button class="w-7 h-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500" @click="download(i)" title="Download">
            <ArrowDownTrayIcon class="w-4 h-4" />
          </button>
          <button class="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center text-red-500" @click="remove(i)" title="Delete">
            <TrashIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
      <p v-else class="text-[12px] text-gray-400 italic">No receipts uploaded yet.</p>

      <div class="border-t border-[#F0F0F0] pt-3 space-y-2">
        <p class="text-[11px] font-bold uppercase tracking-wide text-gray-400">Upload new receipt</p>
        <input type="file" accept=".pdf,image/png,image/jpeg" class="text-[12px]" @change="pickFile">
        <p v-if="error" class="text-[12px] text-red-600">{{ error }}</p>
        <p class="text-[11px] text-gray-400">PDF, PNG, JPG · max 10MB · max 10 files per payout</p>
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
