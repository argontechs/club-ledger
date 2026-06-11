// Regenerates tests/fixtures/sample-import.pdf as fully synthetic data.
// The layout mirrors the POS "agent commission" statement shape the parser
// targets (see PDFImportService regexes) with invented names and amounts.
// Run: node scripts/make-synthetic-import-fixture.mjs
import puppeteer from 'puppeteer'
import { writeFile } from 'node:fs/promises'

const rows = []
let total = 0
// 65 regular rows: date, T+15-digit order id, four filler columns, table, item, qty, RM amount, RM commission
for (let i = 0; i < 65; i++) {
  const day = String(1 + (i % 28)).padStart(2, '0')
  const date = `2026-04-${day}`
  const orderId = `T2604${day}${String(100000000 + i).slice(-9)}`
  const table = i === 0 ? 'L11' : `T${(i % 20) + 1}`
  const amount = i === 0 ? 1454.55 : Math.round((500 + i * 137.5) * 100) / 100
  total += amount
  const fmt = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const comm = (amount * 0.08).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  rows.push(`${date} ${orderId} CASH POS01 SRV A ${table} Demo Package ${(i % 5) + 1} RM ${fmt} RM ${comm}`)
}
// Sort so the 2026-04-01 row (i=0) is genuinely first after the parser's date sort
// (parser sorts itself, but keep the document tidy too)
rows.sort()
// 2 orphan rows (order id column shows '-'): synthetic ids are derived by the parser
for (const [day, table, amount] of [['05', 'V2', 888.0], ['12', 'V7', 1212.5]]) {
  total += amount
  const fmt = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  rows.push(`2026-04-${day} - ${table} Walk In Package 1 RM ${fmt} RM 0.00`)
}
// 1 voided row whose RM cells are '-': the parser must skip it
rows.push(`2026-04-20 T260420999999999 CASH POS01 SRV A T9 Voided Package 1 RM - RM -`)

const totalFmt = total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const commFmt = (total * 0.08).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body { font-family: monospace; font-size: 9px; }
pre { white-space: pre-wrap; }
</style></head><body><pre>
AGENT COMMISSION ON DEMOAGENT 营业 2026-04
订台业绩明细 DEMO VENUE
总计 RM ${totalFmt} RM ${commFmt}
${rows.join('\n')}
</pre></body></html>`

const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
const page = await browser.newPage()
await page.setContent(html)
const pdf = await page.pdf({ format: 'A4' })
await browser.close()
await writeFile(new URL('../tests/fixtures/sample-import.pdf', import.meta.url), pdf)
console.log(`synthetic fixture written: 65 rows + 2 orphans + 1 skip, header total ${totalFmt}`)
console.log(`expected parsed total: ${total.toFixed(2)}, expected row count: 67`)
