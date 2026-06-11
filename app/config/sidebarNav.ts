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

import type { PermissionModule } from '~~/shared/permissions'

// `module` ties each entry to the permission matrix; 'access' has no module —
// it's the user-management surface, visible to admin tier only.
export interface NavItem {
  to: string
  label: string
  icon: SidebarIconKey
  module: PermissionModule | 'access'
}

export const mainSidebarNav: NavItem[] = [
  { to: '/',             label: 'Dashboard',   icon: 'dashboard',   module: 'dashboard' },
  { to: '/sales',        label: 'Sales',       icon: 'sales',       module: 'sales' },
  { to: '/sales/import', label: 'Import',      icon: 'import',      module: 'import' },
  { to: '/commissions',  label: 'Commissions', icon: 'commissions', module: 'commissions' },
  { to: '/payouts',      label: 'Payouts',     icon: 'payouts',     module: 'payouts' },
  { to: '/leaderboard',  label: 'Leaderboard', icon: 'leaderboard', module: 'leaderboard' },
]

export const mgmtSidebarNav: NavItem[] = [
  { to: '/ambassadors',  label: 'Ambassadors', icon: 'ambassadors', module: 'ambassadors' },
  { to: '/teams',        label: 'Teams',       icon: 'teams',       module: 'teams' },
  { to: '/access',       label: 'Access',      icon: 'access',      module: 'access' },
  { to: '/roles',        label: 'Rate plans',  icon: 'roles',       module: 'roles' },
  { to: '/settings',     label: 'Settings',    icon: 'settings',    module: 'settings' },
]

// Route → module map shared by the page-permission middleware.
export const routeModules: Record<string, PermissionModule | 'access'> = Object.fromEntries(
  [...mainSidebarNav, ...mgmtSidebarNav, { to: '/clubs', module: 'dashboard' } as any]
    .map(i => [i.to, i.module]),
)
