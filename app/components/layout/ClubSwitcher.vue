<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ChevronUpDownIcon, CheckIcon, PlusIcon, BuildingStorefrontIcon } from '@heroicons/vue/24/outline'
import { useAuthStore } from '~/stores/auth'
import { useClub } from '~/composables/useClub'
import { useAPIMutation } from '~/composables/useAPIMutation'
import { useToast } from '~/composables/useToast'

const auth = useAuthStore()
const { clubs, activeClub, setClub, refreshClubs } = useClub()
const m = useAPIMutation()
const toast = useToast()

const open = ref(false)
const search = ref('')
const showCreate = ref(false)
const newName = ref('')
const creating = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const isAdmin = computed(() => auth.user?.tier === 'admin')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return q ? clubs.value.filter(c => c.name.toLowerCase().includes(q)) : clubs.value
})

function pick(id: number) {
  setClub(id)
  open.value = false
  search.value = ''
}

async function createClub() {
  const name = newName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const club = await m.post<{ id: number }>('/clubs', { name })
    await refreshClubs()
    if (club?.id) setClub(club.id)
    toast.success(`Club “${name}” created`)
    showCreate.value = false
    newName.value = ''
    open.value = false
  } catch (e: any) {
    toast.error(e?.data?.error?.message ?? 'Could not create club')
  } finally {
    creating.value = false
  }
}

function onDocClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootEl" class="relative px-2.5 pb-1">
    <button
      type="button"
      data-tour="club-switcher"
      class="press w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--color-border-2)] bg-[var(--color-hairline)] text-left hover:border-[var(--color-border)]"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <BuildingStorefrontIcon class="w-4 h-4 shrink-0 text-[var(--color-muted-2)]" aria-hidden="true" />
      <span class="flex-1 min-w-0 text-[12px] font-semibold text-[var(--color-ink)] truncate">
        {{ activeClub?.name ?? 'Select club' }}
      </span>
      <ChevronUpDownIcon class="w-4 h-4 shrink-0 text-[var(--color-muted-2)]" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="absolute left-2.5 right-2.5 top-full mt-1 z-50 rounded-xl border border-[var(--color-border-2)] bg-[var(--color-card)] shadow-card overflow-hidden"
      role="listbox"
    >
      <input
        v-if="clubs.length > 6"
        v-model="search"
        type="text"
        placeholder="Search clubs…"
        class="w-full px-3 py-2 text-[12px] border-b border-[var(--color-border-2)] bg-transparent outline-none"
      />
      <div class="max-h-56 overflow-y-auto py-1">
        <button
          v-for="c in filtered"
          :key="c.id"
          type="button"
          role="option"
          :aria-selected="c.id === activeClub?.id"
          class="press w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-left hover:bg-[var(--color-hairline)]"
          :class="c.id === activeClub?.id ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-muted)]'"
          @click="pick(c.id)"
        >
          <span class="flex-1 min-w-0 truncate">{{ c.name }}</span>
          <CheckIcon v-if="c.id === activeClub?.id" class="w-4 h-4 shrink-0 text-[var(--color-brand)]" aria-hidden="true" />
        </button>
        <p v-if="!filtered.length" class="px-3 py-2 text-[12px] text-[var(--color-muted-2)]">No clubs found.</p>
      </div>
      <button
        v-if="isAdmin"
        type="button"
        class="press w-full flex items-center gap-2 px-3 py-2 text-[12.5px] font-medium text-[var(--color-brand)] border-t border-[var(--color-border-2)] hover:bg-[var(--color-hairline)]"
        @click="showCreate = true; open = false"
      >
        <PlusIcon class="w-4 h-4 shrink-0" aria-hidden="true" />
        New club
      </button>
    </div>

    <AppModal :open="showCreate" title="New club" @close="showCreate = false">
      <div class="space-y-3">
        <AppInput
          v-model="newName"
          label="Club name"
          placeholder="e.g. Neon KL"
          @keyup.enter="createClub"
        />
        <p class="text-[12px] text-[var(--color-muted-2)]">
          The new club starts with its own Leader and Ambassador commission roles — adjust the rates in Roles after switching.
        </p>
      </div>
      <template #footer>
        <AppButton variant="ghost" @click="showCreate = false">Cancel</AppButton>
        <AppButton :disabled="creating || !newName.trim()" @click="createClub">Create club</AppButton>
      </template>
    </AppModal>
  </div>
</template>
