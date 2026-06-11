// The display symbol comes from settings.currency_symbol (delivered on the
// branding payload) — 'RM' is only the pre-hydration default. The historical
// formatRM name is kept for its many import sites.
let symbol = 'RM'

export function setCurrencySymbol(s: string | null | undefined) {
  if (s && s.trim()) symbol = s.trim()
}

export function currencySymbol(): string {
  return symbol
}

// Amount without the symbol — for UI slots that render the symbol separately.
export function formatAmount(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatRM(value: number | string | null | undefined): string {
  return `${symbol} ` + formatAmount(value)
}

export const formatCurrency = formatRM
