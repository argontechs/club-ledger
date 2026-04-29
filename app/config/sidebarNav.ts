export interface NavItem { label: string; to: string; roles: Array<'owner'|'admin'|'leader'|'ambassador'> }

export const sidebarNav: NavItem[] = [
  { label: 'Dashboard',    to: '/',             roles: ['owner','admin','leader','ambassador'] },
  { label: 'Sales',        to: '/sales',        roles: ['owner','admin','leader','ambassador'] },
  { label: 'Import',       to: '/sales/import', roles: ['owner','admin'] },
  { label: 'Commissions',  to: '/commissions',  roles: ['owner','admin','leader','ambassador'] },
  { label: 'Payouts',      to: '/payouts',      roles: ['owner','admin'] },
  { label: 'Ambassadors',  to: '/ambassadors',  roles: ['owner','admin'] },
  { label: 'Teams',        to: '/teams',        roles: ['owner','admin'] },
  { label: 'Leaderboard',  to: '/leaderboard',  roles: ['owner','admin','leader','ambassador'] },
  { label: 'Access',       to: '/access',       roles: ['owner','admin'] },
  { label: 'Settings',     to: '/settings',     roles: ['owner','admin'] },
]
