import {
  BanknotesIcon, BuildingOffice2Icon, Cog6ToothIcon, CurrencyDollarIcon,
  ReceiptPercentIcon, ShieldCheckIcon, Squares2X2Icon, TrophyIcon,
  UserGroupIcon, ArrowDownTrayIcon, IdentificationIcon,
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
  roles: IdentificationIcon,
  settings: Cog6ToothIcon,
} as const satisfies Record<string, Component>

export type SidebarIconKey = keyof typeof sidebarIconMap
export type Role = string

export interface NavItem { to: string; label: string; icon: SidebarIconKey; tiers: Array<'admin' | 'ambassador'> }

export const mainSidebarNav: NavItem[] = [
  { to: '/',             label: 'Dashboard',   icon: 'dashboard',   tiers: ['admin', 'ambassador'] },
  { to: '/sales',        label: 'Sales',       icon: 'sales',       tiers: ['admin', 'ambassador'] },
  { to: '/sales/import', label: 'Import',      icon: 'import',      tiers: ['admin'] },
  { to: '/commissions',  label: 'Commissions', icon: 'commissions', tiers: ['admin', 'ambassador'] },
  { to: '/payouts',      label: 'Payouts',     icon: 'payouts',     tiers: ['admin'] },
  { to: '/leaderboard',  label: 'Leaderboard', icon: 'leaderboard', tiers: ['admin', 'ambassador'] },
]

export const mgmtSidebarNav: NavItem[] = [
  { to: '/ambassadors',  label: 'Ambassadors', icon: 'ambassadors', tiers: ['admin'] },
  { to: '/teams',        label: 'Teams',       icon: 'teams',       tiers: ['admin'] },
  { to: '/access',       label: 'Access',      icon: 'access',      tiers: ['admin'] },
  { to: '/roles',        label: 'Roles',       icon: 'roles',       tiers: ['admin'] },
  { to: '/settings',     label: 'Settings',    icon: 'settings',    tiers: ['admin'] },
]
