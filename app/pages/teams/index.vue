<script setup lang="ts">
definePageMeta({ middleware: ['role'] })
const { data: rows, refresh } = useAPI<any[]>('/teams')
const m = useAPIMutation()
const newName = ref('')

async function add() {
  if (!newName.value) return
  await m.post('/teams', { name: newName.value })
  newName.value = ''
  await refresh()
}
async function remove(id: number) { await m.del(`/teams/${id}`); await refresh() }
</script>
<template>
  <div class="space-y-4">
    <h1 class="text-xl font-semibold">Teams</h1>
    <div class="flex gap-2">
      <AppInput v-model="newName" placeholder="New team name" />
      <AppButton @click="add">Add</AppButton>
    </div>
    <AppTable :rows="rows ?? []" empty-text="None">
      <template #head><th class="p-2">Name</th><th class="p-2"></th></template>
      <template #row="{ row }">
        <td class="p-2">{{ row.name }}</td>
        <td class="p-2 text-right"><AppButton variant="danger" @click="remove(row.id)">Delete</AppButton></td>
      </template>
    </AppTable>
  </div>
</template>
