import 'dotenv/config'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import * as schema from '../schema'

const DEMO_NAMES = ['Ah Beng', 'Wei Ling', 'Daniel Tan', 'Priya Kaur', 'Kenny Lim', 'Sasha Wong']

async function main() {
  const pool = mysql.createPool({
    host: process.env.NUXT_DB_HOST || 'localhost',
    port: Number(process.env.NUXT_DB_PORT || 3306),
    user: process.env.NUXT_DB_USER || 'root',
    password: process.env.NUXT_DB_PASSWORD || '',
    database: process.env.NUXT_DB_NAME || 'nonoclub',
  })
  const db = drizzle(pool, { schema, mode: 'default' })

  const johnny = (await db.select().from(schema.users).where(eq(schema.users.email, 'johnny@nonoclub.local')))[0]
  if (!johnny) throw new Error('Base seed missing — run `pnpm db:seed` first.')

  const roles = await db.select().from(schema.roles)
  const ambRole = roles.find(r => r.name === 'ambassador')!
  const leaderRole = roles.find(r => r.name === 'leader')!

  let vipRole = roles.find(r => r.name === 'VIP Ambassador')
  if (!vipRole) {
    await db.insert(schema.roles).values({
      name: 'VIP Ambassador',
      tier: 'ambassador',
      baseRate: '8.00',
      bonusRate: '2.00',
      kpiThreshold: '30000.00',
      requiresKpi: 1,
      isSystem: 0,
    })
    vipRole = (await db.select().from(schema.roles).where(eq(schema.roles.name, 'VIP Ambassador')))[0]
  }

  const existing = await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.name, DEMO_NAMES[0]))
  if (existing.length) {
    console.log('Demo data already seeded — exiting (idempotent).')
    await pool.end()
    return
  }

  const ambSpecs: Array<{ name: string; roleId: number }> = [
    { name: 'Ah Beng',     roleId: ambRole.id },
    { name: 'Wei Ling',    roleId: ambRole.id },
    { name: 'Daniel Tan',  roleId: ambRole.id },
    { name: 'Priya Kaur',  roleId: ambRole.id },
    { name: 'Kenny Lim',   roleId: leaderRole.id },
    { name: 'Sasha Wong',  roleId: vipRole!.id },
  ]

  type AmbWithRole = { id: number; name: string; baseRate: string; bonusRate: string | null }
  const created: AmbWithRole[] = []
  for (const a of ambSpecs) {
    const r = await db.insert(schema.ambassadors).values({ name: a.name, roleId: a.roleId })
    const role = roles.find(rr => rr.id === a.roleId) ?? vipRole!
    created.push({
      id: (r as any)[0].insertId,
      name: a.name,
      baseRate: role.baseRate,
      bonusRate: role.bonusRate,
    })
  }

  const months = ['2026-02', '2026-03', '2026-04', '2026-05']
  const today = new Date()

  function randomDateIn(monthStr: string): string {
    const [y, m] = monthStr.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const isCurrentMonth = monthStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const cap = isCurrentMonth ? Math.max(1, today.getDate() - 1) : lastDay
    const day = 1 + Math.floor(Math.random() * cap)
    return `${monthStr}-${String(day).padStart(2, '0')}`
  }

  function randAmount(type: 'Table' | 'BGO'): string {
    const min = type === 'Table' ? 1500 : 500
    const max = type === 'Table' ? 15000 : 8000
    const v = min + Math.random() * (max - min)
    return (Math.round(v / 50) * 50).toFixed(2)
  }

  const salesRows: schema.NewSale[] = []
  for (const amb of created) {
    const salesCount = 7 + Math.floor(Math.random() * 4)
    for (let i = 0; i < salesCount; i++) {
      const month = months[Math.floor(Math.random() * months.length)]
      const type: 'Table' | 'BGO' = Math.random() > 0.4 ? 'Table' : 'BGO'
      const date = randomDateIn(month)
      salesRows.push({
        date,
        ambassadorId: amb.id,
        type,
        amount: randAmount(type),
        status: 'confirmed',
        confirmedCommissionRate: amb.baseRate,
        confirmedBonusRate: amb.bonusRate,
        createdBy: johnny.id,
        confirmedAt: new Date(`${date}T20:00:00`),
        notes: 'demo seed',
      })
    }
  }

  await db.insert(schema.sales).values(salesRows)

  console.log(`✓ demo seed: ${created.length} ambassadors, ${salesRows.length} sales across ${months.join(', ')}`)
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
