<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
definePageMeta({ middleware: ['role'] })

const { data: rows, refresh } = useAPI<any[]>('/ambassadors')
const { data: teams } = useAPI<any[]>('/teams')
const { data: rolesList } = useAPI<any[]>('/roles')
const ambassadorRoles = computed(() => (rolesList.value ?? []).filter(r => r.tier === 'ambassador'))
const defaultRoleId = computed(() => ambassadorRoles.value.find(r => r.name === 'ambassador')?.id ?? ambassadorRoles.value[0]?.id ?? null)

const auth = useAuthStore()
const m = useAPIMutation()
const confirm = useConfirm()
const toast = useToast()
const showAdd = ref(false)
const editing = ref<any | null>(null)
const saving = ref(false)

const page = ref(1)
const perPage = ref(25)
const pagedRows = computed(() => {
  const list = rows.value ?? []
  const start = (page.value - 1) * perPage.value
  return list.slice(start, start + perPage.value)
})

type FormState = {
  name: string
  fullName: string
  ic: string
  teamId: number | null
  roleId: number | null
  bankName: string
  bankAccountNumber: string
  bankOwnerName: string
}

const blankForm = (): FormState => ({
  name: '',
  fullName: '',
  ic: '',
  teamId: null,
  roleId: defaultRoleId.value,
  bankName: '',
  bankAccountNumber: '',
  bankOwnerName: '',
})

const form = ref<FormState>(blankForm())

watch(showAdd, (v) => { if (v && !editing.value) form.value = blankForm() })
watch(editing, (v) => {
  if (v) {
    form.value = {
      name: v.name ?? '',
      fullName: v.fullName ?? '',
      ic: v.ic ?? '',
      teamId: v.teamId,
      roleId: v.roleId ?? defaultRoleId.value,
      bankName: v.bankName ?? '',
      bankAccountNumber: v.bankAccountNumber ?? '',
      bankOwnerName: v.bankOwnerName ?? '',
    }
    showAdd.value = true
  }
})

async function save() {
  if (!form.value.name.trim()) { toast.error('Name is required'); return }
  if (!form.value.roleId) { toast.error('Role is required'); return }
  const teamRaw = form.value.teamId
  const teamId = teamRaw === '' as any || teamRaw === null || teamRaw === undefined ? null : Number(teamRaw)
  const payload = {
    name: form.value.name.trim(),
    fullName: form.value.fullName.trim() || null,
    ic: form.value.ic.trim() || null,
    teamId,
    roleId: Number(form.value.roleId),
    bankName: form.value.bankName.trim() || null,
    bankAccountNumber: form.value.bankAccountNumber.trim() || null,
    bankOwnerName: form.value.bankOwnerName.trim() || null,
  }
  const wasEditing = !!editing.value
  saving.value = true
  try {
    if (editing.value) await m.put(`/ambassadors/${editing.value.id}`, payload)
    else await m.post('/ambassadors', payload)
    showAdd.value = false; editing.value = null
    await refresh()
    toast.success(wasEditing ? 'Ambassador updated' : 'Ambassador created')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to save ambassador')
  } finally {
    saving.value = false
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

function isOwnerProtected(row: any) { return !!row.isProtected }
const isAdmin = computed(() => auth.user?.tier === 'admin' && auth.user?.role !== 'owner')
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p class="text-[13px] text-[var(--color-muted)]">
        Manage ambassadors, their team, role, and bank details.
      </p>
      <AppButton class="w-full sm:w-auto" @click="showAdd = true">+ New ambassador</AppButton>
    </div>

    <AppTable :rows="pagedRows" empty-text="No ambassadors yet">
      <template #head>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Name</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Team</th>
        <th class="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Role</th>
        <th class="px-4 py-3" />
      </template>
      <template #row="{ row }">
        <td class="px-4 py-3 text-[13px] font-medium text-[var(--color-ink)]">
          <span class="inline-flex items-center gap-2">
            {{ row.name }}
            <AppBadge v-if="row.isProtected" tone="slate" :dot="false" shape="square">Protected</AppBadge>
          </span>
        </td>
        <td class="px-4 py-3 text-[13px] text-[var(--color-muted)]">
          {{ teams?.find(t => t.id === row.teamId)?.name ?? '—' }}
        </td>
        <td class="px-4 py-3 text-[13px]">
          <AppBadge tone="slate" :dot="false" shape="square">
            {{ rolesList?.find(r => r.id === row.roleId)?.name ?? '—' }}
          </AppBadge>
        </td>
        <td class="px-4 py-3 text-right">
          <div v-if="!(isAdmin && isOwnerProtected(row))" class="inline-flex gap-1.5">
            <AppButton size="sm" variant="secondary" @click="editing = row">Edit</AppButton>
            <AppButton size="sm" variant="danger" :disabled="row.isProtected" @click="remove(row)">Delete</AppButton>
          </div>
        </td>
      </template>
    </AppTable>

    <AppPagination
      v-if="(rows ?? []).length > 0"
      :total="(rows ?? []).length"
      :page="page"
      :per-page="perPage"
      @update:page="page = $event"
      @update:per-page="perPage = $event"
    />

    <AppModal
      :open="showAdd"
      :title="editing ? 'Edit ambassador' : 'New ambassador'"
      size="lg"
      @close="closeModal"
    >
      <div class="space-y-6">
        <!-- Personal -->
        <section class="space-y-3">
          <h4 class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Personal</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AppInput v-model="form.name" label="Name (alias)" placeholder="e.g. Johnny" />
            <AppInput v-model="form.fullName" label="Full legal name" placeholder="Optional" />
            <div class="md:col-span-2">
              <AppInput v-model="form.ic" label="IC / Passport" placeholder="Optional" />
            </div>
          </div>
        </section>

        <!-- Assignment -->
        <section class="space-y-3">
          <h4 class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Assignment</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AppSelect
              v-model="form.teamId"
              :options="[{ value: '', label: '— No team —' }, ...(teams ?? []).map(t => ({ value: t.id, label: t.name }))]"
              label="Team"
            />
            <AppSelect
              v-model="form.roleId"
              :options="(rolesList ?? []).filter(r => r.tier === 'ambassador' || r.id === form.roleId).map(r => ({ value: r.id, label: r.name }))"
              label="Role"
            />
          </div>
        </section>

        <!-- Bank details -->
        <section class="space-y-3">
          <h4 class="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Bank details</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AppInput v-model="form.bankName" label="Bank name" placeholder="e.g. Maybank" />
            <AppInput v-model="form.bankAccountNumber" label="Account number" placeholder="Optional" />
            <div class="md:col-span-2">
              <AppInput v-model="form.bankOwnerName" label="Account holder name" placeholder="Optional" />
            </div>
          </div>
        </section>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="closeModal">Cancel</AppButton>
        <AppButton :disabled="saving || !form.name.trim()" @click="save">
          {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create') }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
