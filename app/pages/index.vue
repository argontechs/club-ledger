<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { TrophyIcon, ArrowTrendingUpIcon, BanknotesIcon, CheckBadgeIcon } from '@heroicons/vue/24/outline'
import { currentMonth } from '~/utils/dateFormat'
import { formatRM } from '~/utils/currency'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const month = ref('')

const { data: monthList } = useAPI<string[]>('/commissions/months')
watch(monthList, (list) => {
  if (list && list.length && !month.value) month.value = list[0]
  else if ((!list || list.length === 0) && !month.value) month.value = currentMonth()
}, { immediate: true })

const { data: commissions } = useAPI<any[]>(() => month.value ? `/commissions?month=${month.value}` : '')
const { data: sales } = useAPI<any[]>(() => month.value ? `/sales?month=${month.value}` : '')
const { data: leaderboard } = useAPI<any[]>(() => month.value ? `/leaderboard?month=${month.value}&type=all` : '')
const { data: chartData } = useAPI<Array<{ month: string; totalSales: number; totalCommission: number }>>('/commissions/chart')

const me = computed(() => commissions.value?.find(r => r.userId === auth.user?.id))

const totalSales = computed(() =>
  (commissions.value ?? []).reduce((a, r) => a + Number(r.ownSales || 0), 0))

const totalCommissions = computed(() =>
  (commissions.value ?? []).reduce((a, r) => a + Number(r.total || 0), 0))

const myCommission = computed(() => Number(me.value?.total ?? 0))

const confirmedCount = computed(() =>
  (sales.value ?? []).filter(s => s.status === 'confirmed').length)

const top5 = computed(() => (leaderboard.value ?? []).slice(0, 5))

const showBreakdown = computed(() => !!me.value)

const monthLabel = computed(() => {
  if (!month.value) return ''
  const [y, m] = month.value.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
})

const salesChart = ref<HTMLCanvasElement | null>(null)
const commChart = ref<HTMLCanvasElement | null>(null)
let salesInst: Chart | null = null
let commInst: Chart | null = null

function shortMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'short' })
}

function initials(name: string | undefined | null) {
  if (!name) return '·'
  return name.split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function chartOpts(): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0E0E10',
        titleFont: { family: 'Geist', weight: '600', size: 11 },
        bodyFont: { family: 'Geist Mono', size: 12 },
        padding: 10,
        cornerRadius: 10,
        displayColors: false,
        callbacks: {
          label: (ctx: any) => 'RM ' + Number(ctx.parsed.y).toLocaleString(),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#9A9AA1', font: { family: 'Geist Mono', size: 10 } },
      },
      y: {
        grid: { color: '#EFEAE2', drawTicks: false },
        border: { display: false },
        ticks: {
          color: '#9A9AA1',
          font: { family: 'Geist Mono', size: 10 },
          padding: 8,
          callback: (v: any) => 'RM ' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v),
        },
        beginAtZero: true,
      },
    },
  }
}

function brandGradient(ctx: CanvasRenderingContext2D, height: number) {
  const g = ctx.createLinearGradient(0, 0, 0, height)
  g.addColorStop(0, 'rgba(220, 26, 71, 0.28)')
  g.addColorStop(1, 'rgba(220, 26, 71, 0)')
  return g
}

function inkGradient(ctx: CanvasRenderingContext2D, height: number) {
  const g = ctx.createLinearGradient(0, 0, 0, height)
  g.addColorStop(0, 'rgba(14, 14, 16, 0.18)')
  g.addColorStop(1, 'rgba(14, 14, 16, 0)')
  return g
}

function renderCharts() {
  const points = chartData.value ?? []
  const labels = points.map(p => shortMonth(p.month))
  const salesData = points.map(p => p.totalSales)
  const commData = points.map(p => p.totalCommission)

  salesInst?.destroy()
  commInst?.destroy()

  if (salesChart.value) {
    const ctx = salesChart.value.getContext('2d')!
    salesInst = new Chart(salesChart.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Sales',
          data: salesData,
          borderColor: '#DC1A47',
          backgroundColor: brandGradient(ctx, 180),
          borderWidth: 2,
          fill: true,
          tension: 0.38,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#DC1A47',
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
        }],
      },
      options: chartOpts(),
    })
  }
  if (commChart.value) {
    const ctx = commChart.value.getContext('2d')!
    commInst = new Chart(commChart.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Commission',
          data: commData,
          borderColor: '#0E0E10',
          backgroundColor: inkGradient(ctx, 180),
          borderWidth: 2,
          fill: true,
          tension: 0.38,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointBackgroundColor: '#0E0E10',
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: '#fff',
        }],
      },
      options: chartOpts(),
    })
  }
}

watch(chartData, () => nextTick(renderCharts))
onMounted(() => nextTick(renderCharts))
onBeforeUnmount(() => {
  salesInst?.destroy()
  commInst?.destroy()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Filter row -->
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Reporting period</p>
        <p class="font-display text-[18px] font-semibold text-[var(--color-ink)] tracking-tight">
          {{ monthLabel || 'Select a month' }}
        </p>
      </div>
      <AppMonthPills v-model="month" :months="monthList ?? []" empty-text="No sales recorded yet" />
    </div>

    <!-- KPI strip — inverted hero + three default with accent rails -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AppCard tone="inverted" label="Total club sales" :prefix="'RM'" :value="formatRM(totalSales).replace(/^RM\s*/, '')">
        <template #icon>
          <span class="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center text-white/70">
            <ArrowTrendingUpIcon class="w-4 h-4" />
          </span>
        </template>
        <p class="mt-3 text-[11px] text-white/55 tabular">Across all confirmed entries · {{ monthLabel }}</p>
      </AppCard>

      <AppCard accent label="Commissions paid" :prefix="'RM'" :value="formatRM(totalCommissions).replace(/^RM\s*/, '')">
        <template #icon>
          <span class="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-muted)]">
            <BanknotesIcon class="w-4 h-4" />
          </span>
        </template>
        <p class="mt-3 text-[11px] text-[var(--color-muted-2)] tabular">Pool · 8% of qualifying sales</p>
      </AppCard>

      <AppCard accent label="My commission" :prefix="'RM'" :value="formatRM(myCommission).replace(/^RM\s*/, '')">
        <template #icon>
          <span class="w-8 h-8 rounded-lg bg-[var(--color-brand-soft)] flex items-center justify-center text-[var(--color-brand-dark)]">
            <TrophyIcon class="w-4 h-4" />
          </span>
        </template>
        <p class="mt-3 text-[11px] text-[var(--color-muted-2)] tabular">Personal earnings this period</p>
      </AppCard>

      <AppCard accent label="Confirmed sales" :value="confirmedCount">
        <template #icon>
          <span class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <CheckBadgeIcon class="w-4 h-4" />
          </span>
        </template>
        <p class="mt-3 text-[11px] text-[var(--color-muted-2)] tabular">Entries marked confirmed</p>
      </AppCard>
    </div>

    <!-- Trend charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-5 shadow-card">
        <div class="flex items-start justify-between mb-4 gap-2">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Sales trend</p>
            <p class="font-display text-[15px] font-semibold text-[var(--color-ink)] tracking-tight">Last 6 months</p>
          </div>
          <span class="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] tabular">
            <span class="w-2 h-2 rounded-full bg-[var(--color-brand)]" /> Sales
          </span>
        </div>
        <div class="h-[200px]"><canvas ref="salesChart" /></div>
      </div>
      <div class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl p-5 shadow-card">
        <div class="flex items-start justify-between mb-4 gap-2">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Commission trend</p>
            <p class="font-display text-[15px] font-semibold text-[var(--color-ink)] tracking-tight">Last 6 months</p>
          </div>
          <span class="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-muted)] tabular">
            <span class="w-2 h-2 rounded-full bg-[var(--color-ink)]" /> Commission
          </span>
        </div>
        <div class="h-[200px]"><canvas ref="commChart" /></div>
      </div>
    </div>

    <!-- Top performers + my breakdown -->
    <div class="grid grid-cols-1 gap-4" :class="showBreakdown ? 'lg:grid-cols-3' : ''">
      <div :class="showBreakdown ? 'lg:col-span-2' : ''">
        <div class="bg-[var(--color-card)] border border-[var(--color-border-2)] rounded-2xl overflow-hidden shadow-card">
          <div class="px-5 py-4 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-2)]">Top performers</p>
              <p class="font-display text-[15px] font-semibold text-[var(--color-ink)] tracking-tight">Top 5 · {{ monthLabel }}</p>
            </div>
            <AppBadge tone="rose" :dot="false">Live</AppBadge>
          </div>

          <ul v-if="top5.length" class="divide-y divide-[var(--color-hairline)]">
            <li
              v-for="(row, i) in top5"
              :key="row.ambassadorId"
              class="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--color-hairline)]/50 transition-colors"
            >
              <span
                class="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold tabular tracking-tight shrink-0"
                :class="i === 0
                  ? 'bg-[var(--color-brand)] text-white shadow-rose'
                  : i === 1
                  ? 'bg-[var(--color-ink)] text-white'
                  : 'bg-[var(--color-surface-2)] text-[var(--color-muted)]'"
              >
                {{ String(i + 1).padStart(2, '0') }}
              </span>
              <div class="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-ember)] to-[var(--color-brand)] flex items-center justify-center text-[11px] font-bold text-white shrink-0 ring-2 ring-white">
                {{ initials(row.name) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-[13px] font-semibold text-[var(--color-ink)] truncate">{{ row.name }}</div>
                <div class="text-[11px] text-[var(--color-muted-2)] tabular">{{ row.saleCount }} {{ row.saleCount === 1 ? 'sale' : 'sales' }}</div>
              </div>
              <div class="text-right tabular shrink-0">
                <div class="text-[14px] font-semibold text-[var(--color-ink)] num-display">{{ formatRM(row.totalSales) }}</div>
                <div class="text-[10px] uppercase tracking-[0.14em] text-[var(--color-muted-2)]">Sales</div>
              </div>
            </li>
          </ul>

          <div v-else class="px-5 py-12 text-center">
            <div class="inline-flex flex-col items-center gap-3 text-[var(--color-muted-2)]">
              <div class="w-12 h-12 rounded-2xl bg-[var(--color-surface-2)] flex items-center justify-center">
                <TrophyIcon class="w-6 h-6" />
              </div>
              <p class="text-[13px] font-medium text-[var(--color-muted)]">No confirmed sales for this month yet.</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showBreakdown">
        <div class="relative bg-[var(--color-ink)] text-white rounded-2xl p-5 shadow-lift overflow-hidden">
          <!-- Brand bloom -->
          <div
            aria-hidden="true"
            class="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full opacity-40 blur-3xl"
            style="background: radial-gradient(closest-side, var(--color-brand) 0%, transparent 70%);"
          />
          <div class="relative">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">My commission</p>
              <AppBadge tone="rose" :dot="false">{{ me?.role ?? '' }}</AppBadge>
            </div>

            <p class="num-display text-[34px] font-bold mt-2 leading-none">
              <span class="text-[18px] mr-1 opacity-70 align-top tracking-normal font-medium">RM</span>{{ formatRM(me?.total ?? 0).replace(/^RM\s*/, '') }}
            </p>
            <p class="text-[11px] text-white/55 mt-1 tabular">{{ monthLabel }} · personal earnings</p>

            <div class="mt-5 pt-4 border-t border-white/10 space-y-2.5">
              <div class="flex items-center justify-between text-[12px]">
                <span class="text-white/60">Own sales</span>
                <span class="font-semibold tabular">{{ formatRM(me?.ownSales ?? 0) }}</span>
              </div>
              <div class="flex items-center justify-between text-[12px]">
                <span class="text-white/60">Own commission</span>
                <span class="font-semibold tabular">{{ formatRM(me?.ownCommission ?? 0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
