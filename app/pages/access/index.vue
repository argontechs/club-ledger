<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['role'] })

const auth = useAuthStore()
const { data: users, refresh } = useAPI<any[]>('/users')
const { data: ambassadors } = useAPI<any[]>('/ambassadors')
const { data: roles } = useAPI<any[]>('/roles')

const roleOptions = computed(() => (roles.value ?? []).map(r => ({ value: r.id, label: r.name })))

const m = useAPIMutation()
const showAdd = ref(false)
const editing = ref<any | null>(null)
const form = ref({ email: '', name: '', password: '', roleId: 0, ambassadorId: null as number | null })

watch(showAdd, (v) => {
  if (v) {
    const ambassadorRoleId = roles.value?.find(r => r.name === 'ambassador')?.id ?? 0
    form.value = { email: '', name: '', password: '', roleId: ambassadorRoleId, ambassadorId: null }
    editing.value = null
  }
})
watch(editing, (v) => {
  if (v) {
    const matchedRole = roles.value?.find(r => r.name === v.role)
    form.value = { email: v.email, name: v.name, password: '', roleId: matchedRole?.id ?? 0, ambassadorId: v.ambassadorId }
  }
})

async function save() {
  const payload: any = { email: form.value.email, name: form.value.name, roleId: Number(form.value.roleId), ambassadorId: form.value.ambassadorId }
  if (form.value.password) payload.password = form.value.password
  if (editing.value) await m.put(`/users/${editing.value.id}`, payload)
  else await m.post('/users', { ...payload, password: form.value.password || 'password' })
  showAdd.value = false; await refresh()
}

async function remove(id: number) { await m.del(`/users/${id}`); await refresh() }

const isAdmin = computed(() => auth.user?.role === 'admin')
function isOwner(u: any) { return u.role === 'owner' }
</script>
<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-semibold">Access</h1>
      <AppButton @click="showAdd = true">+ New user</AppButton>
    </div>

    <AppTable :rows="users ?? []" empty-text="None">
      <template #head>
        <th class="p-2">Name</th><th class="p-2">Email</th><th class="p-2">Role</th>
        <th class="p-2">Ambassador</th><th class="p-2"></th>
      </template>
      <template #row="{ row }">
        <td class="p-2">{{ row.name }}</td>
        <td class="p-2">{{ row.email }}</td>
        <td class="p-2">{{ row.role }}</td>
        <td class="p-2">{{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? '-' }}</td>
        <td class="p-2 text-right space-x-2">
          <template v-if="!(isAdmin && isOwner(row))">
            <AppButton variant="secondary" @click="editing = row; showAdd = true">Edit</AppButton>
            <AppButton v-if="row.role !== 'owner'" variant="danger" @click="remove(row.id)">Delete</AppButton>
          </template>
        </td>
      </template>
    </AppTable>

    <AppModal :open="showAdd" :title="editing ? 'Edit user' : 'New user'" @close="showAdd = false">
      <div class="space-y-3">
        <AppInput v-model="form.name" label="Name" />
        <AppInput v-model="form.email" type="email" label="Email" />
        <AppInput v-model="form.password" type="password"
          :label="editing ? 'New password (optional)' : 'Password'" />
        <AppSelect v-model="form.roleId" label="Role" :options="roleOptions" />
        <AppSelect v-model="form.ambassadorId" label="Linked ambassador (optional)"
          :options="[{ value: '', label: '— None —' }, ...(ambassadors ?? []).map(a => ({ value: a.id, label: a.name }))]" />
        <AppButton @click="save">Save</AppButton>
      </div>
    </AppModal>
  </div>
</template>
