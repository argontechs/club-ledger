import 'dotenv/config'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import { eq, isNull, and } from 'drizzle-orm'
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

  // 1. Club (everything club-scoped hangs off club #1)
  let club = (await db.select().from(schema.clubs).where(eq(schema.clubs.name, 'Nono Club')))[0]
  if (!club) {
    const r = await db.insert(schema.clubs).values({ name: 'Nono Club' })
    club = (await db.select().from(schema.clubs).where(eq(schema.clubs.id, (r as any)[0].insertId)))[0]
  }
  const clubId = club!.id

  // 2. Staff roles (club_id NULL — referenced by user logins)
  const staffSeeds = [
    { name: 'owner', tier: 'admin' as const, isSystem: 1 },
    { name: 'admin', tier: 'admin' as const, isSystem: 1 },
  ]
  for (const r of staffSeeds) {
    const existing = await db.select().from(schema.roles)
      .where(and(eq(schema.roles.name, r.name), isNull(schema.roles.clubId)))
    if (existing.length === 0) {
      await db.insert(schema.roles).values({
        name: r.name, tier: r.tier, baseRate: '0.00', bonusRate: null, isSystem: r.isSystem, clubId: null,
      })
    }
  }

  // 3. Commission roles for club #1 (referenced by ambassadors)
  const clubRoleSeeds = [
    { name: 'owner',      tier: 'admin'      as const, baseRate: '8.00', bonusRate: '1.00' },
    { name: 'admin',      tier: 'admin'      as const, baseRate: '8.00', bonusRate: '1.00' },
    { name: 'leader',     tier: 'ambassador' as const, baseRate: '8.00', bonusRate: null },
    { name: 'ambassador', tier: 'ambassador' as const, baseRate: '8.00', bonusRate: null },
  ]
  for (const r of clubRoleSeeds) {
    const existing = await db.select().from(schema.roles)
      .where(and(eq(schema.roles.name, r.name), eq(schema.roles.clubId, clubId)))
    if (existing.length === 0) {
      await db.insert(schema.roles).values({
        name: r.name, tier: r.tier, baseRate: r.baseRate, bonusRate: r.bonusRate, isSystem: 0, clubId,
      })
    }
  }
  const allRoles = await db.select().from(schema.roles)
  const staffRoleId = (n: string) => allRoles.find(r => r.name === n && r.clubId === null)!.id
  const clubRoleId = (n: string) => allRoles.find(r => r.name === n && r.clubId === clubId)!.id

  // 4. Settings (company-level only — venue identity lives on the club)
  const settingsSeeds: Array<{ key: string; value: string }> = [
    { key: 'currency', value: 'MYR' },
    { key: 'currency_symbol', value: 'RM' },
  ]
  for (const s of settingsSeeds) {
    const existing = await db.select().from(schema.settings).where(eq(schema.settings.key, s.key))
    if (existing.length === 0) await db.insert(schema.settings).values(s)
  }

  // 5. Protected ambassadors: Johnny + Unassigned Sales
  let johnny = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.name, 'Johnny')))[0]
  if (!johnny) {
    const r = await db.insert(schema.ambassadors).values({
      name: 'Johnny', roleId: clubRoleId('owner'), clubId, isProtected: 1,
    })
    johnny = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.id, (r as any)[0].insertId)))[0]
  }
  const unassigned = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.name, 'Unassigned Sales')))[0]
  if (!unassigned) {
    await db.insert(schema.ambassadors).values({
      name: 'Unassigned Sales', roleId: clubRoleId('ambassador'), clubId, isProtected: 1,
    })
  }

  // 6. Mok ambassador (non-protected)
  let mokAmb = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.name, 'Mok')))[0]
  if (!mokAmb) {
    const r = await db.insert(schema.ambassadors).values({
      name: 'Mok', roleId: clubRoleId('admin'), clubId,
    })
    mokAmb = (await db.select().from(schema.ambassadors).where(eq(schema.ambassadors.id, (r as any)[0].insertId)))[0]
  }

  // 7. Users: Johnny (owner) + Mok (admin) — staff roles
  const passwordHash = await bcrypt.hash('password', 10)
  const johnnyEmail = 'johnny@nonoclub.local'
  const mokEmail = 'mok@nonoclub.local'

  const johnnyUser = (await db.select().from(schema.users).where(eq(schema.users.email, johnnyEmail)))[0]
  if (!johnnyUser) {
    await db.insert(schema.users).values({
      email: johnnyEmail, passwordHash, name: 'Johnny',
      roleId: staffRoleId('owner'), ambassadorId: johnny!.id,
    })
  }
  const mokUser = (await db.select().from(schema.users).where(eq(schema.users.email, mokEmail)))[0]
  if (!mokUser) {
    await db.insert(schema.users).values({
      email: mokEmail, passwordHash, name: 'Mok',
      roleId: staffRoleId('admin'), ambassadorId: mokAmb!.id,
    })
  }

  console.log('✓ seed complete')
  await pool.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
