<script setup lang="ts">
definePageMeta({ middleware: ['role'] })
const { data: rows, refresh } = useAPI<any[]>('/teams')
const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()

const showAdd = ref(false)
const editing = ref<any | null>(null)
const newName = ref('')
const saving = ref(false)

watch(showAdd, (v) => { if (v && !editing.value) newName.value = '' })
watch(editing, (v) => {
  if (v) {
    newName.value = v.name
    showAdd.value = true
  }
})

async function save() {
  if (!newName.value.trim()) return
  saving.value = true
  const wasEditing = !!editing.value
  try {
    if (editing.value) await m.put(`/teams/${editing.value.id}`, { name: newName.value.trim() })
    else await m.post('/teams', { name: newName.value.trim() })
    closeModal()
    await refresh()
    toast.success(wasEditing ? 'Team updated' : 'Team created')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to save team')
  } finally {
    saving.value = false
  }
}

function closeModal() {
  showAdd.value = false
  editing.value = null
  newName.value = ''
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
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p class="text-[13px] text-gray-500">Group ambassadors into teams (e.g. by floor or shift).</p>
      <AppButton class="w-full sm:w-auto" @click="showAdd = true">+ New team</AppButton>
    </div>

    <AppTable :rows="rows ?? []" empty-text="No teams yet">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Name</th>
        <th class="px-4 py-2.5" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">{{ row.name }}</td>
        <td class="px-4 py-3 text-right">
          <div class="inline-flex gap-1.5">
            <AppButton size="sm" variant="secondary" @click="editing = row">Edit</AppButton>
            <AppButton size="sm" variant="danger" @click="remove(row.id, row.name)">Delete</AppButton>
          </div>
        </td>
      </template>
    </AppTable>

    <AppModal
      :open="showAdd"
      :title="editing ? 'Edit team' : 'New team'"
      @close="closeModal"
    >
      <div class="space-y-3">
        <AppInput v-model="newName" label="Team name" placeholder="e.g. Team Johnny" />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeModal">Cancel</AppButton>
        <AppButton :disabled="!newName.trim() || saving" @click="save">
          {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
