import {
  BanknotesIcon, BuildingOffice2Icon, Cog6ToothIcon, CurrencyDollarIcon,
  ReceiptPercentIcon, ShieldCheckIcon, Squares2X2Icon, TrophyIcon,
  UserGroupIcon, ArrowDownTrayIcon,
} from '@heroicons/vue/24/outline'
import type { Component } from 'vue'

export const sidebarIconMap = {
  dashboard: Squares2X2Icon,
  sales: CurrencyDollarIcon,
  import: ArrowDownTrayIcon,
  commissions: ReceiptPercentIcon,
  payouts: BanknotesIcon,
  leaderboard: TrophyIcon,
  ambassadors: UserGroupIcon,
  teams: BuildingOffice2Icon,
  access: ShieldCheckIcon,
  settings: Cog6ToothIcon,
} as const satisfies Record<string, Component>

export type SidebarIconKey = keyof typeof sidebarIconMap
export type Role = 'owner' | 'admin' | 'leader' | 'ambassador'

export interface NavItem { to: string; label: string; icon: SidebarIconKey; roles: Role[] }

export const mainSidebarNav: NavItem[] = [
  { to: '/',             label: 'Dashboard',   icon: 'dashboard',   roles: ['owner', 'admin', 'leader', 'ambassador'] },
  { to: '/sales',        label: 'Sales',       icon: 'sales',       roles: ['owner', 'admin', 'leader', 'ambassador'] },
  { to: '/sales/import', label: 'Import',      icon: 'import',      roles: ['owner', 'admin'] },
  { to: '/commissions',  label: 'Commissions', icon: 'commissions', roles: ['owner', 'admin', 'leader', 'ambassador'] },
  { to: '/payouts',      label: 'Payouts',     icon: 'payouts',     roles: ['owner', 'admin'] },
  { to: '/leaderboard',  label: 'Leaderboard', icon: 'leaderboard', roles: ['owner', 'admin', 'leader', 'ambassador'] },
]

export const mgmtSidebarNav: NavItem[] = [
  { to: '/ambassadors',  label: 'Ambassadors', icon: 'ambassadors', roles: ['owner', 'admin'] },
  { to: '/teams',        label: 'Teams',       icon: 'teams',       roles: ['owner', 'admin'] },
  { to: '/access',       label: 'Access',      icon: 'access',      roles: ['owner', 'admin'] },
  { to: '/settings',     label: 'Settings',    icon: 'settings',    roles: ['owner', 'admin'] },
]
