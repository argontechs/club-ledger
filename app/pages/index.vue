<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Chart from 'chart.js/auto'
import { currentMonth } from '~/utils/dateFormat'
import { formatRM } from '~/utils/currency'
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const month = ref(currentMonth())

const { data: commissions } = useAPI<any[]>(() => `/commissions?month=${month.value}`)
const { data: sales } = useAPI<any[]>(() => `/sales?month=${month.value}`)
const { data: leaderboard } = useAPI<any[]>(() => `/leaderboard?month=${month.value}&type=all`)
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

const salesChart = ref<HTMLCanvasElement | null>(null)
const commChart = ref<HTMLCanvasElement | null>(null)
let salesInst: Chart | null = null
let commInst: Chart | null = null

function shortMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'short' })
}

function chartOpts(): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9CA3AF', font: { size: 11 } } },
      y: {
        grid: { color: '#F0F0F0' },
        ticks: {
          color: '#9CA3AF',
          font: { size: 11 },
          callback: (v: any) => 'RM ' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v),
        },
        beginAtZero: true,
      },
    },
  }
}

function renderCharts() {
  const points = chartData.value ?? []
  const labels = points.map(p => shortMonth(p.month))
  const salesData = points.map(p => p.totalSales)
  const commData = points.map(p => p.totalCommission)

  salesInst?.destroy()
  commInst?.destroy()

  if (salesChart.value) {
    salesInst = new Chart(salesChart.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Sales',
          data: salesData,
          borderColor: '#E11D48',
          backgroundColor: 'rgba(225, 29, 72, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#E11D48',
        }],
      },
      options: chartOpts(),
    })
  }
  if (commChart.value) {
    commInst = new Chart(commChart.value, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Commission',
          data: commData,
          borderColor: '#0A0A0A',
          backgroundColor: 'rgba(10, 10, 10, 0.05)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#0A0A0A',
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
  <div class="space-y-5">
    <!-- Filter row -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p class="text-[13px] text-gray-400">Overview for</p>
      <AppMonthPicker v-model="month" />
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <AppCard label="Total Club Sales" prefix="RM " :value="formatRM(totalSales).replace(/^RM\s*/, '')" />
      <AppCard label="Commissions Paid" prefix="RM " :value="formatRM(totalCommissions).replace(/^RM\s*/, '')" />
      <AppCard label="My Commission" prefix="RM " :value="formatRM(myCommission).replace(/^RM\s*/, '')" />
      <AppCard label="Confirmed Sales" :value="confirmedCount" />
    </div>

    <!-- Trend charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400">Sales — Last 6 Months</h3>
        </div>
        <div class="h-[180px]"><canvas ref="salesChart" /></div>
      </div>
      <div class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400">Commission — Last 6 Months</h3>
        </div>
        <div class="h-[180px]"><canvas ref="commChart" /></div>
      </div>
    </div>

    <!-- Top performers + my breakdown -->
    <div class="grid grid-cols-1 gap-4" :class="showBreakdown ? 'lg:grid-cols-3' : ''">
      <div :class="showBreakdown ? 'lg:col-span-2' : ''">
        <div class="bg-white border border-[#E8E8EC] rounded-2xl overflow-hidden shadow-sm">
          <div class="px-5 py-3 border-b border-[#F0F0F0] flex items-center justify-between">
            <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400">Top Performers</h3>
            <span class="text-[11px] text-gray-400">Top 5 · {{ month }}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-[#FAFAFA] border-b border-[#F0F0F0]">
                  <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300 w-12">#</th>
                  <th class="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-gray-300">Ambassador</th>
                  <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Sales</th>
                  <th class="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-gray-300">Total (RM)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!top5.length">
                  <td colspan="4" class="px-4 py-8 text-center text-[13px] text-gray-400">
                    No confirmed sales for this month.
                  </td>
                </tr>
                <tr
                  v-for="(row, i) in top5"
                  :key="row.ambassadorId"
                  class="border-b border-[#F8F8F8] last:border-b-0 hover:bg-[#FAFCFC] transition-colors"
                >
                  <td class="px-4 py-3 text-[13px] font-semibold text-gray-500">{{ i + 1 }}</td>
                  <td class="px-4 py-3 text-[13px] font-medium text-[#0A0A0A]">{{ row.name }}</td>
                  <td class="px-4 py-3 text-[13px] text-right text-gray-500">{{ row.saleCount }}</td>
                  <td class="px-4 py-3 text-[13px] text-right font-semibold text-[#BE123C]">{{ formatRM(row.totalSales) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div v-if="showBreakdown">
        <div class="bg-white border border-[#E8E8EC] rounded-2xl p-5 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-[12px] font-bold uppercase tracking-wide text-gray-400">My Commission</h3>
            <AppBadge tone="rose">{{ me?.role ?? '' }}</AppBadge>
          </div>
          <div class="space-y-2.5 pt-1">
            <div class="flex items-center justify-between text-[13px]">
              <span class="text-gray-500">Own sales</span>
              <span class="font-semibold text-[#0A0A0A]">{{ formatRM(me?.ownSales ?? 0) }}</span>
            </div>
            <div class="flex items-center justify-between text-[13px]">
              <span class="text-gray-500">Own commission</span>
              <span class="font-semibold text-[#0A0A0A]">{{ formatRM(me?.ownCommission ?? 0) }}</span>
            </div>
            <div class="border-t border-[#F0F0F0] pt-2.5 flex items-center justify-between">
              <span class="text-[12px] font-bold uppercase tracking-wide text-gray-400">Total</span>
              <span class="text-[18px] font-bold text-[#BE123C]">{{ formatRM(me?.total ?? 0) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
