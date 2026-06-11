import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'
import { hashPassword } from '~~/server/utils/password'
import { ApiError } from '~~/server/utils/errors'
import { SettingsService } from '~~/server/services/SettingsService'

const SetupSchema = z.object({
  owner: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().email().max(160),
    password: z.string().min(8).max(128),
  }),
  company: z.object({
    name: z.string().trim().max(200).optional(),
    currencySymbol: z.string().trim().min(1).max(10).default('RM'),
  }),
  club: z.object({
    name: z.string().trim().min(1).max(120),
  }),
})

// First-run provisioning. Replaces the hardcoded Johnny/Mok seed for customer
// installs: while the instance has no users, /setup creates the owner login,
// company settings, and the first club. Every step is existence-checked so a
// partial failure can simply be retried.
export const SetupService = {
  async needsSetup(): Promise<boolean> {
    const users = await useDB().select({ id: schema.users.id })
      .from(schema.users).where(isNull(schema.users.deletedAt)).limit(1)
    return users.length === 0
  },

  async run(body: unknown) {
    if (!(await this.needsSetup())) {
      throw ApiError.forbidden('Setup has already been completed')
    }
    const v = SetupSchema.parse(body)
    const db = useDB()

    // 1. Staff roles (owner carries the protection flag)
    const staffSeeds = [
      { name: 'owner', isOwner: 1 },
      { name: 'admin', isOwner: 0 },
    ]
    for (const r of staffSeeds) {
      const existing = await db.select().from(schema.roles)
        .where(and(eq(schema.roles.name, r.name), isNull(schema.roles.clubId)))
      if (existing.length === 0) {
        await db.insert(schema.roles).values({
          name: r.name, tier: 'admin', baseRate: '0.00', bonusRate: null,
          isSystem: 1, isOwner: r.isOwner, clubId: null,
        })
      }
    }
    const ownerRole = (await db.select().from(schema.roles)
      .where(and(eq(schema.roles.isOwner, 1), isNull(schema.roles.clubId))))[0]!

    // 2. First club + its commission-role and sale-type scaffolding.
    // Migration 0004's backfill leaves a placeholder club on fresh databases —
    // if the only club is empty (no ambassadors/sales/payouts/teams), adopt it
    // under the requested name rather than creating a second one.
    let club = (await db.select().from(schema.clubs).where(eq(schema.clubs.name, v.club.name)))[0]
    if (!club) {
      const all = await db.select().from(schema.clubs).where(isNull(schema.clubs.deletedAt))
      const placeholder = all.length === 1 ? all[0] : undefined
      if (placeholder) {
        const ambs = await db.select({ id: schema.ambassadors.id }).from(schema.ambassadors)
          .where(eq(schema.ambassadors.clubId, placeholder.id)).limit(1)
        if (ambs.length === 0) {
          await db.update(schema.clubs).set({ name: v.club.name, updatedAt: new Date() })
            .where(eq(schema.clubs.id, placeholder.id))
          club = (await db.select().from(schema.clubs).where(eq(schema.clubs.id, placeholder.id)))[0]
        }
      }
    }
    if (!club) {
      const r = await db.insert(schema.clubs).values({ name: v.club.name })
      club = (await db.select().from(schema.clubs).where(eq(schema.clubs.id, (r as any)[0].insertId)))[0]
    }
    const clubId = club!.id
    const clubRoles = await db.select().from(schema.roles).where(eq(schema.roles.clubId, clubId))
    for (const role of [{ name: 'Leader' }, { name: 'Ambassador' }]) {
      if (!clubRoles.some(x => x.name === role.name)) {
        await db.insert(schema.roles).values({
          name: role.name, tier: 'ambassador', baseRate: '8.00', bonusRate: null, clubId,
        })
      }
    }
    const clubTypes = await db.select().from(schema.saleTypes).where(eq(schema.saleTypes.clubId, clubId))
    for (const [i, name] of ['Table', 'BGO'].entries()) {
      if (!clubTypes.some(t => t.name === name)) {
        await db.insert(schema.saleTypes).values({ clubId, name, sortOrder: i })
      }
    }

    // 3. Company settings
    await SettingsService.set('currency_symbol', v.company.currencySymbol)
    if (v.company.name) await SettingsService.set('company_name', v.company.name)

    // 4. Owner login
    const passwordHash = await hashPassword(v.owner.password)
    await db.insert(schema.users).values({
      email: v.owner.email, passwordHash, name: v.owner.name, roleId: ownerRole.id,
    })

    return { ok: true }
  },
}
