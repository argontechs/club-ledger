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

export function formatRM(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  if (!Number.isFinite(n)) return `${symbol} 0.00`
  return `${symbol} ` + n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatCurrency = formatRM
