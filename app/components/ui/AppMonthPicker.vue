<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  modelValue: string
  allowEmpty?: boolean
  label?: string
}>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const open = ref(false)
const today = new Date()

const currentYM = computed(() => {
  if (props.modelValue) {
    const [y, m] = props.modelValue.split('-').map(Number)
    return { year: y, month: m }
  }
  return { year: today.getFullYear(), month: today.getMonth() + 1 }
})

const viewYear = ref(currentYM.value.year)

watch(() => props.modelValue, () => { viewYear.value = currentYM.value.year })
watch(open, (v) => { if (v) viewYear.value = currentYM.value.year })

const monthLabel = computed(() => {
  if (!props.modelValue) return 'All time'
  const [y, m] = props.modelValue.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
})

function pick(monthIdx0: number) {
  const m = String(monthIdx0 + 1).padStart(2, '0')
  emit('update:modelValue', `${viewYear.value}-${m}`)
  open.value = false
}
function thisMonth() {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  emit('update:modelValue', `${y}-${m}`)
  open.value = false
}
function clear() {
  emit('update:modelValue', '')
  open.value = false
}

const root = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (!open.value) return
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="root" class="relative inline-block">
    <label v-if="label" class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{{ label }}</label>
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-2 border border-[#E0E0E0] rounded-lg text-[13px] bg-white hover:border-[#E11D48]/40 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/10 transition-colors min-w-[170px]"
      @click="open = !open"
    >
      <CalendarIcon class="w-4 h-4 text-gray-400" />
      <span class="text-[#0A0A0A] font-medium">{{ monthLabel }}</span>
      <span class="ml-auto text-gray-300 text-[10px]">▾</span>
    </button>

    <Transition name="fade">
      <div
        v-if="open"
        class="absolute z-50 mt-2 left-0 w-[280px] bg-white border border-[#E8E8EC] rounded-2xl shadow-lg p-3"
      >
        <!-- year nav -->
        <div class="flex items-center justify-between mb-2 px-1">
          <button
            type="button"
            class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            @click="viewYear--"
          >
            <ChevronLeftIcon class="w-4 h-4" />
          </button>
          <span class="text-[14px] font-bold text-[#0A0A0A]">{{ viewYear }}</span>
          <button
            type="button"
            class="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
            @click="viewYear++"
          >
            <ChevronRightIcon class="w-4 h-4" />
          </button>
        </div>
        <!-- months grid -->
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="(m, i) in SHORT_MONTHS"
            :key="m"
            type="button"
            class="px-2 py-2 rounded-lg text-[12px] font-medium transition-colors"
            :class="(currentYM.year === viewYear && currentYM.month === i + 1 && modelValue)
              ? 'bg-[#E11D48] text-white'
              : 'text-gray-600 hover:bg-[#E11D481A] hover:text-[#BE123C]'"
            @click="pick(i)"
          >
            {{ m }}
          </button>
        </div>
        <!-- footer -->
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-[#F0F0F0] px-1">
          <button
            v-if="allowEmpty"
            type="button"
            class="text-[11px] text-gray-500 hover:text-gray-800 transition-colors"
            @click="clear"
          >
            Clear
          </button>
          <span v-else />
          <button
            type="button"
            class="text-[11px] font-medium text-[#BE123C] hover:text-[#9F1239] transition-colors"
            @click="thisMonth"
          >
            This month
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
