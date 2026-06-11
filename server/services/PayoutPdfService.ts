import { eq, like, and } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { SettingsService } from '~~/server/services/SettingsService'
import { htmlToPdf } from '~~/server/services/PdfService'

function fmt(n: number) {
  return n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Company-configurable display strings (settings keys, with the original
// Malaysian defaults).
function labels(settings: Record<string, string>) {
  return {
    currency: settings.currency_symbol || 'RM',
    registration: settings.label_registration || 'SSM',
    idDocument: settings.label_id_document || 'IC / Passport',
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export interface PayoutPdfContext {
  payout: any
  ambassador: any
  club: any
  settings: Record<string, string>
  rows: Array<{ date: string; type: string; tableNumber: string | null; amount: number; commissionRate: number; commission: number }>
  totals: { gross: number; commission: number; extra: number; total: number }
}

// The documents render the stored payout — they never recompute it. Total is
// always payout.amount; whatever the payout includes beyond the per-sale frozen
// commissions (pool/KPI bonus from batch creation, or a manual adjustment) is
// the `extra` line.
export function derivePayoutTotals(payoutAmount: number, commission: number) {
  const r2 = (n: number) => Math.round(n * 100) / 100
  const c = r2(commission)
  const total = r2(payoutAmount)
  return { commission: c, extra: r2(total - c), total }
}

async function loadContext(payoutId: number): Promise<PayoutPdfContext> {
  const db = useDB()
  const [payout] = await db.select().from(schema.payouts).where(eq(schema.payouts.id, payoutId))
  if (!payout) throw new Error('Payout not found')
  const [ambassador] = await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.id, payout.ambassadorId))
  const [club] = await db.select().from(schema.clubs).where(eq(schema.clubs.id, payout.clubId))
  const settings = await SettingsService.getAll()
  const month = payout.periodMonth
  // Sales for this ambassador in this month
  const sales = await db.select().from(schema.sales)
    .where(and(eq(schema.sales.ambassadorId, payout.ambassadorId), like(schema.sales.date, `${month}%`), eq(schema.sales.status, 'confirmed')))
  const rows = sales.map(s => ({
    date: s.date,
    type: s.type,
    tableNumber: s.tableNumber,
    amount: Number(s.amount),
    commissionRate: Number(s.confirmedCommissionRate ?? 0),
    commission: Number(s.amount) * Number(s.confirmedCommissionRate ?? 0) / 100,
  }))
  const gross = rows.reduce((a, r) => a + r.amount, 0)
  const commission = rows.reduce((a, r) => a + r.commission, 0)
  const { commission: c, extra, total } = derivePayoutTotals(Number(payout.amount), commission)
  return {
    payout, ambassador, club: club ?? null, settings, rows,
    totals: { gross, commission: c, extra, total },
  }
}

function extraLabel(ctx: PayoutPdfContext) {
  if (ctx.totals.extra > 0) {
    const snap = ctx.payout.snapshotBonusRate
    return snap !== null && snap !== undefined ? `Bonus (${Number(snap)}%)` : 'Bonus'
  }
  return 'Adjustment'
}

function header(settings: Record<string, string>) {
  const company = escapeHtml(settings.company_name || 'Payout statement')
  const l = labels(settings)
  const lines = [
    settings.company_address,
    [settings.company_registration ? `${escapeHtml(l.registration)}: ${settings.company_registration}` : '',
     settings.company_phone ? `Tel: ${settings.company_phone}` : '',
     settings.company_email ? `Email: ${settings.company_email}` : ''].filter(Boolean).join(' · '),
  ].filter(Boolean).map(l => `<p style="margin:2px 0;font-size:11px;color:#666">${escapeHtml(l ?? '')}</p>`).join('')
  return `
    <div style="border-bottom:2px solid #E11D48;padding-bottom:12px;margin-bottom:20px">
      <h1 style="margin:0;font-size:22px;color:#0A0A0A;letter-spacing:1px">${company.toUpperCase()}</h1>
      ${lines}
    </div>`
}

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; color:#0A0A0A; padding:0; margin:0; font-size:12px; }
  table { width:100%; border-collapse:collapse; margin-top:12px; }
  th { background:#FAFAFA; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; color:#888; padding:8px; border-bottom:1px solid #E0E0E0; }
  td { padding:8px; border-bottom:1px solid #F0F0F0; font-size:11px; }
  .total-row td { font-weight:bold; border-top:2px solid #E11D48; border-bottom:none; }
  .right { text-align:right; }
  h2 { margin:18px 0 6px; font-size:14px; }
  .meta-grid { display:grid; grid-template-columns:140px 1fr; gap:6px 16px; margin:8px 0; font-size:12px; }
  .meta-grid .label { color:#888; }
`

export function buildSummaryHtml(ctx: PayoutPdfContext): string {
  const { payout, ambassador, totals, rows, settings } = ctx
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
    ${header(settings)}
    <h2 style="margin-top:0">Payout Summary</h2>
    <div class="meta-grid">
      <span class="label">Ambassador:</span><span>${escapeHtml(ambassador.fullName ?? ambassador.name)}</span>
      <span class="label">Alias:</span><span>${escapeHtml(ambassador.name)}</span>
      ${ctx.club ? `<span class="label">Club:</span><span>${escapeHtml(ctx.club.name)}</span>` : ''}
      <span class="label">Period:</span><span>${escapeHtml(payout.periodMonth)}</span>
      <span class="label">Status:</span><span>${payout.paidAt ? 'Paid on ' + new Date(payout.paidAt).toLocaleDateString('en-GB') : 'Unpaid'}</span>
    </div>

    <h2>Sales breakdown</h2>
    <table>
      <thead><tr>
        <th>Date</th><th>Type</th><th>Table</th>
        <th class="right">Amount (${escapeHtml(labels(settings).currency)})</th><th class="right">Rate</th><th class="right">Commission</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td>${r.date}</td><td>${r.type}</td><td>${escapeHtml(r.tableNumber ?? '-')}</td>
          <td class="right">${fmt(r.amount)}</td>
          <td class="right">${fmt(r.commissionRate)}%</td>
          <td class="right">${fmt(r.commission)}</td>
        </tr>`).join('')}
        ${rows.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:24px;color:#aaa">No confirmed sales</td></tr>' : ''}
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td class="right">${fmt(totals.gross)}</td>
          <td class="right"></td>
          <td class="right">${fmt(totals.commission)}</td>
        </tr>
      </tbody>
    </table>
    ${totals.extra !== 0 ? `
      <h2>${extraLabel(ctx)}</h2>
      <table><tbody>
        <tr><td>${extraLabel(ctx)}</td><td class="right">${fmt(totals.extra)}</td></tr>
      </tbody></table>
    ` : ''}
    <h2>Total payout</h2>
    <p style="font-size:18px;font-weight:bold;color:#BE123C">${escapeHtml(labels(settings).currency)} ${fmt(totals.total)}</p>
  </body></html>`
}

export async function generatePayoutSummary(payoutId: number): Promise<{ filename: string; pdf: Buffer }> {
  const ctx = await loadContext(payoutId)
  const pdf = await htmlToPdf(buildSummaryHtml(ctx))
  const slug = (ctx.ambassador.name ?? 'ambassador').replace(/[^\w]/g, '_')
  const filename = `${ctx.payout.periodMonth}_COMM_${slug}.pdf`
  return { filename, pdf }
}

export function buildPayslipHtml(ctx: PayoutPdfContext): string {
  const { payout, ambassador, totals, settings } = ctx
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
    ${header(settings)}
    <h2 style="margin-top:0">Payslip</h2>
    <div class="meta-grid">
      <span class="label">Ambassador:</span><span>${escapeHtml(ambassador.fullName ?? ambassador.name)}</span>
      <span class="label">${escapeHtml(labels(settings).idDocument)}:</span><span>${escapeHtml(ambassador.ic ?? '-')}</span>
      ${ctx.club ? `<span class="label">Club:</span><span>${escapeHtml(ctx.club.name)}</span>` : ''}
      <span class="label">Period:</span><span>${escapeHtml(payout.periodMonth)}</span>
      <span class="label">Issued:</span><span>${new Date().toLocaleDateString('en-GB')}</span>
    </div>

    <h2>Earnings</h2>
    <table>
      <thead><tr><th>Item</th><th class="right">Amount (${escapeHtml(labels(settings).currency)})</th></tr></thead>
      <tbody>
        <tr><td>Sales commission</td><td class="right">${fmt(totals.commission)}</td></tr>
        ${totals.extra !== 0 ? `<tr><td>${extraLabel(ctx)}</td><td class="right">${fmt(totals.extra)}</td></tr>` : ''}
        <tr class="total-row"><td>Total payable</td><td class="right">${fmt(totals.total)}</td></tr>
      </tbody>
    </table>

    ${ambassador.bankName ? `
      <h2>Bank details</h2>
      <div class="meta-grid">
        <span class="label">Bank:</span><span>${escapeHtml(ambassador.bankName ?? '-')}</span>
        <span class="label">Account no:</span><span>${escapeHtml(ambassador.bankAccountNumber ?? '-')}</span>
        <span class="label">Holder:</span><span>${escapeHtml(ambassador.bankOwnerName ?? '-')}</span>
      </div>
    ` : ''}

    <p style="margin-top:40px;font-size:10px;color:#aaa;border-top:1px solid #E0E0E0;padding-top:12px">
      This is a system-generated payslip.${settings.company_name ? ' ' + escapeHtml(settings.company_name) + '.' : ''}
    </p>
  </body></html>`
}

export async function generatePayslip(payoutId: number): Promise<{ filename: string; pdf: Buffer }> {
  const ctx = await loadContext(payoutId)
  const pdf = await htmlToPdf(buildPayslipHtml(ctx))
  const slug = (ctx.ambassador.name ?? 'ambassador').replace(/[^\w]/g, '_')
  const filename = `${ctx.payout.periodMonth}_PAYSLIP_${slug}.pdf`
  return { filename, pdf }
}
