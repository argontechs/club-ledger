<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'

interface Role {
  id?: number
  name: string
  tier: 'admin' | 'ambassador'
  baseRate: string | number
  bonusRate: string | number | null
  kpiThreshold: string | number | null
  requiresKpi: number | boolean
  isSystem?: number
}

const props = defineProps<{ open: boolean; role: Role | null }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'saved'): void }>()

const auth = useAuthStore()
const isOwner = computed(() => !!(auth.user as any)?.isOwner)
import { currencySymbol } from '~/utils/currency'
const m = useAPIMutation()
const toast = useToast()
const saving = ref(false)

const blank = (): Role => ({
  name: '', tier: 'ambassador', baseRate: 0, bonusRate: null,
  kpiThreshold: null, requiresKpi: false, isSystem: 0,
})
const form = ref<Role>(blank())

watch(() => props.role, (r) => {
  form.value = r ? {
    ...r,
    baseRate: Number(r.baseRate),
    bonusRate: r.bonusRate === null ? null : Number(r.bonusRate),
    kpiThreshold: r.kpiThreshold === null ? null : Number(r.kpiThreshold),
    requiresKpi: !!r.requiresKpi,
  } : blank()
}, { immediate: true })

const isEdit = computed(() => !!props.role?.id)
const isSystemRole = computed(() => !!props.role?.isSystem)
const showKpi = computed(() => form.value.tier === 'ambassador' && Number(form.value.bonusRate) > 0)

async function save() {
  saving.value = true
  try {
    const payload = {
      name: typeof form.value.name === 'string' ? form.value.name.trim() : form.value.name,
      tier: form.value.tier,
      baseRate: Number(form.value.baseRate),
      bonusRate: form.value.bonusRate === null || form.value.bonusRate === '' ? null : Number(form.value.bonusRate),
      requiresKpi: !!form.value.requiresKpi,
      kpiThreshold: form.value.kpiThreshold === null || form.value.kpiThreshold === '' ? null : Number(form.value.kpiThreshold),
    }
    if (isEdit.value) await m.put(`/roles/${props.role!.id}`, payload)
    else await m.post('/roles', payload)
    emit('saved')
    emit('close')
    toast.success(isEdit.value ? 'Role updated' : 'Role created')
  } catch (e: any) {
    toast.error(e?.data?.error?.message || 'Failed to save role')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal :open="open" :title="isEdit ? 'Edit role' : 'New role'" size="md" @close="emit('close')">
    <div class="space-y-4">
      <AppInput v-model="form.name" label="Role name" :disabled="isSystemRole" />
      <AppSelect
        v-model="form.tier"
        :options="[
          { value: 'ambassador', label: 'Ambassador tier — own-sales bonus, optional KPI' },
          { value: 'admin', label: 'Admin tier — company-pool bonus, full permissions', disabled: !isOwner },
        ]"
        :disabled="isSystemRole"
        label="Tier"
      />
      <AppInput v-model="form.baseRate" type="number" label="Base commission rate (%)" />
      <AppInput v-model="form.bonusRate" type="number" label="Bonus commission rate (%) — optional, leave blank for none" />
      <div v-if="showKpi" class="space-y-3 p-3 rounded-lg bg-[var(--color-surface-2)]">
        <label class="flex items-center gap-2 text-[13px] cursor-pointer">
          <input v-model="form.requiresKpi" type="checkbox" class="w-4 h-4 rounded" />
          Requires KPI to earn bonus
        </label>
        <AppInput v-if="form.requiresKpi" v-model="form.kpiThreshold" type="number" :label="`KPI threshold (${currencySymbol()} own monthly sales)`" />
      </div>
      <p class="text-[11px] text-[var(--color-muted-2)]">
        Changes affect future sale confirmations only. Bonus uses current settings until the month's batch payout is created.
      </p>
    </div>
    <template #footer>
      <AppButton variant="secondary" @click="emit('close')">Cancel</AppButton>
      <AppButton :disabled="saving || !String(form.name).trim()" @click="save">
        {{ saving ? 'Saving…' : (isEdit ? 'Save' : 'Create') }}
      </AppButton>
    </template>
  </AppModal>
</template>
