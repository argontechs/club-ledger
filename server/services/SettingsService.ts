import { eq } from 'drizzle-orm'
import { useDB, schema } from '~~/server/db/client'

const cache = new Map<string, string>()

export const SettingsService = {
  async get(key: string): Promise<string> {
    if (cache.has(key)) return cache.get(key)!
    const r = await useDB().select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1)
    const v = r[0]?.value ?? ''
    cache.set(key, v)
    return v
  },
  async getAll(): Promise<Record<string, string>> {
    const rows = await useDB().select().from(schema.settings)
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  },
  async set(key: string, value: string) {
    const r = await useDB().select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1)
    if (r.length === 0) {
      await useDB().insert(schema.settings).values({ key, value })
    } else {
      await useDB().update(schema.settings).set({ value, updatedAt: new Date() }).where(eq(schema.settings.key, key))
    }
    cache.set(key, value)
  },
  invalidate() { cache.clear() },
}
