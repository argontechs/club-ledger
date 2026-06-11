export interface TourStep {
  /** value of the target's data-tour attribute */
  target: string
  title: string
  body: string
}

export interface TourChapter {
  id: string
  route: string
  /** which permission tiers see this chapter */
  tiers: Array<'admin' | 'ambassador'>
  steps: TourStep[]
}

// Per-page guided tours. Steps anchor to [data-tour="…"] attributes; a chapter
// auto-starts on first visit to its route and can be replayed from the Header
// help button. Progress persists per user (users.onboarding_state).
export const tourChapters: TourChapter[] = [
  {
    id: 'dashboard',
    route: '/',
    tiers: ['admin', 'ambassador'],
    steps: [
      {
        target: 'club-switcher',
        title: 'Your clubs',
        body: 'Everything on screen belongs to the club selected here. Switch clubs — or create a new one — and the numbers, people, and rates follow.',
      },
      {
        target: 'month-pills',
        title: 'Reporting period',
        body: 'Pick the month you want to look at. Every figure on the dashboard recalculates for that period.',
      },
      {
        target: 'kpis',
        title: 'The headline numbers',
        body: 'Confirmed sales, commissions owed, and your own earnings for the period — every figure traces back to individual confirmed sales.',
      },
    ],
  },
  {
    id: 'sales',
    route: '/sales',
    tiers: ['admin'],
    steps: [
      {
        target: 'new-sale',
        title: 'Record a sale',
        body: 'Sales start as drafts — nothing counts toward commissions yet. Edit freely while a sale is in draft.',
      },
      {
        target: 'sales-table',
        title: 'Confirming locks the rates',
        body: 'Confirming a sale freezes the ambassador’s commission rate onto it. Later rate changes never rewrite confirmed history — that’s what keeps the ledger defensible.',
      },
    ],
  },
  {
    id: 'roles',
    route: '/roles',
    tiers: ['admin'],
    steps: [
      {
        target: 'roles-table',
        title: 'Commission packages',
        body: 'Each role carries a base rate, an optional bonus, and an optional KPI gate. These are per-club — every club in the switcher has its own set.',
      },
    ],
  },
  {
    id: 'payouts',
    route: '/payouts',
    tiers: ['admin'],
    steps: [
      {
        target: 'payouts-create',
        title: 'Close out the month',
        body: 'Create payouts computes each ambassador’s total with the same engine as the Commissions page, then freezes it. Payslips always match what was actually paid.',
      },
    ],
  },
  {
    id: 'settings',
    route: '/settings',
    tiers: ['admin'],
    steps: [
      {
        target: 'settings-club',
        title: 'Make it yours',
        body: 'Rename the active club, set your currency symbol, and upload the club’s logo — it appears in the sidebar, on the login screen, and as the favicon.',
      },
    ],
  },
]
