<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['role'] })

const auth = useAuthStore()
const { data: users, refresh } = useAPI<any[]>('/users')
const { data: ambassadors } = useAPI<any[]>('/ambassadors')
const { data: roles } = useAPI<any[]>('/roles')

const roleOptions = computed(() => (roles.value ?? []).map(r => ({ value: r.id, label: r.name })))

const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()
const showAdd = ref(false)
const editing = ref<any | null>(null)
const form = ref({ email: '', name: '', password: '', roleId: 0, ambassadorId: null as number | null })

watch(showAdd, (v) => {
  if (v && !editing.value) {
    const ambassadorRoleId = roles.value?.find(r => r.name === 'ambassador')?.id ?? 0
    form.value = { email: '', name: '', password: '', roleId: ambassadorRoleId, ambassadorId: null }
  }
})
watch(editing, (v) => {
  if (v) {
    const matchedRole = roles.value?.find(r => r.name === v.role)
    form.value = { email: v.email, name: v.name, password: '', roleId: matchedRole?.id ?? 0, ambassadorId: v.ambassadorId }
    showAdd.value = true
  }
})

async function save() {
  const payload: any = {
    email: form.value.email, name: form.value.name,
    roleId: Number(form.value.roleId), ambassadorId: form.value.ambassadorId,
  }
  if (form.value.password) payload.password = form.value.password
  const wasEditing = !!editing.value
  try {
    if (editing.value) await m.put(`/users/${editing.value.id}`, payload)
    else await m.post('/users', { ...payload, password: form.value.password || 'password' })
    showAdd.value = false; editing.value = null
    await refresh()
    toast.success(wasEditing ? 'User updated' : 'User created')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to save user')
  }
}

function closeModal() {
  showAdd.value = false
  editing.value = null
}

async function remove(row: any) {
  if (!await confirm(`Delete user ${row.name}?`, { tone: 'danger', confirmText: 'Delete' })) return
  try {
    await m.del(`/users/${row.id}`)
    await refresh()
    toast.success('User deleted')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to delete user')
  }
}

const isAdmin = computed(() => auth.user?.role === 'admin')
function isOwner(u: any) { return u.role === 'owner' }

const roleTone = (r: string) => {
  if (r === 'owner' || r === 'admin') return 'rose'
  if (r === 'leader') return 'amber'
  return 'slate'
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
      <AppButton class="w-full sm:w-auto" @click="showAdd = true">+ New user</AppButton>
    </div>

    <AppTable :rows="users ?? []" empty-text="No users">
      <template #head>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Name</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Email</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Role</th>
        <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Linked ambassador</th>
        <th class="px-4 py-2.5" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">{{ row.name }}</td>
        <td class="px-4 py-3 text-[13px] text-gray-500">{{ row.email }}</td>
        <td class="px-4 py-3"><AppBadge :tone="roleTone(row.role)">{{ row.role }}</AppBadge></td>
        <td class="px-4 py-3 text-[13px] text-gray-500">
          {{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? '—' }}
        </td>
        <td class="px-4 py-3 text-right">
          <div v-if="!(isAdmin && isOwner(row))" class="inline-flex gap-1.5">
            <AppButton size="sm" variant="secondary" @click="editing = row">Edit</AppButton>
            <AppButton v-if="row.role !== 'owner'" size="sm" variant="danger" @click="remove(row)">Delete</AppButton>
          </div>
        </td>
      </template>
    </AppTable>

    <AppModal :open="showAdd" :title="editing ? 'Edit user' : 'New user'" @close="closeModal">
      <div class="space-y-3">
        <AppInput v-model="form.name" label="Name" />
        <AppInput v-model="form.email" type="email" label="Email" />
        <AppInput
          v-model="form.password" type="password"
          :label="editing ? 'New password (optional)' : 'Password'"
        />
        <AppSelect v-model="form.roleId" label="Role" :options="roleOptions" />
        <AppSelect
          v-model="form.ambassadorId"
          label="Linked ambassador (optional)"
          :options="[{ value: '', label: '— None —' }, ...(ambassadors ?? []).map(a => ({ value: a.id, label: a.name }))]"
        />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeModal">Cancel</AppButton>
        <AppButton @click="save">{{ editing ? 'Save changes' : 'Create user' }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
