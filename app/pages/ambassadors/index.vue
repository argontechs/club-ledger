<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['role'] })

const { data: rows, refresh } = useAPI<any[]>('/ambassadors')
const { data: teams } = useAPI<any[]>('/teams')
const { data: settings } = useAPI<Record<string, string>>('/settings')

const auth = useAuthStore()
const m = useAPIMutation()
const confirm = useConfirm()
const showAdd = ref(false)
const editing = ref<any | null>(null)

const defaultRate = computed(() => Number(settings.value?.default_commission_rate ?? 8))
const form = ref<{ name: string; teamId: number | null; commissionRate: number }>(
  { name: '', teamId: null, commissionRate: 8 })

watch(showAdd, (v) => { if (v) form.value = { name: '', teamId: null, commissionRate: defaultRate.value } })
watch(editing, (v) => { if (v) form.value = { name: v.name, teamId: v.teamId, commissionRate: Number(v.commissionRate) } })

async function save() {
  const payload = { name: form.value.name, teamId: form.value.teamId, commissionRate: Number(form.value.commissionRate) }
  if (editing.value) await m.put(`/ambassadors/${editing.value.id}`, payload)
  else await m.post('/ambassadors', payload)
  showAdd.value = false; editing.value = null
  await refresh()
}

async function remove(row: any) {
  if (!await confirm(`Delete ${row.name}?`)) return
  await m.del(`/ambassadors/${row.id}`); await refresh()
}

function isOwnerProtected(row: any) { return row.name === 'Johnny' }
const isAdmin = computed(() => auth.user?.role === 'admin')
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Ambassadors</h1>
      <AppButton @click="showAdd = true">+ New ambassador</AppButton>
    </div>

    <AppTable :rows="rows ?? []" empty-text="None">
      <template #head>
        <th class="p-2">Name</th><th class="p-2">Team</th>
        <th class="p-2 text-right">Rate</th><th class="p-2"></th>
      </template>
      <template #row="{ row }">
        <td class="p-2">{{ row.name }} <span v-if="row.isProtected" class="text-xs text-slate-400">(protected)</span></td>
        <td class="p-2">{{ teams?.find(t => t.id === row.teamId)?.name ?? '-' }}</td>
        <td class="p-2 text-right">{{ row.commissionRate }}%</td>
        <td class="p-2 text-right space-x-2">
          <template v-if="!(isAdmin && isOwnerProtected(row))">
            <AppButton variant="secondary" @click="editing = row; showAdd = true">Edit</AppButton>
            <AppButton variant="danger" :disabled="row.isProtected" @click="remove(row)">Delete</AppButton>
          </template>
        </td>
      </template>
    </AppTable>

    <AppModal :open="showAdd" :title="editing ? 'Edit ambassador' : 'New ambassador'" @close="showAdd = false; editing = null">
      <div class="space-y-3">
        <AppInput v-model="form.name" label="Name" />
        <AppSelect v-model="form.teamId"
          :options="[{ value: '', label: '— No team —' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]"
          label="Team" />
        <AppInput v-model="form.commissionRate" type="number" label="Commission rate (%)" />
        <AppButton @click="save">Save</AppButton>
      </div>
    </AppModal>
  </div>
</template>
