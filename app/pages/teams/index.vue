<script setup lang="ts">
definePageMeta({ middleware: ['role'] })
const { data: rows, refresh } = useAPI<any[]>('/teams')
const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()
const newName = ref('')

async function add() {
  if (!newName.value.trim()) return
  try {
    await m.post('/teams', { name: newName.value.trim() })
    newName.value = ''
    await refresh()
    toast.success('Team created')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to create team')
  }
}
async function remove(id: number, name: string) {
  if (!await confirm(`Delete team "${name}"?`, { tone: 'danger', confirmText: 'Delete' })) return
  try {
    await m.del(`/teams/${id}`)
    await refresh()
    toast.success('Team deleted')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to delete team')
  }
}
</script>

<template>
  <div class="space-y-5 max-w-3xl">
    <div class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
      <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-3">Add team</h3>
      <div class="flex flex-col sm:flex-row gap-2">
        <div class="flex-1">
          <AppInput v-model="newName" placeholder="e.g. Floor A" />
        </div>
        <AppButton class="w-full sm:w-auto" :disabled="!newName.trim()" @click="add">Add</AppButton>
      </div>
    </div>

    <AppTable :rows="rows ?? []" empty-text="No teams yet">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Name</th>
        <th class="px-4 py-2.5" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">{{ row.name }}</td>
        <td class="px-4 py-3 text-right">
          <AppButton size="sm" variant="danger" @click="remove(row.id, row.name)">Delete</AppButton>
        </td>
      </template>
    </AppTable>
  </div>
</template>
