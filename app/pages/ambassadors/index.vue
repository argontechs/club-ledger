<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['role'] })

const { data: rows, refresh } = useAPI<any[]>('/ambassadors')
const { data: teams } = useAPI<any[]>('/teams')
const { data: settings } = useAPI<Record<string, string>>('/settings')

const auth = useAuthStore()
const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()
const showAdd = ref(false)
const editing = ref<any | null>(null)

const defaultRate = computed(() => Number(settings.value?.default_commission_rate ?? 8))
const form = ref<{ name: string; teamId: number | null; commissionRate: number }>(
  { name: '', teamId: null, commissionRate: 8 })

watch(showAdd, (v) => { if (v && !editing.value) form.value = { name: '', teamId: null, commissionRate: defaultRate.value } })
watch(editing, (v) => {
  if (v) {
    form.value = { name: v.name, teamId: v.teamId, commissionRate: Number(v.commissionRate) }
    showAdd.value = true
  }
})

async function save() {
  const payload = { name: form.value.name, teamId: form.value.teamId, commissionRate: Number(form.value.commissionRate) }
  const wasEditing = !!editing.value
  try {
    if (editing.value) await m.put(`/ambassadors/${editing.value.id}`, payload)
    else await m.post('/ambassadors', payload)
    showAdd.value = false; editing.value = null
    await refresh()
    toast.success(wasEditing ? 'Ambassador updated' : 'Ambassador created')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to save ambassador')
  }
}

function closeModal() {
  showAdd.value = false
  editing.value = null
}

async function remove(row: any) {
  if (!await confirm(`Delete ${row.name}?`, { tone: 'danger', confirmText: 'Delete' })) return
  try {
    await m.del(`/ambassadors/${row.id}`)
    await refresh()
    toast.success('Ambassador deleted')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to delete ambassador')
  }
}

function isOwnerProtected(row: any) { return row.name === 'Johnny' }
const isAdmin = computed(() => auth.user?.role === 'admin')
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
      <AppButton class="w-full sm:w-auto" @click="showAdd = true">+ New ambassador</AppButton>
    </div>

    <AppTable :rows="rows ?? []" empty-text="No ambassadors yet">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Name</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Team</th>
        <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Rate</th>
        <th class="px-4 py-2.5" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">
          {{ row.name }}
          <AppBadge v-if="row.isProtected" tone="slate" class="ml-2">protected</AppBadge>
        </td>
        <td class="px-4 py-3 text-[13px] text-gray-500">
          {{ teams?.find(t => t.id === row.teamId)?.name ?? '—' }}
        </td>
        <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#0A0A0A]">{{ row.commissionRate }}%</td>
        <td class="px-4 py-3 text-right">
          <div v-if="!(isAdmin && isOwnerProtected(row))" class="inline-flex gap-1.5">
            <AppButton size="sm" variant="secondary" @click="editing = row">Edit</AppButton>
            <AppButton size="sm" variant="danger" :disabled="row.isProtected" @click="remove(row)">Delete</AppButton>
          </div>
        </td>
      </template>
    </AppTable>

    <AppModal :open="showAdd" :title="editing ? 'Edit ambassador' : 'New ambassador'" @close="closeModal">
      <div class="space-y-3">
        <AppInput v-model="form.name" label="Name" />
        <AppSelect
          v-model="form.teamId"
          :options="[{ value: '', label: '— No team —' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]"
          label="Team"
        />
        <AppInput v-model="form.commissionRate" type="number" label="Commission rate (%)" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeModal">Cancel</AppButton>
        <AppButton @click="save">{{ editing ? 'Save changes' : 'Create' }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
