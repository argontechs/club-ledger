<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useClub } from '~/composables/useClub'
definePageMeta({ middleware: ['role'] })

const { data: rows, refresh } = useAPI<any[]>('/ambassadors')
const { data: teams } = useAPI<any[]>('/teams')
const { data: rolesList } = useAPI<any[]>('/roles')
const ambassadorRoles = computed(() => (rolesList.value ?? []).filter(r => r.tier === 'ambassador'))
const defaultRoleId = computed(() => ambassadorRoles.value.find(r => r.name === 'ambassador')?.id ?? ambassadorRoles.value[0]?.id ?? null)

// Cross-club import: copy ambassadors (identity + bank details) from another club.
const { clubs, activeClubId, activeClub } = useClub()
const otherClubs = computed(() => clubs.value.filter(c => c.id !== activeClubId.value))
const showImport = ref(false)
const importSourceClubId = ref<number | null>(null)
const importRoleId = ref<number | null>(null)
const importSelected = ref<Set<number>>(new Set())
const importCandidates = ref<any[]>([])
const importLoading = ref(false)
const importing = ref(false)

watch(showImport, (v) => {
  if (v) {
    importSourceClubId.value = otherClubs.value[0]?.id ?? null
    importRoleId.value = defaultRoleId.value
    importSelected.value = new Set()
    importCandidates.value = []
    if (importSourceClubId.value) loadImportCandidates()
  }
})
watch(importSourceClubId, () => { if (showImport.value) loadImportCandidates() })

async function loadImportCandidates() {
  if (!importSourceClubId.value) return
  importLoading.value = true
  importSelected.value = new Set()
  try {
    // Fetch the source club's ambassadors by overriding the club header.
    const auth = useAuthStore()
    const list = await $fetch<any[]>('/api/v1/ambassadors', {
      headers: {
        authorization: auth.token ? `Bearer ${auth.token}` : '',
        'x-club-id': String(importSourceClubId.value),
      },
    })
    const existingIcs = new Set((rows.value ?? []).map(r => r.ic).filter(Boolean))
    importCandidates.value = (list ?? [])
      .filter(a => !a.isProtected)
      .map(a => ({ ...a, alreadyHere: !!(a.ic && existingIcs.has(a.ic)) }))
  } catch {
    importCandidates.value = []
  } finally {
    importLoading.value = false
  }
}

function toggleImport(id: number) {
  const s = new Set(importSelected.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  importSelected.value = s
}

async function runImport() {
  if (!importSelected.value.size || !importRoleId.value || importing.value) return
  importing.value = true
  try {
    const r = await m.post<{ created: number }>('/ambassadors/import', {
      sourceAmbassadorIds: Array.from(importSelected.value),
      roleId: Number(importRoleId.value),
    })
    showImport.value = false
    await refresh()
    toast.success(`Imported ${r.created} ambassador${r.created === 1 ? '' : 's'} into ${activeClub.value?.name ?? 'this club'}`)
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Import failed')
  } finally {
    importing.value = false
  }
}

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
      <div class="flex flex-col sm:flex-row gap-2">
        <AppButton v-if="otherClubs.length" class="w-full sm:w-auto" variant="secondary" @click="showImport = true">
          Import from club
        </AppButton>
        <AppButton class="w-full sm:w-auto" @click="showAdd = true">+ New ambassador</AppButton>
      </div>
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

    <AppModal :open="showImport" title="Import ambassadors from another club" size="lg" @close="showImport = false">
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AppSelect
            v-model="importSourceClubId"
            :options="otherClubs.map(c => ({ value: c.id, label: c.name }))"
            label="Source club"
          />
          <AppSelect
            v-model="importRoleId"
            :options="ambassadorRoles.map(r => ({ value: r.id, label: r.name }))"
            label="Role in this club"
          />
        </div>
        <p class="text-[12px] text-[var(--color-muted)]">
          Copies name, IC, and bank details into {{ activeClub?.name ?? 'this club' }}. Sales history stays with the source club.
        </p>
        <div class="max-h-72 overflow-y-auto rounded-xl border border-[var(--color-border-2)] divide-y divide-[var(--color-border-2)]">
          <p v-if="importLoading" class="px-4 py-3 text-[13px] text-[var(--color-muted-2)]">Loading…</p>
          <p v-else-if="!importCandidates.length" class="px-4 py-3 text-[13px] text-[var(--color-muted-2)]">No ambassadors in that club.</p>
          <label
            v-for="a in importCandidates"
            :key="a.id"
            class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--color-hairline)]"
          >
            <input
              type="checkbox"
              class="accent-[var(--color-brand)]"
              :checked="importSelected.has(a.id)"
              @change="toggleImport(a.id)"
            >
            <span class="flex-1 min-w-0">
              <span class="block text-[13px] font-medium text-[var(--color-ink)] truncate">{{ a.name }}</span>
              <span v-if="a.fullName" class="block text-[11px] text-[var(--color-muted-2)] truncate">{{ a.fullName }}</span>
            </span>
            <AppBadge v-if="a.alreadyHere" tone="amber" :dot="false" shape="square">Same IC exists here</AppBadge>
          </label>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showImport = false">Cancel</AppButton>
        <AppButton :disabled="importing || !importSelected.size || !importRoleId" @click="runImport">
          {{ importing ? 'Importing…' : `Import ${importSelected.size || ''}` }}
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>
