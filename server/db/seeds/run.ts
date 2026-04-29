import 'dotenv/config'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq } from 'drizzle-orm'
import * as schema from '../schema'
import bcrypt from 'bcryptjs'

async function main() {
  const pool = mysql.createPool({
    host: process.env.NUXT_DB_HOST || 'localhost',
    port: Number(process.env.NUXT_DB_PORT || 3306),
    user: process.env.NUXT_DB_USER || 'root',
    password: process.env.NUXT_DB_PASSWORD || '',
    database: process.env.NUXT_DB_NAME || 'nonoclub',
  })
  const db = drizzle(pool, { schema, mode: 'default' })

  // 1. Roles
  const roleNames = ['owner', 'admin', 'leader', 'ambassador'] as const
  for (const name of roleNames) {
    const existing = await db.select().from(schema.roles).where(eq(schema.roles.name, name))
    if (existing.length === 0) await db.insert(schema.roles).values({ name })
  }
  const allRoles = await db.select().from(schema.roles)
  const roleId = (n: string) => allRoles.find(r => r.name === n)!.id

  // 2. Settings
  const settingsSeeds: Array<{ key: string; value: string }> = [
    { key: 'default_commission_rate', value: '8.00' },
    { key: 'bonus_rate', value: '1.00' },
    { key: 'currency', value: 'MYR' },
    { key: 'currency_symbol', value: 'RM' },
    { key: 'venue_name', value: 'Nono Club' },
  ]
  for (const s of settingsSeeds) {
    const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, s.key))
    if (existing.length === 0) await db.insert(schema.settings).values(s)
  }

  // 3. Protected ambassadors: Johnny + Unassigned Sales
  let johnny = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.name, 'Johnny')))[0]
  if (!johnny) {
    const r = await db.insert(schema.ambassadors).values({ name: 'Johnny', commissionRate: '8.00', isProtected: 1 })
    johnny = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.id, (r as any)[0].insertId)))[0]
  }
  let unassigned = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.name, 'Unassigned Sales')))[0]
  if (!unassigned) {
    await db.insert(schema.ambassadors).values({ name: 'Unassigned Sales', commissionRate: '0.00', isProtected: 1 })
  }

  // 4. Mok ambassador (non-protected)
  let mokAmb = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.name, 'Mok')))[0]
  if (!mokAmb) {
    const r = await db.insert(schema.ambassadors).values({ name: 'Mok', commissionRate: '8.00' })
    mokAmb = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.id, (r as any)[0].insertId)))[0]
  }

  // 5. Users: Johnny (owner) + Mok (admin)
  const passwordHash = await bcrypt.hash('password', 10)
  const johnnyEmail = 'johnny@nonoclub.local'
  const mokEmail = 'mok@nonoclub.local'

  const johnnyUser = (await db.select().from(schema.users).where(eq(schema.users.email, johnnyEmail)))[0]
  if (!johnnyUser) {
    await db.insert(schema.users).values({
      email: johnnyEmail, passwordHash, name: 'Johnny',
      roleId: roleId('owner'), ambassadorId: johnny.id,
    })
  }
  const mokUser = (await db.select().from(schema.users).where(eq(schema.users.email, mokEmail)))[0]
  if (!mokUser) {
    await db.insert(schema.users).values({
      email: mokEmail, passwordHash, name: 'Mok',
      roleId: roleId('admin'), ambassadorId: mokAmb.id,
    })
  }

  console.log('✓ seed complete')
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
