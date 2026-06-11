<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useClub } from '~/composables/useClub'
import { PERMISSION_MODULES, MODULE_LABELS, defaultPermissions, type PermissionLevel } from '~~/shared/permissions'
definePageMeta({ middleware: ['role'] })

const auth = useAuthStore()
const { data: users, refresh } = useAPI<any[]>('/users')
const { data: ambassadors } = useAPI<any[]>('/ambassadors')
// Logins hold company-level staff roles; club commission roles live on the Roles page.
const { data: roles } = useAPI<any[]>('/roles?scope=staff')

const roleOptions = computed(() => (roles.value ?? []).map(r => ({ value: r.id, label: r.name })))

const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()
const showAdd = ref(false)
const editing = ref<any | null>(null)
const form = ref({ email: '', name: '', password: '', roleId: 0, ambassadorId: null as number | null })

// --- Owner-managed access (clubs + permission matrix) ---
const { clubs } = useClub()
const actorIsOwner = computed(() => !!(auth.user as any)?.isOwner)
const targetIsOwner = computed(() => !!editing.value && isOwner(editing.value))
const showAccessControls = computed(() => actorIsOwner.value && !targetIsOwner.value)
const allClubs = ref(true)
const selectedClubs = ref<Set<number>>(new Set())
const customPerms = ref(false)
const perms = ref<Record<string, PermissionLevel>>({})
const selectedRoleTier = computed(() => roles.value?.find(r => r.id === Number(form.value.roleId))?.tier ?? 'admin')

function seedAccess(u: any | null) {
  if (u && Array.isArray(u.clubAccess)) {
    allClubs.value = false
    selectedClubs.value = new Set(u.clubAccess)
  } else {
    allClubs.value = true
    selectedClubs.value = new Set()
  }
  if (u && u.permissions && Object.keys(u.permissions).length) {
    customPerms.value = true
    perms.value = { ...defaultPermissions(selectedRoleTier.value), ...u.permissions }
  } else {
    customPerms.value = false
    perms.value = { ...defaultPermissions(selectedRoleTier.value) }
  }
}
watch([customPerms, selectedRoleTier], () => {
  if (!customPerms.value) perms.value = { ...defaultPermissions(selectedRoleTier.value) }
})
function toggleClub(id: number) {
  const s = new Set(selectedClubs.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedClubs.value = s
}
function accessPayload() {
  if (!showAccessControls.value) return {}
  return {
    clubAccess: allClubs.value ? null : Array.from(selectedClubs.value),
    permissions: customPerms.value ? perms.value : null,
  }
}

watch(showAdd, (v) => {
  if (v && !editing.value) {
    const defaultRoleId = roles.value?.find(r => r.name === 'admin')?.id ?? roles.value?.[0]?.id ?? 0
    form.value = { email: '', name: '', password: '', roleId: defaultRoleId, ambassadorId: null }
    seedAccess(null)
  }
})
watch(editing, (v) => {
  if (v) {
    const matchedRole = roles.value?.find(r => r.name === v.role)
    form.value = { email: v.email, name: v.name, password: '', roleId: matchedRole?.id ?? 0, ambassadorId: v.ambassadorId }
    seedAccess(v)
    showAdd.value = true
  }
})

async function save() {
  const payload: any = {
    email: form.value.email, name: form.value.name,
    roleId: Number(form.value.roleId), ambassadorId: form.value.ambassadorId,
    ...accessPayload(),
  }
  if (form.value.password) payload.password = form.value.password
  const wasEditing = !!editing.value
  if (!wasEditing && form.value.password.length < 6) {
    toast.error('Set a password (at least 6 characters) for the new user')
    return
  }
  try {
    if (editing.value) await m.put(`/users/${editing.value.id}`, payload)
    else await m.post('/users', payload)
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

const isAdmin = computed(() => auth.user?.tier === 'admin' && !(auth.user as any)?.isOwner)
function isOwner(u: any) { return u.isOwner === 1 || u.isOwner === true }

const roleTone = (r: string) => {
  if (r === 'owner' || r === 'admin') return 'rose'
  if (r === 'leader') return 'amber'
  return 'slate'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p class="text-[13px] text-[var(--color-muted)] max-w-prose">
        Manage who can sign in. Roles control what they can see and edit.
      </p>
      <AppButton class="w-full sm:w-auto" @click="showAdd = true">+ New user</AppButton>
    </div>

    <AppTable :rows="users ?? []" empty-text="No users">
      <template #head>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Name</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Email</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Role</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Linked ambassador</th>
        <th class="px-4 py-3" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[var(--color-ink)]">{{ row.name }}</td>
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)]">{{ row.email }}</td>
        <td class="px-4 py-3"><AppBadge :tone="roleTone(row.role)">{{ row.role }}</AppBadge></td>
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)]">
          {{ ambassadors?.find(a => a.id === row.ambassadorId)?.name ?? '—' }}
        </td>
        <td class="px-4 py-3 text-right">
          <div v-if="!(isAdmin && isOwner(row))" class="inline-flex gap-1.5">
            <AppButton size="sm" variant="secondary" @click="editing = row">Edit</AppButton>
            <AppButton v-if="!isOwner(row)" size="sm" variant="danger" @click="remove(row)">Delete</AppButton>
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

        <template v-if="showAccessControls">
          <section class="space-y-2 pt-2 border-t border-[var(--color-border-2)]">
            <h4 class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Club access</h4>
            <label class="flex items-center gap-2 text-[13px] text-[var(--color-ink)] cursor-pointer">
              <input v-model="allClubs" type="checkbox" class="accent-[var(--color-brand)]">
              All clubs (including ones created later)
            </label>
            <div v-if="!allClubs" class="grid grid-cols-2 gap-1.5 pl-1">
              <label
                v-for="c in clubs" :key="c.id"
                class="flex items-center gap-2 text-[12.5px] text-[var(--color-muted)] cursor-pointer"
              >
                <input
                  type="checkbox" class="accent-[var(--color-brand)]"
                  :checked="selectedClubs.has(c.id)" @change="toggleClub(c.id)"
                >
                {{ c.name }}
              </label>
            </div>
          </section>

          <section class="space-y-2 pt-2 border-t border-[var(--color-border-2)]">
            <h4 class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Permissions</h4>
            <label class="flex items-center gap-2 text-[13px] text-[var(--color-ink)] cursor-pointer">
              <input v-model="customPerms" type="checkbox" class="accent-[var(--color-brand)]">
              Customise (otherwise the role's defaults apply)
            </label>
            <div v-if="customPerms" class="space-y-1 pl-1">
              <div
                v-for="m in PERMISSION_MODULES" :key="m"
                class="flex items-center justify-between gap-2 py-0.5"
              >
                <span class="text-[12.5px] text-[var(--color-muted)]">{{ MODULE_LABELS[m] }}</span>
                <div class="flex rounded-lg border border-[var(--color-border-2)] overflow-hidden">
                  <button
                    v-for="lvl in (['none', 'view', 'edit'] as const)" :key="lvl"
                    type="button"
                    class="press px-2.5 py-1 text-[11px] font-medium capitalize"
                    :class="perms[m] === lvl
                      ? 'bg-[var(--color-ink)] text-white'
                      : 'text-[var(--color-muted-2)] hover:bg-[var(--color-hairline)]'"
                    @click="perms[m] = lvl"
                  >{{ lvl }}</button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeModal">Cancel</AppButton>
        <AppButton @click="save">{{ editing ? 'Save changes' : 'Create user' }}</AppButton>
      </template>
    </AppModal>
  </div>
</template>
